from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class EmployeeAvailabilityCreate(BaseModel):
    employee_id: int
    date: date
    availability_status: str = "UNAVAILABLE" # AVAILABLE, UNAVAILABLE, PREFERRED_OFF
    note: Optional[str] = None

class EmployeeAvailabilityOut(EmployeeAvailabilityCreate):
    id: int
    employee_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LeaveRequestCreate(BaseModel):
    employee_id: int
    start_date: date
    end_date: date
    leave_type: str = "PLANNED_LEAVE" # PLANNED_LEAVE, SICK_LEAVE, CASUAL_LEAVE, COMP_OFF
    approval_status: str = "APPROVED" # PENDING, APPROVED, REJECTED
    reason: Optional[str] = None

class LeaveRequestUpdate(BaseModel):
    approval_status: str # PENDING, APPROVED, REJECTED
    reviewed_by: Optional[str] = "Operations Manager"

class LeaveRequestOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    start_date: date
    end_date: date
    leave_type: str
    approval_status: str
    reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PublicHolidayCreate(BaseModel):
    date: date
    holiday_name: str

class PublicHolidayOut(PublicHolidayCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
