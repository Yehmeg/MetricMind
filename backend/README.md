# MetricMind: Agent and Backend Starter

Milestone 1 establishes a proposed structured query contract, FastAPI endpoints,
a mock semantic-layer adapter, and governance tests. It uses synthetic fixtures.
It does not yet include natural-language interpretation, an LLM, Cube/dbt,
PostgreSQL, real Superstore results, root-cause analysis, or a frontend.

## Windows setup (VS Code PowerShell)

Extract this package to `D:\MetricMind` so that `D:\MetricMind\backend` exists.
Open that folder in VS Code. Python 3.11 is the suggested baseline.

```powershell
cd D:\MetricMind\backend
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

No activation or PowerShell execution-policy change is needed. Package installation
requires internet access. No credentials or API keys are needed for this milestone.
Open http://127.0.0.1:8000/docs and try `POST /api/v1/query` using
`backend/examples/query.json`. Stop the server with Ctrl+C.

Expected mock output: revenue 1000, reported profit 185, reported profit margin
18.5 percent. These are deliberately synthetic numbers, not dataset findings.
Metric values are decimal strings to preserve precision. A zero denominator returns
JSON null. No matching records return `status: no_data` and an empty rows list.

For the command-line demo:

```powershell
.\.venv\Scripts\python.exe demo.py
```

## Team contract to agree before integration

- Agent/backend owner: validated requests, orchestration, execution evidence,
  clarification behavior and response validation.
- Data/semantic owner: actual source mappings, approved formulas, keys, fiscal
  calendar, geography mappings, data versions and Cube/dbt adapter contract.
- Frontend owner: question entry, result display, chart rendering, error states
  and inspection of the request trace.

The definitions in `app/semantic.py` are proposed fixture definitions. The real
semantic layer must remain the authoritative metric source at integration time.
Do not copy its formulas into an LLM prompt as independently editable business logic.

Supported request fields: metrics, dimensions, start_date, end_date, market, limit.
Dates are inclusive. Requests longer than 366 elapsed days, extra fields (including
SQL), unapproved metrics/dimensions, duplicate selections and row limits over 1000
are rejected. Results are sorted by dimension labels, not ranked by metric values.
Truncation is explicit; a future agent must not treat a truncated breakdown as complete.

The interface supports only market and category dimensions in this first milestone.
`EU` is a source market code. Do not automatically equate it with all of Europe.
Shipping cost is reported separately; it is not subtracted again from supplied profit.
Material cost and churn are unsupported. Currency remains unspecified.

## Next milestones

1. Agree on this contract with the semantic-layer and frontend owners.
2. Implement an LLM planner that returns this structured request, with clarification
   for missing dates/geography and strict validation before execution. Select the
   provider with the team; no provider dependency is included yet.
3. Replace the mock client with a Cube/dbt adapter, enforce network timeouts and
   execution budgets, and validate every returned result.
4. Add quarter comparisons and evidence-backed country/category drill-down.
   Separate observed contributions from causal claims.
5. Add chat/streaming and chart metadata, then run the shared evaluation set against
   a fixed, versioned Superstore snapshot.

Keep the original `superstore.csv` unchanged. The mock does not need it. Before real
integration, the data owner must investigate order/product identity inconsistencies,
sales precision, source accounting definitions and the zero-sales record.
Never silently discard inconsistent rows or fabricate material costs.

## Development boundary

This is a local development starter. Authentication, production rate limiting,
warehouse cost controls and deployment are not implemented. Keep the development
server bound to 127.0.0.1. Row limits here bound fixture output, not warehouse cost.

References: https://fastapi.tiangolo.com/tutorial/testing/
and https://docs.pydantic.dev/latest/concepts/models/
