from datetime import date
from typing import List, Dict, Set, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.brand import Brand, Process
from app.models.assignment import EmployeeAssignment
from app.models.operating_rule import OperatingRule
from app.models.availability import EmployeeAvailability, LeaveRequest, PublicHoliday
from app.models.roster import Roster, RosterEntry, RosterChangeLog
from app.services.calendar_service import CalendarService

class SchedulingEngine:
    def __init__(self, db: Session, year: int, month: int):
        self.db = db
        self.year = year
        self.month = month
        self.dates = CalendarService.get_month_dates(year, month)
        self.holidays = CalendarService.get_public_holidays_map(db, year, month)

    def generate_roster(self, notes: Optional[str] = None) -> Roster:
        """
        Executes the deterministic roster scheduling algorithm.
        Creates or updates a Draft roster for the specified month and year.
        """
        # 1. Fetch or create the Roster record
        roster = self.db.query(Roster).filter(
            Roster.year == self.year,
            Roster.month == self.month
        ).first()

        if not roster:
            roster = Roster(
                year=self.year,
                month=self.month,
                status="Draft",
                notes=notes or f"Deterministic schedule generated for {self.month:02d}/{self.year}"
            )
            self.db.add(roster)
            self.db.flush()
        else:
            # Clear existing entries if regenerating
            self.db.query(RosterEntry).filter(RosterEntry.roster_id == roster.id).delete()
            roster.status = "Draft"
            roster.notes = notes or f"Regenerated schedule for {self.month:02d}/{self.year}"
            self.db.flush()

        # 2. Pre-fetch all active data
        employees = self.db.query(Employee).filter(Employee.active_status == True).all()
        employee_map = {e.id: e for e in employees}

        assignments = self.db.query(EmployeeAssignment).filter(
            EmployeeAssignment.assignment_status == "active"
        ).all()

        # Map (brand_id, process_id) -> list of assigned employee_ids
        brand_proc_to_employees: Dict[Tuple[int, int], List[int]] = {}
        # Map employee_id -> list of (brand_id, process_id)
        emp_to_assignments: Dict[int, List[Tuple[int, int]]] = {}
        for a in assignments:
            key = (a.brand_id, a.process_id)
            brand_proc_to_employees.setdefault(key, []).append(a.employee_id)
            emp_to_assignments.setdefault(a.employee_id, []).append(key)

        operating_rules = self.db.query(OperatingRule).all()
        # Map (brand_id, process_id) -> OperatingRule
        rule_map = {(r.brand_id, r.process_id): r for r in operating_rules}

        # Pre-fetch leaves in this month
        start_date = self.dates[0]
        end_date = self.dates[-1]
        leaves = self.db.query(LeaveRequest).filter(
            LeaveRequest.approval_status == "APPROVED",
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        ).all()
        # Map (emp_id, date) -> leave_type
        emp_leave_map: Dict[Tuple[int, date], str] = {}
        for l in leaves:
            curr = max(l.start_date, start_date)
            fin = min(l.end_date, end_date)
            d = curr
            from datetime import timedelta
            while d <= fin:
                emp_leave_map[(l.employee_id, d)] = l.leave_type
                d += timedelta(days=1)

        # Pre-fetch explicit availability entries
        availabilities = self.db.query(EmployeeAvailability).filter(
            EmployeeAvailability.date >= start_date,
            EmployeeAvailability.date <= end_date
        ).all()
        emp_avail_map: Dict[Tuple[int, date], str] = {
            (av.employee_id, av.date): av.availability_status for av in availabilities
        }

        # Track fairness & state across the month
        emp_shifts_count: Dict[int, int] = {e.id: 0 for e in employees}
        emp_consecutive_days: Dict[int, int] = {e.id: 0 for e in employees}

        created_entries: List[RosterEntry] = []

        # 3. Iterate date by date
        for d in self.dates:
            weekday = d.weekday()
            is_holiday = d in self.holidays

            # Track who worked on this date to enforce hard constraint #4 & #5
            working_on_date: Set[int] = set()

            # Find all required (brand_id, process_id) slots operational today
            operational_slots: List[Tuple[Tuple[int, int], OperatingRule, int]] = []
            for (b_id, p_id), rule in rule_map.items():
                if CalendarService.is_operational_day(rule, d, self.holidays):
                    operational_slots.append(((b_id, p_id), rule, rule.minimum_staff_required))

            # Heuristic / Priority: Sort operational slots so slots with FEWEST eligible available employees come first
            def slot_priority(item):
                (b_id, p_id), r, min_staff = item
                assigned_emp_ids = brand_proc_to_employees.get((b_id, p_id), [])
                # Count how many of these are available today
                avail_count = sum(
                    1 for eid in assigned_emp_ids
                    if (eid, d) not in emp_leave_map
                    and emp_avail_map.get((eid, d)) != "UNAVAILABLE"
                )
                return (avail_count, -min_staff)

            operational_slots.sort(key=slot_priority)

            # Assign employees to each operational slot
            for (b_id, p_id), rule, min_staff in operational_slots:
                eligible_emp_ids = brand_proc_to_employees.get((b_id, p_id), [])

                # Filter out employees who cannot work today (Hard constraints)
                available_candidates: List[int] = []
                for eid in eligible_emp_ids:
                    # Constraint 1 & 2: Approved leave / comp-off
                    if (eid, d) in emp_leave_map:
                        continue
                    # Constraint 3: Explicit unavailability
                    if emp_avail_map.get((eid, d)) == "UNAVAILABLE":
                        continue
                    # Constraint 4: Already working another shift today
                    if eid in working_on_date:
                        continue
                    available_candidates.append(eid)

                # Deterministic scoring for available candidates
                def candidate_score(eid: int):
                    emp = employee_map[eid]
                    # Soft constraint 1: Preferred weekly off (if today is preferred off, penalize score)
                    is_pref_off = (weekday == emp.preferred_weekly_off)
                    pref_off_penalty = 100 if is_pref_off else 0

                    # Soft constraint 2: Consecutive days limit
                    consec = emp_consecutive_days.get(eid, 0)
                    consec_penalty = 500 if consec >= emp.max_consecutive_days else consec * 10

                    # Soft constraint 3 & 4: Total shifts assigned this month (fairness)
                    shifts = emp_shifts_count.get(eid, 0)

                    # Return tuple for deterministic ordering: lowest penalty first, tie-break by eid
                    return (pref_off_penalty, consec_penalty, shifts, eid)

                available_candidates.sort(key=candidate_score)

                # Allocate up to min_staff
                num_to_assign = min(min_staff, len(available_candidates))
                assigned_for_slot = available_candidates[:num_to_assign]

                for eid in assigned_for_slot:
                    working_on_date.add(eid)
                    emp_shifts_count[eid] += 1
                    emp_consecutive_days[eid] += 1

                    entry = RosterEntry(
                        roster_id=roster.id,
                        employee_id=eid,
                        brand_id=b_id,
                        process_id=p_id,
                        work_date=d,
                        status="Working",
                        shift_start=rule.shift_start or "09:00",
                        shift_end=rule.shift_end or "18:00",
                        notes=f"Covering {rule.operating_type}"
                    )
                    created_entries.append(entry)

            # 4. For all employees NOT assigned to a Working shift today, determine their non-working status
            for eid, emp in employee_map.items():
                if eid in working_on_date:
                    continue

                # Reset consecutive work streak
                emp_consecutive_days[eid] = 0

                # Determine why they are not working
                # A. Approved Leave / Comp-Off
                if (eid, d) in emp_leave_map:
                    l_type = emp_leave_map[(eid, d)]
                    entry_status = "Comp-Off" if l_type == "COMP_OFF" else "Leave"
                    note = f"Approved {l_type}"
                # B. Explicit Unavailability
                elif emp_avail_map.get((eid, d)) == "UNAVAILABLE":
                    entry_status = "Unavailable"
                    note = "Marked unavailable"
                # C. Public Holiday
                elif is_holiday:
                    entry_status = "Public Holiday"
                    note = self.holidays[d]
                # D. Weekly Off / Rest Day
                else:
                    entry_status = "Weekly Off"
                    note = "Scheduled rest day"

                # If employee has a primary brand/process, associate it for context; otherwise None
                emp_assocs = emp_to_assignments.get(eid, [])
                primary_b = emp_assocs[0][0] if emp_assocs else None
                primary_p = emp_assocs[0][1] if emp_assocs else None

                entry = RosterEntry(
                    roster_id=roster.id,
                    employee_id=eid,
                    brand_id=primary_b,
                    process_id=primary_p,
                    work_date=d,
                    status=entry_status,
                    notes=note
                )
                created_entries.append(entry)

        # Batch insert entries
        self.db.bulk_save_objects(created_entries)
        self.db.commit()
        self.db.refresh(roster)
        return roster
