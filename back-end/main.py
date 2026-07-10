"""
Elara - Backend API
====================
FastAPI app connecting the frontend to:
  - cycle_predictor.py  (prediction + phase derivation)
  - wellness_agent.py   (Fireworks MiniMax M3 wellness responses)
  - database.py         (SQLite storage)

Run:
  export FIREWORKS_API_KEY="your-key"
  uvicorn main:app --reload --port 8000

Then open http://127.0.0.1:8000/docs for interactive API testing -
no frontend needed yet to try every endpoint.
"""

import sys
import os
from datetime import date, datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# make /agents importable from /backend
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "agents"))

from cycle_predictor import statistical_prediction, derive_phase_from_prediction  # noqa: E402
from wellness_agent import get_wellness_response  # noqa: E402
import database as db  # noqa: E402

app = FastAPI(title="Elara API")

# Wide open for hackathon dev - tighten this before any real deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    db.init_db()


# ---------- request/response schemas ----------

class CycleLogRequest(BaseModel):
    user_id: str
    cycle_start_date: str  # "YYYY-MM-DD"
    period_length: int = None


class CheckinRequest(BaseModel):
    user_id: str
    entry_text: str
    entry_date: str = None  # defaults to today if not provided


# ---------- endpoints ----------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/cycle-logs")
def log_cycle_start(payload: CycleLogRequest):
    """Log a new period start date for a user."""
    db.add_cycle_log(payload.user_id, payload.cycle_start_date, payload.period_length)
    return {"status": "logged", "user_id": payload.user_id,
            "cycle_start_date": payload.cycle_start_date}


@app.get("/prediction/{user_id}")
def get_prediction(user_id: str):
    """Cycle prediction + current phase for a user, combined."""
    cycle_df = db.get_cycle_df(user_id)
    if cycle_df.empty:
        raise HTTPException(status_code=404,
                             detail="No cycle logs found for this user yet.")

    prediction = statistical_prediction(cycle_df, user_id)
    phase_info = derive_phase_from_prediction(cycle_df, user_id)

    return {"prediction": prediction, "current_phase": phase_info}


@app.post("/checkin")
def checkin(payload: CheckinRequest):
    """
    The core loop: user logs a mood/journal entry -> derive their current
    cycle phase -> get a phase-aware wellness response -> save everything.
    """
    entry_date = payload.entry_date or date.today().isoformat()

    cycle_df = db.get_cycle_df(payload.user_id)
    if cycle_df.empty:
        phase = "unknown"
    else:
        phase_info = derive_phase_from_prediction(cycle_df, payload.user_id)
        phase = phase_info["phase"]

    result = get_wellness_response(phase, payload.entry_text)

    db.add_mood_log(
        user_id=payload.user_id,
        entry_date=entry_date,
        entry_text=payload.entry_text,
        mood_score=result.get("mood_score"),
        themes=result.get("themes", []),
        flag_for_support=result.get("flag_for_support", False),
        phase=phase,
        agent_response=result.get("response", ""),
        status=result.get("status", "unknown"),
    )

    return {
        "phase": phase,
        "reply": result.get("response"),
        "mood_score": result.get("mood_score"),
        "themes": result.get("themes", []),
        "flag_for_support": result.get("flag_for_support", False),
        "status": result.get("status"),
    }


@app.get("/mood-history/{user_id}")
def mood_history(user_id: str):
    """Full mood log history for a user - powers the insights/correlation chart."""
    logs = db.get_mood_logs(user_id)
    return {"user_id": user_id, "entries": logs}