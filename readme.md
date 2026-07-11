# Elara — Cycle Intelligence & Emotional Wellness Platform

Built for the **AMD Developer Hackathon: ACT II** (Unicorn track)

Elara predicts your menstrual cycle *and* understands your mood — connecting the
two so emotional support actually knows what phase you're in, rather than
treating cycle tracking and emotional wellness as two separate apps bolted
together.

---

## What it does

- **Cycle prediction** — logs period start dates and predicts your next
  period, fertile window, and PMS onset, using a statistical/ML model trained
  and validated on a real clinical cycle dataset (Marquette NFP study, via
  Kaggle).
- **Phase-aware wellness check-ins** — log a mood or journal entry, and an AI
  wellness agent responds with warmth, connecting your mood to your current
  cycle phase *only when genuinely relevant* — never diagnostic, and flags
  entries that suggest a need for real professional support.
- **Insights** — mood history over time, correlated against cycle phase.

## Architecture

```
Frontend (React, built with NativelyAI)
        |
        v
Backend API (FastAPI)  ──────────────┐
        |                            |
        v                            v
Cycle Predictor (stats/ML)    Wellness Agent (Fireworks MiniMax M3)
        |                            |
        └──────────> SQLite <────────┘
              (cycle logs + mood logs)
```

The backend derives the user's current cycle phase from their logged history,
then passes that phase as context into the wellness agent - this connection
is what makes Elara one cohesive product rather than a tracker and a chatbot
running side by side.

## Tech stack

- **Backend:** Python, FastAPI, SQLite, pandas, scikit-learn
- **Wellness agent:** Fireworks AI (MiniMax M3)
- **Frontend:** React (built with NativelyAI)
- **AMD Developer Cloud:** LoRA fine-tuning of the wellness agent's response
  style — see [AMD Developer Cloud usage](#amd-developer-cloud-usage) below

## AMD Developer Cloud usage

As part of Elara's tech stack, we fine-tuned a LoRA adapter for the wellness
agent's response style using AMD Developer Cloud.

- **Hardware:** AMD MI300X GPU (single-GPU instance, AMD Developer Cloud)
- **Environment:** PyTorch, ROCm, Docker-based PyTorch container
- <img width="1861" height="910" alt="fine-tuning in progress" src="https://github.com/user-attachments/assets/65d5c08d-e91e-4716-9655-26fb71a6d464" />
- **Base model:** GLM 5.2
- **Method:** LoRA (Low-Rank Adaptation) via Hugging Face `peft`
- <img width="1830" height="741" alt="wellness agent finetuning" src="https://github.com/user-attachments/assets/5cae41b8-8f61-43bc-ae78-19e0a4f199cc" />

- **Dataset:** 39 curated examples of phase-aware, non-diagnostic wellness
  check-in responses (`/finetune/dataset.json`)
  
- **Training script:** `/finetune/train.py`
- **Inference/test script:** `/finetune/test.py`

GPU usage verified via `rocm-smi` on the training instance — see
`/finetune/screenshots`.

## Project structure

```
/agents
  cycle_predictor.py     - prediction model + phase derivation
  wellness_agent.py       - Fireworks MiniMax M3 wellness responses
/backend
  main.py                 - FastAPI app, all API endpoints
  database.py              - SQLite storage layer
  requirements.txt
/finetune
  dataset.json             - LoRA training examples
  train.py                 - fine-tuning script (run on AMD Developer Cloud)
  test.py                  - inference/test script
  screenshots/              - proof of AMD GPU usage (rocm-smi, dashboard, training run)
/frontend
  (React app, built with NativelyAI)
README.md
```

## Running it locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
export FIREWORKS_API_KEY="your-key"
uvicorn main:app --reload --port 8000
```
Then open `http://127.0.0.1:8000/docs` for interactive API testing.

**Frontend:**
See `/frontend` — built and deployed via NativelyAI, configured to call the
backend API above.

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/cycle-logs` | Log a period start date |
| GET | `/prediction/{user_id}` | Cycle prediction + current phase |
| POST | `/checkin` | Log a mood/journal entry, get a phase-aware wellness response |
| GET | `/mood-history/{user_id}` | Full mood log history |

## Team

Built by Team Radon for the AMD Developer Hackathon: ACT II.

## Demo
visit app
https://d7qylgjg9x36k83q00hz6ql5w.nativelyai.app/
