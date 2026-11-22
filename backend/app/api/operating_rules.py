from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.operating_rule import OperatingRule
from app.schemas.brand import OperatingRuleCreate, OperatingRuleUpdate, OperatingRuleOut

router = APIRouter(prefix="/operating-rules", tags=["Operating Rules"])

@router.get("", response_model=List[OperatingRuleOut])
def get_rules(brand_id: int = None, process_id: int = None, db: Session = Depends(get_db)):
    query = db.query(OperatingRule)
    if brand_id:
        query = query.filter(OperatingRule.brand_id == brand_id)
    if process_id:
        query = query.filter(OperatingRule.process_id == process_id)
    rules = query.all()
    results = []
    for r in rules:
        results.append(OperatingRuleOut(
            id=r.id,
            brand_id=r.brand_id,
            brand_name=r.brand.brand_name if r.brand else "",
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
    return results

@router.post("", response_model=OperatingRuleOut)
def create_or_update_rule(payload: OperatingRuleCreate, db: Session = Depends(get_db)):
    existing = db.query(OperatingRule).filter(
        OperatingRule.brand_id == payload.brand_id,
        OperatingRule.process_id == payload.process_id
    ).first()

    if existing:
        for k, v in payload.dict().items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        r = existing
    else:
        r = OperatingRule(**payload.dict())
        db.add(r)
        db.commit()
        db.refresh(r)

    return OperatingRuleOut(
        id=r.id,
        brand_id=r.brand_id,
        brand_name=r.brand.brand_name if r.brand else "",
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
    )

@router.put("/{rule_id}", response_model=OperatingRuleOut)
def update_rule(rule_id: int, payload: OperatingRuleUpdate, db: Session = Depends(get_db)):
    r = db.query(OperatingRule).filter(OperatingRule.id == rule_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Operating rule not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return OperatingRuleOut(
        id=r.id,
        brand_id=r.brand_id,
        brand_name=r.brand.brand_name if r.brand else "",
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
    )
