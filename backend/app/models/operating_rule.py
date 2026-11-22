from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class OperatingRule(Base):
    __tablename__ = "operating_rules"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False, index=True)
    process_id = Column(Integer, ForeignKey("processes.id"), nullable=False, index=True)
    operating_type = Column(String(50), nullable=False, default="EVERYDAY") # EVERYDAY, EVERYDAY_EXCEPT_HOLIDAYS, SUNDAYS_AND_HOLIDAYS_OFF
    sunday_off = Column(Boolean, default=False, nullable=False)
    public_holiday_off = Column(Boolean, default=False, nullable=False)
    minimum_staff_required = Column(Integer, default=1, nullable=False)
    applicable_days = Column(String(50), default="0,1,2,3,4,5,6", nullable=False) # comma-separated day integers 0=Mon, 6=Sun
    shift_start = Column(String(10), default="09:00", nullable=False)
    shift_end = Column(String(10), default="18:00", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("brand_id", "process_id", name="uq_brand_process_rule"),
    )

    # Relationships
    brand = relationship("Brand", back_populates="operating_rules")
    process = relationship("Process", back_populates="operating_rules")
