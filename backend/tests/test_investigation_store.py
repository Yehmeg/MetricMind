import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import investigation_store as store
from app import investigation_api
from test_investigation_api import warehouse, request

client = TestClient(app)

@pytest.fixture(autouse=True)
def trace_db(monkeypatch, tmp_path):
    path = tmp_path / 'traces.sqlite'
    monkeypatch.setenv('METRICMIND_TRACE_DB_PATH', str(path))
    return path

def test_roundtrip_survives_new_process(warehouse, trace_db, monkeypatch):
    before = warehouse.read_bytes()
    response = client.post('/api/v2/investigate/margin', json=request())
    assert response.status_code == 200
    body = response.json()
    assert body['trace_persistence'] == 'sqlite' and body['saved_at']
    assert client.get(body['trace_url']).json() == body
    # New Python process has no app memory; warehouse is unavailable during retrieval.
    env = dict(os.environ, METRICMIND_WAREHOUSE_PATH='missing.sqlite')
    env['PYTHONPATH'] = str(Path(__file__).resolve().parents[1])
    result = subprocess.run([sys.executable, '-c',
        'import json,sys; from app.investigation_store import load; print(json.dumps(load(sys.argv[1])))',
        body['investigation_id']], env=env, capture_output=True, text=True, check=True)
    assert json.loads(result.stdout) == body
    assert warehouse.read_bytes() == before

def test_insufficient_data_saved(warehouse):
    q = request(); q['baseline'] = dict(start_date='2025-04-01', end_date='2025-06-30')
    body = client.post('/api/v2/investigate/margin', json=q).json()
    assert body['status'] == 'insufficient_data'
    assert client.get(body['trace_url']).json() == body

def test_disabled_is_backward_compatible(warehouse, monkeypatch, trace_db):
    monkeypatch.delenv('METRICMIND_TRACE_DB_PATH')
    body = client.post('/api/v2/investigate/margin', json=request()).json()
    assert body['trace_persistence'] == 'response_only'
    assert not trace_db.exists()
    assert client.get('/api/v2/investigations/' + body['investigation_id']).status_code == 503

def test_unknown_does_not_create_database(trace_db):
    assert client.get('/api/v2/investigations/' + str(uuid4())).status_code == 404
    assert not trace_db.exists()

def test_unknown_in_existing_store():
    store.save(dict(investigation_id=str(uuid4())))
    assert client.get('/api/v2/investigations/' + str(uuid4())).status_code == 404

def test_invalid_id():
    assert client.get('/api/v2/investigations/not-a-uuid').status_code == 422

def test_same_warehouse_rejected(warehouse, monkeypatch):
    before = warehouse.read_bytes()
    monkeypatch.setenv('METRICMIND_TRACE_DB_PATH', str(warehouse))
    assert client.post('/api/v2/investigate/margin', json=request()).status_code == 503
    assert warehouse.read_bytes() == before

def test_warehouse_rejected_even_without_env(warehouse, monkeypatch):
    before = warehouse.read_bytes()
    monkeypatch.setenv('METRICMIND_TRACE_DB_PATH', str(warehouse))
    monkeypatch.delenv('METRICMIND_WAREHOUSE_PATH')
    with pytest.raises(store.TraceStoreError):
        store.save(dict(investigation_id=str(uuid4())))
    assert warehouse.read_bytes() == before

def test_missing_parent_sanitized(warehouse, monkeypatch, tmp_path):
    monkeypatch.setenv('METRICMIND_TRACE_DB_PATH', str(tmp_path / 'private-path' / 'trace.sqlite'))
    response = client.post('/api/v2/investigate/margin', json=request())
    assert response.status_code == 503
    assert 'private-path' not in response.text

def test_duplicate_does_not_overwrite():
    body = dict(investigation_id=str(uuid4()), marker='original')
    saved = store.save(body)
    with pytest.raises(store.TraceStoreError):
        store.save(dict(body, marker='changed'))
    assert store.load(body['investigation_id']) == saved

def test_corrupt_storage_sanitized(trace_db):
    trace_db.write_text('not a database')
    response = client.get('/api/v2/investigations/' + str(uuid4()))
    assert response.status_code == 503 and str(trace_db) not in response.text

def test_locked_storage_rolls_back(trace_db):
    store.save(dict(investigation_id=str(uuid4())))
    with sqlite3.connect(trace_db) as db:
        db.execute('BEGIN IMMEDIATE')
        identifier = str(uuid4())
        with pytest.raises(store.TraceStoreError):
            store.save(dict(investigation_id=identifier))
    assert store.load(identifier) is None

def test_failed_investigation_not_saved(warehouse, monkeypatch, trace_db):
    original = investigation_api.execute
    calls = []
    def changed(query):
        result = original(query); calls.append(1)
        if len(calls) == 2: result['dataset_version'] = 'changed'
        return result
    monkeypatch.setattr(investigation_api, 'execute', changed)
    assert client.post('/api/v2/investigate/margin', json=request()).status_code == 409
    assert not trace_db.exists()
