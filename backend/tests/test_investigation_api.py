import os
import sqlite3
from pathlib import Path
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import investigation_api as module

client=TestClient(app)
def request():
    return dict(region='Europe',baseline=dict(start_date='2026-04-01',end_date='2026-06-30'),comparison=dict(start_date='2026-07-01',end_date='2026-09-30'))

@pytest.fixture
def warehouse(monkeypatch,tmp_path):
    location=os.environ.get('METRICMIND_TEST_WAREHOUSE')
    if not location: pytest.skip('Set METRICMIND_TEST_WAREHOUSE to original Member-1 fixture')
    db=tmp_path/'warehouse.sqlite'; db.write_bytes(Path(location).read_bytes())
    monkeypatch.setenv('METRICMIND_WAREHOUSE_PATH',str(db))
    return db

def test_reference_investigation(warehouse):
    before=warehouse.read_bytes()
    response=client.post('/api/v2/investigate/margin',json=request())
    assert response.status_code==200
    body=response.json(); a=body['analysis']
    assert body['status']=='complete' and body['query_count']==2 and len(body['trace'])==3
    assert a['margin_change_pp']=='-16.666667'
    assert a['margin_contributions_pp']==dict(revenue='0.000000',material_cost='0.000000',shipping_cost='-16.666667')
    assert a['gross_profit_change_usd']=='-1200.00'
    assert warehouse.read_bytes()==before

def test_unequal_revenue_bridge(warehouse):
    with sqlite3.connect(warehouse) as db:
        db.execute("UPDATE fact_sales SET gross_cents=gross_cents+10000,revenue_cents=revenue_cents+10000 WHERE date_key >= '2026-07-01'")
    a=client.post('/api/v2/investigate/margin',json=request()).json()['analysis']
    assert Decimal(a['margin_contributions_pp']['revenue'])>0
    assert sum(map(Decimal,a['margin_contributions_pp'].values()))+Decimal(a['rounding_residual_pp'])==Decimal(a['margin_change_pp'])
    assert sum(map(Decimal,a['gross_profit_bridge_usd'].values()))==Decimal(a['gross_profit_change_usd'])

def test_no_change(warehouse):
    q=request();q['region']='North America'
    a=client.post('/api/v2/investigate/margin',json=q).json()['analysis']
    assert Decimal(a['margin_change_pp'])==0

def test_no_data(warehouse):
    q=request();q['baseline']=dict(start_date='2025-04-01',end_date='2025-06-30')
    body=client.post('/api/v2/investigate/margin',json=q).json()
    assert body['status']=='insufficient_data' and body['analysis'] is None

def test_zero_revenue(warehouse):
    with sqlite3.connect(warehouse) as db:
        db.execute('UPDATE fact_sales SET discount_cents=gross_cents,revenue_cents=0')
    assert client.post('/api/v2/investigate/margin',json=request()).json()['status']=='insufficient_data'

@pytest.mark.parametrize('change',[{'region':'EU'},{'baseline':{'start_date':'2026-07-01','end_date':'2026-07-04'}},{'comparison':{'start_date':'2026-07-01','end_date':'2028-07-01'}},{'sql':'SELECT 1'}])
def test_invalid(change):
    q=request();q.update(change)
    assert client.post('/api/v2/investigate/margin',json=q).status_code==422

def test_changed_snapshot(warehouse,monkeypatch):
    original=module.execute;calls=[]
    def changed(query):
        result=original(query);calls.append(1)
        if len(calls)==2: result['dataset_version']='changed'
        return result
    monkeypatch.setattr(module,'execute',changed)
    assert client.post('/api/v2/investigate/margin',json=request()).status_code==409

def test_missing_database(monkeypatch):
    monkeypatch.delenv('METRICMIND_WAREHOUSE_PATH',raising=False)
    assert client.post('/api/v2/investigate/margin',json=request()).status_code==503
