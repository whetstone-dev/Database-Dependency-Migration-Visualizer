#!/usr/bin/env python3
"""Source-tree/installed-skill entry point without modifying caller working directory."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
try:
    from dbdep.cli import main
except ImportError:
    print(
        "Missing dependencies. Install this skill with: python -m pip install <skill-directory>",
        file=sys.stderr,
    )
    raise SystemExit(2)

if __name__ == "__main__":
    raise SystemExit(main())
