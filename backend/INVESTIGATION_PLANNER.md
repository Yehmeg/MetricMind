# Natural-language margin investigation preview

POST /api/v2/plan/investigation accepts:
```json
{"question":"Why did Europe's margin change from Q2 to Q3 2026?"}
```
It returns status (ready/needs_clarification/unsupported), investigation (null unless ready), message, planner_mode=llm, provider=groq, model, requires_review=true, contract_version=2.0, catalog_version=1.0.0, data_kind=synthetic, execution_endpoint=/api/v2/investigate/margin.

Expected investigation for the example:
```json
{"region":"Europe","baseline":{"start_date":"2026-04-01","end_date":"2026-06-30"},"comparison":{"start_date":"2026-07-01","end_date":"2026-09-30"}}
```
Review this object, then send only that object to POST /api/v2/investigate/margin. Do not send the entire preview response. Planning never executes the warehouse; one explicit execution performs the two bounded queries and calculation. Existing single-query /api/v2/plan/llm behavior remains unchanged.

Missing scope should request clarification. Unsupported filters/breakdowns and non-margin investigations should be rejected without silently changing scope. Server validation enforces required fields, regions, dates, period bounds, ordering and status consistency; semantic correspondence to natural language depends on the model and human review. requires_review is a workflow signal, not a server approval token. This does not add persistent traces or a general autonomous agent.

Errors: invalid/blank input 422, missing provider configuration 503, provider failure or invalid proposal 502. Only question, schema and catalog definitions go to Groq; no warehouse rows. No live model calls were made during automated validation.

## Apply and test
Copy the ZIP's backend folder into D:\MetricMind-Group (not into its backend folder). main.py is based on group milestone f9b0a2d. If it has changed since then, add only the investigation_planner router import and registration.

```powershell
cd D:\MetricMind-Group\backend
$env:METRICMIND_TEST_WAREHOUSE = 'D:\MetricMind-Member1\MetricMind_Member1\outputs\warehouse.sqlite'
D:\MetricMind\backend\.venv\Scripts\python.exe -m pytest -q tests
```

## Live verification
Stop the old server using Ctrl+C. In the same PowerShell terminal, set METRICMIND_WAREHOUSE_PATH to the warehouse file, GROQ_API_KEY using the secure prompt below, and GROQ_MODEL to your previously working model. Then restart:
```powershell
$env:METRICMIND_WAREHOUSE_PATH = $env:METRICMIND_TEST_WAREHOUSE
$groqSecret = Read-Host 'Paste Groq API key' -AsSecureString
$env:GROQ_API_KEY = [System.Net.NetworkCredential]::new('', $groqSecret).Password
Remove-Variable groqSecret
$env:GROQ_MODEL = 'openai/gpt-oss-20b'
D:\MetricMind\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8001
```
Use http://127.0.0.1:8001/docs. Test:
- Why did Europe's margin change from Q2 to Q3 2026? -> ready, exact periods above.
- Why did margin decrease last quarter? -> clarification, investigation=null.
- Compare Europe margin Q2 to Q3 2026 excluding Hardware. -> unsupported, investigation=null.
- Compare margin for all regions from Q2 to Q3 2026. -> ready, region=null.
For the first ready preview, review and execute its investigation object; expect margin change -16.666667 pp, gross profit change -1200.00 USD, and three trace steps. These are synthetic accounting results, not proof of causal mechanisms.

After local and live verification:
```powershell
cd D:\MetricMind-Group
git add backend/app/main.py backend/app/investigation_planner.py backend/tests/test_investigation_planner.py backend/INVESTIGATION_PLANNER.md
git diff --cached --stat
git commit -m "feat: add natural-language margin investigation previews"
git push group omshree/frontend-integration
```
Frontend adoption and persistent trace retrieval remain separate tasks. No frontend or Member-1 files changed.

Automated validation: 116 passed, 26 subtests passed with original Member-1 fixture. Live Groq cases remain to be verified.
