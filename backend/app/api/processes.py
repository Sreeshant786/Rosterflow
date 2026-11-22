from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.brand import Process
from app.models.assignment import EmployeeAssignment
from app.schemas.brand import ProcessCreate, ProcessOut

router = APIRouter(prefix="/processes", tags=["Processes"])

@router.get("", response_model=List[ProcessOut])
def get_processes(db: Session = Depends(get_db)):
    procs = db.query(Process).all()
    results = []
    for p in procs:
        emp_cnt = db.query(EmployeeAssignment).filter(
            EmployeeAssignment.process_id == p.id,
            EmployeeAssignment.assignment_status == "active"
        ).count()
        results.append(ProcessOut(
            id=p.id,
            process_name=p.process_name,
            description=p.description,
            assigned_employee_count=emp_cnt,
            created_at=p.created_at
        ))
    return results

@router.post("", response_model=ProcessOut)
def create_process(payload: ProcessCreate, db: Session = Depends(get_db)):
    existing = db.query(Process).filter(Process.process_name == payload.process_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Process with this name already exists")
    p = Process(**payload.dict())
    db.add(p)
    db.commit()
    db.refresh(p)
    return ProcessOut(
        id=p.id,
        process_name=p.process_name,
        description=p.description,
        assigned_employee_count=0,
        created_at=p.created_at
    )
