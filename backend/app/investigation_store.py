"""Optional local-demo evidence store. Never writes into the warehouse."""
import json
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

class TraceStoreError(Exception):
    pass

def configured_path():
    value = os.environ.get('METRICMIND_TRACE_DB_PATH', '').strip()
    return Path(value).resolve() if value else None

def checked_path():
    path = configured_path()
    if path is None:
        raise TraceStoreError('Trace persistence is not configured')
    warehouse = os.environ.get('METRICMIND_WAREHOUSE_PATH', '').strip()
    if warehouse:
        other = Path(warehouse).resolve()
        if path == other or (path.exists() and other.exists() and path.samefile(other)):
            raise TraceStoreError('Trace database must be separate from the warehouse')
    if not path.parent.is_dir():
        raise TraceStoreError('Trace database parent directory must exist')
    return path

def check_schema(db):
    objects = db.execute("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").fetchall()
    if any(name != 'metricmind_investigations_v1' for (name,) in objects):
        raise TraceStoreError('Database is not a dedicated investigation store')

def save(response):
    """Return saved response only after commit; no replace/upsert of existing IDs."""
    if configured_path() is None:
        return response
    try:
        path = checked_path()
        saved = dict(response, trace_persistence='sqlite',
                     saved_at=datetime.now(timezone.utc).isoformat(),
                     trace_url='/api/v2/investigations/' + response['investigation_id'])
        payload = json.dumps(saved, allow_nan=False, separators=(',', ':'))
        with closing(sqlite3.connect(path, timeout=2)) as db:
            with db:
                db.execute('BEGIN IMMEDIATE')
                check_schema(db)
                db.execute('CREATE TABLE IF NOT EXISTS metricmind_investigations_v1 '
                           '(investigation_id TEXT PRIMARY KEY, payload TEXT NOT NULL)')
                db.execute('INSERT INTO metricmind_investigations_v1 VALUES (?, ?)',
                           (saved['investigation_id'], payload))
        return saved
    except (OSError, sqlite3.Error, ValueError) as exc:
        raise TraceStoreError('Investigation evidence could not be saved') from exc

def load(investigation_id):
    try:
        path = checked_path()
        if not path.exists():
            return None
        with closing(sqlite3.connect(path.as_uri() + '?mode=ro', uri=True, timeout=2)) as db:
            db.execute('PRAGMA query_only=ON')
            check_schema(db)
            row = db.execute('SELECT payload FROM metricmind_investigations_v1 WHERE investigation_id=?',
                             (str(investigation_id),)).fetchone()
        if row is None:
            return None
        result = json.loads(row[0])
        if not isinstance(result, dict) or result.get('investigation_id') != str(investigation_id):
            raise TraceStoreError('Invalid stored investigation')
        return result
    except (OSError, sqlite3.Error, ValueError) as exc:
        raise TraceStoreError('Investigation evidence could not be read') from exc
