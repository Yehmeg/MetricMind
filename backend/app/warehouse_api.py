"""Version 2: bounded, read-only queries against Member-1's demo warehouse."""
import hashlib
import os
import sqlite3
import time
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

Metric = Literal['revenue', 'cost', 'gross_profit', 'margin_pct', 'material_cost', 'shipping_cost', 'orders']
Dimension = Literal['region', 'country', 'category', 'year', 'quarter']
EXPRESSIONS = {
    'revenue': 'SUM(revenue_cents)',
    'cost': 'SUM(material_cents + shipping_cents)',
    'gross_profit': 'SUM(revenue_cents - material_cents - shipping_cents)',
    'material_cost': 'SUM(material_cents)',
    'shipping_cost': 'SUM(shipping_cents)',
    'orders': 'COUNT(DISTINCT order_id)',
}
DEFINITIONS = {
    'revenue': 'Gross line sales less line discount; USD.',
    'cost': 'Material plus shipping cost only; USD.',
    'gross_profit': 'Revenue less material and shipping costs; excludes overhead; USD.',
    'margin_pct': '100 * aggregate gross_profit / aggregate revenue; null when revenue is zero.',
    'material_cost': 'Sum of material costs; USD.',
    'shipping_cost': 'Sum of shipping costs; USD.',
    'orders': 'Distinct order IDs within the requested scope; not additive across groups.',
}
router = APIRouter(prefix='/api/v2', tags=['Warehouse v2'])

class WarehouseQuery(BaseModel):
    model_config = ConfigDict(extra='forbid')
    metrics: list[Metric] = Field(min_length=1, max_length=7)
    dimensions: list[Dimension] = Field(default_factory=list, max_length=5)
    start_date: date
    end_date: date
    region: Literal['Europe', 'North America'] | None = None
    limit: int = Field(default=100, ge=1, le=1000, strict=True)

    @model_validator(mode='after')
    def validate_scope(self):
        if not 0 <= (self.end_date - self.start_date).days <= 366:
            raise ValueError('Dates must be ascending and at most 366 days apart')
        for values in (self.metrics, self.dimensions):
            if len(values) != len(set(values)):
                raise ValueError('Metrics and dimensions must be unique')
        return self

def connect():
    location = os.environ.get('METRICMIND_WAREHOUSE_PATH', '').strip()
    if not location or not Path(location).is_file():
        raise HTTPException(503, 'Warehouse unavailable; configure METRICMIND_WAREHOUSE_PATH')
    con = sqlite3.connect(Path(location).resolve().as_uri() + '?mode=ro', uri=True, timeout=2)
    con.execute('PRAGMA query_only=ON')
    deadline = time.monotonic() + 2
    con.set_progress_handler(lambda: int(time.monotonic() > deadline), 1000)
    con.row_factory = sqlite3.Row
    return con

@router.get('/metrics')
def catalog():
    return {'contract_version': '2.0', 'catalog_version': '1.0.0',
            'metrics': DEFINITIONS, 'dimensions': ['region', 'country', 'category', 'year', 'quarter'],
            'regions': ['Europe', 'North America'], 'currency': 'USD',
            'data_kind': 'synthetic', 'max_rows': 1000, 'max_window_days': 366,
            'date_bounds': 'Inclusive order dates; inspect /api/v2/health for loaded coverage'}

@router.get('/health')
def warehouse_health():
    con = None
    try:
        con = connect()
        row = con.execute('SELECT MIN(date_key), MAX(date_key), COUNT(*) FROM governed_sales').fetchone()
        return {'status': 'ok', 'source': 'sqlite', 'data_kind': 'synthetic',
                'min_date': row[0], 'max_date': row[1], 'row_count': row[2], 'catalog_version': '1.0.0'}
    except sqlite3.Error:
        raise HTTPException(503, 'Warehouse unavailable or incompatible') from None
    finally:
        if con is not None:
            con.close()

@router.post('/query')
def execute(request: WarehouseQuery):
    # Only server-owned identifiers/expressions enter SQL; all filter values are bound.
    columns = [f'{d} AS "{d}"' for d in request.dimensions]
    for metric in request.metrics:
        if metric == 'margin_pct':
            columns.extend(['SUM(revenue_cents) AS _revenue',
                            'SUM(revenue_cents-material_cents-shipping_cents) AS _profit'])
        else:
            columns.append(f'{EXPRESSIONS[metric]} AS "{metric}"')
    where = 'date_key >= ? AND date_key <= ?'
    params = [request.start_date.isoformat(), request.end_date.isoformat()]
    if request.region is not None:
        where += ' AND region = ?'
        params.append(request.region)
    group = ', '.join(request.dimensions)
    sql = f'SELECT {", ".join(columns)} FROM governed_sales WHERE {where}'
    if group:
        sql += f' GROUP BY {group}'
    sql += ' HAVING COUNT(*) > 0'
    count_sql = f'SELECT COUNT(*) FROM ({sql})'
    if group:
        sql += f' ORDER BY {group}'
    sql += ' LIMIT ?'
    con = None
    started = time.monotonic()
    try:
        con = connect()
        con.execute('BEGIN')
        # Logical snapshot fingerprint: stable across equivalent database rebuilds.
        digest = hashlib.sha256()
        for record in con.execute('SELECT * FROM governed_sales ORDER BY order_id, line_id'):
            digest.update((repr(tuple(record)) + '\n').encode())
        total = con.execute(count_sql, params).fetchone()[0]
        raw = con.execute(sql, params + [request.limit]).fetchall()
    except sqlite3.OperationalError as exc:
        if 'interrupt' in str(exc).lower():
            raise HTTPException(504, 'Warehouse query exceeded its execution budget') from None
        raise HTTPException(503, 'Warehouse unavailable or incompatible') from None
    except sqlite3.Error:
        raise HTTPException(503, 'Warehouse unavailable or incompatible') from None
    finally:
        if con is not None:
            con.close()
    rows = []
    for record in raw:
        row = {d: str(record[d]) for d in request.dimensions}
        for metric in request.metrics:
            if metric == 'margin_pct':
                row[metric] = (str((Decimal(record['_profit']) * 100 / Decimal(record['_revenue'])).quantize(Decimal('0.000001')))
                               if record['_revenue'] else None)
            elif metric == 'orders':
                row[metric] = str(record[metric])
            else:
                row[metric] = format(Decimal(record[metric]) / 100, '.2f')
        rows.append(row)
    return {'request_id': str(uuid4()), 'status': 'ok' if rows else 'no_data',
            'source': 'sqlite', 'data_kind': 'synthetic', 'dataset_version': 'sha256:' + digest.hexdigest(),
            'contract_version': '2.0', 'catalog_version': '1.0.0', 'currency': 'USD',
            'query': request.model_dump(mode='json'), 'rows': rows, 'total_groups': total,
            'truncated': total > len(rows), 'metric_definitions': {m: DEFINITIONS[m] for m in request.metrics},
            'units': {m: 'percent' if m == 'margin_pct' else 'count' if m == 'orders' else 'USD' for m in request.metrics},
            'warnings': ['Synthetic demonstration data only; not approved financial reporting.'],
            'execution': {'sql': sql, 'parameters': params + [request.limit],
                          'elapsed_ms': round((time.monotonic() - started) * 1000, 3),
                          'read_only': True, 'timeout_seconds': 2}}
