"""Offline demo: requires Pydantic only, no API server or credentials."""
import json
from pathlib import Path
from app.contracts import Query
from app.semantic import MockSemanticClient

if __name__ == '__main__':
    request = Query.model_validate_json(Path('examples/query.json').read_text())
    print(json.dumps(MockSemanticClient().execute(request).model_dump(mode='json'), indent=2))
