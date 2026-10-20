# V2 LLM preview

POST /api/v2/plan/llm accepts {"question":"What were revenue and gross profit in Europe during Q3 2026?"}.
Expected ready query:
```json
{"metrics":["revenue","gross_profit"],"dimensions":[],"start_date":"2026-07-01","end_date":"2026-09-30","region":"Europe","limit":100}
```
Response fields: status (ready/needs_clarification/unsupported), query (null unless ready), message, planner_mode=llm, provider=groq, model, requires_review=true, contract_version=2.0, catalog_version=1.0.0, data_kind=synthetic.

The endpoint never executes a database query. After review, submit only the query object to POST /api/v2/query. Schema validation checks supported values, required fields, dates, limits, duplicates and status consistency. Natural-language fidelity depends on the provider and requires live evaluation; passing mock tests does not prove semantic accuracy or injection resistance. requires_review is a client workflow signal, not a server-enforced approval token.

Errors: blank/invalid input 422; missing Groq configuration 503; provider failure or invalid model proposal 502. There is no offline v2 fallback; the v1 offline planner uses a different contract. No keys are stored in source. Only the question, schema and metric definitions are sent to Groq; warehouse rows are not sent.

## Apply and test
Copy this ZIP's backend folder into D:\MetricMind-Group (not into its backend subfolder). main.py is based on the previous SQLite patch, commit 86bc96b; merge router additions manually if that file has since changed.

```powershell
cd D:\MetricMind-Group\backend
$env:METRICMIND_TEST_WAREHOUSE = 'D:\MetricMind-Member1\MetricMind_Member1\outputs\warehouse.sqlite'
D:\MetricMind\backend\.venv\Scripts\python.exe -m pytest -q tests
```
Expected: 83 passed, 26 subtests passed with the original warehouse fixture. No live key needed for tests.

## Start a live server
Stop the old server with Ctrl+C. In the same terminal:
```powershell
cd D:\MetricMind-Group\backend
$env:METRICMIND_WAREHOUSE_PATH = 'D:\MetricMind-Member1\MetricMind_Member1\outputs\warehouse.sqlite'
$groqSecret = Read-Host 'Paste Groq API key' -AsSecureString
$env:GROQ_API_KEY = [System.Net.NetworkCredential]::new('', $groqSecret).Password
Remove-Variable groqSecret
$env:GROQ_MODEL = 'openai/gpt-oss-20b'
D:\MetricMind\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8001
```
This reuses the previously working model ID; model availability is provider-controlled. Open http://127.0.0.1:8001/docs.

Live cases to inspect (not yet verified by this patch):
- Europe revenue and gross profit Q3 2026 -> ready; correct quarter and no grouping.
- All regions shipping cost Q2 2026 by region -> ready; region=null, dimensions=[region].
- Europe margin Q3 2026 -> ready; margin_pct, dimensions=[].
- Revenue for Q3 -> clarification for year and region.
- US revenue Q3 2026 -> unsupported country scope or clarification; never silently broaden to North America.
- Why did Europe's margin drop? -> unsupported multi-step investigation at this milestone.
- Europe revenue Q3 2026 excluding Hardware -> unsupported filter, query=null.

After live verification, stage only:
```powershell
cd D:\MetricMind-Group
git add backend/app/main.py backend/app/warehouse_planner.py backend/tests/test_warehouse_planner.py backend/WAREHOUSE_PLANNER.md
git diff --cached --stat
git commit -m "feat: add validated warehouse LLM preview endpoint"
git push group omshree/frontend-integration
```
Do not claim live accuracy from the mock tests. Frontend adoption and multi-step investigation remain separate milestones.
