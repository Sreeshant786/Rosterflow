from datetime import date, timedelta
from typing import List, Dict, Set, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.employee import Employee, Pod
from app.models.brand import Brand, Process
from app.models.assignment import EmployeeAssignment
from app.models.operating_rule import OperatingRule
from app.models.availability import EmployeeAvailability, LeaveRequest, PublicHoliday
from app.models.roster import Roster, RosterEntry
from app.schemas.roster import ConflictOut, BackupSuggestion, ValidationSummary
from app.services.calendar_service import CalendarService

class ConflictEngine:
    def __init__(self, db: Session, roster_id: int):
        self.db = db
        self.roster_id = roster_id
        self.roster = db.query(Roster).filter(Roster.id == roster_id).first()
        if not self.roster:
            raise ValueError(f"Roster with ID {roster_id} does not exist")

        self.year = self.roster.year
        self.month = self.roster.month
        self.dates = CalendarService.get_month_dates(self.year, self.month)
        self.holidays = CalendarService.get_public_holidays_map(db, self.year, self.month)

    def validate(self) -> ValidationSummary:
        """
        Comprehensive multi-dimensional validation of the roster.
        Identifies critical violations, warnings, and suggests eligible backups.
        """
        conflicts: List[ConflictOut] = []

        # 1. Fetch reference data
        employees = {e.id: e for e in self.db.query(Employee).all()}
        brands = {b.id: b for b in self.db.query(Brand).all()}
        processes = {p.id: p for p in self.db.query(Process).all()}
        pods = {pd.id: pd for pd in self.db.query(Pod).all()}

        # Operating rules
        operating_rules = self.db.query(OperatingRule).all()
        rule_map = {(r.brand_id, r.process_id): r for r in operating_rules}

        # Active assignments: (emp_id, brand_id, process_id)
        valid_assignments = {
            (a.employee_id, a.brand_id, a.process_id)
            for a in self.db.query(EmployeeAssignment).filter(EmployeeAssignment.assignment_status == "active").all()
        }

        # Approved leaves
        start_date = self.dates[0]
        end_date = self.dates[-1]
        leaves = self.db.query(LeaveRequest).filter(
            LeaveRequest.approval_status == "APPROVED",
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        ).all()
        leave_map: Dict[Tuple[int, date], LeaveRequest] = {}
        for l in leaves:
            curr = max(l.start_date, start_date)
            fin = min(l.end_date, end_date)
            d = curr
            while d <= fin:
                leave_map[(l.employee_id, d)] = l
                d += timedelta(days=1)

        # Unavailabilities
        unavailabilities = self.db.query(EmployeeAvailability).filter(
            EmployeeAvailability.date >= start_date,
            EmployeeAvailability.date <= end_date,
            EmployeeAvailability.availability_status == "UNAVAILABLE"
        ).all()
        unavail_map: Dict[Tuple[int, date], EmployeeAvailability] = {
            (u.employee_id, u.date): u for u in unavailabilities
        }

        # All entries in this roster
        entries = self.db.query(RosterEntry).filter(RosterEntry.roster_id == self.roster_id).all()

        # Map date -> list of entries
        date_entries: Dict[date, List[RosterEntry]] = {}
        # Map (emp_id, date) -> list of entries
        emp_date_entries: Dict[Tuple[int, date], List[RosterEntry]] = {}

        for entry in entries:
            date_entries.setdefault(entry.work_date, []).append(entry)
            emp_date_entries.setdefault((entry.employee_id, entry.work_date), []).append(entry)

        # 2. Check Employee-Centric Conflicts
        # A. Duplicate / Overlapping Working shifts
        for (emp_id, d), emp_entries in emp_date_entries.items():
            working_entries = [e for e in emp_entries if e.status == "Working"]
            emp = employees.get(emp_id)
            emp_name = emp.full_name if emp else f"Employee #{emp_id}"

            if len(working_entries) > 1:
                conflicts.append(ConflictOut(
                    id=f"CONF-DUP-{emp_id}-{d.isoformat()}",
                    conflict_id=f"DUP-{emp_id}-{d.isoformat()}",
                    severity="CRITICAL",
                    conflict_type="DUPLICATE_ASSIGNMENT",
                    date=d,
                    affected_employee_id=emp_id,
                    affected_employee_name=emp_name,
                    expected_staffing=1,
                    actual_staffing=len(working_entries),
                    human_readable_explanation=f"{emp_name} has multiple overlapping working shifts scheduled on {d.strftime('%d %b %Y')}.",
                    suggested_resolution="Remove duplicate shift assignment or reassign one of the shifts to an available peer."
                ))

            # B. Working while on Approved Leave
            if working_entries and (emp_id, d) in leave_map:
                leave_obj = leave_map[(emp_id, d)]
                b_id = working_entries[0].brand_id
                p_id = working_entries[0].process_id
                b_name = brands[b_id].brand_name if b_id in brands else None
                p_name = processes[p_id].process_name if p_id in processes else None

                backups = self.find_backup_candidates(d, b_id, p_id, emp_id, emp_date_entries, leave_map, unavail_map)
                conflicts.append(ConflictOut(
                    id=f"CONF-LEAVE-{emp_id}-{d.isoformat()}",
                    conflict_id=f"LEAVE-{emp_id}-{d.isoformat()}",
                    severity="CRITICAL",
                    conflict_type="ASSIGNED_ON_LEAVE",
                    date=d,
                    brand_id=b_id,
                    brand_name=b_name,
                    process_id=p_id,
                    process_name=p_name,
                    affected_employee_id=emp_id,
                    affected_employee_name=emp_name,
                    expected_staffing=1,
                    actual_staffing=0,
                    human_readable_explanation=f"{emp_name} is assigned to work on {d.strftime('%d %b %Y')} despite having an approved {leave_obj.leave_type}.",
                    suggested_resolution=f"Assign an eligible backup resource or cancel the shift.",
                    suggested_backups=backups
                ))

            # C. Working while marked UNAVAILABLE
            if working_entries and (emp_id, d) in unavail_map:
                b_id = working_entries[0].brand_id
                p_id = working_entries[0].process_id
                b_name = brands[b_id].brand_name if b_id in brands else None
                p_name = processes[p_id].process_name if p_id in processes else None

                backups = self.find_backup_candidates(d, b_id, p_id, emp_id, emp_date_entries, leave_map, unavail_map)
                conflicts.append(ConflictOut(
                    id=f"CONF-UNAVAIL-{emp_id}-{d.isoformat()}",
                    conflict_id=f"UNAVAIL-{emp_id}-{d.isoformat()}",
                    severity="CRITICAL",
                    conflict_type="UNAVAILABLE_ASSIGNED",
                    date=d,
                    brand_id=b_id,
                    brand_name=b_name,
                    process_id=p_id,
                    process_name=p_name,
                    affected_employee_id=emp_id,
                    affected_employee_name=emp_name,
                    expected_staffing=1,
                    actual_staffing=0,
                    human_readable_explanation=f"{emp_name} is scheduled to work on {d.strftime('%d %b %Y')} but is recorded as UNAVAILABLE.",
                    suggested_resolution="Assign an eligible backup colleague to cover this required shift.",
                    suggested_backups=backups
                ))

            # D. Invalid brand / process assignment (employee not assigned to this brand-process)
            for w in working_entries:
                if w.brand_id and w.process_id and (emp_id, w.brand_id, w.process_id) not in valid_assignments:
                    b_name = brands[w.brand_id].brand_name if w.brand_id in brands else "Unknown"
                    p_name = processes[w.process_id].process_name if w.process_id in processes else "Unknown"
                    conflicts.append(ConflictOut(
                        id=f"CONF-INVASSIGN-{emp_id}-{w.brand_id}-{w.process_id}-{d.isoformat()}",
                        conflict_id=f"INVASSIGN-{emp_id}-{d.isoformat()}",
                        severity="WARNING",
                        conflict_type="INVALID_ASSIGNMENT",
                        date=d,
                        brand_id=w.brand_id,
                        brand_name=b_name,
                        process_id=w.process_id,
                        process_name=p_name,
                        affected_employee_id=emp_id,
                        affected_employee_name=emp_name,
                        expected_staffing=1,
                        actual_staffing=1,
                        human_readable_explanation=f"{emp_name} is scheduled for {b_name} ({p_name}) on {d.strftime('%d %b %Y')} without an active formal assignment.",
                        suggested_resolution="Add a formal employee assignment in Brand/Employee settings or reassign to an already mapped staff member."
                    ))

        # 3. Check Mandatory Brand-Process Coverage Conflicts
        for d in self.dates:
            day_entries = date_entries.get(d, [])
            working_day_entries = [e for e in day_entries if e.status == "Working"]

            for (b_id, p_id), rule in rule_map.items():
                is_operating = CalendarService.is_operational_day(rule, d, self.holidays)
                if not is_operating:
                    continue

                min_required = rule.minimum_staff_required
                b_name = brands[b_id].brand_name if b_id in brands else f"Brand #{b_id}"
                p_name = processes[p_id].process_name if p_id in processes else f"Process #{p_id}"

                # Count valid active working staff covering this specific brand and process
                actual_working = [
                    e for e in working_day_entries
                    if e.brand_id == b_id and e.process_id == p_id
                    # exclude any staff currently on leave or unavailable to avoid double-counting invalid assignments
                    and (e.employee_id, d) not in leave_map
                    and (e.employee_id, d) not in unavail_map
                ]
                actual_count = len(actual_working)

                if actual_count < min_required:
                    backups = self.find_backup_candidates(d, b_id, p_id, None, emp_date_entries, leave_map, unavail_map)
                    conflicts.append(ConflictOut(
                        id=f"CONF-COV-{b_id}-{p_id}-{d.isoformat()}",
                        conflict_id=f"COV-{b_id}-{p_id}-{d.isoformat()}",
                        severity="CRITICAL",
                        conflict_type="MISSING_COVERAGE" if actual_count == 0 else "INSUFFICIENT_STAFFING",
                        date=d,
                        brand_id=b_id,
                        brand_name=b_name,
                        process_id=p_id,
                        process_name=p_name,
                        affected_employee_id=None,
                        affected_employee_name=None,
                        expected_staffing=min_required,
                        actual_staffing=actual_count,
                        human_readable_explanation=f"Insufficient staffing for {b_name} — {p_name} on {d.strftime('%d %b %Y')}. Required: {min_required}, Available: {actual_count}.",
                        suggested_resolution=f"Assign {min_required - actual_count} eligible employee(s) to cover mandatory operational hours.",
                        suggested_backups=backups
                    ))

        # Sort conflicts: CRITICAL first, then chronologically
        severity_order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
        conflicts.sort(key=lambda c: (severity_order.get(c.severity, 3), c.date))

        crit_count = sum(1 for c in conflicts if c.severity == "CRITICAL")
        warn_count = sum(1 for c in conflicts if c.severity == "WARNING")
        info_count = sum(1 for c in conflicts if c.severity == "INFO")

        return ValidationSummary(
            total_conflicts=len(conflicts),
            critical_count=crit_count,
            warning_count=warn_count,
            info_count=info_count,
            is_valid_for_publication=(crit_count == 0),
            conflicts=conflicts
        )

    def find_backup_candidates(
        self,
        target_date: date,
        brand_id: Optional[int],
        process_id: Optional[int],
        exclude_emp_id: Optional[int],
        emp_date_entries: Dict[Tuple[int, date], List[RosterEntry]],
        leave_map: Dict[Tuple[int, date], LeaveRequest],
        unavail_map: Dict[Tuple[int, date], EmployeeAvailability]
    ) -> List[BackupSuggestion]:
        """
        Calculates eligible, available backup resources ranked by suitability.
        """
        suggestions: List[BackupSuggestion] = []
        employees = self.db.query(Employee).filter(Employee.active_status == True).all()

        # Query all active assignments
        all_assignments = self.db.query(EmployeeAssignment).filter(
            EmployeeAssignment.assignment_status == "active"
        ).all()
        emp_brand_names: Dict[int, List[str]] = {}
        emp_proc_ids: Dict[int, Set[int]] = {}
        emp_proc_names: Dict[int, List[str]] = {}
        for a in all_assignments:
            if a.brand:
                emp_brand_names.setdefault(a.employee_id, []).append(a.brand.brand_name)
            if a.process:
                emp_proc_ids.setdefault(a.employee_id, set()).add(a.process_id)
                emp_proc_names.setdefault(a.employee_id, []).append(a.process.process_name)

        for emp in employees:
            if exclude_emp_id and emp.id == exclude_emp_id:
                continue

            # Check hard disqualifiers
            if (emp.id, target_date) in leave_map:
                continue
            if (emp.id, target_date) in unavail_map:
                continue

            # Check current shift status on this date
            day_entries = emp_date_entries.get((emp.id, target_date), [])
            is_already_working = any(e.status == "Working" for e in day_entries)
            if is_already_working:
                continue # Cannot double book

            current_status = day_entries[0].status if day_entries else "Weekly Off"

            # Calculate suitability score
            score = 60 # Base score for any active employee
            reasons = []

            has_process_exp = process_id in emp_proc_ids.get(emp.id, set()) if process_id else False
            if has_process_exp:
                score += 30
                reasons.append("Experienced in this operational process")

            # Check weekly off preference
            if target_date.weekday() != emp.preferred_weekly_off:
                score += 10
                reasons.append("Non-preferred off day (readily available)")
            else:
                reasons.append("Preferred weekly off day (available for comp-off)")

            pod_name = emp.pod.pod_name if emp.pod else "General Pod"

            suggestions.append(BackupSuggestion(
                employee_id=emp.id,
                employee_code=emp.employee_code,
                employee_name=emp.full_name,
                pod_name=pod_name,
                assigned_brands=list(set(emp_brand_names.get(emp.id, [])))[:3],
                assigned_processes=list(set(emp_proc_names.get(emp.id, [])))[:3],
                current_shift_status=current_status,
                current_day_load=0,
                suitability_score=score,
                recommendation_reason=", ".join(reasons) or "Available workforce member"
            ))

        suggestions.sort(key=lambda s: -s.suitability_score)
        return suggestions[:5] # Top 5 best candidates
