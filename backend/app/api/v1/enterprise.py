"""
Enterprise Integration API for SkillForge AI
Provides enterprise-grade features for SSO, bulk operations, and team management
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from pydantic import BaseModel, Field, validator
from datetime import datetime, timedelta
import logging
from enum import Enum

from app.core.auth import get_current_user, require_permissions
from app.models.user import User
from app.services.enterprise_service import enterprise_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    VIEWER = "viewer"

class ProvisioningAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DEACTIVATE = "deactivate"
    DELETE = "delete"

class IntegrationType(str, Enum):
    SAML = "saml"
    OIDC = "oidc"
    LDAP = "ldap"
    SCIM = "scim"

# Pydantic Models
class SSOConfiguration(BaseModel):
    provider_name: str
    integration_type: IntegrationType
    entity_id: str
    sso_url: str
    certificate: str
    attribute_mapping: Dict[str, str]
    auto_provision: bool = True
    default_role: UserRole = UserRole.USER
    enabled: bool = True

class BulkUserOperation(BaseModel):
    action: ProvisioningAction
    users: List[Dict[str, Any]]
    send_notifications: bool = True
    dry_run: bool = False

class TeamConfiguration(BaseModel):
    name: str
    description: Optional[str] = None
    manager_id: str
    department: str
    members: List[str] = []
    learning_paths: List[str] = []
    custom_permissions: List[str] = []

class CustomAssessment(BaseModel):
    title: str
    description: str
    skill_ids: List[str]
    questions: List[Dict[str, Any]]
    duration_minutes: int
    passing_score: int
    assigned_teams: List[str] = []
    scheduled_date: Optional[datetime] = None

class AuditLogEntry(BaseModel):
    timestamp: datetime
    user_id: str
    action: str
    resource_type: str
    resource_id: str
    details: Dict[str, Any]
    ip_address: str
    user_agent: str

class EnterpriseAnalytics(BaseModel):
    team_id: str
    period_start: datetime
    period_end: datetime
    metrics: Dict[str, Any]
    skill_progress: List[Dict[str, Any]]
    assessment_results: List[Dict[str, Any]]
    learning_completion: Dict[str, float]

# SSO Endpoints
@router.post("/sso/configure", response_model=Dict[str, str])
async def configure_sso(
    config: SSOConfiguration,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions(["admin:sso"]))
):
    """Configure Single Sign-On integration"""
    try:
        result = await enterprise_service.configure_sso(config)
        
        # Log configuration change
        await enterprise_service.log_audit_event(
            user_id=current_user.id,
            action="sso_configured",
            resource_type="sso_config",
            resource_id=config.provider_name,
            details={"provider": config.provider_name, "type": config.integration_type}
        )
        
        return {"status": "success", "provider_id": result.provider_id}
        
    except Exception as e:
        logger.error(f"SSO configuration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SSO configuration failed: {str(e)}"
        )

@router.get("/sso/providers", response_model=List[Dict[str, Any]])
async def list_sso_providers(
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions(["admin:sso", "read:sso"]))
):
    """List configured SSO providers"""
    try:
        providers = await enterprise_service.get_sso_providers()
        return providers
        
    except Exception as e:
        logger.error(f"Failed to list SSO providers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list SSO providers: {str(e)}"
        )

@router.post("/sso/saml/acs")
async def saml_assertion_consumer(request_data: Dict[str, Any]):
    """SAML Assertion Consumer Service endpoint"""
    try:
        result = await enterprise_service.process_saml_assertion(request_data)
        return result
        
    except Exception as e:
        logger.error(f"SAML assertion processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SAML assertion processing failed: {str(e)}"
        )

# Bulk User Operations
@router.post("/users/bulk", response_model=Dict[str, Any])
async def bulk_user_operations(
    operation: BulkUserOperation,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions(["admin:users"]))
):
    """Perform bulk user operations (create, update, deactivate, delete)"""
    try:
        if operation.dry_run:
            # Validate operations without executing
            validation_result = await enterprise_service.validate_bulk_operation(operation)
            return {
                "status": "validation_complete",
                "valid_operations": validation_result.valid_count,
                "invalid_operations": validation_result.invalid_count,
                "errors": validation_result.errors
            }
        
        # Execute bulk operation in background
        background_tasks.add_task(
            enterprise_service.execute_bulk_operation,
            operation,
            current_user.id
        )
        
        # Log bulk operation
        await enterprise_service.log_audit_event(
            user_id=current_user.id,
            action=f"bulk_{operation.action}",
            resource_type="users",
            resource_id="bulk_operation",
            details={"user_count": len(operation.users), "action": operation.action}
        )
        
        return {
            "status": "operation_queued",
            "operation_id": f"bulk_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "user_count": len(operation.users)
        }
        
    except Exception as e:
        logger.error(f"Bulk user operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk user operation failed: {str(e)}"
        )

# Team Management
@router.post("/teams", response_model=Dict[str, str])
async def create_team(
    team_config: TeamConfiguration,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions(["admin:teams", "create:teams"]))
):
    """Create a new team with specified configuration"""
    try:
        team = await enterprise_service.create_team(team_config)
        
        # Log team creation
        await enterprise_service.log_audit_event(
            user_id=current_user.id,
            action="team_created",
            resource_type="team",
            resource_id=team.id,
            details={"team_name": team_config.name, "department": team_config.department}
        )
        
        return {"status": "success", "team_id": team.id}
        
    except Exception as e:
        logger.error(f"Team creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Team creation failed: {str(e)}"
        )

@router.get("/teams/{team_id}/analytics", response_model=EnterpriseAnalytics)
async def get_team_analytics(
    team_id: str,
    period_days: int = 30,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions(["read:team_analytics"]))
):
    """Get comprehensive analytics for a team"""
    try:
        # Verify user has access to this team
        has_access = await enterprise_service.verify_team_access(current_user.id, team_id)
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to team analytics"
            )
        
        analytics = await enterprise_service.get_team_analytics(team_id, period_days)
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get team analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get team analytics: {str(e)}"
        )

# Custom Assessments
@router.post("/assessments/custom", response_model=Dict[str, str])
async def create_custom_assessment(
    assessment: CustomAssessment,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions(["admin:assessments", "create:assessments"]))
):
    """Create a custom assessment for enterprise use"""
    try:
        assessment_id = await enterprise_service.create_custom_assessment(assessment)
        
        # Log assessment creation
        await enterprise_service.log_audit_event(
            user_id=current_user.id,
            action="custom_assessment_created",
            resource_type="assessment",
            resource_id=assessment_id,
            details={"title": assessment.title, "skill_count": len(assessment.skill_ids)}
        )
        
        return {"status": "success", "assessment_id": assessment_id}
        
    except Exception as e:
        logger.error(f"Custom assessment creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Custom assessment creation failed: {str(e)}"
        )

# HR System Integration
@router.post("/integrations/hr/sync")
async def sync_hr_data(
    hr_system: str,
    sync_config: Dict[str, Any],
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions(["admin:integrations"]))
):
    """Sync data with HR systems (Workday, SAP SuccessFactors, etc.)"""
    try:
        # Validate HR system configuration
        if hr_system not in ["workday", "successfactors", "bamboohr", "adp"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported HR system: {hr_system}"
            )
        
        # Queue HR sync operation
        background_tasks.add_task(
            enterprise_service.sync_hr_system,
            hr_system,
            sync_config,
            current_user.id
        )
        
        # Log HR sync initiation
        await enterprise_service.log_audit_event(
            user_id=current_user.id,
            action="hr_sync_initiated",
            resource_type="hr_integration",
            resource_id=hr_system,
            details={"hr_system": hr_system, "sync_type": sync_config.get("sync_type", "full")}
        )
        
        return {
            "status": "sync_queued",
            "hr_system": hr_system,
            "estimated_completion": datetime.now() + timedelta(minutes=30)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HR sync failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"HR sync failed: {str(e)}"
        )

# Audit Logs
@router.get("/audit/logs", response_model=List[AuditLogEntry])
async def get_audit_logs(
    start_date: datetime,
    end_date: datetime,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions(["admin:audit", "read:audit"]))
):
    """Retrieve audit logs with filtering options"""
    try:
        filters = {
            "start_date": start_date,
            "end_date": end_date,
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "limit": limit,
            "offset": offset
        }
        
        audit_logs = await enterprise_service.get_audit_logs(filters)
        return audit_logs
        
    except Exception as e:
        logger.error(f"Failed to retrieve audit logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve audit logs: {str(e)}"
        )

# Data Export
@router.post("/export/data")
async def export_enterprise_data(
    export_config: Dict[str, Any],
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions(["admin:export"]))
):
    """Export enterprise data for external systems"""
    try:
        # Validate export configuration
        required_fields = ["data_types", "format", "destination"]
        for field in required_fields:
            if field not in export_config:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required field: {field}"
                )
        
        # Queue data export operation
        export_id = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        background_tasks.add_task(
            enterprise_service.export_data,
            export_id,
            export_config,
            current_user.id
        )
        
        # Log data export
        await enterprise_service.log_audit_event(
            user_id=current_user.id,
            action="data_export_initiated",
            resource_type="data_export",
            resource_id=export_id,
            details={"data_types": export_config["data_types"], "format": export_config["format"]}
        )
        
        return {
            "status": "export_queued",
            "export_id": export_id,
            "estimated_completion": datetime.now() + timedelta(hours=2)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Data export failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data export failed: {str(e)}"
        )

# White-labeling and Branding
@router.post("/branding/configure")
async def configure_branding(
    branding_config: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions(["admin:branding"]))
):
    """Configure custom branding and white-labeling"""
    try:
        result = await enterprise_service.configure_branding(branding_config)
        
        # Log branding configuration
        await enterprise_service.log_audit_event(
            user_id=current_user.id,
            action="branding_configured",
            resource_type="branding_config",
            resource_id="enterprise_branding",
            details={"theme": branding_config.get("theme"), "logo_updated": "logo_url" in branding_config}
        )
        
        return {"status": "success", "config_id": result.config_id}
        
    except Exception as e:
        logger.error(f"Branding configuration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Branding configuration failed: {str(e)}"
        )

# SLA Monitoring
@router.get("/sla/metrics", response_model=Dict[str, Any])
async def get_sla_metrics(
    period_days: int = 30,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions(["admin:sla", "read:sla"]))
):
    """Get SLA metrics and performance indicators"""
    try:
        sla_metrics = await enterprise_service.get_sla_metrics(period_days)
        return sla_metrics
        
    except Exception as e:
        logger.error(f"Failed to get SLA metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get SLA metrics: {str(e)}"
        )
