from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.availability import EmployeeAvailability, LeaveRequest, PublicHoliday
from app.schemas.availability import (
    EmployeeAvailabilityCreate, EmployeeAvailabilityOut,
    LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestOut,
    PublicHolidayCreate, PublicHolidayOut
)

router = APIRouter(tags=["Availability & Leaves"])

# Availability endpoints
@router.get("/availability", response_model=List[EmployeeAvailabilityOut])
def get_availabilities(employee_id: int = None, db: Session = Depends(get_db)):
    q = db.query(EmployeeAvailability)
    if employee_id:
        q = q.filter(EmployeeAvailability.employee_id == employee_id)
    items = q.order_by(EmployeeAvailability.date.desc()).all()
    return [
        EmployeeAvailabilityOut(
            id=i.id,
            employee_id=i.employee_id,
            employee_name=i.employee.full_name if i.employee else "",
            date=i.date,
            availability_status=i.availability_status,
            note=i.note,
            created_at=i.created_at
        ) for i in items
    ]

@router.post("/availability", response_model=EmployeeAvailabilityOut)
def record_availability(payload: EmployeeAvailabilityCreate, db: Session = Depends(get_db)):
    existing = db.query(EmployeeAvailability).filter(
        EmployeeAvailability.employee_id == payload.employee_id,
        EmployeeAvailability.date == payload.date
    ).first()
    if existing:
        existing.availability_status = payload.availability_status
        existing.note = payload.note
        db.commit()
        db.refresh(existing)
        item = existing
    else:
        item = EmployeeAvailability(**payload.dict())
        db.add(item)
        db.commit()
        db.refresh(item)
    return EmployeeAvailabilityOut(
        id=item.id,
        employee_id=item.employee_id,
        employee_name=item.employee.full_name if item.employee else "",
        date=item.date,
        availability_status=item.availability_status,
        note=item.note,
        created_at=item.created_at
    )

# Leave endpoints
@router.get("/leaves", response_model=List[LeaveRequestOut])
def get_leaves(employee_id: int = None, status: str = None, db: Session = Depends(get_db)):
    q = db.query(LeaveRequest)
    if employee_id:
        q = q.filter(LeaveRequest.employee_id == employee_id)
    if status:
        q = q.filter(LeaveRequest.approval_status == status)
    leaves = q.order_by(LeaveRequest.start_date.desc()).all()
    return [
        LeaveRequestOut(
            id=l.id,
            employee_id=l.employee_id,
            employee_name=l.employee.full_name if l.employee else "",
            employee_code=l.employee.employee_code if l.employee else "",
            start_date=l.start_date,
            end_date=l.end_date,
            leave_type=l.leave_type,
            approval_status=l.approval_status,
            reason=l.reason,
            reviewed_by=l.reviewed_by,
            created_at=l.created_at
        ) for l in leaves
    ]

@router.post("/leaves", response_model=LeaveRequestOut)
def create_leave(payload: LeaveRequestCreate, db: Session = Depends(get_db)):
    l = LeaveRequest(**payload.dict())
    db.add(l)
    db.commit()
    db.refresh(l)
    return LeaveRequestOut(
        id=l.id,
        employee_id=l.employee_id,
        employee_name=l.employee.full_name if l.employee else "",
        employee_code=l.employee.employee_code if l.employee else "",
        start_date=l.start_date,
        end_date=l.end_date,
        leave_type=l.leave_type,
        approval_status=l.approval_status,
        reason=l.reason,
        reviewed_by=l.reviewed_by,
        created_at=l.created_at
    )

@router.put("/leaves/{leave_id}", response_model=LeaveRequestOut)
def update_leave_status(leave_id: int, payload: LeaveRequestUpdate, db: Session = Depends(get_db)):
    l = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not l:
        raise HTTPException(status_code=404, detail="Leave request not found")
    l.approval_status = payload.approval_status
    l.reviewed_by = payload.reviewed_by or "Operations Manager"
    db.commit()
    db.refresh(l)
    return LeaveRequestOut(
        id=l.id,
        employee_id=l.employee_id,
        employee_name=l.employee.full_name if l.employee else "",
        employee_code=l.employee.employee_code if l.employee else "",
        start_date=l.start_date,
        end_date=l.end_date,
        leave_type=l.leave_type,
        approval_status=l.approval_status,
        reason=l.reason,
        reviewed_by=l.reviewed_by,
        created_at=l.created_at
    )

# Public Holiday endpoints
@router.get("/holidays", response_model=List[PublicHolidayOut])
def get_holidays(db: Session = Depends(get_db)):
    return db.query(PublicHoliday).order_by(PublicHoliday.date).all()

@router.post("/holidays", response_model=PublicHolidayOut)
def create_holiday(payload: PublicHolidayCreate, db: Session = Depends(get_db)):
    existing = db.query(PublicHoliday).filter(PublicHoliday.date == payload.date).first()
    if existing:
        existing.holiday_name = payload.holiday_name
        db.commit()
        db.refresh(existing)
        return existing
    h = PublicHoliday(**payload.dict())
    db.add(h)
    db.commit()
    db.refresh(h)
    return h
