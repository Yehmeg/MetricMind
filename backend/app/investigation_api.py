"""Bounded two-period margin investigation with inline evidence, no LLM calls."""
from datetime import date
from decimal import Decimal, localcontext
from time import monotonic
from typing import Literal
from uuid import UUID, uuid4
from . import investigation_store
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, model_validator
from .warehouse_api import WarehouseQuery, execute

class Period(BaseModel):
    model_config = ConfigDict(extra='forbid')
    start_date: date
    end_date: date

    @model_validator(mode='after')
    def bounded(self):
        if not 0 <= (self.end_date-self.start_date).days <= 366:
            raise ValueError('Period must be ascending and at most 366 days apart')
        return self

class InvestigationRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    region: Literal['Europe', 'North America'] | None
    baseline: Period
    comparison: Period

    @model_validator(mode='after')
    def chronological(self):
        if self.baseline.end_date >= self.comparison.start_date:
            raise ValueError('Comparison must follow baseline without overlap')
        return self

router = APIRouter(prefix='/api/v2', tags=['Investigations v2'])

def money(value):
    rounded = value.quantize(Decimal('0.01'))
    return format(abs(rounded) if rounded == 0 else rounded, '.2f')

def points(value):
    rounded = value.quantize(Decimal('0.000001'))
    return format(abs(rounded) if rounded == 0 else rounded, '.6f')

@router.post('/investigate/margin')
def investigate(request: InvestigationRequest):
    started = monotonic()
    trace = []
    results = []
    for name, period in [('baseline', request.baseline), ('comparison', request.comparison)]:
        query = WarehouseQuery(metrics=['revenue', 'material_cost', 'shipping_cost', 'gross_profit', 'margin_pct', 'orders'],
                               dimensions=[], region=request.region, limit=1, **period.model_dump())
        result = execute(query)
        results.append(result)
        trace.append({'step': len(trace)+1, 'operation': name+'_query',
                      'request_id': result['request_id'], 'query': result['query'],
                      'status': result['status'], 'rows': result['rows'],
                      'dataset_version': result['dataset_version'], 'execution': result['execution']})
    baseline, comparison = results
    if baseline['dataset_version'] != comparison['dataset_version']:
        raise HTTPException(409, 'Warehouse changed between investigation steps. Retry against a stable snapshot.')
    warnings = ['Synthetic demonstration data only; not approved financial reporting.',
                'Contributions are an accounting decomposition, not proof of real-world causation.']
    if (request.baseline.end_date-request.baseline.start_date) != (request.comparison.end_date-request.comparison.start_date):
        warnings.append('Periods differ in calendar length; totals are not normalized per day.')
    response = {'investigation_id': str(uuid4()), 'status': 'complete',
                'contract_version': '2.0', 'catalog_version': '1.0.0',
                'source': 'sqlite', 'data_kind': 'synthetic', 'currency': 'USD',
                'dataset_version': baseline['dataset_version'], 'request': request.model_dump(mode='json'),
                'baseline': baseline['rows'][0] if baseline['rows'] else None,
                'comparison': comparison['rows'][0] if comparison['rows'] else None,
                'analysis': None, 'trace': trace, 'warnings': warnings,
                'query_count': 2, 'trace_persistence': 'response_only'}
    if baseline['status'] == 'no_data' or comparison['status'] == 'no_data':
        response.update(status='insufficient_data', explanation='At least one period has no matching records; no change was calculated.')
    else:
        a, b = response['baseline'], response['comparison']
        r0, r1 = Decimal(a['revenue']), Decimal(b['revenue'])
        m0, m1 = Decimal(a['material_cost']), Decimal(b['material_cost'])
        s0, s1 = Decimal(a['shipping_cost']), Decimal(b['shipping_cost'])
        if r0 <= 0 or r1 <= 0:
            response.update(status='insufficient_data', explanation='Both periods need positive revenue for margin attribution.')
        else:
            with localcontext() as ctx:
                ctx.prec = 40
                margin0 = 100*(r0-m0-s0)/r0
                margin1 = 100*(r1-m1-s1)/r1
                # Symmetric decomposition of cost / revenue: average costs and inverse revenues.
                inverse_average = (1/r0+1/r1)/2
                effects = {'revenue': 100*((m0+s0+m1+s1)/2)*(1/r0-1/r1),
                           'material_cost': -100*(m1-m0)*inverse_average,
                           'shipping_cost': -100*(s1-s0)*inverse_average}
                displayed = {key: points(value) for key,value in effects.items()}
                change = margin1-margin0
                bridge = {'revenue': r1-r0, 'material_cost': -(m1-m0), 'shipping_cost': -(s1-s0)}
                profit_change = (r1-m1-s1)-(r0-m0-s0)
                analysis = {'baseline_margin_pct': points(margin0), 'comparison_margin_pct': points(margin1),
                            'margin_change_pp': points(change), 'margin_contributions_pp': displayed,
                            'rounding_residual_pp': points(Decimal(points(change))-sum(Decimal(v) for v in displayed.values())),
                            'gross_profit_change_usd': money(profit_change),
                            'gross_profit_bridge_usd': {key:money(value) for key,value in bridge.items()},
                            'method': 'Symmetric two-factor decomposition of each cost/revenue ratio; percentage-point contributions, not percentage changes.'}
                response['analysis'] = analysis
                direction = 'increased' if change>0 else 'decreased' if change<0 else 'was unchanged'
                response['explanation'] = (f"Margin {direction}: {points(margin0)}% to {points(margin1)}% "
                    f"(change {points(change)} percentage points). Accounting contributions in percentage points: "
                    f"revenue {displayed['revenue']}, material cost {displayed['material_cost']}, "
                    f"shipping cost {displayed['shipping_cost']}. Gross profit changed by USD {money(profit_change)}.")
                trace.append({'step':3, 'operation':'calculate_margin_bridge', 'inputs':['baseline_query','comparison_query'],
                              'method':analysis['method'], 'result':analysis})
    response['elapsed_ms'] = round((monotonic()-started)*1000,3)
    try:
        return investigation_store.save(response)
    except investigation_store.TraceStoreError:
        raise HTTPException(503, 'Investigation evidence could not be saved. Check trace storage configuration.') from None

@router.get('/investigations/{investigation_id}')
def get_investigation(investigation_id: UUID):
    try:
        result = investigation_store.load(investigation_id)
    except investigation_store.TraceStoreError:
        raise HTTPException(503, 'Investigation evidence storage is unavailable.') from None
    if result is None:
        raise HTTPException(404, 'Investigation not found.')
    return result
