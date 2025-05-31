"""
Celery configuration for SkillForge AI
"""

from celery import Celery
import os

# Create Celery instance
celery_app = Celery(
    "skillforge",
    broker=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0"),
    include=["app.tasks"]
)

# Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Task routes
celery_app.conf.task_routes = {
    "app.tasks.skill_assessment.*": {"queue": "skill_assessment"},
    "app.tasks.job_matching.*": {"queue": "job_matching"},
    "app.tasks.ai_processing.*": {"queue": "ai_processing"},
}

if __name__ == "__main__":
    celery_app.start()
