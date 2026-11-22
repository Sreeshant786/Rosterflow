from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.assignment import EmployeeAssignment
from app.schemas.brand import EmployeeAssignmentCreate, EmployeeAssignmentOut

router = APIRouter(prefix="/assignments", tags=["Assignments"])

@router.get("", response_model=List[EmployeeAssignmentOut])
def get_assignments(employee_id: int = None, brand_id: int = None, db: Session = Depends(get_db)):
    query = db.query(EmployeeAssignment)
    if employee_id:
        query = query.filter(EmployeeAssignment.employee_id == employee_id)
    if brand_id:
        query = query.filter(EmployeeAssignment.brand_id == brand_id)

    assignments = query.all()
    results = []
    for a in assignments:
        results.append(EmployeeAssignmentOut(
            id=a.id,
            employee_id=a.employee_id,
            employee_name=a.employee.full_name if a.employee else "",
            brand_id=a.brand_id,
            brand_name=a.brand.brand_name if a.brand else "",
            process_id=a.process_id,
            process_name=a.process.process_name if a.process else "",
            assignment_status=a.assignment_status,
            is_primary=a.is_primary,
            created_at=a.created_at
        ))
    return results

@router.post("", response_model=EmployeeAssignmentOut)
def create_assignment(payload: EmployeeAssignmentCreate, db: Session = Depends(get_db)):
    existing = db.query(EmployeeAssignment).filter(
        EmployeeAssignment.employee_id == payload.employee_id,
        EmployeeAssignment.brand_id == payload.brand_id,
        EmployeeAssignment.process_id == payload.process_id
    ).first()

    if existing:
        existing.assignment_status = "active"
        existing.is_primary = payload.is_primary
        db.commit()
        db.refresh(existing)
        a = existing
    else:
        a = EmployeeAssignment(**payload.dict())
        db.add(a)
        db.commit()
        db.refresh(a)

    return EmployeeAssignmentOut(
        id=a.id,
        employee_id=a.employee_id,
        employee_name=a.employee.full_name if a.employee else "",
        brand_id=a.brand_id,
        brand_name=a.brand.brand_name if a.brand else "",
        process_id=a.process_id,
        process_name=a.process.process_name if a.process else "",
        assignment_status=a.assignment_status,
        is_primary=a.is_primary,
        created_at=a.created_at
    )

@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    a = db.query(EmployeeAssignment).filter(EmployeeAssignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(a)
    db.commit()
    return {"status": "success", "message": "Assignment deleted"}
