import sqlite3
from pathlib import Path


def get_connection(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def run_migrations(db_path: str) -> None:
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection(db_path)
    # __file__ is src/expert_answers/database.py → parents[2] = backend/
    sql = (Path(__file__).parents[2] / "migrations" / "expert_answers" / "001_initial_schema.sql").read_text()
    conn.executescript(sql)
    conn.close()
