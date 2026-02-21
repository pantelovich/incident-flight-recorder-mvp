from typing import List, Dict, Any
from datetime import datetime, timedelta
from .. import models, schemas

def generate_replay(incident: models.Incident, events: List[models.Event]) -> schemas.ReplayResponse:
    if not events:
        return schemas.ReplayResponse(
            incident_id=incident.id,
            buckets=[],
            mttd_minutes=None,
            mttr_minutes=None,
            current_phase="pre-incident"
        )
        
    # Sort events
    sorted_events = sorted(events, key=lambda e: e.timestamp)
    start_ts = sorted_events[0].timestamp
    end_ts = sorted_events[-1].timestamp
    
    # Calculate MTTR / MTTD if possible
    # Heuristics:
    # MTTD = time from first error/crash to first alert
    # MTTR = time from first alert to last recovery
    first_error = next((e for e in sorted_events if "error" in e.event_type.lower() or "crash" in e.event_type.lower()), None)
    first_alert = next((e for e in sorted_events if "alert" in e.event_type.lower()), None)
    first_recovery = next((e for e in sorted_events if "recover" in e.event_type.lower() or "resolve" in e.event_type.lower()), None)
    
    mttd = None
    if first_error and first_alert and first_alert.timestamp >= first_error.timestamp:
        mttd = (first_alert.timestamp - first_error.timestamp).total_seconds() / 60.0
        
    mttr = None
    if first_alert and first_recovery and first_recovery.timestamp >= first_alert.timestamp:
        mttr = (first_recovery.timestamp - first_alert.timestamp).total_seconds() / 60.0

    # Bucket events by 5 minutes or 1 minute depending on duration
    duration = (end_ts - start_ts).total_seconds()
    bucket_size_min = 1 if duration < 3600 else 5
    bucket_delta = timedelta(minutes=bucket_size_min)
    
    buckets = []
    current_start = start_ts
    while current_start <= end_ts:
        current_end = current_start + bucket_delta
        bucket_events = [e for e in sorted_events if current_start <= e.timestamp < current_end]
        
        # Determine phase for bucket
        phase = "pre-incident"
        if any("error" in e.event_type.lower() for e in bucket_events):
            phase = "onset"
        elif any("alert" in e.event_type.lower() for e in bucket_events):
            phase = "escalation"
        elif any("rollback" in e.event_type.lower() or "mitigat" in e.event_type.lower() for e in bucket_events):
            phase = "mitigation"
        elif any("recover" in e.event_type.lower() for e in bucket_events):
            phase = "recovery"
        
        # Propagate last phase if empty
        if not bucket_events and len(buckets) > 0:
            phase = buckets[-1].phase

        # Only add bucket if not empty (or if we want to fill gaps, let's keep gaps for now)
        if bucket_events:
            buckets.append(
                schemas.TimelineBucket(
                    timestamp_start=current_start,
                    timestamp_end=current_end,
                    events=[schemas.EventResponse.model_validate(e) for e in bucket_events],
                    phase=phase
                )
            )
            
        current_start = current_end
        
    # Edge case: if last event matches current_start exactly
    if end_ts == current_start and sorted_events[-1].timestamp == end_ts:
         # already handled if we use <= but need to make sure we don't duplicate
         pass

    return schemas.ReplayResponse(
        incident_id=incident.id,
        buckets=buckets,
        mttd_minutes=round(mttd, 2) if mttd else None,
        mttr_minutes=round(mttr, 2) if mttr else None,
        current_phase=buckets[-1].phase if buckets else "pre-incident"
    )
