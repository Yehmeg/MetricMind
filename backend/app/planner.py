"""A deliberately narrow offline planner; not an LLM or data executor."""
import calendar
import re
from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from .contracts import Query

class PlanRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    question: str = Field(min_length=1, max_length=1000)

class PlanResponse(BaseModel):
    status: Literal['ready', 'needs_clarification', 'unsupported']
    planner_mode: Literal['rules_v1'] = 'rules_v1'
    query: Query | None = None
    message: str

METRICS = {
    'revenue': 'revenue', 'sales': 'revenue',
    'profit': 'reported_profit', 'reported profit': 'reported_profit',
    'profit margin': 'reported_profit_margin',
    'reported profit margin': 'reported_profit_margin',
    'shipping cost': 'shipping_cost',
}
MARKETS = {m.lower(): m for m in ('EU', 'US', 'LATAM', 'Africa', 'APAC', 'EMEA', 'Canada')}
EXAMPLE = 'Use: Show EU revenue and profit for Q4 2014 by category. Use all markets for no market filter.'

def plan(request: PlanRequest) -> PlanResponse:
    text = ' '.join(request.question.lower().split()).rstrip('?.')
    match = re.fullmatch(
        r'(?:show|get) (?:(all markets|eu|us|latam|africa|apac|emea|canada) )?'
        r'([a-z ,]+?) for (q[1-4](?: [0-9]{4})?|[0-9]{4}|last quarter)'
        r'(?: by (category|market))?', text)
    if not match:
        return PlanResponse(status='unsupported', message='This question is outside the offline planner grammar. ' + EXAMPLE)
    market, metric_text, period, dimension = match.groups()
    tokens = re.split(r'\s*(?:,\s*(?:and\s+)?|\band\b)\s*', metric_text)
    if any(token not in METRICS for token in tokens):
        return PlanResponse(status='unsupported', message='Supported metrics: revenue, profit, profit margin, shipping cost. ' + EXAMPLE)
    missing = []
    if market is None:
        missing.append('a market code or all markets')
    if period == 'last quarter' or re.fullmatch(r'q[1-4]', period):
        missing.append('an explicit calendar quarter and year (for example Q4 2014)')
    if missing:
        return PlanResponse(status='needs_clarification', message='Please specify ' + ' and '.join(missing) + '.')
    year = int(period.split()[-1])
    if year == 0:
        return PlanResponse(status='unsupported', message='The calendar year must be between 0001 and 9999.')
    first_month, last_month = (1, 12) if len(period) == 4 else ((int(period[1])-1)*3+1, int(period[1])*3)
    query = Query(metrics=list(dict.fromkeys(METRICS[token] for token in tokens)),
                  dimensions=[dimension] if dimension else [],
                  start_date=date(year, first_month, 1),
                  end_date=date(year, last_month, calendar.monthrange(year, last_month)[1]),
                  market=None if market == 'all markets' else MARKETS[market])
    return PlanResponse(status='ready', query=query,
                        message='Preview only. Review the query before submitting it to /api/v1/query. That endpoint currently uses synthetic fixtures.')
