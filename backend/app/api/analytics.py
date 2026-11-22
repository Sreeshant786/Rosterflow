from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from typing import Dict, Any, List
from app.core.database import get_db
from app.models.employee import Employee, Pod
from app.models.brand import Brand, Process
from app.models.operating_rule import OperatingRule
from app.models.availability import LeaveRequest
from app.models.roster import Roster, RosterEntry, RosterChangeLog
from app.services.conflict_engine import ConflictEngine

router = APIRouter(prefix="/analytics", tags=["Analytics & Dashboard"])

@router.get("/dashboard")
def get_dashboard_data(db: Session = Depends(get_db)) -> Dict[str, Any]:
    total_employees = db.query(Employee).filter(Employee.active_status == True).count()
    active_brands = db.query(Brand).filter(Brand.active_status == True).count()
    operational_pods = db.query(Pod).count()
    total_processes = db.query(Process).count()

    latest_roster = db.query(Roster).order_by(Roster.year.desc(), Roster.month.desc()).first()

    coverage_rate = 100.0
    critical_conflicts = 0
    warnings = 0
    roster_status = "Not Generated"
    roster_id = None
    month_name = None

    if latest_roster:
        roster_id = latest_roster.id
        roster_status = latest_roster.status
        month_name = f"{date(latest_roster.year, latest_roster.month, 1).strftime('%B %Y')}"
        validator = ConflictEngine(db, latest_roster.id)
        summary = validator.validate()
        critical_conflicts = summary.critical_count
        warnings = summary.warning_count

        total_working_entries = db.query(RosterEntry).filter(
            RosterEntry.roster_id == latest_roster.id,
            RosterEntry.status == "Working"
        ).count()
        total_slots = total_working_entries + critical_conflicts
        if total_slots > 0:
            coverage_rate = round((total_working_entries / total_slots) * 100, 1)

    # Upcoming leaves
    today = date.today()
    upcoming_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.end_date >= today
    ).order_by(LeaveRequest.start_date.asc()).limit(5).all()

    leaves_out = []
    for l in upcoming_leaves:
        leaves_out.append({
            "id": l.id,
            "employee_name": l.employee.full_name if l.employee else "Unknown",
            "leave_type": l.leave_type,
            "start_date": l.start_date.isoformat(),
            "end_date": l.end_date.isoformat(),
            "approval_status": l.approval_status
        })

    # Recent roster changelogs
    recent_logs = db.query(RosterChangeLog).order_by(
        RosterChangeLog.created_at.desc()
    ).limit(6).all()

    logs_out = []
    for log in recent_logs:
        logs_out.append({
            "id": log.id,
            "employee_name": log.employee.full_name if log.employee else "Staff",
            "changed_date": log.changed_date.isoformat(),
            "old_status": log.old_status,
            "new_status": log.new_status,
            "reason": log.reason,
            "changed_by": log.changed_by,
            "created_at": log.created_at.isoformat()
        })

    # Pod workforce distribution for charts
    pod_stats = []
    for p in db.query(Pod).all():
        cnt = db.query(Employee).filter(Employee.pod_id == p.id, Employee.active_status == True).count()
        pod_stats.append({
            "name": p.pod_name.replace(" Pod", ""),
            "members": cnt
        })

    # Operating rule distribution
    rule_counts = {"EVERYDAY": 0, "EVERYDAY_EXCEPT_HOLIDAYS": 0, "SUNDAYS_AND_HOLIDAYS_OFF": 0}
    for r in db.query(OperatingRule).all():
        op = r.operating_type or "EVERYDAY"
        rule_counts[op] = rule_counts.get(op, 0) + 1

    rule_stats = [
        {"name": "Everyday (365d)", "value": rule_counts["EVERYDAY"], "color": "#0ea5e9"},
        {"name": "No Holidays", "value": rule_counts["EVERYDAY_EXCEPT_HOLIDAYS"], "color": "#6366f1"},
        {"name": "Mon-Sat (Off Sun/Hol)", "value": rule_counts["SUNDAYS_AND_HOLIDAYS_OFF"], "color": "#10b981"},
    ]

    return {
        "kpis": {
            "total_employees": total_employees,
            "active_brands": active_brands,
            "operational_pods": operational_pods,
            "total_processes": total_processes,
            "roster_status": roster_status,
            "roster_month": month_name,
            "roster_id": roster_id,
            "coverage_percentage": coverage_rate,
            "critical_conflicts": critical_conflicts,
            "warning_conflicts": warnings
        },
        "upcoming_leaves": leaves_out,
        "recent_changelogs": logs_out,
        "pod_distribution": pod_stats,
        "rule_distribution": rule_stats
    }
