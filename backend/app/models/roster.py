from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Roster(Base):
    __tablename__ = "rosters"

    id = Column(Integer, primary_key=True, index=True)
    month = Column(Integer, nullable=False, index=True) # 1-12
    year = Column(Integer, nullable=False, index=True)
    status = Column(String(50), default="Draft", nullable=False) # Draft, Pending Approval, Published
    generated_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    published_by = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("month", "year", name="uq_roster_month_year"),
    )

    # Relationships
    entries = relationship("RosterEntry", back_populates="roster", cascade="all, delete-orphan")
    changelogs = relationship("RosterChangeLog", back_populates="roster", cascade="all, delete-orphan")


class RosterEntry(Base):
    __tablename__ = "roster_entries"

    id = Column(Integer, primary_key=True, index=True)
    roster_id = Column(Integer, ForeignKey("rosters.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True, index=True)
    process_id = Column(Integer, ForeignKey("processes.id"), nullable=True, index=True)
    work_date = Column(Date, nullable=False, index=True)
    status = Column(String(50), nullable=False) # Working, Weekly Off, Public Holiday, Leave, Comp-Off, Unavailable
    shift_start = Column(String(10), nullable=True)
    shift_end = Column(String(10), nullable=True)
    notes = Column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint("roster_id", "employee_id", "work_date", "brand_id", "process_id", name="uq_roster_emp_date_brand_process"),
    )

    # Relationships
    roster = relationship("Roster", back_populates="entries")
    employee = relationship("Employee", back_populates="roster_entries")
    brand = relationship("Brand", back_populates="roster_entries")
    process = relationship("Process", back_populates="roster_entries")


class RosterChangeLog(Base):
    __tablename__ = "roster_changelogs"

    id = Column(Integer, primary_key=True, index=True)
    roster_id = Column(Integer, ForeignKey("rosters.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    changed_date = Column(Date, nullable=False, index=True)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    old_brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True)
    new_brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True)
    old_process_id = Column(Integer, ForeignKey("processes.id"), nullable=True)
    new_process_id = Column(Integer, ForeignKey("processes.id"), nullable=True)
    reason = Column(Text, nullable=False)
    changed_by = Column(String(100), default="Operations Manager", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    roster = relationship("Roster", back_populates="changelogs")
    employee = relationship("Employee")
    old_brand = relationship("Brand", foreign_keys=[old_brand_id])
    new_brand = relationship("Brand", foreign_keys=[new_brand_id])
    old_process = relationship("Process", foreign_keys=[old_process_id])
    new_process = relationship("Process", foreign_keys=[new_process_id])
