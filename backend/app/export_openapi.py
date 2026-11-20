"""Write the OpenAPI specification to docs/openapi.json.

    python -m app.export_openapi

A test fails when the committed file differs from what the application generates, so the API documentation
cannot silently drift from the code.
"""

import json

from app.ml.paths import REPO_ROOT

OPENAPI_PATH = REPO_ROOT / "docs" / "openapi.json"


def build_spec() -> dict:
    from app.main import app

    return app.openapi()


def main() -> None:
    OPENAPI_PATH.write_text(json.dumps(build_spec(), indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"wrote {OPENAPI_PATH}")


if __name__ == "__main__":
    main()
