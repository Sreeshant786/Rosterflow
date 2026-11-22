from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from app.core.database import get_db
from app.models.roster import Roster, RosterEntry, RosterChangeLog
from app.models.employee import Employee
from app.models.brand import Brand, Process
from app.schemas.roster import (
    RosterGenerateRequest, RosterOut, RosterEntryOut,
    RosterEntryUpdate, RosterChangeLogOut, RosterPublishRequest,
    ValidationSummary
)
from app.services.scheduling_engine import SchedulingEngine
from app.services.conflict_engine import ConflictEngine

router = APIRouter(prefix="/rosters", tags=["Rosters"])

@router.get("", response_model=List[RosterOut])
def get_rosters(db: Session = Depends(get_db)):
    rosters = db.query(Roster).order_by(Roster.year.desc(), Roster.month.desc()).all()
    results = []
    for r in rosters:
        cnt = db.query(RosterEntry).filter(RosterEntry.roster_id == r.id).count()
        results.append(RosterOut(
            id=r.id,
            month=r.month,
            year=r.year,
            status=r.status,
            generated_at=r.generated_at,
            published_at=r.published_at,
            published_by=r.published_by,
            notes=r.notes,
            total_entries=cnt
        ))
    return results

@router.post("/generate", response_model=RosterOut)
def generate_roster(payload: RosterGenerateRequest, db: Session = Depends(get_db)):
    if payload.month < 1 or payload.month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")

    existing_published = db.query(Roster).filter(
        Roster.month == payload.month,
        Roster.year == payload.year,
        Roster.status == "Published"
    ).first()
    if existing_published:
        raise HTTPException(
            status_code=400,
            detail=f"A published roster already exists for {payload.month:02d}/{payload.year}. Published rosters cannot be overwritten."
        )

    scheduler = SchedulingEngine(db, payload.year, payload.month)
    roster = scheduler.generate_roster()

    validator = ConflictEngine(db, roster.id)
    summary = validator.validate()

    entry_count = db.query(RosterEntry).filter(RosterEntry.roster_id == roster.id).count()
    return RosterOut(
        id=roster.id,
        month=roster.month,
        year=roster.year,
        status=roster.status,
        generated_at=roster.generated_at,
        published_at=roster.published_at,
        published_by=roster.published_by,
        notes=roster.notes,
        total_entries=entry_count,
        validation=summary
    )

