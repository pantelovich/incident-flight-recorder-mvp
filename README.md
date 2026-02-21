# Incident Flight Recorder (MVP-0.1)

A cloud incident reconstruction and replay platform. It ingest telemetry from across your stack (CI/CD, Cloud Activity Logs, K8s, App Logs) and pieces them together into an interactive playable timeline with AI root-cause hypotheses.

## Features
- **Interactive Timeline Replay**: Scrub through an incident second-by-second to see the domino effect of failures.
- **Rule-based Root Cause Summarization**: Automatically links deployments or permission changes to downstream errors.
- **SaaS Preimum UI**: Built on Next.js 14, Tailwind, and dark mode optimizations.
- **Raw Event Ingestion**: API & UI to paste normalized JSON events to recreate incidents.

## Tech Stack
- Frontend: Next.js (App Router), Tailwind CSS, Lucide React
- Backend: FastAPI, SQLAlchemy, Pydantic (Python 3.11)
- DB: SQLite (Fast local setup) / Postgres via Docker

## How to Run locally (1-Click)

The fastest way to test the application is using Docker Compose.

1. Ensure Docker is running.
2. In the root directory, run:
   ```bash
   docker compose up --build
   ```
3. Open `http://localhost:3000` in your browser.

*Note: If Docker is unavailable on your machine, `docker-compose.yml` will fail, but you can run them manually using local SQLite. See below.*

## How to use the Demo

1. Navigate to `http://localhost:3000`
2. Click **"Load Demo Dataset"** - this generates ~40 realistic events (GitHub Actions deploy -> Azure config change -> 500 Error Spikes -> Alerts -> Rollback) into the database.
3. Click on the generated incident card.
4. Click **"Generate Analysis"** to see the system pinpoint the bad config change as the causal root.
5. Click **"Open Replay"** to open the timeline scrubber. Press **Play**, adjust the speed to 2x or 5x, and watch the system state change from Stable -> Critical -> Mitigating depending on the event stream!

## Setup without Docker (Native Local Testing)

Since Docker might be turned off on some machines:

**Backend (Terminal 1):**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*(By default, this will create a local `incident_recorder.db` SQLite database).*

**Frontend (Terminal 2):**
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`.

## JSON Ingestion Example
You can manually load events via the `/ingest` page using this schema:
```json
[
  {
    "timestamp": "2024-05-10T12:00:00Z",
    "source_type": "app",
    "event_type": "error_spike",
    "actor_id": "datadog-monitor",
    "message": "Latency breached 2000ms"
  }
]
```
