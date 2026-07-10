"""
Elara - Database layer
=======================
SQLite for the hackathon build - zero setup, single file, good enough for
a demo. Swap for Postgres later without changing the schema shape.

Tables:
  cycle_logs  - one row per logged period start
  mood_logs   - one row per check-in (journal entry + wellness agent result)
"""

import sqlite3
import pandas as pd
from contextlib import contextmanager

DB_PATH = "elara.db"


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cycle_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                cycle_start_date TEXT NOT NULL,
                period_length INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS mood_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                entry_date TEXT NOT NULL,
                entry_text TEXT NOT NULL,
                mood_score INTEGER,
                themes TEXT,
                flag_for_support INTEGER,
                phase TEXT,
                agent_response TEXT,
                status TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)


def add_cycle_log(user_id: str, cycle_start_date: str, period_length: int = None):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO cycle_logs (user_id, cycle_start_date, period_length) VALUES (?, ?, ?)",
            (user_id, cycle_start_date, period_length),
        )


def add_mood_log(user_id: str, entry_date: str, entry_text: str, mood_score,
                  themes, flag_for_support: bool, phase: str, agent_response: str, status: str):
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO mood_logs
               (user_id, entry_date, entry_text, mood_score, themes, flag_for_support,
                phase, agent_response, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, entry_date, entry_text, mood_score,
             ",".join(themes) if themes else "", int(bool(flag_for_support)),
             phase, agent_response, status),
        )


def get_cycle_df(user_id: str = None) -> pd.DataFrame:
    """
    Returns a DataFrame shaped exactly like what cycle_predictor.py's
    load_and_prepare() produces: user_id, cycle_start_date, cycle_length.
    This is the live-data equivalent of loading a CSV - same schema, so
    statistical_prediction() / derive_phase_from_prediction() work unchanged.
    """
    with get_conn() as conn:
        query = "SELECT user_id, cycle_start_date, period_length FROM cycle_logs"
        params = ()
        if user_id:
            query += " WHERE user_id = ?"
            params = (user_id,)
        df = pd.read_sql_query(query, conn, params=params)

    if df.empty:
        return df

    df["cycle_start_date"] = pd.to_datetime(df["cycle_start_date"])
    df = df.sort_values(["user_id", "cycle_start_date"]).reset_index(drop=True)
    df["cycle_length"] = df.groupby("user_id")["cycle_start_date"].diff().dt.days
    return df


def get_mood_logs(user_id: str) -> list:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM mood_logs WHERE user_id = ? ORDER BY entry_date ASC",
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]