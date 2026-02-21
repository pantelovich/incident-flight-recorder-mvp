from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime
import uuid

# --- EVENT SCHEMAS ---

class EventBase(BaseModel):
    timestamp: datetime
    source_type: str
    event_type: str
    actor_type: Optional[str] = None
    actor_id: Optional[str] = None
    resource_id: Optional[str] = None
    message: Optional[str] = None
    event_metadata: Optional[Dict[str, Any]] = None

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: str
    incident_id: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# --- INCIDENT SUMMARY SCHEMAS ---

class IncidentSummaryResponse(BaseModel):
    incident_id: str
    generated_at: datetime
    probable_root_cause: Optional[str] = None
    causal_chain: Optional[List[Any]] = None
    key_events: Optional[List[Any]] = None
    recommendations: Optional[List[str]] = None
    confidence_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

# --- INCIDENT SCHEMAS ---

class IncidentBase(BaseModel):
    title: str
    description: Optional[str] = None
    environment: str = "prod"
    status: str = "open"
    severity: int = 3
    start_time: Optional[datetime] = None

class IncidentCreate(IncidentBase):
    pass

class IncidentResponse(IncidentBase):
    id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    created_at: datetime
    
    events: List[EventResponse] = []
    summary: Optional[IncidentSummaryResponse] = None

    model_config = ConfigDict(from_attributes=True)

# --- REPLAY SCHEMA ---

class TimelineBucket(BaseModel):
    timestamp_start: datetime
    timestamp_end: datetime
    events: List[EventResponse]
    phase: str # e.g., pre-incident, onset, escalation, mitigation, recovery

class ReplayResponse(BaseModel):
    incident_id: str
    buckets: List[TimelineBucket]
    mttd_minutes: Optional[float] = None
    mttr_minutes: Optional[float] = None
    current_phase: str
