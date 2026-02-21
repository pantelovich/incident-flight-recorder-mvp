from sqlalchemy import Column, String, DateTime, Integer, Float, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import sqlalchemy.types as types
import uuid
import datetime

from .database import Base

# Simple generic UUID type getter to be DB agnostic (SQLite fallback)
def generate_uuid():
    return str(uuid.uuid4())

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    environment = Column(String, nullable=False, default="prod")
    start_time = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)
    status = Column(String, default="open", nullable=False) # open, resolved
    severity = Column(Integer, default=3, nullable=False) # 1-5
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    events = relationship("Event", back_populates="incident", cascade="all, delete-orphan")
    summary = relationship("IncidentSummary", back_populates="incident", uselist=False, cascade="all, delete-orphan")

class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"), index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    source_type = Column(String, nullable=False) # e.g. cloud, cicd, app, iam, k8s
    event_type = Column(String, nullable=False) # e.g. deploy_started, config_change, pod_crash
    actor_type = Column(String, nullable=True) # human, service_principal, system
    actor_id = Column(String, nullable=True) 
    resource_id = Column(String, nullable=True)
    message = Column(String, nullable=True)
    metadata = Column(JSON, nullable=True) # JSON column for arbitrary data

    incident = relationship("Incident", back_populates="events")

class IncidentSummary(Base):
    __tablename__ = "incident_summaries"

    incident_id = Column(String, ForeignKey("incidents.id"), primary_key=True)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    probable_root_cause = Column(String, nullable=True)
    causal_chain = Column(JSON, nullable=True) # array of internal dicts or strings
    key_events = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    confidence_score = Column(Float, nullable=True) # 0 to 1

    incident = relationship("Incident", back_populates="summary")
