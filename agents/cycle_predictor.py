"""
Cycle Intelligence - Prediction Model
======================================
Predicts: next period start (with confidence range), fertile window, PMS onset.

Two modes, same interface:
  1. Statistical baseline (default) - rolling mean/std of past cycle lengths.
     Works with as few as 2-3 logged cycles. Use this first - it's what
     ships in your Day 2-3 MVP.
  2. ML upgrade (optional) - gradient boosting regressor using lag features.
     Only worth switching to if you have 8+ cycles per user in your dataset.

Expected input CSV columns (rename your dataset to match, see bottom notes):
  user_id            - any hashable ID
  cycle_start_date   - date, first day of period (YYYY-MM-DD)
  period_length      - optional, days of bleeding (int)

Usage:
  python cycle_predictor.py --csv your_data.csv --user_id U1
"""

import argparse
import numpy as np
import pandas as pd
from datetime import timedelta

LUTEAL_PHASE_DEFAULT = 14  # days; the luteal phase (ovulation -> next period)
                            # is far more consistent across women than the
                            # follicular phase, so it's a safe constant to
                            # start with when you don't have per-user data.


def load_and_prepare(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path, parse_dates=["cycle_start_date"])
    df = df.sort_values(["user_id", "cycle_start_date"]).reset_index(drop=True)

    # cycle_length = days between this start and the previous start, per user
    df["cycle_length"] = (
        df.groupby("user_id")["cycle_start_date"].diff().dt.days
    )
    return df


def load_fedcycle_dataset(csv_path: str) -> pd.DataFrame:
    """
    Adapter for the Kaggle 'Menstrual Cycle Data' / FedCycleData.csv dataset
    (Marquette NFP study, ClientID/CycleNumber format - no absolute dates,
    only per-cycle lengths).

    Quirks this handles:
      - Many numeric columns are stored as strings with blank entries
        instead of proper NaN (Age, BMI, LengthofLutealPhase, etc.)
      - Age/BMI are only populated on each client's first row, not repeated
        per cycle - forward-filled here per client.
      - No real calendar dates - we synthesize cycle_start_date by
        cumulatively summing LengthofCycle per client from an arbitrary
        anchor date, purely so the same statistical_prediction()/
        ml_prediction() functions can be reused unchanged.
      - LengthofLutealPhase has a handful of extreme outliers (data entry
        anomalies / irregular cycles) - clipped to a sane 7-20 day range
        so a single bad row doesn't distort a user's ovulation estimate.
    """
    df = pd.read_csv(csv_path)

    numeric_cols = ["LengthofCycle", "LengthofLutealPhase", "EstimatedDayofOvulation",
                     "LengthofMenses", "Age", "BMI", "UnusualBleeding"]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.rename(columns={"ClientID": "user_id"})
    df = df.sort_values(["user_id", "CycleNumber"]).reset_index(drop=True)

    # Age/BMI only appear on the first row per client - carry forward
    df["age"] = df.groupby("user_id")["Age"].ffill()
    df["bmi"] = df.groupby("user_id")["BMI"].ffill()

    # sane bounds - a handful of rows have implausible luteal phase values
    df["LengthofLutealPhase"] = df["LengthofLutealPhase"].clip(lower=7, upper=20)

    # synthesize cycle_start_date from cumulative cycle lengths per client
    anchor = pd.Timestamp("2024-01-01")
    df["days_from_anchor"] = df.groupby("user_id")["LengthofCycle"].cumsum().shift(1).fillna(0)
    df["cycle_start_date"] = df.groupby("user_id")["days_from_anchor"].transform(
        lambda x: anchor + pd.to_timedelta(x, unit="D")
    )

    df["cycle_length"] = df["LengthofCycle"]
    return df


def personalized_luteal_phase(df: pd.DataFrame, user_id: str) -> float:
    """Use this user's own average luteal phase length instead of the
    generic 14-day constant, when the data is available - more accurate
    than assuming everyone is the same."""
    user_df = df[df["user_id"] == user_id]
    val = user_df["LengthofLutealPhase"].mean()
    return val if pd.notna(val) else LUTEAL_PHASE_DEFAULT


