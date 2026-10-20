import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.llm_api import get_provider
from app.llm_provider import ProviderError
from app.warehouse_planner import WarehousePlan, ExplicitWarehouseQuery
from pydantic import ValidationError

client = TestClient(app)
QUERY = dict(metrics=['revenue', 'gross_profit'], dimensions=[], start_date='2026-07-01', end_date='2026-09-30', region='Europe', limit=100)

class FakeProvider:
    model = 'test-model'
    def __init__(self, proposal): self.proposal = proposal
    def complete(self, *, system, question):
        if isinstance(self.proposal, Exception): raise self.proposal
        return json.dumps(self.proposal)

@pytest.fixture(autouse=True)
def cleanup():
    yield
    app.dependency_overrides.pop(get_provider, None)

def call(proposal, question='Show Europe revenue and gross profit for Q3 2026'):
    app.dependency_overrides[get_provider] = lambda: FakeProvider(proposal)
    return client.post('/api/v2/plan/llm', json={'question': question})

def test_ready_never_executes(monkeypatch):
    monkeypatch.delenv('METRICMIND_WAREHOUSE_PATH', raising=False)
    r = call(dict(status='ready', query=QUERY, message='Review this preview.'))
    assert r.status_code == 200
    data = r.json()
    assert data['query'] == QUERY
    assert data['requires_review'] and data['contract_version'] == '2.0'
    assert 'rows' not in data and data['model'] == 'test-model'

@pytest.mark.parametrize('status', ['needs_clarification', 'unsupported'])
def test_non_ready(status):
    assert call(dict(status=status, query=None, message='Please clarify scope.')).json()['query'] is None

@pytest.mark.parametrize('field', list(QUERY))
def test_all_fields_required(field):
    query = dict(QUERY); query.pop(field)
    assert call(dict(status='ready', query=query, message='Preview')).status_code == 502

def test_schema_required():
    assert set(ExplicitWarehouseQuery.model_json_schema()['required']) == set(QUERY)

@pytest.mark.parametrize('change', [dict(region='EU'), dict(metrics=['reported_profit']), dict(limit=1001), dict(limit=True), dict(dimensions=['month']), dict(end_date='2025-01-01'), dict(sql='SELECT 1')])
def test_invalid_provider_query(change):
    query = dict(QUERY); query.update(change)
    assert call(dict(status='ready', query=query, message='Preview')).status_code == 502

@pytest.mark.parametrize('status,query', [('ready', None), ('unsupported', QUERY), ('needs_clarification', QUERY)])
def test_inconsistent_status(status, query):
    with pytest.raises(ValidationError):
        WarehousePlan(status=status, query=query, message='Preview')

def test_sanitized_error():
    response = call(ProviderError('secret-provider-detail'))
    assert response.status_code == 502 and 'secret-provider-detail' not in response.text

def test_blank_input():
    assert call({}, '   ').status_code == 422

def test_missing_config(monkeypatch):
    monkeypatch.delenv('GROQ_API_KEY', raising=False)
    monkeypatch.delenv('GROQ_MODEL', raising=False)
    assert client.post('/api/v2/plan/llm', json={'question':'Show Europe revenue for Q3 2026'}).status_code == 503
