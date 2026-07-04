import sqlite3
from pathlib import Path


def get_connection(db_path: str) -> sqlite3.Connection:
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def run_migrations(db_path: str) -> None:
    migrations_dir = Path(__file__).parent.parent.parent / "migrations" / "trust"
    conn = get_connection(db_path)
    for sql_file in sorted(migrations_dir.glob("*.sql")):
        conn.executescript(sql_file.read_text())
    conn.commit()
    conn.close()