def statistical_prediction(df: pd.DataFrame, user_id: str, luteal_phase_days: float = None) -> dict:
    """Baseline: rolling average + std dev of a user's own cycle history."""
    user_df = df[df["user_id"] == user_id].dropna(subset=["cycle_length"])

    if len(user_df) < 2:
        return {
            "status": "insufficient_data",
            "message": "Need at least 2-3 logged cycles for a reliable prediction. "
                       "Showing a population-average estimate instead.",
            "avg_cycle_length": 28,
            "confidence_days": 3,
        }

    mean_len = user_df["cycle_length"].mean()
    std_len = user_df["cycle_length"].std(ddof=1) if len(user_df) > 2 else 2.0
    std_len = max(std_len, 1.5)  # floor so the range never looks falsely exact

    last_start = df[df["user_id"] == user_id]["cycle_start_date"].max()
    predicted_next_start = last_start + timedelta(days=round(mean_len))

    range_low = predicted_next_start - timedelta(days=round(std_len))
    range_high = predicted_next_start + timedelta(days=round(std_len))

    # Ovulation ~14 days before the *predicted* next period (luteal phase).
    # Use this user's own average luteal phase length if available/passed in -
    # more accurate than assuming everyone is the same.
    luteal_days = luteal_phase_days if luteal_phase_days else LUTEAL_PHASE_DEFAULT
    ovulation_day = predicted_next_start - timedelta(days=round(luteal_days))
    fertile_start = ovulation_day - timedelta(days=5)
    fertile_end = ovulation_day + timedelta(days=1)

    # PMS onset heuristic: symptoms commonly cluster in the last ~5 days
    # of the luteal phase, right before the next period
    pms_onset = predicted_next_start - timedelta(days=5)

    return {
        "status": "ok",
        "predicted_next_period": predicted_next_start.date().isoformat(),
        "confidence_range": f"{range_low.date()} to {range_high.date()}",
        "avg_cycle_length_days": round(mean_len, 1),
        "cycle_length_std_days": round(std_len, 1),
        "fertile_window": f"{fertile_start.date()} to {fertile_end.date()}",
        "estimated_ovulation_day": ovulation_day.date().isoformat(),
        "pms_onset_estimate": pms_onset.date().isoformat(),
        "cycles_used": len(user_df),
    }


