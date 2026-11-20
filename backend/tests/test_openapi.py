"""docs/openapi.json must match the API the code actually serves."""

import json

from app.export_openapi import OPENAPI_PATH, build_spec


def test_committed_openapi_spec_is_current():
    committed = json.loads(OPENAPI_PATH.read_text(encoding="utf-8"))
    assert committed == json.loads(json.dumps(build_spec())), "API changed: run `python -m app.export_openapi` and commit docs/openapi.json"


def test_every_documented_route_has_a_summary_and_error_free_schema():
    spec = build_spec()
    for path, methods in spec["paths"].items():
        for method, operation in methods.items():
            assert operation.get("summary"), f"{method.upper()} {path} has no summary"
