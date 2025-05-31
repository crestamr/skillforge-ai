"""
SkillForge AI - Encryption and Key Management
Implements AES-256-GCM encryption with AWS KMS integration
"""

import os
import base64
import secrets
from typing import Optional, Dict, Any, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.asymmetric import rsa, padding
import boto3
from botocore.exceptions import ClientError
import logging
from datetime import datetime, timedelta
import json

from app.core.config import settings

logger = logging.getLogger(__name__)

class KMSManager:
    """AWS KMS Key Management Service integration"""
    
    def __init__(self):
        self.kms_client = boto3.client(
            'kms',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        self.key_id = settings.KMS_KEY_ID
    
    def encrypt_data_key(self, plaintext_key: bytes) -> Dict[str, Any]:
        """Encrypt a data key using KMS"""
        try:
            response = self.kms_client.encrypt(
                KeyId=self.key_id,
                Plaintext=plaintext_key,
                EncryptionContext={
                    'service': 'skillforge-ai',
                    'purpose': 'data-encryption',
                    'timestamp': datetime.utcnow().isoformat()
                }
            )
            return {
                'encrypted_key': base64.b64encode(response['CiphertextBlob']).decode('utf-8'),
                'key_id': response['KeyId']
            }
        except ClientError as e:
            logger.error(f"KMS encryption error: {e}")
            raise Exception("Failed to encrypt data key")
    
    def decrypt_data_key(self, encrypted_key: str) -> bytes:
        """Decrypt a data key using KMS"""
        try:
            response = self.kms_client.decrypt(
                CiphertextBlob=base64.b64decode(encrypted_key),
                EncryptionContext={
                    'service': 'skillforge-ai',
                    'purpose': 'data-encryption'
                }
            )
            return response['Plaintext']
        except ClientError as e:
            logger.error(f"KMS decryption error: {e}")
            raise Exception("Failed to decrypt data key")
    
    def generate_data_key(self, key_spec: str = 'AES_256') -> Dict[str, Any]:
        """Generate a new data key"""
        try:
            response = self.kms_client.generate_data_key(
                KeyId=self.key_id,
                KeySpec=key_spec,
                EncryptionContext={
                    'service': 'skillforge-ai',
                    'purpose': 'data-encryption',
                    'timestamp': datetime.utcnow().isoformat()
                }
            )
            return {
                'plaintext_key': response['Plaintext'],
                'encrypted_key': base64.b64encode(response['CiphertextBlob']).decode('utf-8'),
                'key_id': response['KeyId']
            }
        except ClientError as e:
            logger.error(f"KMS key generation error: {e}")
            raise Exception("Failed to generate data key")
    
    def rotate_key(self) -> bool:
        """Initiate key rotation"""
        try:
            self.kms_client.enable_key_rotation(KeyId=self.key_id)
            return True
        except ClientError as e:
            logger.error(f"KMS key rotation error: {e}")
            return False

class FieldEncryption:
    """Field-level encryption for sensitive data"""
    
    def __init__(self):
        self.kms_manager = KMSManager()
        self._key_cache = {}
        self._key_cache_ttl = timedelta(hours=1)
    
    def encrypt_field(self, plaintext: str, field_type: str = 'general') -> Dict[str, str]:
        """
        Encrypt a field value using AES-256-GCM with envelope encryption
        Returns dict with encrypted_data, encrypted_key, and metadata
        """
        if not plaintext:
            return {'encrypted_data': '', 'encrypted_key': '', 'algorithm': 'none'}
        
        try:
            # Generate or get cached data key
            data_key_info = self._get_data_key(field_type)
            plaintext_key = data_key_info['plaintext_key']
            encrypted_key = data_key_info['encrypted_key']
            
            # Generate random nonce
            nonce = secrets.token_bytes(12)  # 96-bit nonce for GCM
            
            # Encrypt data using AES-256-GCM
            aesgcm = AESGCM(plaintext_key)
            
            # Additional authenticated data (AAD)
            aad = json.dumps({
                'field_type': field_type,
                'timestamp': datetime.utcnow().isoformat(),
                'version': '1.0'
            }).encode('utf-8')
            
            ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), aad)
            
            # Combine nonce + ciphertext
            encrypted_data = base64.b64encode(nonce + ciphertext).decode('utf-8')
            
            return {
                'encrypted_data': encrypted_data,
                'encrypted_key': encrypted_key,
                'algorithm': 'AES-256-GCM',
                'aad': base64.b64encode(aad).decode('utf-8')
            }
            
        except Exception as e:
            logger.error(f"Field encryption error: {e}")
            raise Exception("Failed to encrypt field")
    
    def decrypt_field(self, encrypted_data: str, encrypted_key: str, aad: str = None) -> str:
        """
        Decrypt a field value
        """
        if not encrypted_data or not encrypted_key:
            return ''
        
        try:
            # Decrypt the data key
            plaintext_key = self.kms_manager.decrypt_data_key(encrypted_key)
            
            # Decode the encrypted data
            encrypted_bytes = base64.b64decode(encrypted_data)
            
            # Extract nonce and ciphertext
            nonce = encrypted_bytes[:12]
            ciphertext = encrypted_bytes[12:]
            
            # Decrypt using AES-256-GCM
            aesgcm = AESGCM(plaintext_key)
            
            # Decode AAD if provided
            aad_bytes = base64.b64decode(aad) if aad else None
            
            plaintext_bytes = aesgcm.decrypt(nonce, ciphertext, aad_bytes)
            
            return plaintext_bytes.decode('utf-8')
            
        except Exception as e:
            logger.error(f"Field decryption error: {e}")
            raise Exception("Failed to decrypt field")
    
    def _get_data_key(self, field_type: str) -> Dict[str, Any]:
        """Get or generate data key for field type"""
        cache_key = f"data_key_{field_type}"
        
        # Check cache
        if cache_key in self._key_cache:
            cached_data = self._key_cache[cache_key]
            if datetime.utcnow() - cached_data['timestamp'] < self._key_cache_ttl:
                return cached_data['key_info']
        
        # Generate new data key
        key_info = self.kms_manager.generate_data_key()
        
        # Cache the key
        self._key_cache[cache_key] = {
            'key_info': key_info,
            'timestamp': datetime.utcnow()
        }
        
        return key_info
    
    def rotate_field_keys(self, field_type: str = None):
        """Rotate encryption keys for fields"""
        if field_type:
            cache_key = f"data_key_{field_type}"
            if cache_key in self._key_cache:
                del self._key_cache[cache_key]
        else:
            self._key_cache.clear()

