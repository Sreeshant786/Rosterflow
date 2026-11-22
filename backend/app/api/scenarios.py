from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import date
from app.core.database import get_db
from app.models.roster import Roster
from app.services.scenario_service import ScenarioService
from app.services.seed_data import seed_database

router = APIRouter(prefix="/scenarios", tags=["Demonstration Scenarios"])

@router.post("/step1")
def scenario_step_1(
    month: int = Body(default=date.today().month),
    year: int = Body(default=date.today().year),
    db: Session = Depends(get_db)
):
    """Step 1: Generates baseline monthly roster."""
    return ScenarioService.run_step_1_baseline(db, year, month)

@router.post("/step2")
def scenario_step_2(
    roster_id: int = Body(...),
    target_date: Optional[str] = Body(None),
    db: Session = Depends(get_db)
):
    """Step 2: Injects unavailability for Arjun Patel (Kalyan Organics) & detects conflict."""
    parsed_date = date.fromisoformat(target_date) if target_date else None
    return ScenarioService.run_step_2_inject_unavailability(db, roster_id, parsed_date)

@router.post("/step3")
def scenario_step_3(
    roster_id: int = Body(...),
    backup_employee_id: int = Body(...),
    target_date: Optional[str] = Body(None),
    brand_id: Optional[int] = Body(None),
    process_id: Optional[int] = Body(None),
    db: Session = Depends(get_db)
):
    """Step 3: Assigns eligible backup resource to the selected brand/process/date."""
    parsed_date = date.fromisoformat(target_date) if target_date else None
    return ScenarioService.run_step_3_assign_backup(
        db, roster_id, backup_employee_id, parsed_date, brand_id, process_id
    )

@router.post("/reset")
def reset_seed(db: Session = Depends(get_db)):
    """Resets database with fresh realistic sample data."""
    return seed_database(db, force=True)
