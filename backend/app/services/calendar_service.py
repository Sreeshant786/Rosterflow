import calendar
from datetime import date, timedelta
from typing import List, Dict, Set
from sqlalchemy.orm import Session
from app.models.availability import PublicHoliday
from app.models.operating_rule import OperatingRule

class CalendarService:
    @staticmethod
    def get_month_dates(year: int, month: int) -> List[date]:
        """Returns all dates in the specified month in chronological order."""
        num_days = calendar.monthrange(year, month)[1]
        return [date(year, month, day) for day in range(1, num_days + 1)]

    @staticmethod
    def get_public_holidays_map(db: Session, year: int, month: int) -> Dict[date, str]:
        """Returns mapping of date -> holiday_name for all holidays in that month."""
        start_date = date(year, month, 1)
        end_date = date(year, month, calendar.monthrange(year, month)[1])
        holidays = db.query(PublicHoliday).filter(
            PublicHoliday.date >= start_date,
            PublicHoliday.date <= end_date
        ).all()
        return {h.date: h.holiday_name for h in holidays}

    @staticmethod
    def is_operational_day(
        rule: OperatingRule,
        check_date: date,
        holiday_map: Dict[date, str]
    ) -> bool:
        """
        Determines whether a brand-process requires staffing on check_date
        based on its configured operating_type and applicable rules.
        """
        weekday = check_date.weekday() # 0 = Monday, 6 = Sunday
        is_holiday = check_date in holiday_map

        # Check explicit applicable_days filter if provided
        if rule.applicable_days:
            allowed_days = [int(d.strip()) for d in rule.applicable_days.split(",") if d.strip().isdigit()]
            if weekday not in allowed_days:
                return False

        op_type = rule.operating_type.upper() if rule.operating_type else "EVERYDAY"

        if op_type == "EVERYDAY":
            # Operates Mon-Sun, including holidays
            return True
        elif op_type == "EVERYDAY_EXCEPT_HOLIDAYS":
            # Operates Mon-Sun, but closed on public holidays
            return not is_holiday
        elif op_type == "SUNDAYS_AND_HOLIDAYS_OFF":
            # Closed on Sundays and public holidays
            if weekday == 6 or is_holiday:
                return False
            return True
        else:
            # Fallback to boolean flags
            if rule.sunday_off and weekday == 6:
                return False
            if rule.public_holiday_off and is_holiday:
                return False
            return True
