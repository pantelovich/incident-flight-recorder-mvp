from datetime import datetime, timedelta
import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from .. import models, schemas
import random

def create_demo_incident(db: Session, title: str = "Bad deploy + misconfigured scaling") -> models.Incident:
    # 1. Create Incident
    now = datetime.utcnow()
    start_time = now - timedelta(hours=2)
    end_time = now - timedelta(minutes=10) # Resolved 10 mins ago
    
    incident = models.Incident(
        title=title,
        description="A bad deployment caused a cascading failure with misconfigured scaling thresholds leading to pod crashloops and 500 errors.",
        environment="prod",
        status="resolved",
        severity=2,
        start_time=start_time,
        end_time=end_time
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    
    # 2. Generate Events
    events: List[models.Event] = []
    
    def add_event(minutes_offset: int, source: str, evt_type: str, actor_t: str = None, actor_i: str = None, res_i: str = None, msg: str = None, meta: dict = None):
        ts = start_time + timedelta(minutes=minutes_offset)
        e = models.Event(
            incident_id=incident.id,
            timestamp=ts,
            source_type=source,
            event_type=evt_type,
            actor_type=actor_t,
            actor_id=actor_i,
            resource_id=res_i,
            message=msg,
            event_metadata=meta or {}
        )
        events.append(e)

    # T=0: GitHub Actions starts deploy
    add_event(0, "cicd", "deploy_started", "human", "dev-jdoe", "repo/cart-service", "Triggered deployment to prod")
    
    # T=2: GitHub Actions deploy finishes
    add_event(2, "cicd", "deploy_succeeded", "system", "github-actions", "repo/cart-service", "Deployment cart-v2.1 live")
    
    # T=5: Bad config applied via Azure Activity
    add_event(5, "cloud", "config_change", "service_principal", "spn-infra-deployer", "aks-cluster-prod", "Updated auto-scaling thresholds", {"max_replicas": 2})
    
    # T=12: App starts getting traffic and logging errors
    add_event(12, "app", "latency_spike", "system", "apm-monitor", "svc:cart", "P99 latency exceeding 2000ms")
    
    # T=15: K8s pods crash due to memory/config
    add_event(15, "k8s", "pod_crash", "system", "kubelet", "pod/cart-v2.1-a1b2", "OOMKilled pod")
    
    # T=18: Error rate spike detected
    for i in range(18, 25):
        add_event(i, "app", "error_rate_spike", "system", "datadog", "svc:cart", f"{random.randint(50, 200)} 500 errors/min detected")
        
    # T=20: Alert fired
    add_event(20, "iam", "alert_fired", "system", "pagerduty", "svc:cart", "SEV2: Cart Service High Error Rate")
    
    # T=25: Engineer starts investigating (manual event or slack?)
    add_event(25, "im", "investigation_started", "human", "dev-oncall", "slack-channel", "Acknowledged alert, investigating")
    
    # T=40: Engineer identifies issue and initiates rollback
    add_event(40, "cicd", "rollback", "human", "dev-oncall", "repo/cart-service", "Reverting to cart-v2.0")
    
    # T=45: Config change reverted
    add_event(45, "cloud", "config_change", "human", "dev-oncall", "aks-cluster-prod", "Reverted scaling bounds", {"max_replicas": 10})
    
    # T=50: Recovery observed
    add_event(50, "app", "recovery", "system", "datadog", "svc:cart", "Error rate back to baseline (<1%)")
    
    db.add_all(events)
    db.commit()
    
    return incident
