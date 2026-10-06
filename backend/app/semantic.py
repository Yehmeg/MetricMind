"""Local test double. It is not Cube/dbt and does not load Superstore."""
from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Protocol
from uuid import uuid4
from .contracts import Query, Result

CATALOG = {
    'revenue': 'SUM(sales); source units, currency not asserted',
    'reported_profit': 'SUM(profit); accounting definition requires source documentation',
    'reported_profit_margin': '100 * SUM(profit) / SUM(sales); NULL when SUM(sales)=0',
    'shipping_cost': 'SUM(shipping_cost); never subtracted again from supplied profit',
}

# Deliberately synthetic values for testing the interface and aggregation.
# date, market, category, sales, profit, shipping_cost
FIXTURE = (
    ('2014-10-01', 'EU', 'Furniture', '100', '10', '5'),
    ('2014-11-01', 'EU', 'Technology', '900', '180', '20'),
    ('2014-12-31', 'EU', 'Furniture', '0', '-5', '2'),
    ('2014-09-30', 'EU', 'Furniture', '200', '40', '6'),
    ('2014-10-01', 'US', 'Furniture', '300', '60', '8'),
)

class SemanticClient(Protocol):
    def execute(self, query: Query) -> Result: ...

class MockSemanticClient:
    def execute(self, query: Query) -> Result:
        # Revalidate even when a future caller bypasses ordinary API construction.
        query = Query.model_validate(query.model_dump(mode='json'))
        groups = defaultdict(lambda: [Decimal(0), Decimal(0), Decimal(0)])
        for day, market, category, sales, profit, shipping in FIXTURE:
            if not query.start_date <= date.fromisoformat(day) <= query.end_date:
                continue
            if query.market is not None and market != query.market:
                continue
            labels = {'market': market, 'category': category}
            key = tuple(labels[name] for name in query.dimensions)
            totals = groups[key]
            for i, value in enumerate((sales, profit, shipping)):
                totals[i] += Decimal(value)
        rows = []
        warnings = ['Synthetic fixture results only. These are not Superstore results.']
        for key, (sales, profit, shipping) in sorted(groups.items()):
            values = {'revenue': sales, 'reported_profit': profit,
                      'shipping_cost': shipping,
                      'reported_profit_margin': profit / sales * 100 if sales else None}
            row = dict(zip(query.dimensions, key))
            for name in query.metrics:
                value = values[name]
                row[name] = None if value is None else format(value, 'f')
            rows.append(row)
            if sales == 0 and 'reported_profit_margin' in query.metrics:
                warnings.append('A group has zero revenue; its margin is null.')
        return Result(request_id=str(uuid4()), status='ok' if rows else 'no_data',
                      query=query, rows=rows[:query.limit], total_groups=len(rows),
                      truncated=len(rows) > query.limit,
                      metric_definitions={m: CATALOG[m] for m in query.metrics},
                      warnings=list(dict.fromkeys(warnings)))
