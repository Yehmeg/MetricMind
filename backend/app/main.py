from fastapi import FastAPI
from .contracts import Query, Result
from .semantic import CATALOG, MockSemanticClient
from .planner_api import router as planner_router

app = FastAPI(title='MetricMind Backend', version='0.1.0',
              description='Milestone 1: structured queries against synthetic fixtures. No LLM or warehouse yet.')
client = MockSemanticClient()

@app.get('/health')
def health():
    return {'status': 'ok', 'mode': 'mock', 'contract_version': '0.1'}

@app.get('/api/v1/metrics')
def metrics():
    return {'metrics': CATALOG, 'dimensions': ['market', 'category'],
            'date_bounds': 'Inclusive calendar dates', 'mode': 'mock',
            'max_window_days': 366, 'max_rows': 1000}

@app.post('/api/v1/query', response_model=Result)
def query(request: Query):
    return client.execute(request)

app.include_router(planner_router)