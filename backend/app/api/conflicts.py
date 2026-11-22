from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.roster import Roster
from app.schemas.roster import ValidationSummary
from app.services.conflict_engine import ConflictEngine

router = APIRouter(prefix="/conflicts", tags=["Conflicts"])

@router.get("", response_model=ValidationSummary)
def get_conflicts(roster_id: Optional[int] = None, db: Session = Depends(get_db)):
    if roster_id:
        target_roster = db.query(Roster).filter(Roster.id == roster_id).first()
    else:
        target_roster = db.query(Roster).order_by(Roster.year.desc(), Roster.month.desc()).first()

    if not target_roster:
        return ValidationSummary(
            total_conflicts=0,
            critical_count=0,
            warning_count=0,
            info_count=0,
            is_valid_for_publication=True,
            conflicts=[]
        )

    validator = ConflictEngine(db, target_roster.id)
    return validator.validate()
