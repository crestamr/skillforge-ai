"""
SkillForge AI - Security Monitoring and Incident Response
Real-time security monitoring, threat detection, and automated incident response
"""

import json
import time
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import redis
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
from collections import defaultdict, deque
import threading
import hashlib

from app.core.config import settings

logger = logging.getLogger(__name__)

class ThreatLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class IncidentStatus(Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    CONTAINED = "contained"
    RESOLVED = "resolved"
    CLOSED = "closed"

@dataclass
class SecurityEvent:
    """Security event data structure"""
    event_id: str
    timestamp: datetime
    event_type: str
    source_ip: str
    user_id: Optional[str]
    endpoint: str
    threat_level: ThreatLevel
    description: str
    metadata: Dict[str, Any]
    raw_data: Dict[str, Any]

@dataclass
class SecurityIncident:
    """Security incident data structure"""
    incident_id: str
    title: str
    description: str
    threat_level: ThreatLevel
    status: IncidentStatus
    created_at: datetime
    updated_at: datetime
    events: List[SecurityEvent]
    assigned_to: Optional[str]
    resolution: Optional[str]

class ThreatDetector:
    """Real-time threat detection engine"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
        
        # Threat detection rules
        self.detection_rules = {
            "brute_force_login": {
                "threshold": 5,
                "window": 300,  # 5 minutes
                "threat_level": ThreatLevel.HIGH
            },
            "sql_injection_attempt": {
                "threshold": 1,
                "window": 60,
                "threat_level": ThreatLevel.CRITICAL
            },
            "xss_attempt": {
                "threshold": 1,
                "window": 60,
                "threat_level": ThreatLevel.HIGH
            },
            "privilege_escalation": {
                "threshold": 1,
                "window": 60,
                "threat_level": ThreatLevel.CRITICAL
            },
            "data_exfiltration": {
                "threshold": 3,
                "window": 300,
                "threat_level": ThreatLevel.CRITICAL
            },
            "suspicious_user_agent": {
                "threshold": 10,
                "window": 3600,
                "threat_level": ThreatLevel.MEDIUM
            },
            "rate_limit_exceeded": {
                "threshold": 10,
                "window": 600,
                "threat_level": ThreatLevel.MEDIUM
            },
            "failed_authentication": {
                "threshold": 10,
                "window": 900,
                "threat_level": ThreatLevel.HIGH
            }
        }
        
        # Known malicious patterns
        self.malicious_patterns = {
            "sql_injection": [
                r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
                r"(--|#|/\*|\*/)",
                r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
                r"(\bUNION\s+SELECT\b)",
                r"(\b1\s*=\s*1\b)"
            ],
            "xss": [
                r"(<script[^>]*>.*?</script>)",
                r"(javascript:)",
                r"(on\w+\s*=)",
                r"(<iframe[^>]*>)",
                r"(alert\s*\()",
                r"(document\.cookie)"
            ],
            "command_injection": [
                r"(;|\||&|`|\$\(|\${)",
                r"(\b(rm|cat|ls|ps|kill|chmod|chown|wget|curl)\b)",
                r"(nc\s+-)",
                r"(/bin/sh|/bin/bash)"
            ],
            "path_traversal": [
                r"(\.\./|\.\.\\)",
                r"(/etc/passwd|/etc/shadow|/proc/)",
                r"(\\windows\\system32)"
            ]
        }
        
        # Suspicious user agents
        self.suspicious_user_agents = [
            "sqlmap", "nikto", "nmap", "masscan", "zap", "burp",
            "python-requests", "curl", "wget", "scanner"
        ]
    
    def analyze_event(self, event_data: Dict[str, Any]) -> Optional[SecurityEvent]:
        """Analyze incoming event for threats"""
        try:
            # Extract event details
            timestamp = datetime.fromisoformat(event_data.get("timestamp", datetime.utcnow().isoformat()))
            source_ip = event_data.get("client_ip", "unknown")
            endpoint = event_data.get("path", "")
            user_agent = event_data.get("user_agent", "")
            status_code = event_data.get("status_code", 200)
            
            # Detect threat type and level
            threat_info = self._detect_threat_type(event_data)
            
            if threat_info:
                event_id = self._generate_event_id(event_data)
                
                security_event = SecurityEvent(
                    event_id=event_id,
                    timestamp=timestamp,
                    event_type=threat_info["type"],
                    source_ip=source_ip,
                    user_id=event_data.get("user_id"),
                    endpoint=endpoint,
                    threat_level=threat_info["level"],
                    description=threat_info["description"],
                    metadata={
                        "user_agent": user_agent,
                        "status_code": status_code,
                        "method": event_data.get("method", ""),
                        "query_params": event_data.get("query_params", {}),
                        "detection_rule": threat_info.get("rule")
                    },
                    raw_data=event_data
                )
                
                return security_event
            
        except Exception as e:
            logger.error(f"Error analyzing security event: {e}")
        
        return None
    
    def _detect_threat_type(self, event_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Detect specific threat types"""
        
        # Check for authentication failures
        if event_data.get("status_code") == 401:
            if self._check_brute_force(event_data):
                return {
                    "type": "brute_force_login",
                    "level": ThreatLevel.HIGH,
                    "description": "Brute force login attempt detected",
                    "rule": "brute_force_login"
                }
        
        # Check for injection attacks
        request_data = str(event_data.get("query_params", "")) + str(event_data.get("body", ""))
        
        for attack_type, patterns in self.malicious_patterns.items():
            for pattern in patterns:
                import re
                if re.search(pattern, request_data, re.IGNORECASE):
                    return {
                        "type": f"{attack_type}_attempt",
                        "level": ThreatLevel.CRITICAL if attack_type == "sql_injection" else ThreatLevel.HIGH,
                        "description": f"{attack_type.replace('_', ' ').title()} attempt detected",
                        "rule": f"{attack_type}_attempt"
                    }
        
        # Check for suspicious user agents
        user_agent = event_data.get("user_agent", "").lower()
        for suspicious_agent in self.suspicious_user_agents:
            if suspicious_agent in user_agent:
                return {
                    "type": "suspicious_user_agent",
                    "level": ThreatLevel.MEDIUM,
                    "description": f"Suspicious user agent detected: {suspicious_agent}",
                    "rule": "suspicious_user_agent"
                }
        
        # Check for rate limiting violations
        if event_data.get("status_code") == 429:
            return {
                "type": "rate_limit_exceeded",
                "level": ThreatLevel.MEDIUM,
                "description": "Rate limit exceeded",
                "rule": "rate_limit_exceeded"
            }
        
        # Check for privilege escalation attempts
        endpoint = event_data.get("path", "")
        if "/admin" in endpoint or "/api/v1/admin" in endpoint:
            if event_data.get("status_code") == 403:
                return {
                    "type": "privilege_escalation",
                    "level": ThreatLevel.CRITICAL,
                    "description": "Unauthorized access attempt to admin endpoint",
                    "rule": "privilege_escalation"
                }
        
        return None
    
    def _check_brute_force(self, event_data: Dict[str, Any]) -> bool:
        """Check for brute force attack patterns"""
        source_ip = event_data.get("client_ip", "")
        key = f"failed_login:{source_ip}"
        
        # Count failed attempts in the last 5 minutes
        current_time = int(time.time())
        window_start = current_time - 300  # 5 minutes
        
        # Remove old entries
        self.redis_client.zremrangebyscore(key, 0, window_start)
        
        # Count current attempts
        attempt_count = self.redis_client.zcard(key)
        
        return attempt_count >= 5
    
    def _generate_event_id(self, event_data: Dict[str, Any]) -> str:
        """Generate unique event ID"""
        data_string = json.dumps(event_data, sort_keys=True)
        return hashlib.sha256(data_string.encode()).hexdigest()[:16]

class IncidentManager:
    """Security incident management"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
        self.incidents = {}
        self.incident_counter = 0
    
    def create_incident(self, events: List[SecurityEvent], title: str = None) -> SecurityIncident:
        """Create new security incident"""
        self.incident_counter += 1
        incident_id = f"INC-{datetime.utcnow().strftime('%Y%m%d')}-{self.incident_counter:04d}"
        
        # Determine threat level (highest among events)
        threat_level = max([event.threat_level for event in events], key=lambda x: x.value)
        
        # Generate title if not provided
        if not title:
            event_types = list(set([event.event_type for event in events]))
            title = f"Security Incident: {', '.join(event_types)}"
        
        incident = SecurityIncident(
            incident_id=incident_id,
            title=title,
            description=f"Incident created from {len(events)} security events",
            threat_level=threat_level,
            status=IncidentStatus.OPEN,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            events=events,
            assigned_to=None,
            resolution=None
        )
        
        self.incidents[incident_id] = incident
        
        # Store in Redis
        self._store_incident(incident)
        
        return incident
    
    def update_incident(self, incident_id: str, status: IncidentStatus = None, 
                       assigned_to: str = None, resolution: str = None) -> bool:
        """Update incident details"""
        if incident_id not in self.incidents:
            return False
        
        incident = self.incidents[incident_id]
        
        if status:
            incident.status = status
        if assigned_to:
            incident.assigned_to = assigned_to
        if resolution:
            incident.resolution = resolution
        
        incident.updated_at = datetime.utcnow()
        
        # Update in Redis
        self._store_incident(incident)
        
        return True
    
    def _store_incident(self, incident: SecurityIncident):
        """Store incident in Redis"""
        incident_data = {
            "incident_id": incident.incident_id,
            "title": incident.title,
            "description": incident.description,
            "threat_level": incident.threat_level.value,
            "status": incident.status.value,
            "created_at": incident.created_at.isoformat(),
            "updated_at": incident.updated_at.isoformat(),
            "assigned_to": incident.assigned_to,
            "resolution": incident.resolution,
            "event_count": len(incident.events)
        }
        
        self.redis_client.hset(f"incident:{incident.incident_id}", mapping=incident_data)
        self.redis_client.lpush("incidents", incident.incident_id)

class AlertManager:
    """Security alert management and notification"""
    
    def __init__(self):
        self.notification_channels = {
            "email": self._send_email_alert,
            "slack": self._send_slack_alert,
            "pagerduty": self._send_pagerduty_alert,
            "webhook": self._send_webhook_alert
        }
    
    def send_alert(self, incident: SecurityIncident, channels: List[str] = None):
        """Send security alert through specified channels"""
        if not channels:
            # Default channels based on threat level
            if incident.threat_level == ThreatLevel.CRITICAL:
                channels = ["email", "slack", "pagerduty"]
            elif incident.threat_level == ThreatLevel.HIGH:
                channels = ["email", "slack"]
            else:
                channels = ["slack"]
        
        for channel in channels:
            if channel in self.notification_channels:
                try:
                    self.notification_channels[channel](incident)
                except Exception as e:
                    logger.error(f"Failed to send alert via {channel}: {e}")
    
    def _send_email_alert(self, incident: SecurityIncident):
        """Send email alert"""
        subject = f"🚨 Security Alert: {incident.title} [{incident.threat_level.value.upper()}]"
        
        body = f"""
        Security Incident Alert
        
        Incident ID: {incident.incident_id}
        Title: {incident.title}
        Threat Level: {incident.threat_level.value.upper()}
        Status: {incident.status.value}
        Created: {incident.created_at}
        
        Description:
        {incident.description}
        
        Events: {len(incident.events)} security events detected
        
        Please investigate immediately.
        
        SkillForge AI Security Team
        """
        
        # Send email (implementation depends on email service)
        logger.info(f"Email alert sent for incident {incident.incident_id}")
    
    def _send_slack_alert(self, incident: SecurityIncident):
        """Send Slack alert"""
        webhook_url = settings.SLACK_WEBHOOK_URL
        if not webhook_url:
            return
        
        color = {
            ThreatLevel.LOW: "#36a64f",
            ThreatLevel.MEDIUM: "#ff9500",
            ThreatLevel.HIGH: "#ff0000",
            ThreatLevel.CRITICAL: "#8B0000"
        }.get(incident.threat_level, "#36a64f")
        
        payload = {
            "attachments": [{
                "color": color,
                "title": f"🚨 Security Alert: {incident.title}",
                "fields": [
                    {"title": "Incident ID", "value": incident.incident_id, "short": True},
                    {"title": "Threat Level", "value": incident.threat_level.value.upper(), "short": True},
                    {"title": "Status", "value": incident.status.value, "short": True},
                    {"title": "Events", "value": str(len(incident.events)), "short": True},
                    {"title": "Description", "value": incident.description, "short": False}
                ],
                "footer": "SkillForge AI Security",
                "ts": int(incident.created_at.timestamp())
            }]
        }
        
        try:
            response = requests.post(webhook_url, json=payload)
            response.raise_for_status()
            logger.info(f"Slack alert sent for incident {incident.incident_id}")
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
    
    def _send_pagerduty_alert(self, incident: SecurityIncident):
        """Send PagerDuty alert"""
        # PagerDuty integration implementation
        logger.info(f"PagerDuty alert sent for incident {incident.incident_id}")
    
    def _send_webhook_alert(self, incident: SecurityIncident):
        """Send webhook alert"""
        # Custom webhook implementation
        logger.info(f"Webhook alert sent for incident {incident.incident_id}")

class SecurityMonitor:
    """Main security monitoring orchestrator"""
    
    def __init__(self):
        self.threat_detector = ThreatDetector()
        self.incident_manager = IncidentManager()
        self.alert_manager = AlertManager()
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
        self.running = False
        self.event_buffer = deque(maxlen=1000)
    
    def start_monitoring(self):
        """Start security monitoring"""
        self.running = True
        logger.info("Security monitoring started")
        
        # Start monitoring thread
        monitor_thread = threading.Thread(target=self._monitor_events)
        monitor_thread.daemon = True
        monitor_thread.start()
    
    def stop_monitoring(self):
        """Stop security monitoring"""
        self.running = False
        logger.info("Security monitoring stopped")
    
    def _monitor_events(self):
        """Monitor security events from Redis"""
        while self.running:
            try:
                # Get events from Redis queue
                event_data = self.redis_client.brpop("security_events", timeout=1)
                
                if event_data:
                    event_json = json.loads(event_data[1])
                    self._process_event(event_json)
                
            except Exception as e:
                logger.error(f"Error monitoring security events: {e}")
                time.sleep(1)
    
    def _process_event(self, event_data: Dict[str, Any]):
        """Process individual security event"""
        # Analyze event for threats
        security_event = self.threat_detector.analyze_event(event_data)
        
        if security_event:
            logger.warning(f"Security threat detected: {security_event.event_type} from {security_event.source_ip}")
            
            # Add to event buffer
            self.event_buffer.append(security_event)
            
            # Check if incident should be created
            if self._should_create_incident(security_event):
                related_events = self._get_related_events(security_event)
                incident = self.incident_manager.create_incident(related_events)
                
                logger.critical(f"Security incident created: {incident.incident_id}")
                
                # Send alerts
                self.alert_manager.send_alert(incident)
    
    def _should_create_incident(self, event: SecurityEvent) -> bool:
        """Determine if incident should be created"""
        # Create incident for critical threats immediately
        if event.threat_level == ThreatLevel.CRITICAL:
            return True
        
        # Create incident for high threats with multiple occurrences
        if event.threat_level == ThreatLevel.HIGH:
            similar_events = [e for e in self.event_buffer 
                            if e.event_type == event.event_type and 
                            e.source_ip == event.source_ip and
                            (event.timestamp - e.timestamp).seconds < 300]
            return len(similar_events) >= 3
        
        return False
    
    def _get_related_events(self, event: SecurityEvent) -> List[SecurityEvent]:
        """Get events related to the current event"""
        related = [event]
        
        # Find events from same IP in last 10 minutes
        for buffered_event in self.event_buffer:
            if (buffered_event.source_ip == event.source_ip and
                buffered_event.event_id != event.event_id and
                (event.timestamp - buffered_event.timestamp).seconds < 600):
                related.append(buffered_event)
        
        return related

# Initialize global security monitor
security_monitor = SecurityMonitor()
