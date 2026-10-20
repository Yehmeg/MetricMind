import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .warehouse_api import router as warehouse_router
from .contracts import Query, Result
from .semantic import CATALOG, MockSemanticClient
from .planner_api import router as planner_router

app = FastAPI(title='MetricMind Backend', version='0.1.0',
              description='V1 mock queries and planning; V2 governed SQLite demonstration queries.')
client = MockSemanticClient()

from .llm_api import router as llm_router

app.include_router(llm_router)
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[value.strip() for value in os.environ.get(
        'METRICMIND_CORS_ORIGINS',
        'http://localhost:3000,http://127.0.0.1:3000'
    ).split(',') if value.strip()],
    allow_credentials=False,
    allow_methods=['GET', 'POST'],
    allow_headers=['Content-Type'],
)
app.include_router(warehouse_router)
