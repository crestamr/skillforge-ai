"""
Custom exceptions for SkillForge AI
"""

from typing import Any, Dict, Optional


class SkillForgeException(Exception):
    """Base exception for SkillForge AI"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ValidationException(SkillForgeException):
    """Raised when data validation fails"""
    pass


class AuthenticationException(SkillForgeException):
    """Raised when authentication fails"""
    pass


class AuthorizationException(SkillForgeException):
    """Raised when authorization fails"""
    pass


class ResourceNotFoundException(SkillForgeException):
    """Raised when a requested resource is not found"""
    pass


class RateLimitException(SkillForgeException):
    """Raised when rate limit is exceeded"""
    
    def __init__(self, message: str, retry_after: int = 60, details: Optional[Dict[str, Any]] = None):
        self.retry_after = retry_after
        super().__init__(message, details)


class ServiceUnavailableException(SkillForgeException):
    """Raised when a service is temporarily unavailable"""
    pass


class DatabaseException(SkillForgeException):
    """Raised when database operations fail"""
    pass


class ExternalServiceException(SkillForgeException):
    """Raised when external service calls fail"""
    pass


class ConfigurationException(SkillForgeException):
    """Raised when configuration is invalid"""
    pass


class AIServiceException(SkillForgeException):
    """Raised when AI service operations fail"""
    pass


class FileProcessingException(SkillForgeException):
    """Raised when file processing fails"""
    pass


class SkillAssessmentException(SkillForgeException):
    """Raised when skill assessment operations fail"""
    pass


class JobMatchingException(SkillForgeException):
    """Raised when job matching operations fail"""
    pass


class LearningPathException(SkillForgeException):
    """Raised when learning path operations fail"""
    pass


class UserManagementException(SkillForgeException):
    """Raised when user management operations fail"""
    pass


class PaymentException(SkillForgeException):
    """Raised when payment operations fail"""
    pass


class NotificationException(SkillForgeException):
    """Raised when notification operations fail"""
    pass


class CacheException(SkillForgeException):
    """Raised when cache operations fail"""
    pass


class SecurityException(SkillForgeException):
    """Raised when security violations occur"""
    pass


class IntegrationException(SkillForgeException):
    """Raised when third-party integration fails"""
    pass


class DataProcessingException(SkillForgeException):
    """Raised when data processing operations fail"""
    pass


class ReportGenerationException(SkillForgeException):
    """Raised when report generation fails"""
    pass


class AnalyticsException(SkillForgeException):
    """Raised when analytics operations fail"""
    pass


class WorkflowException(SkillForgeException):
    """Raised when workflow operations fail"""
    pass


class TemplateException(SkillForgeException):
    """Raised when template operations fail"""
    pass


class SearchException(SkillForgeException):
    """Raised when search operations fail"""
    pass


class ImportExportException(SkillForgeException):
    """Raised when import/export operations fail"""
    pass


class VersioningException(SkillForgeException):
    """Raised when versioning operations fail"""
    pass


class ComplianceException(SkillForgeException):
    """Raised when compliance checks fail"""
    pass


class AuditException(SkillForgeException):
    """Raised when audit operations fail"""
    pass


class BackupException(SkillForgeException):
    """Raised when backup operations fail"""
    pass


class MaintenanceException(SkillForgeException):
    """Raised during maintenance operations"""
    pass


class CapacityException(SkillForgeException):
    """Raised when system capacity is exceeded"""
    pass


class PerformanceException(SkillForgeException):
    """Raised when performance thresholds are exceeded"""
    pass


class CompatibilityException(SkillForgeException):
    """Raised when compatibility issues occur"""
    pass


class LicenseException(SkillForgeException):
    """Raised when license validation fails"""
    pass


class EnvironmentException(SkillForgeException):
    """Raised when environment configuration is invalid"""
    pass


class DependencyException(SkillForgeException):
    """Raised when dependency requirements are not met"""
    pass


class MigrationException(SkillForgeException):
    """Raised when database migration fails"""
    pass


class TestingException(SkillForgeException):
    """Raised during testing operations"""
    pass


class DeploymentException(SkillForgeException):
    """Raised during deployment operations"""
    pass


class MonitoringException(SkillForgeException):
    """Raised when monitoring operations fail"""
    pass


class LoggingException(SkillForgeException):
    """Raised when logging operations fail"""
    pass


class MetricsException(SkillForgeException):
    """Raised when metrics collection fails"""
    pass


class HealthCheckException(SkillForgeException):
    """Raised when health check operations fail"""
    pass


class DocumentationException(SkillForgeException):
    """Raised when documentation operations fail"""
    pass


class LocalizationException(SkillForgeException):
    """Raised when localization operations fail"""
    pass


class AccessibilityException(SkillForgeException):
    """Raised when accessibility requirements are not met"""
    pass


class UsabilityException(SkillForgeException):
    """Raised when usability issues occur"""
    pass


class QualityException(SkillForgeException):
    """Raised when quality standards are not met"""
    pass


class StandardsException(SkillForgeException):
    """Raised when coding standards are violated"""
    pass


class OptimizationException(SkillForgeException):
    """Raised when optimization operations fail"""
    pass


class ScalingException(SkillForgeException):
    """Raised when scaling operations fail"""
    pass


class ResourceException(SkillForgeException):
    """Raised when resource allocation fails"""
    pass


class NetworkException(SkillForgeException):
    """Raised when network operations fail"""
    pass


class TimeoutException(SkillForgeException):
    """Raised when operations timeout"""
    pass


class ConcurrencyException(SkillForgeException):
    """Raised when concurrency issues occur"""
    pass


class SynchronizationException(SkillForgeException):
    """Raised when synchronization fails"""
    pass


class ConsistencyException(SkillForgeException):
    """Raised when data consistency is violated"""
    pass


class IntegrityException(SkillForgeException):
    """Raised when data integrity is violated"""
    pass


class CorruptionException(SkillForgeException):
    """Raised when data corruption is detected"""
    pass


class RecoveryException(SkillForgeException):
    """Raised when recovery operations fail"""
    pass


class DisasterException(SkillForgeException):
    """Raised during disaster recovery scenarios"""
    pass


class EmergencyException(SkillForgeException):
    """Raised during emergency situations"""
    pass


class CriticalException(SkillForgeException):
    """Raised for critical system failures"""
    pass


class FatalException(SkillForgeException):
    """Raised for fatal errors that require immediate attention"""
    pass
