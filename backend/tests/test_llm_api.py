import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.llm_api import get_provider
from app.llm_provider import ProviderError

QUERY = {'metrics': ['revenue'], 'dimensions': [], 'start_date': '2014-10-01',
         'end_date': '2014-12-31', 'market': 'EU', 'limit': 100}

class Stub:
    model = 'test-model'
    def __init__(self, answer): self.answer = answer
    def complete(self, **kwargs):
        if isinstance(self.answer, Exception): raise self.answer
        return self.answer

@pytest.fixture
def client():
    previous = app.dependency_overrides.copy()
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous)

def configure(answer):
    app.dependency_overrides[get_provider] = lambda: Stub(answer)

def test_ready_preview_does_not_execute(client, monkeypatch):
    from app import main
    def forbidden(*args, **kwargs): raise AssertionError('Preview executed a query')
    monkeypatch.setattr(main.client, 'execute', forbidden)
    configure(json.dumps({'status': 'ready', 'query': QUERY, 'message': 'Review this query'}))
    response = client.post('/api/v1/plan/llm', json={'question': 'Revenue in EU in Q4 2014?'})
    assert response.status_code == 200
    body = response.json()
    assert body['query'] == QUERY
    assert body['requires_review'] is True
    assert body['provider'] == 'groq'
    assert body['model'] == 'test-model'
    assert 'rows' not in body

@pytest.mark.parametrize('status', ['needs_clarification', 'unsupported'])
def test_nonready_plan(client, status):
    configure(json.dumps({'status': status, 'query': None, 'message': 'Please revise the question'}))
    response = client.post('/api/v1/plan/llm', json={'question': 'Revenue?'})
    assert response.status_code == 200
    assert response.json()['status'] == status
    assert response.json()['query'] is None

@pytest.mark.parametrize('answer', ['bad json', ProviderError('SECRET provider details')])
def test_failed_plan_is_sanitized(client, answer):
    configure(answer)
    response = client.post('/api/v1/plan/llm', json={'question': 'Revenue?'})
    assert response.status_code == 502
    assert 'SECRET' not in response.text
    assert 'query' not in response.json()

def test_missing_config_and_offline_still_works(client, monkeypatch):
    monkeypatch.delenv('GROQ_API_KEY', raising=False)
    monkeypatch.delenv('GROQ_MODEL', raising=False)
    assert client.post('/api/v1/plan/llm', json={'question': 'Revenue?'}).status_code == 503
    response = client.post('/api/v1/plan', json={'question': 'Show EU revenue for Q4 2014'})
    assert response.status_code == 200
    assert response.json()['planner_mode'] == 'rules_v1'

def test_blank_request_does_not_call_provider(client):
    configure(AssertionError('Should not call provider'))
    assert client.post('/api/v1/plan/llm', json={'question': '  '}).status_code == 422
