"""
Enterprise Service for SkillForge AI
Handles enterprise-grade features including SSO, bulk operations, and team management
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
import json
from dataclasses import dataclass
import xml.etree.ElementTree as ET
from cryptography.x509 import load_pem_x509_certificate
from cryptography.hazmat.backends import default_backend
import jwt
import httpx

from app.core.database import get_database
from app.models.user import User
from app.models.team import Team
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

@dataclass
class SSOProvider:
    provider_id: str
    name: str
    type: str
    config: Dict[str, Any]
    enabled: bool

@dataclass
class BulkOperationResult:
    valid_count: int
    invalid_count: int
    errors: List[str]
    processed_users: List[str]

@dataclass
class TeamAnalytics:
    team_id: str
    period_start: datetime
    period_end: datetime
    metrics: Dict[str, Any]
    skill_progress: List[Dict[str, Any]]
    assessment_results: List[Dict[str, Any]]
    learning_completion: Dict[str, float]

class EnterpriseService:
    """Enterprise-grade service for SSO, bulk operations, and team management"""
    
    def __init__(self):
        self.sso_providers: Dict[str, SSOProvider] = {}
        self.hr_integrations = {
            "workday": self._sync_workday,
            "successfactors": self._sync_successfactors,
            "bamboohr": self._sync_bamboohr,
            "adp": self._sync_adp
        }
        
    async def configure_sso(self, config) -> SSOProvider:
        """Configure Single Sign-On integration"""
        try:
            # Validate SSO configuration
            await self._validate_sso_config(config)
            
            # Create SSO provider
            provider = SSOProvider(
                provider_id=f"sso_{config.provider_name.lower()}",
                name=config.provider_name,
                type=config.integration_type,
                config={
                    "entity_id": config.entity_id,
                    "sso_url": config.sso_url,
                    "certificate": config.certificate,
                    "attribute_mapping": config.attribute_mapping,
                    "auto_provision": config.auto_provision,
                    "default_role": config.default_role
                },
                enabled=config.enabled
            )
            
            # Store provider configuration
            self.sso_providers[provider.provider_id] = provider
            
            # Save to database
            db = await get_database()
            await db.sso_providers.insert_one({
                "provider_id": provider.provider_id,
                "name": provider.name,
                "type": provider.type,
                "config": provider.config,
                "enabled": provider.enabled,
                "created_at": datetime.utcnow()
            })
            
            logger.info(f"SSO provider configured: {provider.name}")
            return provider
            
        except Exception as e:
            logger.error(f"SSO configuration failed: {e}")
            raise

    async def _validate_sso_config(self, config):
        """Validate SSO configuration parameters"""
        # Validate certificate
        try:
            cert_bytes = config.certificate.encode('utf-8')
            load_pem_x509_certificate(cert_bytes, default_backend())
        except Exception as e:
            raise ValueError(f"Invalid certificate: {e}")
        
        # Validate URLs
        if not config.sso_url.startswith(('https://', 'http://')):
            raise ValueError("SSO URL must be a valid HTTP/HTTPS URL")
        
        # Validate attribute mapping
        required_attributes = ['email', 'first_name', 'last_name']
        for attr in required_attributes:
            if attr not in config.attribute_mapping:
                raise ValueError(f"Missing required attribute mapping: {attr}")

    async def process_saml_assertion(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process SAML assertion and authenticate user"""
        try:
            # Parse SAML response
            saml_response = request_data.get('SAMLResponse')
            if not saml_response:
                raise ValueError("Missing SAML response")
            
            # Decode and parse SAML assertion
            import base64
            decoded_response = base64.b64decode(saml_response)
            root = ET.fromstring(decoded_response)
            
            # Extract user attributes
            user_attributes = self._extract_saml_attributes(root)
            
            # Find or create user
            user = await self._provision_sso_user(user_attributes)
            
            # Generate JWT token
            token = self._generate_jwt_token(user)
            
            return {
                "status": "success",
                "user_id": user.id,
                "access_token": token,
                "user_attributes": user_attributes
            }
            
        except Exception as e:
            logger.error(f"SAML assertion processing failed: {e}")
            raise

    def _extract_saml_attributes(self, saml_root) -> Dict[str, Any]:
        """Extract user attributes from SAML assertion"""
        attributes = {}
        
        # Find attribute statements
        for attr_stmt in saml_root.findall('.//{urn:oasis:names:tc:SAML:2.0:assertion}AttributeStatement'):
            for attr in attr_stmt.findall('.//{urn:oasis:names:tc:SAML:2.0:assertion}Attribute'):
                attr_name = attr.get('Name')
                attr_values = [val.text for val in attr.findall('.//{urn:oasis:names:tc:SAML:2.0:assertion}AttributeValue')]
                
                if attr_values:
                    attributes[attr_name] = attr_values[0] if len(attr_values) == 1 else attr_values
        
        return attributes

    async def _provision_sso_user(self, attributes: Dict[str, Any]) -> User:
        """Provision or update user from SSO attributes"""
        db = await get_database()
        
        email = attributes.get('email')
        if not email:
            raise ValueError("Email attribute required for user provisioning")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email})
        
        if existing_user:
            # Update existing user
            await db.users.update_one(
                {"email": email},
                {
                    "$set": {
                        "first_name": attributes.get('first_name', existing_user.get('first_name')),
                        "last_name": attributes.get('last_name', existing_user.get('last_name')),
                        "last_login": datetime.utcnow(),
                        "sso_attributes": attributes
                    }
                }
            )
            return User(**existing_user)
        else:
            # Create new user
            new_user = {
                "email": email,
                "first_name": attributes.get('first_name', ''),
                "last_name": attributes.get('last_name', ''),
                "role": "user",
                "sso_provisioned": True,
                "sso_attributes": attributes,
                "created_at": datetime.utcnow(),
                "last_login": datetime.utcnow()
            }
            
            result = await db.users.insert_one(new_user)
            new_user["id"] = str(result.inserted_id)
            
            return User(**new_user)

    def _generate_jwt_token(self, user: User) -> str:
        """Generate JWT token for authenticated user"""
        payload = {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "exp": datetime.utcnow() + timedelta(hours=24),
            "iat": datetime.utcnow()
        }
        
        # Use your JWT secret key
        secret_key = "your-jwt-secret-key"  # Should come from environment
        return jwt.encode(payload, secret_key, algorithm="HS256")

    async def validate_bulk_operation(self, operation) -> BulkOperationResult:
        """Validate bulk user operation without executing"""
        valid_count = 0
        invalid_count = 0
        errors = []
        
        for user_data in operation.users:
            try:
                # Validate required fields
                if operation.action == "create":
                    required_fields = ["email", "first_name", "last_name"]
                    for field in required_fields:
                        if field not in user_data:
                            raise ValueError(f"Missing required field: {field}")
                
                # Validate email format
                email = user_data.get("email")
                if email and "@" not in email:
                    raise ValueError("Invalid email format")
                
                valid_count += 1
                
            except Exception as e:
                invalid_count += 1
                errors.append(f"User {user_data.get('email', 'unknown')}: {str(e)}")
        
        return BulkOperationResult(
            valid_count=valid_count,
            invalid_count=invalid_count,
            errors=errors,
            processed_users=[]
        )

    async def execute_bulk_operation(self, operation, executor_user_id: str):
        """Execute bulk user operation"""
        db = await get_database()
        processed_users = []
        
        try:
            for user_data in operation.users:
                try:
                    if operation.action == "create":
                        # Create new user
                        new_user = {
                            **user_data,
                            "created_at": datetime.utcnow(),
                            "bulk_created": True,
                            "created_by": executor_user_id
                        }
                        result = await db.users.insert_one(new_user)
                        processed_users.append(str(result.inserted_id))
                        
                    elif operation.action == "update":
                        # Update existing user
                        email = user_data.get("email")
                        if email:
                            await db.users.update_one(
                                {"email": email},
                                {"$set": {**user_data, "updated_at": datetime.utcnow()}}
                            )
                            processed_users.append(email)
                    
                    elif operation.action == "deactivate":
                        # Deactivate user
                        email = user_data.get("email")
                        if email:
                            await db.users.update_one(
                                {"email": email},
                                {"$set": {"active": False, "deactivated_at": datetime.utcnow()}}
                            )
                            processed_users.append(email)
                    
                    elif operation.action == "delete":
                        # Soft delete user
                        email = user_data.get("email")
                        if email:
                            await db.users.update_one(
                                {"email": email},
                                {"$set": {"deleted": True, "deleted_at": datetime.utcnow()}}
                            )
                            processed_users.append(email)
                
                except Exception as e:
                    logger.error(f"Failed to process user {user_data.get('email')}: {e}")
                    continue
            
            # Log bulk operation completion
            await self.log_audit_event(
                user_id=executor_user_id,
                action=f"bulk_{operation.action}_completed",
                resource_type="users",
                resource_id="bulk_operation",
                details={
                    "processed_count": len(processed_users),
                    "total_count": len(operation.users),
                    "action": operation.action
                }
            )
            
        except Exception as e:
            logger.error(f"Bulk operation failed: {e}")
            raise

    async def create_team(self, team_config) -> Team:
        """Create a new team with specified configuration"""
        db = await get_database()
        
        team_data = {
            "name": team_config.name,
            "description": team_config.description,
            "manager_id": team_config.manager_id,
            "department": team_config.department,
            "members": team_config.members,
            "learning_paths": team_config.learning_paths,
            "custom_permissions": team_config.custom_permissions,
            "created_at": datetime.utcnow()
        }
        
        result = await db.teams.insert_one(team_data)
        team_data["id"] = str(result.inserted_id)
        
        return Team(**team_data)

    async def verify_team_access(self, user_id: str, team_id: str) -> bool:
        """Verify if user has access to team data"""
        db = await get_database()
        
        # Check if user is team member or manager
        team = await db.teams.find_one({"_id": team_id})
        if not team:
            return False
        
        if user_id == team.get("manager_id") or user_id in team.get("members", []):
            return True
        
        # Check if user has admin permissions
        user = await db.users.find_one({"_id": user_id})
        if user and user.get("role") == "admin":
            return True
        
        return False

    async def get_team_analytics(self, team_id: str, period_days: int) -> TeamAnalytics:
        """Get comprehensive analytics for a team"""
        db = await get_database()
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)
        
        # Get team members
        team = await db.teams.find_one({"_id": team_id})
        if not team:
            raise ValueError(f"Team not found: {team_id}")
        
        member_ids = team.get("members", [])
        
        # Calculate metrics
        metrics = await self._calculate_team_metrics(member_ids, start_date, end_date)
        skill_progress = await self._get_team_skill_progress(member_ids, start_date, end_date)
        assessment_results = await self._get_team_assessment_results(member_ids, start_date, end_date)
        learning_completion = await self._get_team_learning_completion(member_ids, start_date, end_date)
        
        return TeamAnalytics(
            team_id=team_id,
            period_start=start_date,
            period_end=end_date,
            metrics=metrics,
            skill_progress=skill_progress,
            assessment_results=assessment_results,
            learning_completion=learning_completion
        )

    async def _calculate_team_metrics(self, member_ids: List[str], start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Calculate team performance metrics"""
        db = await get_database()
        
        # Active users
        active_users = await db.user_sessions.count_documents({
            "user_id": {"$in": member_ids},
            "created_at": {"$gte": start_date, "$lte": end_date}
        })
        
        # Assessments completed
        assessments_completed = await db.assessment_sessions.count_documents({
            "user_id": {"$in": member_ids},
            "status": "completed",
            "completed_at": {"$gte": start_date, "$lte": end_date}
        })
        
        # Learning hours
        learning_hours = await db.learning_progress.aggregate([
            {
                "$match": {
                    "user_id": {"$in": member_ids},
                    "updated_at": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_hours": {"$sum": "$time_spent_hours"}
                }
            }
        ]).to_list(1)
        
        total_learning_hours = learning_hours[0]["total_hours"] if learning_hours else 0
        
        return {
            "team_size": len(member_ids),
            "active_users": active_users,
            "assessments_completed": assessments_completed,
            "total_learning_hours": total_learning_hours,
            "avg_learning_hours_per_user": total_learning_hours / len(member_ids) if member_ids else 0
        }

    async def _get_team_skill_progress(self, member_ids: List[str], start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get skill progress for team members"""
        db = await get_database()
        
        skill_progress = await db.user_skills.aggregate([
            {
                "$match": {
                    "user_id": {"$in": member_ids},
                    "updated_at": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": "$skill_id",
                    "avg_proficiency": {"$avg": "$proficiency_level"},
                    "user_count": {"$sum": 1}
                }
            },
            {
                "$lookup": {
                    "from": "skills",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "skill_info"
                }
            }
        ]).to_list(None)
        
        return skill_progress

    async def _get_team_assessment_results(self, member_ids: List[str], start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get assessment results for team members"""
        db = await get_database()
        
        assessment_results = await db.assessment_sessions.aggregate([
            {
                "$match": {
                    "user_id": {"$in": member_ids},
                    "status": "completed",
                    "completed_at": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": "$assessment_id",
                    "avg_score": {"$avg": "$score"},
                    "completion_count": {"$sum": 1},
                    "pass_rate": {
                        "$avg": {
                            "$cond": [{"$gte": ["$score", 70]}, 1, 0]
                        }
                    }
                }
            }
        ]).to_list(None)
        
        return assessment_results

    async def _get_team_learning_completion(self, member_ids: List[str], start_date: datetime, end_date: datetime) -> Dict[str, float]:
        """Get learning completion rates for team"""
        db = await get_database()
        
        # Get learning path completion rates
        completion_data = await db.learning_progress.aggregate([
            {
                "$match": {
                    "user_id": {"$in": member_ids},
                    "updated_at": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "avg_completion": {"$avg": "$completion_percentage"},
                    "completed_paths": {
                        "$sum": {
                            "$cond": [{"$gte": ["$completion_percentage", 100]}, 1, 0]
                        }
                    },
                    "total_paths": {"$sum": 1}
                }
            }
        ]).to_list(1)
        
        if completion_data:
            data = completion_data[0]
            return {
                "avg_completion_rate": data.get("avg_completion", 0),
                "path_completion_rate": (data.get("completed_paths", 0) / data.get("total_paths", 1)) * 100
            }
        
        return {"avg_completion_rate": 0, "path_completion_rate": 0}

    async def log_audit_event(self, user_id: str, action: str, resource_type: str, resource_id: str, details: Dict[str, Any], ip_address: str = None, user_agent: str = None):
        """Log audit event for compliance"""
        db = await get_database()
        
        audit_entry = {
            "timestamp": datetime.utcnow(),
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details,
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        
        await db.audit_logs.insert_one(audit_entry)

    async def get_audit_logs(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Retrieve audit logs with filtering"""
        db = await get_database()
        
        query = {
            "timestamp": {
                "$gte": filters["start_date"],
                "$lte": filters["end_date"]
            }
        }
        
        if filters.get("user_id"):
            query["user_id"] = filters["user_id"]
        if filters.get("action"):
            query["action"] = filters["action"]
        if filters.get("resource_type"):
            query["resource_type"] = filters["resource_type"]
        
        cursor = db.audit_logs.find(query).sort("timestamp", -1).skip(filters["offset"]).limit(filters["limit"])
        return await cursor.to_list(None)

    # HR System Integration Methods
    async def sync_hr_system(self, hr_system: str, config: Dict[str, Any], user_id: str):
        """Sync data with HR systems"""
        if hr_system in self.hr_integrations:
            await self.hr_integrations[hr_system](config, user_id)
        else:
            raise ValueError(f"Unsupported HR system: {hr_system}")

    async def _sync_workday(self, config: Dict[str, Any], user_id: str):
        """Sync with Workday HR system"""
        # Implementation for Workday integration
        logger.info("Syncing with Workday HR system")
        # Add actual Workday API integration here

    async def _sync_successfactors(self, config: Dict[str, Any], user_id: str):
        """Sync with SAP SuccessFactors"""
        # Implementation for SuccessFactors integration
        logger.info("Syncing with SAP SuccessFactors")
        # Add actual SuccessFactors API integration here

    async def _sync_bamboohr(self, config: Dict[str, Any], user_id: str):
        """Sync with BambooHR"""
        # Implementation for BambooHR integration
        logger.info("Syncing with BambooHR")
        # Add actual BambooHR API integration here

    async def _sync_adp(self, config: Dict[str, Any], user_id: str):
        """Sync with ADP"""
        # Implementation for ADP integration
        logger.info("Syncing with ADP")
        # Add actual ADP API integration here

# Service instance
enterprise_service = EnterpriseService()
