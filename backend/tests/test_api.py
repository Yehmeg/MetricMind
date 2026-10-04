from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
BODY = {'metrics': ['revenue'], 'start_date': '2014-10-01',
        'end_date': '2014-12-31', 'market': 'EU'}

def test_health_and_catalog():
    assert client.get('/health').json()['mode'] == 'mock'
    assert 'reported_profit_margin' in client.get('/api/v1/metrics').json()['metrics']

def test_successful_query():
    result = client.post('/api/v1/query', json=BODY)
    assert result.status_code == 200
    assert result.json()['rows'] == [{'revenue': '1000'}]
    assert result.json()['source'] == 'mock_fixture'

def test_sql_rejected():
    assert client.post('/api/v1/query', json={**BODY, 'sql': 'SELECT 1'}).status_code == 422

def test_unknown_metric_rejected():
    assert client.post('/api/v1/query', json={**BODY, 'metrics': ['churn']}).status_code == 422

def test_missing_dates_rejected():
    assert client.post('/api/v1/query', json={'metrics': ['revenue']}).status_code == 422
