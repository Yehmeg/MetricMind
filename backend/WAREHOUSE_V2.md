# Member-2: SQLite API integration milestone

This adds structured warehouse execution and CORS, not the v2 natural-language planner or multi-step investigation. V1 remains mock-backed. The frontend must explicitly adopt v2; no frontend files are changed.

## Local setup (PowerShell)

Extract Member-1's original package outside the repository, for example:
`D:\MetricMind-Member1\MetricMind_Member1`. Keep its authorship and files intact.

```powershell
cd D:\MetricMind-Member1\MetricMind_Member1
python .\pipeline.py
python .\test_pipeline.py

cd D:\MetricMind-Group\backend
$env:METRICMIND_WAREHOUSE_PATH = 'D:\MetricMind-Member1\MetricMind_Member1\outputs\warehouse.sqlite'
$env:METRICMIND_TEST_WAREHOUSE = $env:METRICMIND_WAREHOUSE_PATH
$env:METRICMIND_CORS_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000'
D:\MetricMind\backend\.venv\Scripts\python.exe -m pytest -q
D:\MetricMind\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8001
```

Use an unused port or stop the previous server first. Environment variables apply to the current PowerShell process and its children. No new dependencies are required. Do not commit database paths or credentials. The new warehouse tests require METRICMIND_TEST_WAREHOUSE pointing to the original generated fixture. They copy it to temporary storage before mutations.

## API contract for Member-3

Base URL in the commands above: http://127.0.0.1:8001

| Method | Path | Purpose |
|---|---|---|
| GET | /api/v2/health | Loaded data coverage, row count and availability |
| GET | /api/v2/metrics | Versioned metric names, definitions, dimensions, limits and regions |
| POST | /api/v2/query | Execute a validated structured request |
| GET | /docs | Interactive API schemas and examples |

POST request:
```json
{"metrics":["revenue","gross_profit","margin_pct"],"dimensions":[],"start_date":"2026-07-01","end_date":"2026-09-30","region":"Europe","limit":100}
```
Expected rows:
```json
[{"revenue":"7200.00","gross_profit":"1600.00","margin_pct":"22.222222"}]
```
The response includes request_id, status (ok/no_data), source (sqlite), data_kind (synthetic), dataset_version (logical snapshot SHA256), contract_version (2.0), catalog_version (1.0.0), currency (USD), normalized query, rows, total_groups, truncated, metric_definitions, units, warnings and execution. execution contains actual SELECT SQL, bound parameters, elapsed_ms, read_only and timeout_seconds. It describes this one query execution, not a persisted investigation trace. It excludes secrets and local paths. There are no new /sql or /trace lookup endpoints.

All row values are strings or null, including year, quarter and order counts. Monetary strings have two decimals; percentages have six. Render null as unavailable, never zero. total_groups counts groups before the limit; rows.length counts returned groups. Do not average grouped margins or sum grouped distinct-order counts. Do not present limited groups as complete totals.

Supported dimensions: region, country, category, year, quarter. region=null means all regions. Filter and grouping are independent. There are no country/category filters in this milestone. No automatic market-to-region mapping is performed.

Date filters are inclusive order dates. A window may be at most 366 days apart. Empty matching populations return status=no_data, rows=[], total_groups=0. The demo has April 1–4 and July 1–4, 2026 records; coverage bounds are not a promise of records on every day. Limits: 1–1000 rows, seven unique metrics, five unique dimensions. SQL is built only from server-owned allowlists with bound filter values; clients cannot submit SQL or expressions.

Errors: 422 for invalid requests (FastAPI detail array), 503 for missing/incompatible warehouse, 504 for interrupted execution. CORS permits configured exact origins, GET/POST and Content-Type; credentials are disabled. Add port 3001 explicitly if needed. CORS is not authentication.

## Governed definitions and scope

Catalog 1.0.0 follows the team-confirmed Member-1 demonstration definitions. Revenue is gross less discount, cost is material plus shipping, gross_profit subtracts both costs, margin is the ratio of aggregate profit to aggregate revenue. Orders are distinct order IDs. Zero revenue margin is null. No mapping to v1 reported_profit is made.

Monetary source values are integer USD cents. Totals are summed as integers and formatted using Decimal; division by 100 is unit conversion, not FX. This adapter is for the supplied synthetic warehouse, not arbitrary external databases. Finance approval and real-data validation remain pending.

The read-only SQLite connection applies a two-second progress deadline and a two-second lock timeout. These are local demonstration safeguards, not a hard process-wide SLA. Snapshot fingerprinting scans the dataset; optimize through pipeline-published version metadata before larger datasets. Metric expressions are maintained in the adapter for catalog 1.0.0; future catalog changes require explicit adapter review.

## Next milestones

V2 LLM preview using the new contract; multi-step cost investigation and persistent execution traces; frontend adoption by Member-3; Member-1 Git integration when available. Keep v1 LLM requests out of the v2 executor until a compatible v2 planner exists. This milestone does not add authentication or deployment controls.
