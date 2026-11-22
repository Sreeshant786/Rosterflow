import io
import csv
import pandas as pd
from datetime import date
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.employee import Employee, Pod
from app.models.brand import Brand, Process
from app.models.roster import Roster, RosterEntry
from app.services.calendar_service import CalendarService

class ExportService:
    @staticmethod
    def get_filtered_entries(
        db: Session,
        roster_id: int,
        pod_id: Optional[int] = None,
        brand_id: Optional[int] = None,
        employee_id: Optional[int] = None,
        process_id: Optional[int] = None
    ) -> List[RosterEntry]:
        query = db.query(RosterEntry).filter(RosterEntry.roster_id == roster_id)
        if employee_id:
            query = query.filter(RosterEntry.employee_id == employee_id)
        if brand_id:
            query = query.filter(RosterEntry.brand_id == brand_id)
        if process_id:
            query = query.filter(RosterEntry.process_id == process_id)
        if pod_id:
            query = query.join(Employee, RosterEntry.employee_id == Employee.id).filter(Employee.pod_id == pod_id)
        return query.order_by(RosterEntry.work_date, RosterEntry.employee_id).all()

    @staticmethod
    def export_to_csv(
        db: Session,
        roster_id: int,
        pod_id: Optional[int] = None,
        brand_id: Optional[int] = None,
        employee_id: Optional[int] = None
    ) -> io.StringIO:
        entries = ExportService.get_filtered_entries(db, roster_id, pod_id, brand_id, employee_id)
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "Date", "Day", "Employee Code", "Employee Name", "Pod",
            "Brand", "Process", "Status", "Shift Start", "Shift End", "Notes"
        ])

        for e in entries:
            day_name = e.work_date.strftime("%A")
            emp_code = e.employee.employee_code if e.employee else ""
            emp_name = e.employee.full_name if e.employee else ""
            pod_name = e.employee.pod.pod_name if e.employee and e.employee.pod else ""
            brand_name = e.brand.brand_name if e.brand else "-"
            process_name = e.process.process_name if e.process else "-"

            writer.writerow([
                e.work_date.isoformat(),
                day_name,
                emp_code,
                emp_name,
                pod_name,
                brand_name,
                process_name,
                e.status,
                e.shift_start or "",
                e.shift_end or "",
                e.notes or ""
            ])

        output.seek(0)
        return output

    @staticmethod
    def export_to_excel(
        db: Session,
        roster_id: int,
        pod_id: Optional[int] = None,
        brand_id: Optional[int] = None,
        employee_id: Optional[int] = None
    ) -> io.BytesIO:
        entries = ExportService.get_filtered_entries(db, roster_id, pod_id, brand_id, employee_id)
        data = []
        for e in entries:
            data.append({
                "Date": e.work_date.strftime("%Y-%m-%d"),
                "Day": e.work_date.strftime("%A"),
                "Employee Code": e.employee.employee_code if e.employee else "",
                "Employee Name": e.employee.full_name if e.employee else "",
                "Pod": e.employee.pod.pod_name if e.employee and e.employee.pod else "",
                "Brand": e.brand.brand_name if e.brand else "-",
                "Process": e.process.process_name if e.process else "-",
                "Status": e.status,
                "Shift Start": e.shift_start or "",
                "Shift End": e.shift_end or "",
                "Notes": e.notes or ""
            })

        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name="Roster Schedule")

        output.seek(0)
        return output
