from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProcessBase(BaseModel):
    process_name: str
    description: Optional[str] = None

class ProcessCreate(ProcessBase):
    pass

class ProcessOut(ProcessBase):
    id: int
    assigned_employee_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class OperatingRuleBase(BaseModel):
    brand_id: int
    process_id: int
    operating_type: str = "EVERYDAY" # EVERYDAY, EVERYDAY_EXCEPT_HOLIDAYS, SUNDAYS_AND_HOLIDAYS_OFF
    sunday_off: bool = False
    public_holiday_off: bool = False
    minimum_staff_required: int = 1
    applicable_days: str = "0,1,2,3,4,5,6"
    shift_start: str = "09:00"
    shift_end: str = "18:00"

class OperatingRuleCreate(OperatingRuleBase):
    pass

class OperatingRuleUpdate(BaseModel):
    operating_type: Optional[str] = None
    sunday_off: Optional[bool] = None
    public_holiday_off: Optional[bool] = None
    minimum_staff_required: Optional[int] = None
    applicable_days: Optional[str] = None
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None

class OperatingRuleOut(OperatingRuleBase):
    id: int
    brand_name: Optional[str] = None
    process_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BrandBase(BaseModel):
    brand_name: str
    description: Optional[str] = None
    active_status: bool = True

class BrandCreate(BrandBase):
    pass

class BrandUpdate(BaseModel):
    brand_name: Optional[str] = None
    description: Optional[str] = None
    active_status: Optional[bool] = None

class AssignedEmployeeBrief(BaseModel):
    employee_id: int
    employee_code: str
    full_name: str
    process_id: int
    process_name: str
    is_primary: bool

class BrandOut(BrandBase):
    id: int
    assigned_employees: List[AssignedEmployeeBrief] = []
    operating_rules: List[OperatingRuleOut] = []
    created_at: datetime

    class Config:
        from_attributes = True


class EmployeeAssignmentCreate(BaseModel):
    employee_id: int
    brand_id: int
    process_id: int
    assignment_status: str = "active"
    is_primary: bool = True

class EmployeeAssignmentOut(EmployeeAssignmentCreate):
    id: int
    employee_name: Optional[str] = None
    brand_name: Optional[str] = None
    process_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
