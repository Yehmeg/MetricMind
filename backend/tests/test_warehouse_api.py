import os
import sqlite3
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def warehouse(monkeypatch, tmp_path):
    location = os.environ.get('METRICMIND_TEST_WAREHOUSE')
    if not location:
        pytest.skip('Set METRICMIND_TEST_WAREHOUSE to Member-1 generated fixture to run integration tests')
    source = Path(location)
    target = tmp_path / 'warehouse.sqlite'
    target.write_bytes(source.read_bytes())
    monkeypatch.setenv('METRICMIND_WAREHOUSE_PATH', str(target))
    return target

def payload(**changes):
    return dict(metrics=['revenue', 'cost', 'gross_profit', 'margin_pct', 'material_cost', 'shipping_cost', 'orders'],
                start_date='2026-07-01', end_date='2026-09-30', region='Europe', **changes)

def test_reference_totals(warehouse):
    response = client.post('/api/v2/query', json=payload())
    assert response.status_code == 200
    body = response.json()
    assert body['rows'] == [dict(revenue='7200.00', cost='5600.00', gross_profit='1600.00', margin_pct='22.222222', material_cost='3600.00', shipping_cost='2000.00', orders='8')]
    assert body['execution']['read_only']
    assert body['data_kind'] == 'synthetic'
    assert client.get('/api/v2/health').json()['row_count'] == 24

def test_q2(warehouse):
    q = payload(); q.update(start_date='2026-04-01', end_date='2026-06-30')
    assert client.post('/api/v2/query', json=q).json()['rows'][0]['margin_pct'] == '38.888889'

def test_group_limit_and_fingerprint(warehouse):
    first = client.post('/api/v2/query', json=payload(dimensions=['category'], limit=1)).json()
    second = client.post('/api/v2/query', json=payload(dimensions=['category'], limit=1)).json()
    assert first['truncated'] and first['total_groups'] == 2 and len(first['rows']) == 1
    assert first['rows'] == second['rows']
    assert first['dataset_version'] == second['dataset_version']

@pytest.mark.parametrize('dimensions', [[], ['category']])
def test_no_data(warehouse, dimensions):
    q = payload(dimensions=dimensions); q.update(start_date='2014-01-01', end_date='2014-03-31')
    body = client.post('/api/v2/query', json=q).json()
    assert body['status'] == 'no_data' and body['rows'] == [] and body['total_groups'] == 0

@pytest.mark.parametrize('change', [dict(region='EU'), dict(metrics=['reported_profit']), dict(limit=0), dict(limit=True), dict(dimensions=['category','category']), dict(start_date='2027-01-01'), dict(end_date='2028-01-01'), dict(sql='DROP TABLE fact_sales')])
def test_rejects_invalid(change):
    q = payload(); q.update(change)
    assert client.post('/api/v2/query', json=q).status_code == 422

def test_missing_database(monkeypatch):
    monkeypatch.delenv('METRICMIND_WAREHOUSE_PATH', raising=False)
    assert client.post('/api/v2/query', json=payload()).status_code == 503
    assert client.get('/health').status_code == 200

def test_zero_revenue(warehouse):
    with sqlite3.connect(warehouse) as con:
        con.execute('UPDATE fact_sales SET discount_cents=gross_cents, revenue_cents=0')
    assert client.post('/api/v2/query', json=payload()).json()['rows'][0]['margin_pct'] is None

def test_cors():
    headers = {'Origin':'http://localhost:3000','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}
    response = client.options('/api/v2/query', headers=headers)
    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == 'http://localhost:3000'
    headers['Origin'] = 'https://unapproved.example'
    assert 'access-control-allow-origin' not in client.options('/api/v2/query', headers=headers).headers
