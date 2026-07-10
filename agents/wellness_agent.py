"""
Elara - Wellness Agent
======================
Takes a user's mood/journal entry + their current cycle phase (from
cycle_predictor.py) and returns a warm, phase-aware, non-diagnostic response
plus structured mood/theme data for the insights dashboard.

Model: MiniMax M3 on Fireworks (accounts/fireworks/models/minimax-m3)
  - 512K context, reasoning model - may emit <think>...</think> before
    its actual answer. This code strips that automatically.
  - General-purpose, not empathy-tuned specifically - the system prompt
    below carries most of the weight. If responses feel flat or clinical
    once you're testing with real entries, GLM 5.2 is the upgrade path -
    same code, just swap MODEL_ID.

Setup:
  export FIREWORKS_API_KEY="your-api-key"
  pip install requests

Usage:
  from wellness_agent import get_wellness_response
  result = get_wellness_response(
      cycle_phase="luteal",
      mood_entry="Feeling really irritable and tired, snapped at my partner.",
  )
"""

import os
import re
import json
import time
import requests

MODEL_ID = "accounts/fireworks/models/minimax-m3"
API_URL = "https://api.fireworks.ai/inference/v1/chat/completions"

SYSTEM_PROMPT = """You are the wellness companion inside Elara, a cycle intelligence and \
emotional wellness app. Someone has just logged a mood or journal entry, and you know \
what phase of their menstrual cycle they're currently in.

Your job: respond with warmth, and connect how they're feeling to their current cycle \
phase when it's genuinely relevant - never force the connection if the entry doesn't \
call for it.

Tone rules:
- Warm and conversational, never clinical or robotic.
- Never diagnostic. You are not a therapist or doctor. Don't label conditions.
- If phase context is relevant, mention it naturally (e.g. "that tracks with where you \
are in your cycle right now") rather than lecturing about hormones.
- Keep responses short - 2-4 sentences. This is a check-in, not an essay.
- If the entry suggests something serious (self-harm, persistent hopelessness, safety \
concerns), gently encourage them to reach out to a professional or someone they trust. \
Do not try to counsel through it yourself.
- Never assume gender, relationship status, or other details not stated in the entry.

You must respond with ONLY a JSON object, no other text, no markdown fences, in this \
exact shape:
{
  "mood_score": <integer 1-5, 1=very low 5=very positive, your best read of the entry>,
  "themes": [<1-3 short lowercase strings, e.g. "fatigue", "conflict", "work stress">],
  "flag_for_support": <true if the entry suggests they should consider professional \
support, false otherwise>,
  "response": "<your 2-4 sentence warm reply to show the user>"
}
"""


def _strip_reasoning(text: str) -> str:
    """MiniMax M3 may emit <think>...</think> reasoning before its actual
    answer. Strip it so we're left with just the JSON payload."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def _extract_json(text: str) -> dict:
    """Model is asked for raw JSON, but models sometimes wrap it in
    markdown fences anyway - handle both cases."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    return json.loads(text)


def get_wellness_response(cycle_phase: str, mood_entry: str,
                           recent_context: str = None, max_retries: int = 2) -> dict:
    """
    cycle_phase: one of "menstrual", "follicular", "ovulation", "luteal"
                 (this is exactly what cycle_predictor.py's ovulation/period
                 math implies - derive it from predicted_next_period and
                 estimated_ovulation_day before calling this function)
    mood_entry: the user's raw journal/mood text
    recent_context: optional short summary of the last 1-3 entries, for
                     session continuity (keep this short - a sentence or two)

    Returns a dict: {mood_score, themes, flag_for_support, response, status}
    On failure, returns a graceful fallback rather than raising, so a flaky
    API call doesn't crash the whole app mid-demo.
    """
    api_key = os.environ.get("FIREWORKS_API_KEY")
    if not api_key:
        return _fallback("FIREWORKS_API_KEY environment variable not set.")

    user_message = ""
    if cycle_phase and cycle_phase != "unknown":
        user_message += f"Current cycle phase: {cycle_phase}\n"
    # If phase is "unknown" (new user, insufficient history, or overdue period
    # with no new log yet), we deliberately say nothing about it here - the
    # system prompt only connects mood to phase "when genuinely relevant",
    # so simply omitting the phase line keeps the agent from guessing.
    if recent_context:
        user_message += f"Recent context: {recent_context}\n"
    user_message += f"Today's entry: {mood_entry}"

    payload = {
        "model": MODEL_ID,
        "max_tokens": 400,
        "temperature": 0.7,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    last_error = None
    for attempt in range(max_retries + 1):
        try:
            resp = requests.post(API_URL, headers=headers, json=payload, timeout=60)
            resp.raise_for_status()
            raw_text = resp.json()["choices"][0]["message"]["content"]
            cleaned = _strip_reasoning(raw_text)
            parsed = _extract_json(cleaned)

            return {
                "status": "ok",
                "mood_score": parsed.get("mood_score"),
                "themes": parsed.get("themes", []),
                "flag_for_support": parsed.get("flag_for_support", False),
                "response": parsed.get("response", ""),
            }
        except (requests.RequestException, json.JSONDecodeError, KeyError, IndexError) as e:
            last_error = e
            if attempt < max_retries:
                time.sleep(1.5 * (attempt + 1))  # brief backoff, M3 can be slow under load
                continue

    return _fallback(f"API call failed after retries: {last_error}")


def _fallback(reason: str) -> dict:
    """Graceful degradation - the app should still function (even if
    blandly) rather than crash if the LLM call fails during a demo."""
    return {
        "status": "error",
        "mood_score": None,
        "themes": [],
        "flag_for_support": False,
        "response": "I'm having trouble connecting right now, but I hear you - "
                    "want to try logging this again in a moment?",
        "error_detail": reason,
    }


if __name__ == "__main__":
    # Quick manual test - requires a real FIREWORKS_API_KEY in your environment.
    test_cases = [
        ("luteal", "Feeling really irritable and tired, snapped at my partner for no reason."),
        ("follicular", "Had a great workout today, feeling energetic and motivated!"),
        ("luteal", "I don't see the point in anything anymore, nothing feels worth it."),
    ]
    for phase, entry in test_cases:
        print(f"\n--- Phase: {phase} | Entry: {entry[:50]}...")
        result = get_wellness_response(phase, entry)
        print(json.dumps(result, indent=2))