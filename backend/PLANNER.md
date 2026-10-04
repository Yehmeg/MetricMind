# Offline query planner: milestone 2a

POST /api/v1/plan with {"question":"Show EU revenue and profit for Q4 2014"}.
This previews a governed Query; it does not execute it. A ready query can be
reviewed and submitted separately to POST /api/v1/query, which still uses
synthetic fixtures. This is a deterministic baseline, not LLM integration.

Supported grammar:
Show|Get <market code|all markets> <metrics> for <Q1-Q4 YYYY|YYYY> [by category|market]

Metrics: revenue (sales), profit (reported profit), profit margin (reported
profit margin), shipping cost. Separate metrics with commas or "and".
Markets: EU, US, LATAM, Africa, APAC, EMEA, Canada.
Quarter boundaries are inclusive calendar dates; an entire year is supported.
Missing market/year requires clarification. Relative dates, comparison,
ranking, explanations, category filters and other wording are unsupported.
No currency, material costs, warehouse availability or dataset coverage is inferred.
All non-ready responses have a null query. No external services or keys are used.

## Integration
Append to backend/app/main.py:

    from .planner_api import router as planner_router
    app.include_router(planner_router)

Run the complete backend pytest suite before committing. These files introduce
six core planner tests and three API tests. Existing routes remain available.
