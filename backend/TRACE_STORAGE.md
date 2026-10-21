# Persistent investigation evidence (local demonstration)

Set METRICMIND_TRACE_DB_PATH to a dedicated SQLite file to enable persistence.
No new dependency is needed. The parent folder must already exist. Use an
absolute path outside the repositories and separate from Member-1's warehouse.
The application creates the trace database and table on the first successful save.

PowerShell, in the same terminal that runs Uvicorn:

```powershell
New-Item -ItemType Directory -Force D:\MetricMind-Runtime | Out-Null
$env:METRICMIND_TRACE_DB_PATH = 'D:\MetricMind-Runtime\investigations.sqlite'
$env:METRICMIND_WAREHOUSE_PATH = 'D:\MetricMind-Member1\MetricMind_Member1\outputs\warehouse.sqlite'
```

Restart Uvicorn after setting these variables. Keep the existing Groq configuration
if using LLM previews; direct investigation execution and retrieval need no LLM.

## API

POST /api/v2/investigate/margin retains the existing request and calculation.
After a complete or insufficient_data result, it atomically saves the entire
response, including validated scope, trace steps, SQL and parameters, results,
calculation evidence, warnings, dataset version and original timing. It adds:

- trace_persistence: "sqlite"
- saved_at: UTC ISO-8601 timestamp
- trace_url: "/api/v2/investigations/{investigation_id}"

GET /api/v2/investigations/{investigation_id} returns that exact saved response.
It does not rerun queries, invoke Groq, or require a working warehouse. The saved
response is historical evidence, not a statement about the current warehouse.
The original elapsed_ms measures calculation time before persistence.

GET returns 422 for malformed UUIDs, 404 for unknown IDs (including a database
not yet created), and 503 for disabled, unreadable or incompatible storage.
POST returns 503 if persistence is configured but the save fails; it never
claims successful persistence. A retry creates a new ID; requests are not
idempotent and a lost network response can leave a saved record.

Without METRICMIND_TRACE_DB_PATH, POST keeps trace_persistence="response_only"
and does not save. LLM previews and failed investigations are never stored.
No listing, deletion, retention cleanup, or failure-event logging is added.

## Integrity and scope

Writes use a transaction and INSERT only, rejecting duplicate IDs. Reads use
SQLite read-only mode. Connections close after each operation. SQLite lock wait
is limited to two seconds. The store rejects the configured warehouse path,
file aliases, and databases with unrelated schema objects before any DDL/DML.
This is application evidence storage, not a tamper-proof financial audit log.
Database administrators can modify files; no signatures or access-control layer
are provided. Treat this as a local demonstration endpoint: UUIDs are identifiers,
not authorization. Add authentication and per-user ownership before shared deployment.
Storage is unbounded; manage backups and retention separately. Keep the database
and any SQLite sidecar files out of Git. A local writable disk is expected.

## Verification

Set METRICMIND_TEST_WAREHOUSE to the original Member-1 warehouse and run
`python -m pytest -q tests`. New tests use temporary trace databases and verify
fresh-process retrieval, exact response round trips, insufficient-data storage,
disabled compatibility, missing IDs, invalid IDs, warehouse protection, failures,
locking, duplicate protection and rejected investigations.

Manual check: POST a known Europe Q2-to-Q3 2026 investigation. Copy trace_url,
restart the backend with the same trace path, then GET that URL. The stored
investigation ID, results and trace must match the original response.
