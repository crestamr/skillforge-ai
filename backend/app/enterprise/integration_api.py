"""
SkillForge AI - Enterprise Integration API
Comprehensive enterprise features including SSO, bulk operations, and custom integrations
"""

import asyncio
import logging
import json
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import jwt
import requests
from cryptography.x509 import load_pem_x509_certificate
from cryptography.hazmat.backends import default_backend
import saml2
from saml2.config import Config as Saml2Config
from saml2.client import Saml2Client
from authlib.integrations.requests_client import OAuth2Session
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.config import settings
from app.models.enterprise import (
    EnterpriseOrganization, EnterpriseUser, EnterpriseGroup,
    EnterpriseRole, EnterprisePermission, EnterpriseAuditLog,
    EnterpriseLearningPath, EnterpriseAssessment
)
from app.services.user_service import UserService
from app.services.learning_service import LearningService
from app.security.authentication import AuthenticationService

logger = logging.getLogger(__name__)

class IntegrationType(Enum):
    SAML = "saml"
    OIDC = "oidc"
    LDAP = "ldap"
    SCIM = "scim"

class ProvisioningAction(Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    SUSPEND = "suspend"
    ACTIVATE = "activate"

@dataclass
class EnterpriseConfig:
    """Enterprise configuration settings"""
    organization_id: str
    sso_enabled: bool
    sso_type: IntegrationType
    sso_config: Dict[str, Any]
    custom_branding: Dict[str, Any]
    audit_retention_days: int
    data_residency: str
    compliance_requirements: List[str]

class EnterpriseIntegrationAPI:
    """Enterprise integration API for SSO, provisioning, and custom integrations"""
    
    def __init__(self):
        self.router = APIRouter(prefix="/enterprise", tags=["enterprise"])
        self.user_service = UserService()
        self.learning_service = LearningService()
        self.auth_service = AuthenticationService()
        
        # SSO configurations
        self.sso_configs = {}
        self.saml_clients = {}
        self.oidc_clients = {}
        
        # HR system integrations
        self.hr_integrations = {
            'workday': WorkdayIntegration(),
            'successfactors': SuccessFactorsIntegration(),
            'bamboohr': BambooHRIntegration(),
            'adp': ADPIntegration()
        }
        
        # LMS integrations
        self.lms_integrations = {
            'moodle': MoodleIntegration(),
            'canvas': CanvasIntegration(),
            'blackboard': BlackboardIntegration(),
            'cornerstone': CornerstoneIntegration()
        }
        
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup enterprise API routes"""
        
        # SSO endpoints
        self.router.add_api_route("/sso/config", self.configure_sso, methods=["POST"])
        self.router.add_api_route("/sso/saml/metadata", self.get_saml_metadata, methods=["GET"])
        self.router.add_api_route("/sso/saml/acs", self.saml_assertion_consumer, methods=["POST"])
        self.router.add_api_route("/sso/oidc/callback", self.oidc_callback, methods=["GET"])
        
        # User provisioning endpoints
        self.router.add_api_route("/users/bulk", self.bulk_user_operations, methods=["POST"])
        self.router.add_api_route("/users/provision", self.provision_user, methods=["POST"])
        self.router.add_api_route("/users/deprovision/{user_id}", self.deprovision_user, methods=["DELETE"])
        self.router.add_api_route("/users/sync", self.sync_users, methods=["POST"])
        
        # Group and role management
        self.router.add_api_route("/groups", self.create_group, methods=["POST"])
        self.router.add_api_route("/groups/{group_id}/members", self.manage_group_members, methods=["POST"])
        self.router.add_api_route("/roles", self.create_role, methods=["POST"])
        self.router.add_api_route("/roles/{role_id}/permissions", self.manage_role_permissions, methods=["POST"])
        
        # Learning path management
        self.router.add_api_route("/learning-paths", self.create_learning_path, methods=["POST"])
        self.router.add_api_route("/learning-paths/{path_id}/assign", self.assign_learning_path, methods=["POST"])
        self.router.add_api_route("/learning-paths/bulk-assign", self.bulk_assign_learning_paths, methods=["POST"])
        
        # Assessment management
        self.router.add_api_route("/assessments", self.create_assessment, methods=["POST"])
        self.router.add_api_route("/assessments/{assessment_id}/schedule", self.schedule_assessment, methods=["POST"])
        self.router.add_api_route("/assessments/bulk-schedule", self.bulk_schedule_assessments, methods=["POST"])
        
        # Manager dashboards
        self.router.add_api_route("/managers/{manager_id}/team", self.get_team_overview, methods=["GET"])
        self.router.add_api_route("/managers/{manager_id}/skills", self.get_team_skills, methods=["GET"])
        self.router.add_api_route("/managers/{manager_id}/progress", self.get_team_progress, methods=["GET"])
        
        # Reporting and analytics
        self.router.add_api_route("/reports/usage", self.get_usage_report, methods=["GET"])
        self.router.add_api_route("/reports/skills", self.get_skills_report, methods=["GET"])
        self.router.add_api_route("/reports/compliance", self.get_compliance_report, methods=["GET"])
        self.router.add_api_route("/reports/custom", self.generate_custom_report, methods=["POST"])
        
        # Audit and compliance
        self.router.add_api_route("/audit/logs", self.get_audit_logs, methods=["GET"])
        self.router.add_api_route("/audit/export", self.export_audit_logs, methods=["POST"])
        
        # Data export
        self.router.add_api_route("/data/export", self.export_organization_data, methods=["POST"])
        self.router.add_api_route("/data/import", self.import_organization_data, methods=["POST"])
        
        # HR system integrations
        self.router.add_api_route("/integrations/hr/{system}/sync", self.sync_hr_system, methods=["POST"])
        self.router.add_api_route("/integrations/hr/{system}/webhook", self.hr_webhook, methods=["POST"])
        
        # LMS integrations
        self.router.add_api_route("/integrations/lms/{system}/sync", self.sync_lms_system, methods=["POST"])
        self.router.add_api_route("/integrations/lms/{system}/grades", self.sync_lms_grades, methods=["POST"])
    
    async def configure_sso(
        self,
        config: Dict[str, Any],
        organization_id: str,
        db: Session = Depends(get_db)
    ) -> Dict[str, Any]:
        """Configure SSO for an organization"""
        
        try:
            sso_type = IntegrationType(config['type'])
            
            if sso_type == IntegrationType.SAML:
                return await self._configure_saml_sso(organization_id, config, db)
            elif sso_type == IntegrationType.OIDC:
                return await self._configure_oidc_sso(organization_id, config, db)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"SSO type {sso_type} not supported"
                )
                
        except Exception as e:
            logger.error(f"Failed to configure SSO: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to configure SSO"
            )
    
    async def _configure_saml_sso(
        self,
        organization_id: str,
        config: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Configure SAML SSO"""
        
        # Create SAML configuration
        saml_config = {
            'entityid': f"https://api.skillforge.ai/enterprise/sso/saml/{organization_id}",
            'assertion_consumer_service': {
                'url': f"https://api.skillforge.ai/enterprise/sso/saml/acs",
                'binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST'
            },
            'single_logout_service': {
                'url': f"https://api.skillforge.ai/enterprise/sso/saml/sls",
                'binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
            },
            'idp': {
                'entityid': config['idp_entity_id'],
                'sso_url': config['idp_sso_url'],
                'slo_url': config.get('idp_slo_url'),
                'x509cert': config['idp_certificate']
            },
            'attribute_mapping': config.get('attribute_mapping', {
                'email': 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
                'first_name': 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
                'last_name': 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
                'groups': 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'
            })
        }
        
        # Create SAML client
        saml2_config = Saml2Config()
        saml2_config.load(saml_config)
        saml_client = Saml2Client(config=saml2_config)
        
        # Store configuration
        self.sso_configs[organization_id] = {
            'type': IntegrationType.SAML,
            'config': saml_config,
            'client': saml_client
        }
        
        # Save to database
        await self._save_sso_config(organization_id, saml_config, db)
        
        return {
            'status': 'configured',
            'type': 'saml',
            'metadata_url': f"https://api.skillforge.ai/enterprise/sso/saml/metadata?org={organization_id}",
            'acs_url': f"https://api.skillforge.ai/enterprise/sso/saml/acs"
        }
    
    async def _configure_oidc_sso(
        self,
        organization_id: str,
        config: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Configure OIDC SSO"""
        
        # Create OIDC client
        oidc_client = OAuth2Session(
            client_id=config['client_id'],
            client_secret=config['client_secret'],
            redirect_uri=f"https://api.skillforge.ai/enterprise/sso/oidc/callback"
        )
        
        oidc_config = {
            'client_id': config['client_id'],
            'client_secret': config['client_secret'],
            'discovery_url': config['discovery_url'],
            'scopes': config.get('scopes', ['openid', 'profile', 'email']),
            'attribute_mapping': config.get('attribute_mapping', {
                'email': 'email',
                'first_name': 'given_name',
                'last_name': 'family_name',
                'groups': 'groups'
            })
        }
        
        # Store configuration
        self.sso_configs[organization_id] = {
            'type': IntegrationType.OIDC,
            'config': oidc_config,
            'client': oidc_client
        }
        
        # Save to database
        await self._save_sso_config(organization_id, oidc_config, db)
        
        return {
            'status': 'configured',
            'type': 'oidc',
            'authorization_url': f"https://api.skillforge.ai/enterprise/sso/oidc/authorize?org={organization_id}",
            'callback_url': f"https://api.skillforge.ai/enterprise/sso/oidc/callback"
        }
    
    async def bulk_user_operations(
        self,
        operations: List[Dict[str, Any]],
        organization_id: str,
        db: Session = Depends(get_db)
    ) -> Dict[str, Any]:
        """Perform bulk user operations (create, update, delete)"""
        
        results = {
            'successful': [],
            'failed': [],
            'total': len(operations)
        }
        
        for operation in operations:
            try:
                action = ProvisioningAction(operation['action'])
                user_data = operation['user_data']
                
                if action == ProvisioningAction.CREATE:
                    result = await self._create_enterprise_user(user_data, organization_id, db)
                elif action == ProvisioningAction.UPDATE:
                    result = await self._update_enterprise_user(user_data, organization_id, db)
                elif action == ProvisioningAction.DELETE:
                    result = await self._delete_enterprise_user(user_data['id'], organization_id, db)
                elif action == ProvisioningAction.SUSPEND:
                    result = await self._suspend_enterprise_user(user_data['id'], organization_id, db)
                elif action == ProvisioningAction.ACTIVATE:
                    result = await self._activate_enterprise_user(user_data['id'], organization_id, db)
                
                results['successful'].append({
                    'user_id': user_data.get('id'),
                    'email': user_data.get('email'),
                    'action': action.value,
                    'result': result
                })
                
            except Exception as e:
                logger.error(f"Failed to process user operation: {e}")
                results['failed'].append({
                    'user_data': user_data,
                    'action': operation['action'],
                    'error': str(e)
                })
        
        # Log bulk operation
        await self._log_audit_event(
            organization_id,
            'bulk_user_operation',
            {
                'total_operations': len(operations),
                'successful': len(results['successful']),
                'failed': len(results['failed'])
            },
            db
        )
        
        return results
    
    async def create_learning_path(
        self,
        learning_path_data: Dict[str, Any],
        organization_id: str,
        db: Session = Depends(get_db)
    ) -> Dict[str, Any]:
        """Create custom learning path for organization"""
        
        try:
            # Validate learning path structure
            required_fields = ['name', 'description', 'modules']
            for field in required_fields:
                if field not in learning_path_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Create learning path
            learning_path = EnterpriseLearningPath(
                organization_id=organization_id,
                name=learning_path_data['name'],
                description=learning_path_data['description'],
                modules=learning_path_data['modules'],
                prerequisites=learning_path_data.get('prerequisites', []),
                estimated_duration=learning_path_data.get('estimated_duration'),
                difficulty_level=learning_path_data.get('difficulty_level', 'intermediate'),
                tags=learning_path_data.get('tags', []),
                is_mandatory=learning_path_data.get('is_mandatory', False),
                created_by=learning_path_data.get('created_by'),
                created_at=datetime.utcnow()
            )
            
            db.add(learning_path)
            db.commit()
            db.refresh(learning_path)
            
            # Log creation
            await self._log_audit_event(
                organization_id,
                'learning_path_created',
                {
                    'learning_path_id': learning_path.id,
                    'name': learning_path.name,
                    'created_by': learning_path_data.get('created_by')
                },
                db
            )
            
            return {
                'learning_path_id': learning_path.id,
                'name': learning_path.name,
                'status': 'created',
                'modules_count': len(learning_path.modules)
            }
            
        except Exception as e:
            logger.error(f"Failed to create learning path: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create learning path"
            )
    
    async def get_team_overview(
        self,
        manager_id: str,
        organization_id: str,
        db: Session = Depends(get_db)
    ) -> Dict[str, Any]:
        """Get team overview for manager dashboard"""
        
        try:
            # Get team members
            team_members = db.query(EnterpriseUser).filter(
                EnterpriseUser.organization_id == organization_id,
                EnterpriseUser.manager_id == manager_id,
                EnterpriseUser.is_active == True
            ).all()
            
            # Calculate team metrics
            total_members = len(team_members)
            active_learners = len([m for m in team_members if m.last_activity_date and 
                                 m.last_activity_date > datetime.utcnow() - timedelta(days=7)])
            
            # Get skill distribution
            skill_distribution = await self._calculate_team_skill_distribution(team_members, db)
            
            # Get learning progress
            learning_progress = await self._calculate_team_learning_progress(team_members, db)
            
            # Get recent achievements
            recent_achievements = await self._get_team_recent_achievements(team_members, db)
            
            return {
                'team_size': total_members,
                'active_learners': active_learners,
                'engagement_rate': active_learners / total_members if total_members > 0 else 0,
                'skill_distribution': skill_distribution,
                'learning_progress': learning_progress,
                'recent_achievements': recent_achievements,
                'team_members': [
                    {
                        'id': member.id,
                        'name': f"{member.first_name} {member.last_name}",
                        'role': member.role,
                        'last_activity': member.last_activity_date.isoformat() if member.last_activity_date else None,
                        'skills_count': len(member.skills) if member.skills else 0,
                        'learning_paths_active': len([lp for lp in member.learning_paths if lp.status == 'active'])
                    }
                    for member in team_members
                ]
            }
            
        except Exception as e:
            logger.error(f"Failed to get team overview: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get team overview"
            )
    
    async def generate_custom_report(
        self,
        report_config: Dict[str, Any],
        organization_id: str,
        db: Session = Depends(get_db)
    ) -> Dict[str, Any]:
        """Generate custom analytics report"""
        
        try:
            report_type = report_config['type']
            filters = report_config.get('filters', {})
            metrics = report_config.get('metrics', [])
            date_range = report_config.get('date_range', {})
            
            # Build query based on report configuration
            if report_type == 'user_engagement':
                data = await self._generate_user_engagement_report(
                    organization_id, filters, metrics, date_range, db
                )
            elif report_type == 'skill_analytics':
                data = await self._generate_skill_analytics_report(
                    organization_id, filters, metrics, date_range, db
                )
            elif report_type == 'learning_effectiveness':
                data = await self._generate_learning_effectiveness_report(
                    organization_id, filters, metrics, date_range, db
                )
            elif report_type == 'compliance_tracking':
                data = await self._generate_compliance_tracking_report(
                    organization_id, filters, metrics, date_range, db
                )
            else:
                raise ValueError(f"Unsupported report type: {report_type}")
            
            # Log report generation
            await self._log_audit_event(
                organization_id,
                'custom_report_generated',
                {
                    'report_type': report_type,
                    'filters': filters,
                    'metrics': metrics
                },
                db
            )
            
            return {
                'report_id': f"report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                'type': report_type,
                'generated_at': datetime.utcnow().isoformat(),
                'data': data,
                'metadata': {
                    'total_records': len(data) if isinstance(data, list) else 1,
                    'filters_applied': filters,
                    'metrics_included': metrics
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to generate custom report: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate custom report"
            )
    
    async def sync_hr_system(
        self,
        system: str,
        sync_config: Dict[str, Any],
        organization_id: str,
        db: Session = Depends(get_db)
    ) -> Dict[str, Any]:
        """Sync data with HR system"""
        
        try:
            if system not in self.hr_integrations:
                raise ValueError(f"HR system {system} not supported")
            
            hr_integration = self.hr_integrations[system]
            
            # Perform sync based on configuration
            sync_result = await hr_integration.sync_data(
                organization_id,
                sync_config,
                db
            )
            
            # Log sync operation
            await self._log_audit_event(
                organization_id,
                'hr_system_sync',
                {
                    'system': system,
                    'sync_type': sync_config.get('type'),
                    'records_processed': sync_result.get('records_processed', 0),
                    'errors': sync_result.get('errors', [])
                },
                db
            )
            
            return sync_result
            
        except Exception as e:
            logger.error(f"Failed to sync HR system {system}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to sync HR system {system}"
            )
    
    # Helper methods (implementation details)
    async def _save_sso_config(self, organization_id: str, config: Dict[str, Any], db: Session):
        """Save SSO configuration to database"""
        pass
    
    async def _create_enterprise_user(self, user_data: Dict[str, Any], organization_id: str, db: Session):
        """Create enterprise user"""
        pass
    
    async def _log_audit_event(self, organization_id: str, event_type: str, details: Dict[str, Any], db: Session):
        """Log audit event"""
        pass
    
    # Additional helper methods would be implemented here...

# HR System Integration Classes
class WorkdayIntegration:
    """Workday HR system integration"""
    
    async def sync_data(self, organization_id: str, config: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Sync data with Workday"""
        # Implementation for Workday integration
        pass

class SuccessFactorsIntegration:
    """SAP SuccessFactors integration"""
    
    async def sync_data(self, organization_id: str, config: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Sync data with SuccessFactors"""
        # Implementation for SuccessFactors integration
        pass

class BambooHRIntegration:
    """BambooHR integration"""
    
    async def sync_data(self, organization_id: str, config: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Sync data with BambooHR"""
        # Implementation for BambooHR integration
        pass

class ADPIntegration:
    """ADP integration"""
    
    async def sync_data(self, organization_id: str, config: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Sync data with ADP"""
        # Implementation for ADP integration
        pass

# LMS Integration Classes
class MoodleIntegration:
    """Moodle LMS integration"""
    
    async def sync_data(self, organization_id: str, config: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Sync data with Moodle"""
        # Implementation for Moodle integration
        pass

class CanvasIntegration:
    """Canvas LMS integration"""
    
    async def sync_data(self, organization_id: str, config: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Sync data with Canvas"""
        # Implementation for Canvas integration
        pass

class BlackboardIntegration:
    """Blackboard LMS integration"""
    
    async def sync_data(self, organization_id: str, config: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Sync data with Blackboard"""
        # Implementation for Blackboard integration
        pass

class CornerstoneIntegration:
    """Cornerstone OnDemand integration"""
    
    async def sync_data(self, organization_id: str, config: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Sync data with Cornerstone"""
        # Implementation for Cornerstone integration
        pass

# Initialize enterprise integration API
enterprise_api = EnterpriseIntegrationAPI()
