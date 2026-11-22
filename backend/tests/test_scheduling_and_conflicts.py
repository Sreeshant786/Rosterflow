import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.employee import Employee, Pod
from app.models.brand import Brand, Process
from app.models.assignment import EmployeeAssignment
from app.models.operating_rule import OperatingRule
from app.models.availability import EmployeeAvailability, LeaveRequest, PublicHoliday
from app.models.roster import Roster, RosterEntry, RosterChangeLog
from app.services.scheduling_engine import SchedulingEngine
from app.services.conflict_engine import ConflictEngine
from app.services.calendar_service import CalendarService
from app.services.scenario_service import ScenarioService
from app.services.seed_data import seed_database

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db, force=True)
    yield db
    db.close()

def test_1_everyday_operating_schedule(test_db):
    """1. Test Everyday Operating Schedule: Brand operates Mon-Sun including holidays."""
    rule = OperatingRule(operating_type="EVERYDAY", applicable_days="0,1,2,3,4,5,6")
    holidays = {date(2026, 11, 1): "Diwali"}
    # Should operate on Sunday and on Holiday
    assert CalendarService.is_operational_day(rule, date(2026, 11, 1), holidays) is True
    assert CalendarService.is_operational_day(rule, date(2026, 11, 2), holidays) is True

def test_2_sundays_and_public_holidays_off(test_db):
    """2. Test SUNDAYS_AND_HOLIDAYS_OFF operating rule."""
    rule = OperatingRule(operating_type="SUNDAYS_AND_HOLIDAYS_OFF", applicable_days="0,1,2,3,4,5")
    holidays = {date(2026, 11, 15): "Guru Nanak Jayanti"} # Sunday or holiday
    # Sunday is off
    assert CalendarService.is_operational_day(rule, date(2026, 11, 1), holidays) is False # Sunday
    # Holiday is off
    assert CalendarService.is_operational_day(rule, date(2026, 11, 15), holidays) is False
    # Regular weekday is operational
    assert CalendarService.is_operational_day(rule, date(2026, 11, 3), holidays) is True

def test_3_holiday_specific_exceptions(test_db):
    """3. Test EVERYDAY_EXCEPT_HOLIDAYS operating rule."""
    rule = OperatingRule(operating_type="EVERYDAY_EXCEPT_HOLIDAYS", applicable_days="0,1,2,3,4,5,6")
    holidays = {date(2026, 11, 15): "Holiday"}
    assert CalendarService.is_operational_day(rule, date(2026, 11, 15), holidays) is False
    assert CalendarService.is_operational_day(rule, date(2026, 11, 14), holidays) is True

def test_4_approved_leaves_respected(test_db):
    """4. Test that an employee on approved leave is never scheduled to work."""
    scheduler = SchedulingEngine(test_db, 2026, 11)
    roster = scheduler.generate_roster()
    # EMP008 (Kavya Menon) has approved leave on Nov 10, 11, 12
    emp = test_db.query(Employee).filter(Employee.employee_code == "EMP008").first()
    entries = test_db.query(RosterEntry).filter(
        RosterEntry.roster_id == roster.id,
        RosterEntry.employee_id == emp.id,
        RosterEntry.work_date.in_([date(2026, 11, 10), date(2026, 11, 11), date(2026, 11, 12)])
    ).all()
    for e in entries:
        assert e.status == "Leave"
        assert e.status != "Working"

def test_5_weekly_offs_and_unavailability(test_db):
    """5. Test that employee explicit unavailability is respected as non-working."""
    scheduler = SchedulingEngine(test_db, 2026, 11)
    roster = scheduler.generate_roster()
    # EMP010 (Meera Joshi) has UNAVAILABLE on Nov 25
    emp = test_db.query(Employee).filter(Employee.employee_code == "EMP010").first()
    entry = test_db.query(RosterEntry).filter(
        RosterEntry.roster_id == roster.id,
        RosterEntry.employee_id == emp.id,
        RosterEntry.work_date == date(2026, 11, 25)
    ).first()
    assert entry is not None
    assert entry.status == "Unavailable"

def test_6_minimum_staffing_validation(test_db):
    """6. Test minimum staffing detection when required staff is unmet."""
    scheduler = SchedulingEngine(test_db, 2026, 11)
    roster = scheduler.generate_roster()
    validator = ConflictEngine(test_db, roster.id)
    summary = validator.validate()
    # Conflicts are identified and have clear explanations
    assert summary.total_conflicts > 0
    cov_conflicts = [c for c in summary.conflicts if c.conflict_type in ("MISSING_COVERAGE", "INSUFFICIENT_STAFFING")]
    assert len(cov_conflicts) > 0
    assert cov_conflicts[0].expected_staffing >= 1

def test_7_single_resource_brand_coverage(test_db):
    """7. Test single resource brand coverage and gap identification on unavailability."""
    scheduler = SchedulingEngine(test_db, 2026, 11)
    roster = scheduler.generate_roster()
    # Arjun Patel handles Kalyan Organics
    emp = test_db.query(Employee).filter(Employee.employee_code == "EMP005").first()
    brand = test_db.query(Brand).filter(Brand.brand_name == "Kalyan Organics").first()
    working_days = test_db.query(RosterEntry).filter(
        RosterEntry.roster_id == roster.id,
        RosterEntry.employee_id == emp.id,
        RosterEntry.brand_id == brand.id,
        RosterEntry.status == "Working"
    ).count()
    assert working_days > 20

