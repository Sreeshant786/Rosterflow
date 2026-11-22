from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class EmployeeAvailability(Base):
    __tablename__ = "employee_availabilities"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    availability_status = Column(String(50), nullable=False, default="AVAILABLE") # AVAILABLE, UNAVAILABLE, PREFERRED_OFF
    note = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="uq_emp_date_availability"),
    )

    # Relationships
    employee = relationship("Employee", back_populates="availabilities")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    leave_type = Column(String(50), nullable=False) # PLANNED_LEAVE, SICK_LEAVE, CASUAL_LEAVE, COMP_OFF
    approval_status = Column(String(50), default="PENDING", nullable=False) # PENDING, APPROVED, REJECTED
    reason = Column(Text, nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    employee = relationship("Employee", back_populates="leaves")


class PublicHoliday(Base):
    __tablename__ = "public_holidays"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    holiday_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
