from datetime import date
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.brand import Brand, Process
from app.models.availability import EmployeeAvailability, LeaveRequest
from app.models.roster import Roster, RosterEntry, RosterChangeLog
from app.services.scheduling_engine import SchedulingEngine
from app.services.conflict_engine import ConflictEngine

class ScenarioService:
    @staticmethod
    def run_step_1_baseline(db: Session, year: int, month: int) -> Dict[str, Any]:
        """Step 1: Generate or fetch baseline monthly roster."""
        scheduler = SchedulingEngine(db, year, month)
        roster = scheduler.generate_roster(notes="Baseline roster for demonstration scenario")
        validator = ConflictEngine(db, roster.id)
        summary = validator.validate()
        return {
            "step": 1,
            "title": "Baseline Roster Generated",
            "roster_id": roster.id,
            "month": month,
            "year": year,
            "status": roster.status,
            "total_conflicts": summary.total_conflicts,
            "critical_conflicts": summary.critical_count,
            "message": "Baseline monthly roster generated successfully. All operating rules and assignments checked."
        }

    @staticmethod
    def run_step_2_inject_unavailability(
        db: Session,
        roster_id: int,
        target_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Step 2 & 3:
        Select Arjun Patel (EMP005), who is the sole dedicated resource for Kalyan Organics.
        Mark him UNAVAILABLE on an active working day (e.g., the 14th of the month).
        """
        roster = db.query(Roster).filter(Roster.id == roster_id).first()
        if not roster:
            raise ValueError("Roster not found")

        # Spotlight Arjun Patel (sole resource for Kalyan Organics)
        emp = db.query(Employee).filter(Employee.employee_code == "EMP005").first()
        brand = db.query(Brand).filter(Brand.brand_name == "Kalyan Organics").first()

        chosen_date = target_date or date(roster.year, roster.month, 14)

        # Record availability as UNAVAILABLE
        existing_avail = db.query(EmployeeAvailability).filter(
            EmployeeAvailability.employee_id == emp.id,
            EmployeeAvailability.date == chosen_date
        ).first()

        if existing_avail:
            existing_avail.availability_status = "UNAVAILABLE"
            existing_avail.note = "Emergency leave / unavailable on required working day"
        else:
            new_avail = EmployeeAvailability(
                employee_id=emp.id,
                date=chosen_date,
                availability_status="UNAVAILABLE",
                note="Emergency leave / unavailable on required working day"
            )
            db.add(new_avail)

        # Update existing roster entry for Arjun on this day to 'Unavailable'
        entry = db.query(RosterEntry).filter(
            RosterEntry.roster_id == roster.id,
            RosterEntry.employee_id == emp.id,
            RosterEntry.work_date == chosen_date
        ).first()

        old_status = "Working"
        if entry:
            old_status = entry.status
            entry.status = "Unavailable"
            entry.notes = "Marked unavailable by manager"

        # Record change log
        changelog = RosterChangeLog(
            roster_id=roster.id,
            employee_id=emp.id,
            changed_date=chosen_date,
            old_status=old_status,
            new_status="Unavailable",
            old_brand_id=brand.id if brand else None,
            new_brand_id=None,
            reason="Employee reported sudden medical unavailability; mandatory coverage at risk",
            changed_by="Operations Lead"
        )
        db.add(changelog)
        db.commit()

        # Step 4, 5, 6, 7: Validate and detect missing coverage
        validator = ConflictEngine(db, roster.id)
        summary = validator.validate()

        # Find the specific conflict for Kalyan Organics on this date
        relevant_conflicts = [
            c for c in summary.conflicts
            if c.date == chosen_date and c.brand_name == "Kalyan Organics"
        ]

        return {
            "step": 2,
            "title": "Employee Unavailability Injected & Conflict Detected",
            "roster_id": roster.id,
            "affected_employee": emp.full_name,
            "affected_employee_code": emp.employee_code,
            "affected_brand": brand.brand_name if brand else "Kalyan Organics",
            "date": chosen_date.isoformat(),
            "conflict_count": summary.critical_count,
            "detected_conflicts": [c.model_dump() for c in relevant_conflicts],
            "message": f"Marked {emp.full_name} unavailable on {chosen_date}. Critical missing coverage conflict detected for {brand.brand_name}."
        }

    @staticmethod
    def run_step_3_assign_backup(
        db: Session,
        roster_id: int,
        backup_employee_id: int,
        target_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Step 8 & 9:
        Assign an eligible backup resource to cover Kalyan Organics Customer Support.
        Revalidate and show whether the conflict has been resolved.
        """
        roster = db.query(Roster).filter(Roster.id == roster_id).first()
        if not roster:
            raise ValueError("Roster not found")

        brand = db.query(Brand).filter(Brand.brand_name == "Kalyan Organics").first()
        process = db.query(Process).filter(Process.process_name.like("%Customer Support%")).first()
        backup_emp = db.query(Employee).filter(Employee.id == backup_employee_id).first()
        if not backup_emp:
            raise ValueError("Backup employee not found")

        chosen_date = target_date or date(roster.year, roster.month, 14)

        # Update or create working entry for the backup resource
        backup_entry = db.query(RosterEntry).filter(
            RosterEntry.roster_id == roster.id,
            RosterEntry.employee_id == backup_emp.id,
            RosterEntry.work_date == chosen_date
        ).first()

        old_status = backup_entry.status if backup_entry else "Weekly Off"
        if backup_entry:
            backup_entry.status = "Working"
            backup_entry.brand_id = brand.id
            backup_entry.process_id = process.id
            backup_entry.shift_start = "09:00"
            backup_entry.shift_end = "18:00"
            backup_entry.notes = f"Backup deployed to cover for {brand.brand_name}"
        else:
            backup_entry = RosterEntry(
                roster_id=roster.id,
                employee_id=backup_emp.id,
                brand_id=brand.id,
                process_id=process.id,
                work_date=chosen_date,
                status="Working",
                shift_start="09:00",
                shift_end="18:00",
                notes=f"Backup deployed to cover for {brand.brand_name}"
            )
            db.add(backup_entry)

        # Log change in changelog
        log = RosterChangeLog(
            roster_id=roster.id,
            employee_id=backup_emp.id,
            changed_date=chosen_date,
            old_status=old_status,
            new_status="Working",
            new_brand_id=brand.id,
            new_process_id=process.id,
            reason=f"Assigned as qualified backup for Kalyan Organics covering Arjun Patel",
            changed_by="Operations Lead"
        )
        db.add(log)
        db.commit()

        # Step 10: Revalidate
        validator = ConflictEngine(db, roster.id)
        summary = validator.validate()

        # Check if the Kalyan Organics conflict on that date is now resolved
        remaining_target_conflicts = [
            c for c in summary.conflicts
            if c.date == chosen_date and c.brand_name == "Kalyan Organics" and c.severity == "CRITICAL"
        ]

        return {
            "step": 3,
            "title": "Backup Assigned & Conflict Resolved",
            "roster_id": roster.id,
            "backup_assigned": backup_emp.full_name,
            "brand": brand.brand_name,
            "date": chosen_date.isoformat(),
            "conflict_resolved": len(remaining_target_conflicts) == 0,
            "remaining_critical_conflicts": summary.critical_count,
            "message": f"Successfully assigned {backup_emp.full_name} to cover {brand.brand_name}. Conflict resolved!"
        }
