from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.roster import Roster
from app.services.export_service import ExportService

router = APIRouter(prefix="/exports", tags=["Exports"])

@router.get("/csv")
def export_csv(
    roster_id: Optional[int] = None,
    pod_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    if not roster_id:
        latest = db.query(Roster).order_by(Roster.year.desc(), Roster.month.desc()).first()
        if not latest:
            raise HTTPException(status_code=404, detail="No roster available to export")
        roster_id = latest.id

    csv_stream = ExportService.export_to_csv(db, roster_id, pod_id, brand_id, employee_id)
    filename = f"rosterflow_roster_{roster_id}.csv"

    return Response(
        content=csv_stream.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/excel")
def export_excel(
    roster_id: Optional[int] = None,
    pod_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    if not roster_id:
        latest = db.query(Roster).order_by(Roster.year.desc(), Roster.month.desc()).first()
        if not latest:
            raise HTTPException(status_code=404, detail="No roster available to export")
        roster_id = latest.id

    excel_stream = ExportService.export_to_excel(db, roster_id, pod_id, brand_id, employee_id)
    filename = f"rosterflow_roster_{roster_id}.xlsx"

    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
