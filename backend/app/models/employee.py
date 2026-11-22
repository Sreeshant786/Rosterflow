from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Pod(Base):
    __tablename__ = "pods"

    id = Column(Integer, primary_key=True, index=True)
    pod_name = Column(String(100), unique=True, nullable=False, index=True)
    pod_lead_id = Column(Integer, ForeignKey("employees.id", use_alter=True, name="fk_pod_lead"), nullable=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lead = relationship("Employee", foreign_keys=[pod_lead_id], post_update=True)
    members = relationship("Employee", foreign_keys="Employee.pod_id", back_populates="pod")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(20), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    pod_id = Column(Integer, ForeignKey("pods.id"), nullable=True, index=True)
    designation = Column(String(100), nullable=False)
    active_status = Column(Boolean, default=True, nullable=False)
    joining_date = Column(Date, nullable=False)
    preferred_weekly_off = Column(Integer, default=6) # 0=Monday, 6=Sunday
    max_consecutive_days = Column(Integer, default=6)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    pod = relationship("Pod", foreign_keys=[pod_id], back_populates="members")
    assignments = relationship("EmployeeAssignment", back_populates="employee", cascade="all, delete-orphan")
    availabilities = relationship("EmployeeAvailability", back_populates="employee", cascade="all, delete-orphan")
    leaves = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    roster_entries = relationship("RosterEntry", back_populates="employee")
