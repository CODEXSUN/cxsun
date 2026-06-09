#!/usr/bin/env python3
"""Repository launcher for the CXSun cloud CLI."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from cxcli.nginx import main


if __name__ == "__main__":
    raise SystemExit(main())
