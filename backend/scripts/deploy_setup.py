"""Vercel build step for the backend service: migrate the database and seed it once.

Runs `alembic upgrade head` and `seed.py --if-empty` against the direct (unpooled) Neon
connection when Vercel provides one. Only production builds touch the database: preview
deployments share it, and a feature branch must not migrate the production schema.

Usage (vercel.json buildCommand): python -m scripts.deploy_setup
"""

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    target = os.environ.get("VERCEL_ENV", "")
    if target != "production":
        print(f"deploy_setup: VERCEL_ENV={target or 'unset'}, skipping migrations and seed.")
        return

    url = os.environ.get("DATABASE_URL_UNPOOLED") or os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("deploy_setup: DATABASE_URL is not set for this build.")

    env = {**os.environ, "DATABASE_URL": url}
    for command in (
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        [sys.executable, "seed.py", "--if-empty"],
    ):
        print("deploy_setup:", " ".join(command[1:]), flush=True)
        subprocess.run(command, cwd=ROOT, env=env, check=True)


if __name__ == "__main__":
    main()