@router.get("/{roster_id}", response_model=RosterOut)
def get_roster(roster_id: int, validate: bool = True, db: Session = Depends(get_db)):
    r = db.query(Roster).filter(Roster.id == roster_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Roster not found")

    summary = None
    if validate:
        validator = ConflictEngine(db, r.id)
        summary = validator.validate()

    cnt = db.query(RosterEntry).filter(RosterEntry.roster_id == r.id).count()
    return RosterOut(
        id=r.id,
        month=r.month,
        year=r.year,
        status=r.status,
        generated_at=r.generated_at,
        published_at=r.published_at,
        published_by=r.published_by,
        notes=r.notes,
        total_entries=cnt,
        validation=summary
    )

@router.get("/{roster_id}/entries", response_model=List[RosterEntryOut])
def get_roster_entries(
    roster_id: int,
    work_date: Optional[date] = None,
    pod_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    process_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = Query(default=1000, le=2000),
    db: Session = Depends(get_db)
):
    query = db.query(RosterEntry).filter(RosterEntry.roster_id == roster_id)
    if work_date:
        query = query.filter(RosterEntry.work_date == work_date)
    if employee_id:
        query = query.filter(RosterEntry.employee_id == employee_id)
    if brand_id:
        query = query.filter(RosterEntry.brand_id == brand_id)
    if process_id:
        query = query.filter(RosterEntry.process_id == process_id)
    if status:
        query = query.filter(RosterEntry.status == status)
    if pod_id:
        query = query.join(Employee, RosterEntry.employee_id == Employee.id).filter(Employee.pod_id == pod_id)

    entries = query.order_by(RosterEntry.work_date, RosterEntry.employee_id).limit(limit).all()
    results = []
    for e in entries:
        results.append(RosterEntryOut(
            id=e.id,
            roster_id=e.roster_id,
            employee_id=e.employee_id,
            employee_name=e.employee.full_name if e.employee else "",
            employee_code=e.employee.employee_code if e.employee else "",
            pod_id=e.employee.pod_id if e.employee else None,
            pod_name=e.employee.pod.pod_name if e.employee and e.employee.pod else None,
            brand_id=e.brand_id,
            brand_name=e.brand.brand_name if e.brand else None,
            process_id=e.process_id,
            process_name=e.process.process_name if e.process else None,
            work_date=e.work_date,
            status=e.status,
            shift_start=e.shift_start,
            shift_end=e.shift_end,
            notes=e.notes
        ))
    return results

@router.put("/{roster_id}/entries/{entry_id}", response_model=RosterEntryOut)
def update_roster_entry(
    roster_id: int,
    entry_id: int,
    payload: RosterEntryUpdate,
    db: Session = Depends(get_db)
):
    entry = db.query(RosterEntry).filter(
        RosterEntry.id == entry_id,
        RosterEntry.roster_id == roster_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Roster entry not found")

    # Record change in changelog
    old_status = entry.status
    old_b_id = entry.brand_id
    old_p_id = entry.process_id

    # Update entry fields
    entry.status = payload.status
    if payload.employee_id is not None:
        entry.employee_id = payload.employee_id
    if payload.brand_id is not None:
        entry.brand_id = payload.brand_id
    if payload.process_id is not None:
        entry.process_id = payload.process_id
    if payload.shift_start is not None:
        entry.shift_start = payload.shift_start
    if payload.shift_end is not None:
        entry.shift_end = payload.shift_end
    entry.notes = payload.reason

    changelog = RosterChangeLog(
        roster_id=roster_id,
        employee_id=entry.employee_id,
        changed_date=entry.work_date,
        old_status=old_status,
        new_status=entry.status,
        old_brand_id=old_b_id,
        new_brand_id=entry.brand_id,
        old_process_id=old_p_id,
        new_process_id=entry.process_id,
        reason=payload.reason,
        changed_by=payload.changed_by or "Operations Manager"
    )
    db.add(changelog)
    db.commit()
    db.refresh(entry)

    return RosterEntryOut(
        id=entry.id,
        roster_id=entry.roster_id,
        employee_id=entry.employee_id,
        employee_name=entry.employee.full_name if entry.employee else "",
        employee_code=entry.employee.employee_code if entry.employee else "",
        pod_id=entry.employee.pod_id if entry.employee else None,
        pod_name=entry.employee.pod.pod_name if entry.employee and entry.employee.pod else None,
        brand_id=entry.brand_id,
        brand_name=entry.brand.brand_name if entry.brand else None,
        process_id=entry.process_id,
        process_name=entry.process.process_name if entry.process else None,
        work_date=entry.work_date,
        status=entry.status,
        shift_start=entry.shift_start,
        shift_end=entry.shift_end,
        notes=entry.notes
    )

@router.get("/{roster_id}/validate", response_model=ValidationSummary)
def validate_roster(roster_id: int, db: Session = Depends(get_db)):
    validator = ConflictEngine(db, roster_id)
    return validator.validate()

@router.post("/{roster_id}/publish", response_model=RosterOut)
def publish_roster(roster_id: int, payload: RosterPublishRequest, db: Session = Depends(get_db)):
    r = db.query(Roster).filter(Roster.id == roster_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Roster not found")

    # Run conflict detection to enforce Publication Restriction requirement
    validator = ConflictEngine(db, roster_id)
    summary = validator.validate()

    if summary.critical_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Publication blocked! Roster has {summary.critical_count} critical conflict(s). All mandatory hard constraints must be resolved before publication."
        )

    r.status = "Published"
    r.published_at = datetime.utcnow()
    r.published_by = payload.published_by
    if payload.notes:
        r.notes = payload.notes
    db.commit()
    db.refresh(r)

    cnt = db.query(RosterEntry).filter(RosterEntry.roster_id == r.id).count()
    return RosterOut(
        id=r.id,
        month=r.month,
        year=r.year,
        status=r.status,
        generated_at=r.generated_at,
        published_at=r.published_at,
        published_by=r.published_by,
        notes=r.notes,
        total_entries=cnt,
        validation=summary
    )

@router.get("/{roster_id}/changelogs", response_model=List[RosterChangeLogOut])
def get_changelogs(roster_id: int, db: Session = Depends(get_db)):
    logs = db.query(RosterChangeLog).filter(
        RosterChangeLog.roster_id == roster_id
    ).order_by(RosterChangeLog.created_at.desc()).all()

    return [
        RosterChangeLogOut(
            id=l.id,
            roster_id=l.roster_id,
            employee_id=l.employee_id,
            employee_name=l.employee.full_name if l.employee else "",
            changed_date=l.changed_date,
            old_status=l.old_status,
            new_status=l.new_status,
            old_brand_name=l.old_brand.brand_name if l.old_brand else None,
            new_brand_name=l.new_brand.brand_name if l.new_brand else None,
            old_process_name=l.old_process.process_name if l.old_process else None,
            new_process_name=l.new_process.process_name if l.new_process else None,
            reason=l.reason,
            changed_by=l.changed_by,
            created_at=l.created_at
        ) for l in logs
    ]
