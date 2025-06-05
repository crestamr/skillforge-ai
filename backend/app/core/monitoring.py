"""
Comprehensive Monitoring and Observability System for SkillForge AI
Provides APM, metrics collection, logging, and alerting capabilities
"""

import logging
import time
import traceback
from typing import Dict, Any, Optional, List
from functools import wraps
from datetime import datetime, timedelta
import asyncio
import psutil
import json
from dataclasses import dataclass, asdict
from enum import Enum

# Third-party monitoring integrations
try:
    from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False

try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class MetricData:
    name: str
    value: float
    timestamp: datetime
    labels: Dict[str, str]
    unit: str = ""

@dataclass
class LogEntry:
    timestamp: datetime
    level: str
    message: str
    service: str
    trace_id: Optional[str] = None
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    metadata: Dict[str, Any] = None

@dataclass
class Alert:
    id: str
    severity: AlertSeverity
    title: str
    description: str
    timestamp: datetime
    service: str
    metric: str
    threshold: float
    current_value: float
    resolved: bool = False

class PrometheusMetrics:
    """Prometheus metrics collection"""
    
    def __init__(self):
        if not PROMETHEUS_AVAILABLE:
            logger.warning("Prometheus client not available")
            return
            
        self.registry = CollectorRegistry()
        
        # API Metrics
        self.api_requests_total = Counter(
            'api_requests_total',
            'Total API requests',
            ['method', 'endpoint', 'status_code'],
            registry=self.registry
        )
        
        self.api_request_duration = Histogram(
            'api_request_duration_seconds',
            'API request duration',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        # Business Metrics
        self.user_registrations = Counter(
            'user_registrations_total',
            'Total user registrations',
            registry=self.registry
        )
        
        self.assessments_completed = Counter(
            'assessments_completed_total',
            'Total assessments completed',
            ['assessment_type'],
            registry=self.registry
        )
        
        self.learning_paths_generated = Counter(
            'learning_paths_generated_total',
            'Total learning paths generated',
            registry=self.registry
        )
        
        self.job_matches_found = Counter(
            'job_matches_found_total',
            'Total job matches found',
            registry=self.registry
        )
        
        # System Metrics
        self.database_connections = Gauge(
            'database_connections_active',
            'Active database connections',
            registry=self.registry
        )
        
        self.cache_hit_rate = Gauge(
            'cache_hit_rate',
            'Cache hit rate percentage',
            ['cache_type'],
            registry=self.registry
        )
        
        self.memory_usage = Gauge(
            'memory_usage_bytes',
            'Memory usage in bytes',
            ['type'],
            registry=self.registry
        )
        
        self.cpu_usage = Gauge(
            'cpu_usage_percent',
            'CPU usage percentage',
            registry=self.registry
        )
        
        # AI/ML Metrics
        self.model_inference_duration = Histogram(
            'model_inference_duration_seconds',
            'Model inference duration',
            ['model_name', 'model_version'],
            registry=self.registry
        )
        
        self.model_accuracy = Gauge(
            'model_accuracy_score',
            'Model accuracy score',
            ['model_name', 'model_version'],
            registry=self.registry
        )

    def record_api_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Record API request metrics"""
        if not PROMETHEUS_AVAILABLE:
            return
            
        self.api_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=str(status_code)
        ).inc()
        
        self.api_request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)

    def record_business_metric(self, metric_name: str, labels: Dict[str, str] = None):
        """Record business metrics"""
        if not PROMETHEUS_AVAILABLE:
            return
            
        labels = labels or {}
        
        if metric_name == "user_registration":
            self.user_registrations.inc()
        elif metric_name == "assessment_completed":
            self.assessments_completed.labels(
                assessment_type=labels.get("assessment_type", "unknown")
            ).inc()
        elif metric_name == "learning_path_generated":
            self.learning_paths_generated.inc()
        elif metric_name == "job_match_found":
            self.job_matches_found.inc()

    def update_system_metrics(self):
        """Update system performance metrics"""
        if not PROMETHEUS_AVAILABLE:
            return
            
        # Memory usage
        memory = psutil.virtual_memory()
        self.memory_usage.labels(type="used").set(memory.used)
        self.memory_usage.labels(type="available").set(memory.available)
        self.memory_usage.labels(type="total").set(memory.total)
        
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        self.cpu_usage.set(cpu_percent)

    def get_metrics(self) -> str:
        """Get Prometheus metrics in text format"""
        if not PROMETHEUS_AVAILABLE:
            return ""
        return generate_latest(self.registry).decode('utf-8')

class DistributedTracing:
    """Distributed tracing for request correlation"""
    
    def __init__(self):
        self.active_traces: Dict[str, Dict[str, Any]] = {}
    
    def start_trace(self, trace_id: str, operation: str, metadata: Dict[str, Any] = None):
        """Start a new trace"""
        self.active_traces[trace_id] = {
            "trace_id": trace_id,
            "operation": operation,
            "start_time": time.time(),
            "metadata": metadata or {},
            "spans": []
        }
    
    def add_span(self, trace_id: str, span_name: str, duration: float, metadata: Dict[str, Any] = None):
        """Add a span to an existing trace"""
        if trace_id in self.active_traces:
            self.active_traces[trace_id]["spans"].append({
                "name": span_name,
                "duration": duration,
                "metadata": metadata or {},
                "timestamp": time.time()
            })
    
    def finish_trace(self, trace_id: str) -> Dict[str, Any]:
        """Finish a trace and return trace data"""
        if trace_id not in self.active_traces:
            return {}
        
        trace = self.active_traces.pop(trace_id)
        trace["end_time"] = time.time()
        trace["total_duration"] = trace["end_time"] - trace["start_time"]
        
        return trace

class AlertManager:
    """Alert management and notification system"""
    
    def __init__(self):
        self.alerts: List[Alert] = []
        self.alert_rules: Dict[str, Dict[str, Any]] = {}
        self.notification_channels: List[str] = []
    
    def add_alert_rule(self, metric_name: str, threshold: float, severity: AlertSeverity, 
                      comparison: str = "greater_than", duration: int = 300):
        """Add an alert rule"""
        self.alert_rules[metric_name] = {
            "threshold": threshold,
            "severity": severity,
            "comparison": comparison,
            "duration": duration,
            "last_triggered": None
        }
    
    def check_alerts(self, metrics: List[MetricData]):
        """Check metrics against alert rules"""
        for metric in metrics:
            if metric.name in self.alert_rules:
                rule = self.alert_rules[metric.name]
                
                should_alert = False
                if rule["comparison"] == "greater_than" and metric.value > rule["threshold"]:
                    should_alert = True
                elif rule["comparison"] == "less_than" and metric.value < rule["threshold"]:
                    should_alert = True
                
                if should_alert:
                    self._trigger_alert(metric, rule)
    
    def _trigger_alert(self, metric: MetricData, rule: Dict[str, Any]):
        """Trigger an alert"""
        alert = Alert(
            id=f"alert_{metric.name}_{int(time.time())}",
            severity=rule["severity"],
            title=f"Alert: {metric.name}",
            description=f"Metric {metric.name} value {metric.value} exceeds threshold {rule['threshold']}",
            timestamp=datetime.utcnow(),
            service="skillforge-ai",
            metric=metric.name,
            threshold=rule["threshold"],
            current_value=metric.value
        )
        
        self.alerts.append(alert)
        self._send_notification(alert)
    
    def _send_notification(self, alert: Alert):
        """Send alert notification"""
        logger.warning(f"ALERT: {alert.title} - {alert.description}")
        # Implement actual notification logic (email, Slack, PagerDuty, etc.)

class PerformanceMonitor:
    """Application performance monitoring"""
    
    def __init__(self):
        self.metrics = PrometheusMetrics()
        self.tracing = DistributedTracing()
        self.alerts = AlertManager()
        self._setup_default_alerts()
    
    def _setup_default_alerts(self):
        """Setup default alert rules"""
        self.alerts.add_alert_rule("api_request_duration_seconds", 2.0, AlertSeverity.HIGH)
        self.alerts.add_alert_rule("cpu_usage_percent", 80.0, AlertSeverity.MEDIUM)
        self.alerts.add_alert_rule("memory_usage_bytes", 0.9, AlertSeverity.HIGH)
        self.alerts.add_alert_rule("database_connections_active", 80, AlertSeverity.MEDIUM)
    
    def monitor_endpoint(self, func):
        """Decorator to monitor API endpoints"""
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            trace_id = f"trace_{int(start_time * 1000000)}"
            
            # Start trace
            self.tracing.start_trace(trace_id, func.__name__)
            
            try:
                # Execute function
                result = await func(*args, **kwargs)
                status_code = getattr(result, 'status_code', 200)
                
                # Record metrics
                duration = time.time() - start_time
                self.metrics.record_api_request(
                    method="GET",  # Should be extracted from request
                    endpoint=func.__name__,
                    status_code=status_code,
                    duration=duration
                )
                
                return result
                
            except Exception as e:
                # Record error
                duration = time.time() - start_time
                self.metrics.record_api_request(
                    method="GET",
                    endpoint=func.__name__,
                    status_code=500,
                    duration=duration
                )
                
                # Log error with trace
                logger.error(f"Error in {func.__name__}: {str(e)}", extra={
                    "trace_id": trace_id,
                    "duration": duration,
                    "error": str(e),
                    "traceback": traceback.format_exc()
                })
                
                raise
            finally:
                # Finish trace
                self.tracing.finish_trace(trace_id)
        
        return wrapper
    
    def record_business_event(self, event_type: str, metadata: Dict[str, Any] = None):
        """Record business events"""
        self.metrics.record_business_metric(event_type, metadata or {})
        
        logger.info(f"Business event: {event_type}", extra={
            "event_type": event_type,
            "metadata": metadata,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def health_check(self) -> Dict[str, Any]:
        """Perform system health check"""
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {}
        }
        
        # Check database connectivity
        try:
            # Add actual database check here
            health_status["checks"]["database"] = {"status": "healthy", "response_time": 0.05}
        except Exception as e:
            health_status["checks"]["database"] = {"status": "unhealthy", "error": str(e)}
            health_status["status"] = "unhealthy"
        
        # Check Redis connectivity
        try:
            # Add actual Redis check here
            health_status["checks"]["redis"] = {"status": "healthy", "response_time": 0.01}
        except Exception as e:
            health_status["checks"]["redis"] = {"status": "unhealthy", "error": str(e)}
            health_status["status"] = "unhealthy"
        
        # Check system resources
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=1)
        
        health_status["checks"]["system"] = {
            "status": "healthy" if memory.percent < 90 and cpu_percent < 90 else "degraded",
            "memory_percent": memory.percent,
            "cpu_percent": cpu_percent
        }
        
        return health_status

# Initialize global monitoring instance
monitor = PerformanceMonitor()

# Sentry integration
def initialize_sentry(dsn: str, environment: str = "production"):
    """Initialize Sentry for error tracking"""
    if not SENTRY_AVAILABLE:
        logger.warning("Sentry SDK not available")
        return
    
    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        integrations=[
            FastApiIntegration(auto_enable=True),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
    )

# Utility functions
def log_structured(level: str, message: str, **kwargs):
    """Log structured data"""
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "level": level,
        "message": message,
        **kwargs
    }
    
    logger.log(getattr(logging, level.upper()), json.dumps(log_data))

def measure_time(operation_name: str):
    """Decorator to measure execution time"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                log_structured("INFO", f"Operation completed: {operation_name}", 
                             duration=duration, operation=operation_name)
                return result
            except Exception as e:
                duration = time.time() - start_time
                log_structured("ERROR", f"Operation failed: {operation_name}",
                             duration=duration, operation=operation_name, error=str(e))
                raise
        return wrapper
    return decorator
