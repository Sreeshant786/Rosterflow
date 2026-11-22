from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.brand import Brand, Process
from app.models.assignment import EmployeeAssignment
from app.models.operating_rule import OperatingRule
from app.schemas.brand import BrandCreate, BrandUpdate, BrandOut, AssignedEmployeeBrief, OperatingRuleOut

router = APIRouter(prefix="/brands", tags=["Brands"])

@router.get("", response_model=List[BrandOut])
def get_brands(db: Session = Depends(get_db)):
    brands = db.query(Brand).all()
    results = []
    for b in brands:
        assigned = []
        for a in b.assignments:
            if a.assignment_status == "active" and a.employee and a.process:
                assigned.append(AssignedEmployeeBrief(
                    employee_id=a.employee_id,
                    employee_code=a.employee.employee_code,
                    full_name=a.employee.full_name,
                    process_id=a.process_id,
                    process_name=a.process.process_name,
                    is_primary=a.is_primary
                ))

        rules = []
        for r in b.operating_rules:
            rules.append(OperatingRuleOut(
                id=r.id,
                brand_id=r.brand_id,
                brand_name=b.brand_name,
                process_id=r.process_id,
                process_name=r.process.process_name if r.process else "",
                operating_type=r.operating_type,
                sunday_off=r.sunday_off,
                public_holiday_off=r.public_holiday_off,
                minimum_staff_required=r.minimum_staff_required,
                applicable_days=r.applicable_days,
                shift_start=r.shift_start,
                shift_end=r.shift_end,
                created_at=r.created_at
            ))

        results.append(BrandOut(
            id=b.id,
            brand_name=b.brand_name,
            description=b.description,
            active_status=b.active_status,
            assigned_employees=assigned,
            operating_rules=rules,
            created_at=b.created_at
        ))
    return results

@router.post("", response_model=BrandOut)
def create_brand(payload: BrandCreate, db: Session = Depends(get_db)):
    existing = db.query(Brand).filter(Brand.brand_name == payload.brand_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Brand with this name already exists")
    b = Brand(**payload.dict())
    db.add(b)
    db.commit()
    db.refresh(b)
    return BrandOut(
        id=b.id,
        brand_name=b.brand_name,
        description=b.description,
        active_status=b.active_status,
        assigned_employees=[],
        operating_rules=[],
        created_at=b.created_at
    )

@router.put("/{brand_id}", response_model=BrandOut)
def update_brand(brand_id: int, payload: BrandUpdate, db: Session = Depends(get_db)):
    b = db.query(Brand).filter(Brand.id == brand_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Brand not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return b
