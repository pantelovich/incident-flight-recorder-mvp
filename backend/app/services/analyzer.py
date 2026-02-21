from typing import List, Dict, Any, Tuple
from datetime import timedelta
from .. import models, schemas
import json

def analyze_incident(incident: models.Incident, events: List[models.Event]) -> models.IncidentSummary:
    """
    Rule-based root cause analysis for MVP-0.1.
    """
    sorted_events = sorted(events, key=lambda e: e.timestamp)
    
    probable_root_cause = "Unknown"
    recommendations = []
    causal_chain = []
    confidence = 0.0
    
    # Simple Hypothesis Engine
    # Look for triggers before the first error spike
    first_error = next((e for e in sorted_events if "error" in e.event_type.lower() or "crash" in e.event_type.lower()), None)
    
    if first_error:
        # Check for config_change or deploy_started within 15 minutes before first_error
        cutoff_time = first_error.timestamp
        start_search = cutoff_time - timedelta(minutes=15)
        
        candidates = [e for e in sorted_events if start_search <= e.timestamp < cutoff_time and e.event_type in ["config_change", "deploy_started", "role_assigned", "policy_changed", "permission_change"]]
        
        if candidates:
            top_candidate = candidates[-1] # closest to error
            if top_candidate.event_type in ["config_change", "deploy_started"]:
                probable_root_cause = f"Bad deployment or configuration change at {top_candidate.timestamp.strftime('%H:%M:%S')}"
                confidence = 0.85
                recommendations = [
                    "Implement stricter pre-deployment health checks.",
                    "Review configuration validation hooks in CI/CD.",
                    "Set up automated progressive delivery (canary deployments)."
                ]
                causal_chain = [
                    {"event_id": top_candidate.id, "desc": f"Trigger: {top_candidate.event_type}"},
                    {"event_id": first_error.id, "desc": f"Effect: {first_error.event_type} observed"}
                ]
            elif top_candidate.event_type in ["role_assigned", "policy_changed", "permission_change"]:
                probable_root_cause = f"Identity risk: unexpected permission change at {top_candidate.timestamp.strftime('%H:%M:%S')}"
                confidence = 0.90
                recommendations = [
                    "Audit service principal permissions.",
                    "Enforce 'Just-In-Time' access for critical role assignments."
                ]
                causal_chain = [
                    {"event_id": top_candidate.id, "desc": f"Trigger: Identity permission modified by {top_candidate.actor_id}"},
                    {"event_id": first_error.id, "desc": f"Effect: Anomalous behavior or access failure"}
                ]
    
    # Generate generic key events
    key_events = []
    for e in sorted_events:
        if e.event_type in ["deploy_started", "config_change", "alert_fired", "rollback", "permission_change"]:
            key_events.append({"event_id": e.id, "event_type": e.event_type, "timestamp": e.timestamp.isoformat()})
            
    if not key_events and sorted_events:
        key_events = [{"event_id": e.id, "event_type": e.event_type, "timestamp": e.timestamp.isoformat()} for e in sorted_events[:3]]
        
    summary = models.IncidentSummary(
        incident_id=incident.id,
        probable_root_cause=probable_root_cause,
        causal_chain=causal_chain,
        key_events=key_events,
        recommendations=recommendations,
        confidence_score=confidence
    )
    
    return summary