def derive_phase_from_prediction(df: pd.DataFrame, user_id: str, reference_date=None,
                                   period_length_days: float = None,
                                   luteal_phase_days: float = None) -> dict:
    """
    The connector between the predictor and the wellness agent: turns a
    user's cycle history into a single phase string - "menstrual",
    "follicular", "ovulation", or "luteal" - for whatever date you ask
    about (defaults to today).

    This is what get_wellness_response()'s cycle_phase argument expects.

    reference_date: date/str/Timestamp to check the phase for. Defaults to
                     today - pass a specific date when backtesting.
    period_length_days: average days of bleeding. Auto-derived from
                     LengthofMenses if that column exists (FedCycleData),
                     otherwise defaults to 5.
    luteal_phase_days: personalized luteal phase length. Auto-derived via
                     personalized_luteal_phase() if the data supports it.
    """
    if reference_date is None:
        reference_date = pd.Timestamp.today().date()
    elif isinstance(reference_date, str):
        reference_date = pd.Timestamp(reference_date).date()
    elif isinstance(reference_date, pd.Timestamp):
        reference_date = reference_date.date()

    if luteal_phase_days is None and "LengthofLutealPhase" in df.columns:
        luteal_phase_days = personalized_luteal_phase(df, user_id)

    if period_length_days is None:
        if "LengthofMenses" in df.columns:
            val = df[df["user_id"] == user_id]["LengthofMenses"].mean()
            period_length_days = val if pd.notna(val) else 5
        else:
            period_length_days = 5

    result = statistical_prediction(df, user_id, luteal_phase_days=luteal_phase_days)
    if result["status"] != "ok":
        # Not enough history yet - the wellness agent should just skip
        # phase-specific language rather than guess. See wellness_agent.py's
        # handling of phase == "unknown".
        return {"phase": "unknown", "reason": result.get("message", "insufficient data")}

    last_start = df[df["user_id"] == user_id]["cycle_start_date"].max()
    last_start = last_start.date() if hasattr(last_start, "date") else last_start
    ovulation_day = pd.Timestamp(result["estimated_ovulation_day"]).date()
    next_period = pd.Timestamp(result["predicted_next_period"]).date()

    days_since_start = (reference_date - last_start).days

    if days_since_start < 0:
        # Asking about a date before their last logged period start -
        # we don't have data to reason about this, don't guess.
        return {"phase": "unknown", "reason": "reference date precedes last logged cycle start"}

    if days_since_start < period_length_days:
        phase = "menstrual"
    elif reference_date < ovulation_day:
        phase = "follicular"
    elif reference_date <= ovulation_day + timedelta(days=1):
        phase = "ovulation"
    elif reference_date < next_period:
        phase = "luteal"
    else:
        # Predicted period date has come and gone with no new logged entry.
        # Likely means the period started but hasn't been logged yet, or
        # it's running late - either way, don't confidently claim a phase.
        return {
            "phase": "unknown",
            "reason": "predicted period date has passed without a new logged "
                      "entry - prompt the user to confirm/log their period start",
            "days_overdue": (reference_date - next_period).days,
        }

    return {
        "phase": phase,
        "days_since_last_period_start": days_since_start,
        "estimated_ovulation_day": str(ovulation_day),
        "predicted_next_period": str(next_period),
    }


def ml_prediction(df: pd.DataFrame, user_id: str, min_cycles: int = 8):
    """
    Optional upgrade: gradient boosting regressor predicting next cycle_length
    from lag features (previous cycle lengths + age/BMI if present).
    Only use this once you have enough history per user - with too few
    rows it will just overfit and be less reliable than the statistical
    baseline above.
    """
    from sklearn.ensemble import GradientBoostingRegressor

    user_df = df[df["user_id"] == user_id].dropna(subset=["cycle_length"]).copy()
    if len(user_df) < min_cycles:
        return {
            "status": "insufficient_data",
            "message": f"ML upgrade needs {min_cycles}+ cycles; "
                       f"only {len(user_df)} available. Use statistical_prediction() instead.",
        }

    # lag features: previous 1-3 cycle lengths
    for lag in (1, 2, 3):
        user_df[f"lag_{lag}"] = user_df["cycle_length"].shift(lag)

    feature_cols = [c for c in user_df.columns if c.startswith("lag_")]
    for optional_col in ("age", "bmi"):
        if optional_col in user_df.columns:
            feature_cols.append(optional_col)

    # Only drop rows missing a value in the columns we actually use -
    # this dataset has ~80 columns total and many unrelated fields (e.g.
    # occupation, medical notes) have gaps that shouldn't affect this model.
    user_df = user_df.dropna(subset=feature_cols + ["cycle_length"])

    X = user_df[feature_cols]
    y = user_df["cycle_length"]

    model = GradientBoostingRegressor(n_estimators=100, max_depth=2, random_state=42)
    model.fit(X, y)

    last_row = X.iloc[[-1]]
    predicted_length = model.predict(last_row)[0]

    return {
        "status": "ok",
        "predicted_cycle_length": round(float(predicted_length), 1),
        "note": "Combine this with the same ovulation/fertile-window/PMS math "
                "used in statistical_prediction(), just swap in this length.",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    parser.add_argument("--user_id", required=True)
    parser.add_argument("--mode", choices=["stats", "ml"], default="stats")
    args = parser.parse_args()

    data = load_and_prepare(args.csv)
    if args.mode == "stats":
        result = statistical_prediction(data, args.user_id)
    else:
        result = ml_prediction(data, args.user_id)

    for k, v in result.items():
        print(f"{k}: {v}")