def test_8_multi_resource_brand_coverage(test_db):
    """8. Test multi-resource brand coverage where multiple employees handle different processes."""
    scheduler = SchedulingEngine(test_db, 2026, 11)
    roster = scheduler.generate_roster()
    bsc = test_db.query(Brand).filter(Brand.brand_name == "Bombay Shaving Co.").first()
    entries = test_db.query(RosterEntry).filter(
        RosterEntry.roster_id == roster.id,
        RosterEntry.brand_id == bsc.id,
        RosterEntry.status == "Working"
    ).all()
    assigned_processes = {e.process_id for e in entries}
    # Multiple processes staffed independently
    assert len(assigned_processes) >= 2

def test_9_employees_assigned_to_multiple_brands(test_db):
    """9. Test employee assigned to multiple brands."""
    emp = test_db.query(Employee).filter(Employee.employee_code == "EMP031").first()
    assert len(emp.assignments) >= 2

def test_10_duplicate_assignment_detection(test_db):
    """10. Test that overlapping / duplicate working shifts on different brands are detected as critical conflicts."""
    scheduler = SchedulingEngine(test_db, 2026, 11)
    roster = scheduler.generate_roster()
    # Manually insert two working shifts for an employee on the same date across different brands
    emp = test_db.query(Employee).filter(Employee.employee_code == "EMP001").first()
    b1 = test_db.query(Brand).first()
    b2 = test_db.query(Brand).offset(1).first()
    p = test_db.query(Process).first()
    test_db.add(RosterEntry(
        roster_id=roster.id,
        employee_id=emp.id,
        brand_id=b1.id,
        process_id=p.id,
        work_date=date(2026, 11, 5),
        status="Working"
    ))
    test_db.add(RosterEntry(
        roster_id=roster.id,
        employee_id=emp.id,
        brand_id=b2.id,
        process_id=p.id,
        work_date=date(2026, 11, 5),
        status="Working"
    ))
    test_db.commit()

    validator = ConflictEngine(test_db, roster.id)
    summary = validator.validate()
    dup_conflicts = [c for c in summary.conflicts if c.conflict_type == "DUPLICATE_ASSIGNMENT"]
    assert len(dup_conflicts) > 0
    assert dup_conflicts[0].severity == "CRITICAL"

def test_11_overlapping_responsibilities_handled(test_db):
    """11. Test that scheduling engine prevents overlapping shifts on the same day."""
    scheduler = SchedulingEngine(test_db, 2026, 11)
    roster = scheduler.generate_roster()
    # Verify no employee has two "Working" shifts on the exact same date
    entries = test_db.query(RosterEntry).filter(
        RosterEntry.roster_id == roster.id,
        RosterEntry.status == "Working"
    ).all()
    emp_date_pairs = [(e.employee_id, e.work_date) for e in entries]
    assert len(emp_date_pairs) == len(set(emp_date_pairs))

def test_12_changes_in_employee_availability(test_db):
    """12. Test Scenario Step 2: Employee unavailability injection."""
    scheduler = SchedulingEngine(test_db, 2026, 11)
    roster = scheduler.generate_roster()
    res = ScenarioService.run_step_2_inject_unavailability(test_db, roster.id, date(2026, 11, 14))
    assert res["step"] == 2
    assert len(res["detected_conflicts"]) > 0
    assert res["detected_conflicts"][0]["suggested_backups"] is not None

def test_13_manual_roster_modification_and_resolution(test_db):
    """13. Test Scenario Step 3: Manual assignment of backup resolves conflict."""
    scheduler = SchedulingEngine(test_db, 2026, 11)
    roster = scheduler.generate_roster()
    step2 = ScenarioService.run_step_2_inject_unavailability(test_db, roster.id, date(2026, 11, 14))
    backup_id = step2["detected_conflicts"][0]["suggested_backups"][0]["employee_id"]
    step3 = ScenarioService.run_step_3_assign_backup(test_db, roster.id, backup_id, date(2026, 11, 14))
    assert step3["step"] == 3
    assert step3["conflict_resolved"] is True
    # Verify changelog was recorded
    log = test_db.query(RosterChangeLog).filter(
        RosterChangeLog.roster_id == roster.id,
        RosterChangeLog.changed_date == date(2026, 11, 14)
    ).first()
    assert log is not None

def test_14_unresolvable_coverage_conflict_explanation(test_db):
    """14. Test that conflicts provide human-readable explanations and suggested resolutions."""
    scheduler = SchedulingEngine(test_db, 2026, 11)
    roster = scheduler.generate_roster()
    validator = ConflictEngine(test_db, roster.id)
    summary = validator.validate()
    for c in summary.conflicts:
        assert len(c.human_readable_explanation) > 10
        assert len(c.suggested_resolution) > 5

def test_15_publication_restrictions(test_db):
    """15. Test that publication is blocked when critical conflicts exist."""
    scheduler = SchedulingEngine(test_db, 2026, 11)
    roster = scheduler.generate_roster()
    validator = ConflictEngine(test_db, roster.id)
    summary = validator.validate()
    # When critical conflicts exist, is_valid_for_publication must be False
    if summary.critical_count > 0:
        assert summary.is_valid_for_publication is False
