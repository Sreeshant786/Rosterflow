from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class EmployeeAssignment(Base):
    __tablename__ = "employee_assignments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False, index=True)
    process_id = Column(Integer, ForeignKey("processes.id"), nullable=False, index=True)
    assignment_status = Column(String(20), default="active", nullable=False) # "active", "inactive"
    is_primary = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("employee_id", "brand_id", "process_id", name="uq_emp_brand_process"),
    )

    # Relationships
    employee = relationship("Employee", back_populates="assignments")
    brand = relationship("Brand", back_populates="assignments")
    process = relationship("Process", back_populates="assignments")
