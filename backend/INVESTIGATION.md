# Bounded margin investigation (Member-2)

POST /api/v2/investigate/margin performs exactly two aggregate warehouse queries, then a deterministic calculation. No Groq key or model call is needed. It does not yet accept natural-language questions; /api/v2/plan/llm still rejects multi-step why questions. This is the execution foundation for that future planner.

## Request
```json
{
  "region": "Europe",
  "baseline": {"start_date": "2026-04-01", "end_date": "2026-06-30"},
  "comparison": {"start_date": "2026-07-01", "end_date": "2026-09-30"}
}
```
region is required: Europe, North America, or null for all regions. Periods are inclusive, each at most 366 days apart; comparison must follow baseline without overlap. Unequal duration produces a warning. Only aggregate margin investigation is supported; no arbitrary SQL, grouping, or model-generated steps.

## Response
The response contains investigation_id, status, contract_version, catalog_version, source, data_kind, currency, dataset_version, normalized request, baseline and comparison metric rows, analysis, explanation, trace, warnings, query_count and elapsed_ms.

status=complete means calculations succeeded. status=insufficient_data means a period has no rows or nonpositive revenue; analysis=null. No missing result is substituted with zero. Missing warehouse returns 503; validation errors 422; query timeout 504. Different dataset fingerprints between queries return 409 with no combined conclusion.

Expected Europe Q2-to-Q3 synthetic results:
- Revenue: USD 7,200 in both periods.
- Material cost: USD 3,600 in both periods.
- Shipping: USD 800 -> USD 2,000.
- Gross profit: USD 2,800 -> USD 1,600 (change -1,200).
- Margin: 38.888889% -> 22.222222%; change -16.666667 percentage points.
- Shipping contribution: -16.666667 pp; revenue and material contributions zero.

## Attribution method
Let baseline be index 0 and comparison index 1; R=revenue, M=material, S=shipping, C=M+S.
Margin = 100*(1-C/R).
The symmetric decomposition is:
- Revenue contribution = 100 * (C0+C1)/2 * (1/R0-1/R1).
- Material contribution = -100 * (M1-M0) * (1/R0+1/R1)/2.
- Shipping contribution = -100 * (S1-S0) * (1/R0+1/R1)/2.
These sum to the margin change before display rounding. rounding_residual_pp reconciles the six-decimal displayed contributions to the displayed change. This is a symmetric allocation convention for accounting changes, not evidence of causal mechanisms. The profit bridge is change in revenue minus change in material minus change in shipping. All money calculations use Decimal values from integer-cent warehouse totals.

## Trace and limits
Two trace steps contain actual validated queries, their request IDs, SQL, bound parameters, returned rows, dataset fingerprints and execution timing. A third step contains calculation inputs and results when sufficient data exists. Queries retain the adapter's read-only connection, two-second SQL progress deadline, and one aggregate row limit. There are exactly two query calls and no retries or unbounded agent loops. Lock waits and Python work mean this is not a hard four-second request-wide SLA.

Trace persistence is response_only: save the response if you need evidence. There is no GET trace lookup endpoint, restart persistence or database trace store yet. Failed investigations return an error instead of a successful partial explanation. Persistent traces, natural-language investigation planning and frontend wiring remain future work.

## Apply, verify, run
Copy the patch backend folder into D:\MetricMind-Group. main.py is based on the previous v2 planner milestone (5ba3493); if you have newer changes, add only the investigation router import and registration.

```powershell
cd D:\MetricMind-Group\backend
$env:METRICMIND_TEST_WAREHOUSE = 'D:\MetricMind-Member1\MetricMind_Member1\outputs\warehouse.sqlite'
D:\MetricMind\backend\.venv\Scripts\python.exe -m pytest -q tests
```
Expected: 94 passed, 26 subtests passed with Member-1's original fixture. No new dependencies.
Stop the existing server with Ctrl+C; then:
```powershell
$env:METRICMIND_WAREHOUSE_PATH = $env:METRICMIND_TEST_WAREHOUSE
D:\MetricMind\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8001
```
Open http://127.0.0.1:8001/docs and run the request above.

After verification:
```powershell
cd D:\MetricMind-Group
git add backend/app/main.py backend/app/investigation_api.py backend/tests/test_investigation_api.py backend/INVESTIGATION.md
git diff --cached --stat
git commit -m "feat: add bounded margin investigation with execution evidence"
git push group omshree/frontend-integration
```
Frontend and Member-1 files are unchanged. Share this contract with Gomti. Sync this commit to the personal repository after group validation.
