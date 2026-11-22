from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.employee import Employee, Pod
from app.models.assignment import EmployeeAssignment
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut, PodCreate, PodOut, AssignmentBrief

router = APIRouter(prefix="/employees", tags=["Employees"])

@router.get("", response_model=List[EmployeeOut])
def get_employees(
    search: Optional[str] = None,
    pod_id: Optional[int] = None,
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(Employee)
    if active_only:
        query = query.filter(Employee.active_status == True)
    if pod_id:
        query = query.filter(Employee.pod_id == pod_id)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Employee.full_name.ilike(search_filter)) |
            (Employee.employee_code.ilike(search_filter)) |
            (Employee.email.ilike(search_filter)) |
            (Employee.designation.ilike(search_filter))
        )
    employees = query.order_by(Employee.employee_code).all()

    result = []
    for emp in employees:
        assocs = []
        for a in emp.assignments:
            if a.assignment_status == "active":
                assocs.append(AssignmentBrief(
                    id=a.id,
                    brand_id=a.brand_id,
                    brand_name=a.brand.brand_name if a.brand else "",
                    process_id=a.process_id,
                    process_name=a.process.process_name if a.process else "",
                    is_primary=a.is_primary
                ))

        result.append(EmployeeOut(
            id=emp.id,
            employee_code=emp.employee_code,
            full_name=emp.full_name,
            email=emp.email,
            pod_id=emp.pod_id,
            pod_name=emp.pod.pod_name if emp.pod else None,
            designation=emp.designation,
            active_status=emp.active_status,
            joining_date=emp.joining_date,
            preferred_weekly_off=emp.preferred_weekly_off,
            max_consecutive_days=emp.max_consecutive_days,
            assignments=assocs,
            created_at=emp.created_at
        ))
    return result

@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    assocs = []
    for a in emp.assignments:
        if a.assignment_status == "active":
            assocs.append(AssignmentBrief(
                id=a.id,
                brand_id=a.brand_id,
                brand_name=a.brand.brand_name if a.brand else "",
                process_id=a.process_id,
                process_name=a.process.process_name if a.process else "",
                is_primary=a.is_primary
            ))

    return EmployeeOut(
        id=emp.id,
        employee_code=emp.employee_code,
        full_name=emp.full_name,
        email=emp.email,
        pod_id=emp.pod_id,
        pod_name=emp.pod.pod_name if emp.pod else None,
        designation=emp.designation,
        active_status=emp.active_status,
        joining_date=emp.joining_date,
        preferred_weekly_off=emp.preferred_weekly_off,
        max_consecutive_days=emp.max_consecutive_days,
        assignments=assocs,
        created_at=emp.created_at
    )

@router.post("", response_model=EmployeeOut)
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db)):
    existing = db.query(Employee).filter(
        (Employee.email == payload.email) | (Employee.employee_code == payload.employee_code)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee code or email already exists")

    emp = Employee(**payload.dict())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return EmployeeOut(
        id=emp.id,
        employee_code=emp.employee_code,
        full_name=emp.full_name,
        email=emp.email,
        pod_id=emp.pod_id,
        pod_name=emp.pod.pod_name if emp.pod else None,
        designation=emp.designation,
        active_status=emp.active_status,
        joining_date=emp.joining_date,
        preferred_weekly_off=emp.preferred_weekly_off,
        max_consecutive_days=emp.max_consecutive_days,
        assignments=[],
        created_at=emp.created_at
    )

@router.put("/{employee_id}", response_model=EmployeeOut)
def update_employee(employee_id: int, payload: EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(emp, k, v)

    db.commit()
    db.refresh(emp)
    return get_employee(employee_id, db)

@router.delete("/{employee_id}")
def deactivate_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.active_status = False
    db.commit()
    return {"status": "success", "message": f"Employee {emp.full_name} deactivated"}
