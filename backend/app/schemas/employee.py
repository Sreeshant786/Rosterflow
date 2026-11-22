from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class PodBase(BaseModel):
    pod_name: str
    pod_lead_id: Optional[int] = None
    description: Optional[str] = None

class PodCreate(PodBase):
    pass

class PodOut(PodBase):
    id: int
    lead_name: Optional[str] = None
    member_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class EmployeeBase(BaseModel):
    employee_code: str
    full_name: str
    email: str
    pod_id: Optional[int] = None
    designation: str
    active_status: bool = True
    joining_date: date
    preferred_weekly_off: int = 6 # 0=Monday, 6=Sunday
    max_consecutive_days: int = 6

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    pod_id: Optional[int] = None
    designation: Optional[str] = None
    active_status: Optional[bool] = None
    joining_date: Optional[date] = None
    preferred_weekly_off: Optional[int] = None
    max_consecutive_days: Optional[int] = None

class AssignmentBrief(BaseModel):
    id: int
    brand_id: int
    brand_name: str
    process_id: int
    process_name: str
    is_primary: bool

class EmployeeOut(EmployeeBase):
    id: int
    pod_name: Optional[str] = None
    assignments: List[AssignmentBrief] = []
    created_at: datetime

    class Config:
        from_attributes = True
