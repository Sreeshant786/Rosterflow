from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.employee import Pod, Employee
from app.schemas.employee import PodCreate, PodOut

router = APIRouter(prefix="/pods", tags=["Pods"])

@router.get("", response_model=List[PodOut])
def get_pods(db: Session = Depends(get_db)):
    pods = db.query(Pod).all()
    results = []
    for p in pods:
        lead_name = p.lead.full_name if p.lead else None
        member_cnt = db.query(Employee).filter(Employee.pod_id == p.id, Employee.active_status == True).count()
        results.append(PodOut(
            id=p.id,
            pod_name=p.pod_name,
            pod_lead_id=p.pod_lead_id,
            lead_name=lead_name,
            member_count=member_cnt,
            description=p.description,
            created_at=p.created_at
        ))
    return results

@router.post("", response_model=PodOut)
def create_pod(payload: PodCreate, db: Session = Depends(get_db)):
    existing = db.query(Pod).filter(Pod.pod_name == payload.pod_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Pod with this name already exists")
    pod = Pod(**payload.dict())
    db.add(pod)
    db.commit()
    db.refresh(pod)
    lead_name = pod.lead.full_name if pod.lead else None
    return PodOut(
        id=pod.id,
        pod_name=pod.pod_name,
        pod_lead_id=pod.pod_lead_id,
        lead_name=lead_name,
        member_count=0,
        description=pod.description,
        created_at=pod.created_at
    )
