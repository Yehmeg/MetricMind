import json
import httpx
import pytest
from app.groq_provider import GroqProvider
from app.llm_provider import ProviderError
from app.llm_planner import propose
from app.planner import PlanRequest

QUERY = {'metrics': ['revenue'], 'dimensions': [], 'start_date': '2014-10-01',
         'end_date': '2014-12-31', 'market': 'EU', 'limit': 100}

class FakeProvider:
    def __init__(self, result): self.result = result
    def complete(self, *, system, question):
        assert 'Schema:' in system
        return self.result

def test_valid_plan():
    result = propose(PlanRequest(question='Revenue in EU for Q4 2014?'),
                     FakeProvider(json.dumps({'status': 'ready', 'query': QUERY, 'message': 'Preview only'})))
    assert result.query.metrics == ['revenue']
    assert result.query.market == 'EU'

@pytest.mark.parametrize('payload', [
    'not json',
    {'status': 'ready', 'query': None, 'message': 'Bad'},
    {'status': 'unsupported', 'query': QUERY, 'message': 'Bad'},
    {'status': 'ready', 'query': dict(QUERY, metrics=['material_cost']), 'message': 'Bad'},
    {'status': 'ready', 'query': dict(QUERY, sql='SELECT 1'), 'message': 'Bad'},
    {'status': 'ready', 'query': dict(QUERY, end_date='2010-01-01'), 'message': 'Bad'},
])
def test_invalid_plans_rejected(payload):
    with pytest.raises(ProviderError, match='invalid query plan'):
        propose(PlanRequest(question='test'), FakeProvider(payload if isinstance(payload, str) else json.dumps(payload)))

def test_clarification_has_no_query():
    result = propose(PlanRequest(question='Revenue?'), FakeProvider(json.dumps(
        {'status': 'needs_clarification', 'query': None, 'message': 'Which market and period?'})))
    assert result.query is None

def test_adapter_request_and_response():
    def handler(request):
        assert str(request.url) == 'https://api.groq.com/openai/v1/chat/completions'
        body = json.loads(request.content)
        assert body['messages'][1]['content'] == 'test question'
        assert body['response_format'] == {'type': 'json_object'}
        assert request.headers['authorization'] == 'Bearer test-key'
        return httpx.Response(200, json={'choices': [{'finish_reason': 'stop', 'message': {'content': '{}'}}]})
    provider = GroqProvider(api_key='test-key', model='test-model', transport=httpx.MockTransport(handler))
    assert provider.complete(system='Return JSON', question='test question') == '{}'

@pytest.mark.parametrize('status,body', [(401, {'error': 'SECRET'}), (429, {}), (500, {}),
    (200, {}), (200, {'choices': [{'finish_reason': 'length', 'message': {'content': '{}'}}]})])
def test_provider_failures_are_sanitized(status, body):
    provider = GroqProvider(api_key='SECRET', model='test-model',
        transport=httpx.MockTransport(lambda request: httpx.Response(status, json=body)))
    with pytest.raises(ProviderError) as error:
        provider.complete(system='JSON', question='test')
    assert 'SECRET' not in str(error.value)

def test_timeout():
    def handler(request): raise httpx.ReadTimeout('SECRET')
    provider = GroqProvider(api_key='test-key', model='test-model', transport=httpx.MockTransport(handler))
    with pytest.raises(ProviderError, match='timed out'):
        provider.complete(system='JSON', question='test')

def test_missing_configuration(monkeypatch):
    monkeypatch.delenv('GROQ_API_KEY', raising=False)
    monkeypatch.delenv('GROQ_MODEL', raising=False)
    with pytest.raises(ValueError): GroqProvider.from_env()
