"""Explicit live evaluation: eight HTTP requests, no automatic query execution."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


def query(metrics, market, start, end, dimensions=None):
    return dict(metrics=metrics, dimensions=dimensions or [], market=market,
                start_date=start, end_date=end, limit=100)


CASES = [
    ('eu_quarter', 'What were the revenue and reported profit in EU during Q4 2014?', 'ready',
     query(['revenue', 'reported_profit'], 'EU', '2014-10-01', '2014-12-31')),
    ('group_category', 'Show US revenue for 2014 by category.', 'ready',
     query(['revenue'], 'US', '2014-01-01', '2014-12-31', ['category'])),
    ('all_markets', 'Show shipping cost across all markets for Q1 2012 by market.', 'ready',
     query(['shipping_cost'], None, '2012-01-01', '2012-03-31', ['market'])),
    ('profit_margin', 'What was reported profit margin for APAC during Q2 2013?', 'ready',
     query(['reported_profit_margin'], 'APAC', '2013-04-01', '2013-06-30')),
    ('missing_scope', 'What is the revenue?', 'needs_clarification', None),
    ('relative_dates', 'Show EU revenue for last quarter.', 'needs_clarification', None),
    ('material_cost', 'Show material costs for EU in Q4 2014.', 'unsupported', None),
    ('unsupported_filter', 'Show EU revenue for Q4 2014 excluding Furniture.', 'unsupported', None),
]


def assess(body, status, expected):
    errors = []
    if not isinstance(body, dict):
        return ['Response is not an object']
    if body.get('status') != status:
        errors.append('Unexpected plan status')
    actual = body.get('query')
    if expected is None:
        if 'query' not in body or actual is not None:
            errors.append('Expected explicit null query')
    elif not isinstance(actual, dict):
        errors.append('Missing query object')
    else:
        if set(actual) != set(expected):
            errors.append('Query fields differ')
        for key, value in expected.items():
            observed = actual.get(key)
            # Metric ordering has no analytical significance; duplicates still fail.
            if key == 'metrics' and isinstance(observed, list):
                equal = sorted(observed) == sorted(value)
            else:
                equal = observed == value
            if not equal:
                errors.append('Incorrect query field: ' + key)
    if body.get('planner_mode') != 'llm' or body.get('requires_review') is not True:
        errors.append('Missing LLM preview metadata')
    if body.get('provider') != 'groq' or not body.get('model'):
        errors.append('Missing provider/model metadata')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8001)
    parser.add_argument('--output', default='evaluation-results/planner-live.json')
    args = parser.parse_args()
    endpoint = f'http://127.0.0.1:{args.port}/api/v1/plan/llm'
    report = {'started_at': datetime.now(timezone.utc).isoformat(),
              'suite_version': '1', 'endpoint': endpoint, 'results': []}
    for name, question, status, expected in CASES:
        started = perf_counter()
        body = None
        http_status = None
        try:
            request = Request(endpoint, data=json.dumps({'question': question}).encode(),
                              headers={'Content-Type': 'application/json'}, method='POST')
            with urlopen(request, timeout=60) as response:
                http_status = response.status
                body = json.load(response)
            errors = assess(body, status, expected)
        except HTTPError as error:
            http_status = error.code
            errors = [f'HTTP {error.code}']
        except (URLError, TimeoutError, OSError, ValueError) as error:
            errors = ['Request or JSON failure: ' + type(error).__name__]
        row = dict(id=name, question=question, expected_status=status,
                   expected_query=expected, passed=not errors, errors=errors,
                   http_status=http_status, response=body,
                   elapsed_seconds=round(perf_counter()-started, 3))
        report['results'].append(row)
        print(('PASS' if row['passed'] else 'FAIL') + ' ' + name, flush=True)
    report['passed'] = sum(row['passed'] for row in report['results'])
    report['total'] = len(CASES)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f"Result: {report['passed']}/{report['total']}; report: {target}")
    return 0 if report['passed'] == report['total'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
