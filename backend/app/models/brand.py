from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    brand_name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    active_status = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assignments = relationship("EmployeeAssignment", back_populates="brand", cascade="all, delete-orphan")
    operating_rules = relationship("OperatingRule", back_populates="brand", cascade="all, delete-orphan")
    roster_entries = relationship("RosterEntry", back_populates="brand")


class Process(Base):
    __tablename__ = "processes"

    id = Column(Integer, primary_key=True, index=True)
    process_name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assignments = relationship("EmployeeAssignment", back_populates="process", cascade="all, delete-orphan")
    operating_rules = relationship("OperatingRule", back_populates="process", cascade="all, delete-orphan")
    roster_entries = relationship("RosterEntry", back_populates="process")
