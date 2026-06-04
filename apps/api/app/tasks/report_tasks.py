from app.services.report_service import generate_report_sync
from app.tasks.celery_app import celery_app


@celery_app.task(name="generate_report")
def generate_report_task(submission_id: str) -> None:
    generate_report_sync(submission_id)
