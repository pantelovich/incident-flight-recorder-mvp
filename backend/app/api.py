from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from . import models, schemas
from .database import get_db
from .services import replay, analyzer, demo_data

api_router = APIRouter()

@api_router.post("/demo")
def generate_demo_dataset(db: Session = Depends(get_db)):
    incident = demo_data.create_demo_incident(db)
    
    # Also generate the summary automatically for the demo dataset
    events = db.query(models.Event).filter(models.Event.incident_id == incident.id).all()
    summary = analyzer.analyze_incident(incident, events)
    db.add(summary)
    db.commit()
    
    return {"message": "Demo data generated successfully", "incident_id": incident.id}

@api_router.post("/incidents", response_model=schemas.IncidentResponse)
def create_incident(incident: schemas.IncidentCreate, db: Session = Depends(get_db)):
    db_incident = models.Incident(
        title=incident.title,
        description=incident.description,
        environment=incident.environment,
        status=incident.status,
        severity=incident.severity,
        start_time=incident.start_time or datetime.utcnow()
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident

@api_router.get("/incidents", response_model=List[schemas.IncidentResponse])
def get_incidents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    incidents = db.query(models.Incident).offset(skip).limit(limit).all()
    return incidents

@api_router.get("/incidents/{incident_id}", response_model=schemas.IncidentResponse)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@api_router.get("/incidents/{incident_id}/events", response_model=List[schemas.EventResponse])
def get_events(incident_id: str, db: Session = Depends(get_db)):
    events = db.query(models.Event).filter(models.Event.incident_id == incident_id).order_by(models.Event.timestamp.asc()).all()
    return events

@api_router.post("/incidents/{incident_id}/events/bulk")
def ingest_events_bulk(incident_id: str, events: List[schemas.EventCreate], db: Session = Depends(get_db)):
    # Verify incident exists
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    db_events = []
    for event_in in events:
        db_event = models.Event(
            incident_id=incident_id,
            timestamp=event_in.timestamp,
            source_type=event_in.source_type,
            event_type=event_in.event_type,
            actor_type=event_in.actor_type,
            actor_id=event_in.actor_id,
            resource_id=event_in.resource_id,
            message=event_in.message,
            metadata=event_in.metadata_field
        )
        db_events.append(db_event)
        
    db.add_all(db_events)
    db.commit()
    
    return {"message": f"Successfully ingested {len(db_events)} events.", "count": len(db_events)}

@api_router.get("/incidents/{incident_id}/replay", response_model=schemas.ReplayResponse)
def get_incident_replay(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    events = db.query(models.Event).filter(models.Event.incident_id == incident_id).all()
    return replay.generate_replay(incident, events)

@api_router.post("/incidents/{incident_id}/summarize", response_model=schemas.IncidentSummaryResponse)
def summarize_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    events = db.query(models.Event).filter(models.Event.incident_id == incident_id).all()
    
    # Generate summary
    summary_model = analyzer.analyze_incident(incident, events)
    
    # Store or update in DB
    existing_summary = db.query(models.IncidentSummary).filter(models.IncidentSummary.incident_id == incident_id).first()
    if existing_summary:
        existing_summary.probable_root_cause = summary_model.probable_root_cause
        existing_summary.causal_chain = summary_model.causal_chain
        existing_summary.key_events = summary_model.key_events
        existing_summary.recommendations = summary_model.recommendations
        existing_summary.confidence_score = summary_model.confidence_score
        existing_summary.generated_at = datetime.utcnow()
        summary_to_return = existing_summary
    else:
        db.add(summary_model)
        summary_to_return = summary_model
        
    db.commit()
    db.refresh(summary_to_return)
    return summary_to_return

@api_router.get("/incidents/{incident_id}/export")
def export_incident_report(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    summary = db.query(models.IncidentSummary).filter(models.IncidentSummary.incident_id == incident_id).first()
    
    return {
        "incident_id": incident.id,
        "title": incident.title,
        "environment": incident.environment,
        "severity": incident.severity,
        "duration_minutes": ((incident.end_time - incident.start_time).total_seconds() / 60) if incident.end_time else None,
        "summary": {
            "root_cause": summary.probable_root_cause if summary else "Not generated",
            "recommendations": summary.recommendations if summary else [],
            "key_events": summary.key_events if summary else []
        }
    }
