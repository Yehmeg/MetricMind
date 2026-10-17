# LLM preview API

Append these lines once to app/main.py (outside any function):

    from .llm_api import router as llm_router
    app.include_router(llm_router)

Install requirements-llm.txt and requirements-dev.txt in your virtual environment.
Run python -m pytest -q. All automated tests use stubs; no Groq key is needed.

POST /api/v1/plan/llm accepts {"question":"What was EU revenue in Q4 2014?"}.
Responses include planner_mode=llm, provider=groq, configured model, and
requires_review=true. Review the generated metrics, market, dates and grouping.
Only submit a ready query separately to /api/v1/query. Results there are still
synthetic fixtures, not real Superstore data. No automatic execution or fallback.

HTTP outcomes: 200 for valid ready/needs_clarification/unsupported plans;
422 for invalid request bodies when the provider is configured; 503 when
GROQ_API_KEY or GROQ_MODEL is missing; 502 for provider or plan-validation failures.
If both configuration and request are invalid, configuration may be checked first.

Set GROQ_API_KEY and GROQ_MODEL in the server process environment. A .env file
is NOT automatically read. Use a Groq chat model supporting JSON object mode.
Restart the server after configuration changes. Do not commit keys.
This route is intended for local development; bind the server to 127.0.0.1.
The question, query schema and metric definitions are sent to Groq when called.
No dataset rows are sent by this planner.

Schema-valid output may still misunderstand intent. Live accuracy is not yet
verified. Manually check: EU Q4 2014 -> 2014-10-01 through 2014-12-31;
'Revenue?' -> clarification; 'gross margin' -> clarification/unsupported;
unsupported ranking/comparison requests -> unsupported, with no partial query.
Record actual responses before describing live integration as verified.
