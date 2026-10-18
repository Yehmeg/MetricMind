# Live planner evaluation

Start the configured backend on 127.0.0.1:8001. In a second terminal run:

    python evaluate_planner.py

This makes eight sequential Groq planning requests through the local API.
It does not execute data queries, send dataset rows, or read/store your API key.
It checks exact metrics, market, dates, grouping, limits, clarification, and
unsupported requests. Metric order is ignored; duplicate metrics still fail.
There are no retries. HTTP and connection failures count as failures.
The report records timestamps, configured model, responses and elapsed times.
Default output: evaluation-results/planner-live.json (overwritten on rerun).
Use --output PATH to retain another run and --port NUMBER for another port.

This is a small development suite, not an accuracy benchmark or a guarantee.
It does not judge message quality or prove resistance to prompt injection.
Review returned messages manually. Do not change expected results just to pass.
Live tests are separate from pytest to avoid accidental external requests.
