import copy
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.llm_api import get_provider
from app.llm_provider import ProviderError
from app import investigation_api

client = TestClient(app)
SCOPE = {'region':'Europe','baseline':{'start_date':'2026-04-01','end_date':'2026-06-30'},'comparison':{'start_date':'2026-07-01','end_date':'2026-09-30'}}
class Fake:
    model = 'test-model'
    def __init__(self, output): self.output = output
    def complete(self, *, system, question):
        if isinstance(self.output, Exception): raise self.output
        return self.output if isinstance(self.output,str) else json.dumps(self.output)

@pytest.fixture(autouse=True)
def clean():
    yield
    app.dependency_overrides.pop(get_provider,None)

def call(output, question='Why did Europe margin change from Q2 to Q3 2026?'):
    app.dependency_overrides[get_provider] = lambda: Fake(output)
    return client.post('/api/v2/plan/investigation',json={'question':question})

def ready(scope): return {'status':'ready','investigation':scope,'message':'Review these synthetic-data periods before executing.'}

def test_ready_without_execution(monkeypatch):
    monkeypatch.delenv('METRICMIND_WAREHOUSE_PATH',raising=False)
    def forbidden(*args,**kwargs): raise AssertionError('Preview executed warehouse query')
    monkeypatch.setattr(investigation_api,'execute',forbidden)
    response = call(ready(SCOPE))
    assert response.status_code == 200
    body=response.json()
    assert body['investigation']==SCOPE and body['requires_review']
    assert body['execution_endpoint']=='/api/v2/investigate/margin'
    assert 'analysis' not in body and 'trace' not in body

@pytest.mark.parametrize('status',['needs_clarification','unsupported'])
def test_non_ready(status):
    body=call({'status':status,'investigation':None,'message':'Please clarify or revise scope.'}).json()
    assert body['status']==status and body['investigation'] is None

@pytest.mark.parametrize('field',['region','baseline','comparison'])
def test_missing_field(field):
    scope=copy.deepcopy(SCOPE);scope.pop(field)
    assert call(ready(scope)).status_code==502

@pytest.mark.parametrize('period',['baseline','comparison'])
@pytest.mark.parametrize('field',['start_date','end_date'])
def test_missing_period_field(period,field):
    scope=copy.deepcopy(SCOPE);scope[period].pop(field)
    assert call(ready(scope)).status_code==502

@pytest.mark.parametrize('change',[{'region':'EU'},{'sql':'SELECT 1'},{'baseline':{'start_date':'2026-07-01','end_date':'2026-07-31'}},{'comparison':{'start_date':'2026-07-01','end_date':'2028-07-01'}}])
def test_invalid_scope(change):
    scope=copy.deepcopy(SCOPE);scope.update(change)
    assert call(ready(scope)).status_code==502

@pytest.mark.parametrize('status,scope',[('ready',None),('unsupported',SCOPE),('needs_clarification',SCOPE)])
def test_status_consistency(status,scope):
    assert call({'status':status,'investigation':scope,'message':'Preview'}).status_code==502

def test_invalid_json():
    assert call('not JSON').status_code==502

def test_provider_error_sanitized():
    response=call(ProviderError('secret debug details'))
    assert response.status_code==502 and 'secret debug details' not in response.text

def test_blank():
    assert call({},'   ').status_code==422

def test_missing_configuration(monkeypatch):
    monkeypatch.delenv('GROQ_API_KEY',raising=False)
    monkeypatch.delenv('GROQ_MODEL',raising=False)
    assert client.post('/api/v2/plan/investigation',json={'question':'Compare margin'}).status_code==503

def test_all_regions():
    scope=copy.deepcopy(SCOPE);scope['region']=None
    assert call(ready(scope)).json()['investigation']['region'] is None
