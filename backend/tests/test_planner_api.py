from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_plan_then_execute_fixture():
    response = client.post('/api/v1/plan', json={'question': 'Show EU revenue and profit for Q4 2014'})
    assert response.status_code == 200
    preview = response.json()
    assert preview['status'] == 'ready'
    result = client.post('/api/v1/query', json=preview['query'])
    assert result.status_code == 200
    assert result.json()['source'] == 'mock_fixture'
    assert result.json()['rows'] == [{'revenue': '1000', 'reported_profit': '185'}]

def test_plan_clarification():
    response = client.post('/api/v1/plan', json={'question': 'Show revenue for Q4'})
    assert response.status_code == 200
    assert response.json()['status'] == 'needs_clarification'
    assert response.json()['query'] is None

def test_plan_rejects_blank_input():
    assert client.post('/api/v1/plan', json={'question': '  '}).status_code == 422