class DatabaseEncryption:
    """Database-level encryption utilities"""
    
    @staticmethod
    def encrypt_sensitive_columns(model_class, sensitive_fields: list):
        """
        Decorator to automatically encrypt/decrypt sensitive database columns
        """
        field_encryption = FieldEncryption()
        
        def encrypt_before_insert(mapper, connection, target):
            for field in sensitive_fields:
                if hasattr(target, field):
                    plaintext = getattr(target, field)
                    if plaintext:
                        encrypted_data = field_encryption.encrypt_field(plaintext, field)
                        setattr(target, f"{field}_encrypted", encrypted_data['encrypted_data'])
                        setattr(target, f"{field}_key", encrypted_data['encrypted_key'])
                        setattr(target, f"{field}_aad", encrypted_data['aad'])
                        setattr(target, field, None)  # Clear plaintext
        
        def decrypt_after_load(target, context):
            for field in sensitive_fields:
                encrypted_field = f"{field}_encrypted"
                key_field = f"{field}_key"
                aad_field = f"{field}_aad"
                
                if (hasattr(target, encrypted_field) and 
                    hasattr(target, key_field) and
                    getattr(target, encrypted_field)):
                    
                    encrypted_data = getattr(target, encrypted_field)
                    encrypted_key = getattr(target, key_field)
                    aad = getattr(target, aad_field, None)
                    
                    try:
                        plaintext = field_encryption.decrypt_field(encrypted_data, encrypted_key, aad)
                        setattr(target, field, plaintext)
                    except Exception as e:
                        logger.error(f"Failed to decrypt {field}: {e}")
                        setattr(target, field, None)
        
        # Register SQLAlchemy event listeners
        from sqlalchemy import event
        event.listen(model_class, 'before_insert', encrypt_before_insert)
        event.listen(model_class, 'before_update', encrypt_before_insert)
        event.listen(model_class, 'load', decrypt_after_load)
        
        return model_class

