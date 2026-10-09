#!/usr/bin/env python3
"""Stage only distributable toolkit files, then invoke the installed creator."""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ".gitattributes",
    ".gitignore",
    "SKILL.md",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "THIRD_PARTY_NOTICES.md",
    "pyproject.toml",
    "MANIFEST.in",
]
DIRECTORIES = [
    "agents",
    "assets",
    "references",
    "schemas",
    "scripts",
    "src",
    "templates",
    "examples",
    "tests",
    "docs",
]


def include(path):
    return not any(
        part in {"__pycache__", "node_modules", "screenshots"} or part.endswith(".egg-info")
        for part in path.parts
    ) and path.suffix not in {".pyc", ".png", ".log"}


def main():
    args_parser = argparse.ArgumentParser(description=__doc__)
    args_parser.add_argument("--creator-dir", type=Path, required=True)
    args_parser.add_argument("--out", type=Path, default=ROOT / "dist")
    args = args_parser.parse_args()
    creator = args.creator_dir.resolve()
    if not (creator / "scripts/package_skill.py").is_file():
        args_parser.error("creator-dir must contain the installed creator scripts/package_skill.py")
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="dbdep-package-") as temp:
        stage = Path(temp) / "database-dependency-migration"
        stage.mkdir()
        for filename in FILES:
            shutil.copy2(ROOT / filename, stage / filename)
        for dirname in DIRECTORIES:
            for source in sorted((ROOT / dirname).rglob("*")):
                relative = source.relative_to(ROOT)
                if source.is_file() and not source.is_symlink() and include(relative):
                    target = stage / relative
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source, target)
        # The creator owns validation and packaging. Its per-file log is retained.
        env = dict(os.environ, PYTHONUTF8="1")
        command = [sys.executable, "-m", "scripts.package_skill", str(stage), str(out)]
        result = subprocess.run(
            command,
            cwd=creator,
            env=env,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=120,
        )
        (out / "creator-package.log").write_text(result.stdout + result.stderr, encoding="utf-8")
        if result.returncode:
            raise RuntimeError("Creator packaging failed; see creator-package.log")
        archive = out / "database-dependency-migration.skill"
        # Normalize archive timestamps/order after the creator's successful run.
        with zipfile.ZipFile(archive) as original:
            members = {name: original.read(name) for name in original.namelist()}
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as normalized:
            for name, payload in sorted(members.items()):
                info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                info.create_system = 3
                normalized.writestr(info, payload)
        assert all(
            not any(
                part in {".git", ".venv", "site", "evals", "tmp", "dist"}
                for part in Path(name).parts
            )
            for name in members
        )
        receipt = {
            "artifact": archive.name,
            "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
            "members": len(members),
            "creator_validation": "passed",
            "excluded": ["site", "evals", "environments", "git", "screenshots"],
            "deterministic_zip_metadata": True,
        }
        (out / "skill-package.json").write_text(
            json.dumps(receipt, indent=2) + "\n", encoding="utf-8"
        )
        print(json.dumps(receipt))


if __name__ == "__main__":
    main()
