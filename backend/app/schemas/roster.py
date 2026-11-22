from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime

class RosterGenerateRequest(BaseModel):
    month: int # 1 - 12
    year: int

class RosterPublishRequest(BaseModel):
    published_by: str = "Operations Lead"
    notes: Optional[str] = None

class RosterEntryOut(BaseModel):
    id: int
    roster_id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    pod_id: Optional[int] = None
    pod_name: Optional[str] = None
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    process_id: Optional[int] = None
    process_name: Optional[str] = None
    work_date: date
    status: str # Working, Weekly Off, Public Holiday, Leave, Comp-Off, Unavailable
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class RosterEntryUpdate(BaseModel):
    employee_id: Optional[int] = None
    brand_id: Optional[int] = None
    process_id: Optional[int] = None
    status: str
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None
    reason: str
    changed_by: Optional[str] = "Operations Manager"

class RosterChangeLogOut(BaseModel):
    id: int
    roster_id: int
    employee_id: int
    employee_name: Optional[str] = None
    changed_date: date
    old_status: Optional[str] = None
    new_status: str
    old_brand_name: Optional[str] = None
    new_brand_name: Optional[str] = None
    old_process_name: Optional[str] = None
    new_process_name: Optional[str] = None
    reason: str
    changed_by: str
    created_at: datetime

    class Config:
        from_attributes = True

class BackupSuggestion(BaseModel):
    employee_id: int
    employee_code: str
    employee_name: str
    pod_name: Optional[str] = None
    assigned_brands: List[str] = []
    assigned_processes: List[str] = []
    current_shift_status: Optional[str] = None
    current_day_load: int = 0
    suitability_score: int = 100
    recommendation_reason: str

class ConflictOut(BaseModel):
    id: str
    conflict_id: str
    severity: str # CRITICAL, WARNING, INFO
    conflict_type: str # MISSING_COVERAGE, INSUFFICIENT_STAFFING, ASSIGNED_ON_LEAVE, etc.
    date: date
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    process_id: Optional[int] = None
    process_name: Optional[str] = None
    affected_employee_id: Optional[int] = None
    affected_employee_name: Optional[str] = None
    expected_staffing: int = 1
    actual_staffing: int = 0
    human_readable_explanation: str
    suggested_resolution: str
    suggested_backups: List[BackupSuggestion] = []

class ValidationSummary(BaseModel):
    total_conflicts: int
    critical_count: int
    warning_count: int
    info_count: int
    is_valid_for_publication: bool
    conflicts: List[ConflictOut]

class RosterSummary(BaseModel):
    total_shifts_scheduled: int = 0
    coverage_rate: float = 0.0 # Percentage (e.g., 98.5)
    unassigned_operating_slots: int = 0
    critical_conflicts: int = 0
    warning_conflicts: int = 0

class RosterOut(BaseModel):
    id: int
    month: int
    year: int
    status: str # Draft, Pending Approval, Published
    generated_at: datetime
    published_at: Optional[datetime] = None
    published_by: Optional[str] = None
    notes: Optional[str] = None
    total_entries: int = 0
    validation: Optional[ValidationSummary] = None

    class Config:
        from_attributes = True