class FileEncryption:
    """File encryption for uploaded documents and media"""
    
    def __init__(self):
        self.field_encryption = FieldEncryption()
    
    def encrypt_file(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """Encrypt file content"""
        try:
            # Generate file-specific data key
            key_info = self.field_encryption.kms_manager.generate_data_key()
            plaintext_key = key_info['plaintext_key']
            encrypted_key = key_info['encrypted_key']
            
            # Generate nonce
            nonce = secrets.token_bytes(12)
            
            # Create AAD with file metadata
            aad = json.dumps({
                'filename': filename,
                'size': len(file_content),
                'timestamp': datetime.utcnow().isoformat(),
                'version': '1.0'
            }).encode('utf-8')
            
            # Encrypt file content
            aesgcm = AESGCM(plaintext_key)
            ciphertext = aesgcm.encrypt(nonce, file_content, aad)
            
            # Combine nonce + ciphertext
            encrypted_content = nonce + ciphertext
            
            return {
                'encrypted_content': encrypted_content,
                'encrypted_key': encrypted_key,
                'aad': base64.b64encode(aad).decode('utf-8'),
                'algorithm': 'AES-256-GCM'
            }
            
        except Exception as e:
            logger.error(f"File encryption error: {e}")
            raise Exception("Failed to encrypt file")
    
    def decrypt_file(self, encrypted_content: bytes, encrypted_key: str, aad: str) -> bytes:
        """Decrypt file content"""
        try:
            # Decrypt the data key
            plaintext_key = self.field_encryption.kms_manager.decrypt_data_key(encrypted_key)
            
            # Extract nonce and ciphertext
            nonce = encrypted_content[:12]
            ciphertext = encrypted_content[12:]
            
            # Decrypt file content
            aesgcm = AESGCM(plaintext_key)
            aad_bytes = base64.b64decode(aad)
            
            file_content = aesgcm.decrypt(nonce, ciphertext, aad_bytes)
            
            return file_content
            
        except Exception as e:
            logger.error(f"File decryption error: {e}")
            raise Exception("Failed to decrypt file")

class TokenEncryption:
    """Encryption for tokens and temporary secrets"""
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate cryptographically secure token"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_verification_code(length: int = 6) -> str:
        """Generate numeric verification code"""
        return ''.join(secrets.choice('0123456789') for _ in range(length))
    
    @staticmethod
    def hash_token(token: str) -> str:
        """Hash token for storage"""
        digest = hashes.Hash(hashes.SHA256())
        digest.update(token.encode('utf-8'))
        return base64.b64encode(digest.finalize()).decode('utf-8')
    
    @staticmethod
    def verify_token(token: str, hashed_token: str) -> bool:
        """Verify token against hash"""
        return TokenEncryption.hash_token(token) == hashed_token

# Utility functions for common encryption tasks
def encrypt_pii(data: str) -> Dict[str, str]:
    """Encrypt personally identifiable information"""
    field_encryption = FieldEncryption()
    return field_encryption.encrypt_field(data, 'pii')

def decrypt_pii(encrypted_data: str, encrypted_key: str, aad: str = None) -> str:
    """Decrypt personally identifiable information"""
    field_encryption = FieldEncryption()
    return field_encryption.decrypt_field(encrypted_data, encrypted_key, aad)

def encrypt_payment_data(data: str) -> Dict[str, str]:
    """Encrypt payment information with highest security"""
    field_encryption = FieldEncryption()
    return field_encryption.encrypt_field(data, 'payment')

def decrypt_payment_data(encrypted_data: str, encrypted_key: str, aad: str = None) -> str:
    """Decrypt payment information"""
    field_encryption = FieldEncryption()
    return field_encryption.decrypt_field(encrypted_data, encrypted_key, aad)

# Initialize global encryption instance
encryption_service = FieldEncryption()
file_encryption_service = FileEncryption()
