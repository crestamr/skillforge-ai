"""
SkillForge AI - Security Testing and Vulnerability Scanner
Automated security testing, vulnerability scanning, and penetration testing tools
"""

import asyncio
import aiohttp
import json
import re
import ssl
import socket
import subprocess
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

class VulnerabilityLevel(Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class Vulnerability:
    """Vulnerability finding data structure"""
    id: str
    title: str
    description: str
    level: VulnerabilityLevel
    category: str
    endpoint: str
    method: str
    evidence: str
    recommendation: str
    cve_id: Optional[str] = None
    cvss_score: Optional[float] = None

class SecurityScanner:
    """Comprehensive security scanner"""
    
    def __init__(self, base_url: str, auth_token: str = None):
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token
        self.session = None
        self.vulnerabilities = []
        
        # Common attack payloads
        self.sql_payloads = [
            "' OR '1'='1",
            "' OR 1=1--",
            "' UNION SELECT NULL--",
            "'; DROP TABLE users--",
            "1' AND (SELECT COUNT(*) FROM users) > 0--",
            "' OR SLEEP(5)--"
        ]
        
        self.xss_payloads = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            "';alert('XSS');//",
            "<iframe src=javascript:alert('XSS')></iframe>"
        ]
        
        self.command_injection_payloads = [
            "; ls -la",
            "| whoami",
            "&& cat /etc/passwd",
            "`id`",
            "$(whoami)",
            "; ping -c 4 127.0.0.1"
        ]
        
        self.path_traversal_payloads = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
            "....//....//....//etc/passwd",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
        ]
    
    async def scan_application(self) -> List[Vulnerability]:
        """Run comprehensive security scan"""
        logger.info(f"Starting security scan of {self.base_url}")
        
        async with aiohttp.ClientSession() as session:
            self.session = session
            
            # Discovery phase
            endpoints = await self._discover_endpoints()
            
            # Vulnerability scanning
            await self._scan_ssl_tls()
            await self._scan_headers()
            await self._scan_authentication()
            await self._scan_injection_vulnerabilities(endpoints)
            await self._scan_broken_access_control(endpoints)
            await self._scan_security_misconfigurations()
            await self._scan_sensitive_data_exposure()
            await self._scan_xml_vulnerabilities()
            await self._scan_broken_authentication()
            await self._scan_insufficient_logging()
        
        logger.info(f"Security scan completed. Found {len(self.vulnerabilities)} vulnerabilities")
        return self.vulnerabilities
    
    async def _discover_endpoints(self) -> List[str]:
        """Discover application endpoints"""
        endpoints = [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/password-reset",
            "/api/v1/users/profile",
            "/api/v1/skills/extract",
            "/api/v1/jobs/match",
            "/api/v1/ai/inference",
            "/admin",
            "/api/v1/admin/users",
            "/health",
            "/metrics"
        ]
        
        # Try to discover more endpoints
        common_paths = [
            "/robots.txt", "/sitemap.xml", "/.well-known/security.txt",
            "/swagger.json", "/api/docs", "/graphql"
        ]
        
        for path in common_paths:
            try:
                async with self.session.get(urljoin(self.base_url, path)) as response:
                    if response.status == 200:
                        # Parse response for additional endpoints
                        text = await response.text()
                        found_endpoints = self._extract_endpoints_from_text(text)
                        endpoints.extend(found_endpoints)
            except Exception:
                pass
        
        return list(set(endpoints))
    
    def _extract_endpoints_from_text(self, text: str) -> List[str]:
        """Extract API endpoints from text content"""
        endpoints = []
        
        # Look for API paths in various formats
        patterns = [
            r'/api/v\d+/[a-zA-Z0-9/_-]+',
            r'"/[a-zA-Z0-9/_-]+"',
            r"'/[a-zA-Z0-9/_-]+'"
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                endpoint = match.strip('"\'')
                if endpoint.startswith('/'):
                    endpoints.append(endpoint)
        
        return endpoints
    
    async def _scan_ssl_tls(self):
        """Scan SSL/TLS configuration"""
        try:
            parsed_url = urlparse(self.base_url)
            hostname = parsed_url.hostname
            port = parsed_url.port or (443 if parsed_url.scheme == 'https' else 80)
            
            if parsed_url.scheme == 'https':
                # Check SSL certificate
                context = ssl.create_default_context()
                
                with socket.create_connection((hostname, port), timeout=10) as sock:
                    with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                        cert = ssock.getpeercert()
                        
                        # Check certificate expiration
                        not_after = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                        days_until_expiry = (not_after - datetime.now()).days
                        
                        if days_until_expiry < 30:
                            self.vulnerabilities.append(Vulnerability(
                                id="ssl_cert_expiry",
                                title="SSL Certificate Expiring Soon",
                                description=f"SSL certificate expires in {days_until_expiry} days",
                                level=VulnerabilityLevel.MEDIUM,
                                category="SSL/TLS",
                                endpoint=self.base_url,
                                method="GET",
                                evidence=f"Certificate expires: {cert['notAfter']}",
                                recommendation="Renew SSL certificate before expiration"
                            ))
                        
                        # Check for weak cipher suites
                        cipher = ssock.cipher()
                        if cipher and 'RC4' in cipher[0] or 'DES' in cipher[0]:
                            self.vulnerabilities.append(Vulnerability(
                                id="weak_cipher",
                                title="Weak SSL Cipher Suite",
                                description="Server supports weak cipher suites",
                                level=VulnerabilityLevel.HIGH,
                                category="SSL/TLS",
                                endpoint=self.base_url,
                                method="GET",
                                evidence=f"Weak cipher: {cipher[0]}",
                                recommendation="Disable weak cipher suites and use strong encryption"
                            ))
            else:
                # HTTP instead of HTTPS
                self.vulnerabilities.append(Vulnerability(
                    id="no_https",
                    title="No HTTPS Encryption",
                    description="Application is not using HTTPS encryption",
                    level=VulnerabilityLevel.HIGH,
                    category="SSL/TLS",
                    endpoint=self.base_url,
                    method="GET",
                    evidence="HTTP protocol detected",
                    recommendation="Implement HTTPS encryption for all communications"
                ))
                
        except Exception as e:
            logger.error(f"SSL/TLS scan error: {e}")
    
    async def _scan_headers(self):
        """Scan security headers"""
        try:
            async with self.session.get(self.base_url) as response:
                headers = response.headers
                
                # Check for missing security headers
                security_headers = {
                    'Strict-Transport-Security': 'HSTS header missing',
                    'X-Frame-Options': 'X-Frame-Options header missing',
                    'X-Content-Type-Options': 'X-Content-Type-Options header missing',
                    'X-XSS-Protection': 'X-XSS-Protection header missing',
                    'Content-Security-Policy': 'Content Security Policy header missing',
                    'Referrer-Policy': 'Referrer-Policy header missing'
                }
                
                for header, description in security_headers.items():
                    if header not in headers:
                        self.vulnerabilities.append(Vulnerability(
                            id=f"missing_{header.lower().replace('-', '_')}",
                            title=f"Missing {header} Header",
                            description=description,
                            level=VulnerabilityLevel.MEDIUM,
                            category="Security Headers",
                            endpoint=self.base_url,
                            method="GET",
                            evidence=f"Response headers: {dict(headers)}",
                            recommendation=f"Add {header} header to improve security"
                        ))
                
                # Check for information disclosure headers
                disclosure_headers = ['Server', 'X-Powered-By', 'X-AspNet-Version']
                for header in disclosure_headers:
                    if header in headers:
                        self.vulnerabilities.append(Vulnerability(
                            id=f"info_disclosure_{header.lower().replace('-', '_')}",
                            title=f"Information Disclosure via {header} Header",
                            description=f"Server reveals information through {header} header",
                            level=VulnerabilityLevel.LOW,
                            category="Information Disclosure",
                            endpoint=self.base_url,
                            method="GET",
                            evidence=f"{header}: {headers[header]}",
                            recommendation=f"Remove or obfuscate {header} header"
                        ))
                        
        except Exception as e:
            logger.error(f"Header scan error: {e}")
    
    async def _scan_injection_vulnerabilities(self, endpoints: List[str]):
        """Scan for injection vulnerabilities"""
        for endpoint in endpoints:
            # SQL Injection
            await self._test_sql_injection(endpoint)
            
            # XSS
            await self._test_xss(endpoint)
            
            # Command Injection
            await self._test_command_injection(endpoint)
            
            # Path Traversal
            await self._test_path_traversal(endpoint)
    
    async def _test_sql_injection(self, endpoint: str):
        """Test for SQL injection vulnerabilities"""
        for payload in self.sql_payloads:
            try:
                # Test in query parameters
                params = {'id': payload, 'search': payload}
                async with self.session.get(urljoin(self.base_url, endpoint), params=params) as response:
                    text = await response.text()
                    
                    # Look for SQL error messages
                    sql_errors = [
                        'sql syntax', 'mysql_fetch', 'ora-', 'postgresql',
                        'sqlite_', 'sqlstate', 'syntax error', 'database error'
                    ]
                    
                    for error in sql_errors:
                        if error.lower() in text.lower():
                            self.vulnerabilities.append(Vulnerability(
                                id=f"sql_injection_{endpoint.replace('/', '_')}",
                                title="SQL Injection Vulnerability",
                                description="Application is vulnerable to SQL injection",
                                level=VulnerabilityLevel.CRITICAL,
                                category="Injection",
                                endpoint=endpoint,
                                method="GET",
                                evidence=f"Payload: {payload}, Error: {error}",
                                recommendation="Use parameterized queries and input validation"
                            ))
                            break
                
                # Test in POST body
                if endpoint.endswith(('login', 'register', 'search')):
                    data = {'username': payload, 'password': payload, 'email': payload}
                    async with self.session.post(urljoin(self.base_url, endpoint), json=data) as response:
                        text = await response.text()
                        
                        for error in sql_errors:
                            if error.lower() in text.lower():
                                self.vulnerabilities.append(Vulnerability(
                                    id=f"sql_injection_post_{endpoint.replace('/', '_')}",
                                    title="SQL Injection in POST Data",
                                    description="Application is vulnerable to SQL injection in POST data",
                                    level=VulnerabilityLevel.CRITICAL,
                                    category="Injection",
                                    endpoint=endpoint,
                                    method="POST",
                                    evidence=f"Payload: {payload}, Error: {error}",
                                    recommendation="Use parameterized queries and input validation"
                                ))
                                break
                                
            except Exception as e:
                logger.debug(f"SQL injection test error for {endpoint}: {e}")
    
    async def _test_xss(self, endpoint: str):
        """Test for XSS vulnerabilities"""
        for payload in self.xss_payloads:
            try:
                # Test reflected XSS
                params = {'q': payload, 'search': payload, 'message': payload}
                async with self.session.get(urljoin(self.base_url, endpoint), params=params) as response:
                    text = await response.text()
                    
                    # Check if payload is reflected without encoding
                    if payload in text and '<script>' in payload:
                        self.vulnerabilities.append(Vulnerability(
                            id=f"xss_reflected_{endpoint.replace('/', '_')}",
                            title="Reflected XSS Vulnerability",
                            description="Application is vulnerable to reflected XSS",
                            level=VulnerabilityLevel.HIGH,
                            category="Injection",
                            endpoint=endpoint,
                            method="GET",
                            evidence=f"Payload reflected: {payload}",
                            recommendation="Implement proper input validation and output encoding"
                        ))
                        
            except Exception as e:
                logger.debug(f"XSS test error for {endpoint}: {e}")
    
    async def _test_command_injection(self, endpoint: str):
        """Test for command injection vulnerabilities"""
        for payload in self.command_injection_payloads:
            try:
                params = {'cmd': payload, 'file': payload}
                async with self.session.get(urljoin(self.base_url, endpoint), params=params) as response:
                    text = await response.text()
                    
                    # Look for command output indicators
                    command_indicators = ['root:', 'bin/bash', 'uid=', 'gid=', 'PING']
                    
                    for indicator in command_indicators:
                        if indicator in text:
                            self.vulnerabilities.append(Vulnerability(
                                id=f"command_injection_{endpoint.replace('/', '_')}",
                                title="Command Injection Vulnerability",
                                description="Application is vulnerable to command injection",
                                level=VulnerabilityLevel.CRITICAL,
                                category="Injection",
                                endpoint=endpoint,
                                method="GET",
                                evidence=f"Payload: {payload}, Output: {indicator}",
                                recommendation="Avoid system calls with user input, use safe APIs"
                            ))
                            break
                            
            except Exception as e:
                logger.debug(f"Command injection test error for {endpoint}: {e}")
    
    async def _test_path_traversal(self, endpoint: str):
        """Test for path traversal vulnerabilities"""
        for payload in self.path_traversal_payloads:
            try:
                params = {'file': payload, 'path': payload, 'document': payload}
                async with self.session.get(urljoin(self.base_url, endpoint), params=params) as response:
                    text = await response.text()
                    
                    # Look for file content indicators
                    file_indicators = ['root:x:', '[boot loader]', 'localhost']
                    
                    for indicator in file_indicators:
                        if indicator in text:
                            self.vulnerabilities.append(Vulnerability(
                                id=f"path_traversal_{endpoint.replace('/', '_')}",
                                title="Path Traversal Vulnerability",
                                description="Application is vulnerable to path traversal",
                                level=VulnerabilityLevel.HIGH,
                                category="Injection",
                                endpoint=endpoint,
                                method="GET",
                                evidence=f"Payload: {payload}, Content: {indicator}",
                                recommendation="Validate and sanitize file paths, use whitelist approach"
                            ))
                            break
                            
            except Exception as e:
                logger.debug(f"Path traversal test error for {endpoint}: {e}")
    
    async def _scan_broken_access_control(self, endpoints: List[str]):
        """Scan for broken access control"""
        # Test for missing authentication
        for endpoint in endpoints:
            if 'admin' in endpoint or 'user' in endpoint:
                try:
                    async with self.session.get(urljoin(self.base_url, endpoint)) as response:
                        if response.status == 200:
                            text = await response.text()
                            if 'login' not in text.lower() and 'unauthorized' not in text.lower():
                                self.vulnerabilities.append(Vulnerability(
                                    id=f"missing_auth_{endpoint.replace('/', '_')}",
                                    title="Missing Authentication",
                                    description="Sensitive endpoint accessible without authentication",
                                    level=VulnerabilityLevel.HIGH,
                                    category="Broken Access Control",
                                    endpoint=endpoint,
                                    method="GET",
                                    evidence=f"Status: {response.status}, accessible without auth",
                                    recommendation="Implement proper authentication for sensitive endpoints"
                                ))
                except Exception as e:
                    logger.debug(f"Access control test error for {endpoint}: {e}")
    
    async def _scan_security_misconfigurations(self):
        """Scan for security misconfigurations"""
        # Test for debug mode
        try:
            async with self.session.get(urljoin(self.base_url, '/debug')) as response:
                if response.status == 200:
                    self.vulnerabilities.append(Vulnerability(
                        id="debug_mode_enabled",
                        title="Debug Mode Enabled",
                        description="Application debug mode is enabled in production",
                        level=VulnerabilityLevel.MEDIUM,
                        category="Security Misconfiguration",
                        endpoint="/debug",
                        method="GET",
                        evidence="Debug endpoint accessible",
                        recommendation="Disable debug mode in production"
                    ))
        except Exception:
            pass
    
    async def _scan_sensitive_data_exposure(self):
        """Scan for sensitive data exposure"""
        sensitive_files = [
            '/.env', '/config.json', '/database.yml', '/secrets.txt',
            '/.git/config', '/backup.sql', '/users.csv'
        ]
        
        for file_path in sensitive_files:
            try:
                async with self.session.get(urljoin(self.base_url, file_path)) as response:
                    if response.status == 200:
                        self.vulnerabilities.append(Vulnerability(
                            id=f"sensitive_file_{file_path.replace('/', '_').replace('.', '_')}",
                            title="Sensitive File Exposure",
                            description=f"Sensitive file {file_path} is publicly accessible",
                            level=VulnerabilityLevel.HIGH,
                            category="Sensitive Data Exposure",
                            endpoint=file_path,
                            method="GET",
                            evidence=f"File accessible: {file_path}",
                            recommendation="Remove or protect sensitive files from public access"
                        ))
            except Exception:
                pass
    
    async def _scan_xml_vulnerabilities(self):
        """Scan for XML vulnerabilities"""
        # XXE payload
        xxe_payload = """<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
        <data>&xxe;</data>"""
        
        xml_endpoints = ['/api/v1/upload', '/api/v1/import', '/api/v1/data']
        
        for endpoint in xml_endpoints:
            try:
                headers = {'Content-Type': 'application/xml'}
                async with self.session.post(
                    urljoin(self.base_url, endpoint), 
                    data=xxe_payload, 
                    headers=headers
                ) as response:
                    text = await response.text()
                    
                    if 'root:' in text:
                        self.vulnerabilities.append(Vulnerability(
                            id=f"xxe_{endpoint.replace('/', '_')}",
                            title="XML External Entity (XXE) Vulnerability",
                            description="Application is vulnerable to XXE attacks",
                            level=VulnerabilityLevel.HIGH,
                            category="XML Vulnerabilities",
                            endpoint=endpoint,
                            method="POST",
                            evidence="XXE payload executed successfully",
                            recommendation="Disable external entity processing in XML parser"
                        ))
            except Exception:
                pass
    
    async def _scan_broken_authentication(self):
        """Scan for broken authentication"""
        # Test weak password policy
        weak_passwords = ['123456', 'password', 'admin', 'test']
        
        for password in weak_passwords:
            try:
                data = {'username': 'admin', 'password': password}
                async with self.session.post(
                    urljoin(self.base_url, '/api/v1/auth/login'), 
                    json=data
                ) as response:
                    if response.status == 200:
                        self.vulnerabilities.append(Vulnerability(
                            id="weak_password_policy",
                            title="Weak Password Policy",
                            description="Application accepts weak passwords",
                            level=VulnerabilityLevel.MEDIUM,
                            category="Broken Authentication",
                            endpoint="/api/v1/auth/login",
                            method="POST",
                            evidence=f"Weak password accepted: {password}",
                            recommendation="Implement strong password policy"
                        ))
                        break
            except Exception:
                pass
    
    async def _scan_insufficient_logging(self):
        """Scan for insufficient logging and monitoring"""
        # This would typically involve checking log configurations
        # For now, we'll check if there's a logging endpoint
        try:
            async with self.session.get(urljoin(self.base_url, '/logs')) as response:
                if response.status == 200:
                    self.vulnerabilities.append(Vulnerability(
                        id="exposed_logs",
                        title="Exposed Log Files",
                        description="Application log files are publicly accessible",
                        level=VulnerabilityLevel.MEDIUM,
                        category="Insufficient Logging",
                        endpoint="/logs",
                        method="GET",
                        evidence="Log endpoint accessible",
                        recommendation="Protect log files from public access"
                    ))
        except Exception:
            pass

# Utility function to run security scan
async def run_security_scan(base_url: str, auth_token: str = None) -> List[Vulnerability]:
    """Run comprehensive security scan"""
    scanner = SecurityScanner(base_url, auth_token)
    return await scanner.scan_application()
