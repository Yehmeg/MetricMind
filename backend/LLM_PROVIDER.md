# LLM provider foundation

This incremental change adds TextProvider, GroqProvider, and propose().
Existing API routes and the offline planner are unchanged. API integration is
the next commit. No live API request is needed to run these tests.

Install: python -m pip install -r requirements-llm.txt
Test: python -m pytest -q

GroqProvider.from_env() reads GROQ_API_KEY and GROQ_MODEL from the process
environment. There is no automatic .env loading and no hard-coded model.
Use a Groq chat model that supports JSON object mode. Never commit API keys.
Future adapters implement complete(system=..., question=...) -> str and raise
ProviderError on failure; propose() applies the same validation to all adapters.

The Groq adapter uses the fixed HTTPS chat completions endpoint, JSON object
mode, 1024 completion tokens, a 5-second connection timeout and 20-second
HTTP operation timeouts. These are not an end-to-end deadline. No automatic
retry or fallback occurs. Provider errors do not include raw response bodies.

Model output must satisfy the existing query contract, include every query
field explicitly, and contain a query only when status is ready. SQL and
unknown fields are rejected. The planner does not execute any query.
Schema validation cannot prove that a model interpreted user intent correctly.
Clarification behaviour and semantic accuracy need live evaluation before use;
keep query preview/review in the eventual API flow. Tests here use fake model
outputs and HTTP MockTransport, not live Groq. No dataset rows are sent. When
explicitly invoked, the provider receives the question, schema and definitions.

References checked 2026-10-17:
https://console.groq.com/docs/api-reference
https://console.groq.com/docs/structured-outputs
