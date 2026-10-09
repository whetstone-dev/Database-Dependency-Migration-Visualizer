#!/usr/bin/env python3
"""Install a wheel away from the checkout and exercise packaged resources."""

import argparse
import json
import os
import subprocess
import tempfile
import venv
import zipfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wheel", type=Path, required=True)
    parser.add_argument("--skill", type=Path)
    parser.add_argument("--out", type=Path, default=Path("out/artifact-smoke.json"))
    args = parser.parse_args()
    wheel = args.wheel.resolve()
    env = dict(os.environ, PYTHONUTF8="1")
    env.pop("PYTHONPATH", None)
    with tempfile.TemporaryDirectory(prefix="dbdep-artifact-") as temp:
        root = Path(temp)
        installed = root / "installed"
        venv.create(installed, with_pip=True)
        python = installed / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        away = root / "away"
        away.mkdir()

        def run(command):
            result = subprocess.run(
                command,
                cwd=away,
                env=env,
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=180,
            )
            if result.returncode:
                raise RuntimeError("Artifact smoke command failed: " + result.stderr[-1500:])
            return result.stdout

        run([str(python), "-m", "pip", "install", str(wheel)])
        dbdep = installed / ("Scripts/dbdep.exe" if os.name == "nt" else "bin/dbdep")
        doctor = json.loads(run([str(dbdep), "doctor", "--json"]))
        assert doctor["ready"]
        run([str(dbdep), "demo", "wheel-demos"])
        for name in ["ecommerce", "analytics", "high-traffic"]:
            model = f"wheel-demos/{name}/model.dbdep.json"
            result = json.loads(run([str(dbdep), "validate", model, "--strict", "--json"]))
            assert result["valid"]
            assert (away / "wheel-demos" / name / "report.html").is_file()
        receipt = {
            "wheel": wheel.name,
            "fresh_environment": True,
            "outside_checkout": True,
            "doctor": doctor["ready"],
            "demo_models_valid": 3,
            "bundled_resources": "passed",
        }
        if args.skill:
            package = root / "skill"
            package.mkdir()
            with zipfile.ZipFile(args.skill.resolve()) as archive:
                for name in archive.namelist():
                    target = (package / name).resolve()
                    if not target.is_relative_to(package.resolve()):
                        raise ValueError("Skill archive path escapes extraction root")
                archive.extractall(package)
            entry = package / "database-dependency-migration/scripts/dbdep.py"
            assert json.loads(run([str(python), str(entry), "doctor", "--json"]))["ready"]
            run([str(python), str(entry), "demo", "skill-demos"])
            receipt["skill"] = {
                "artifact": args.skill.name,
                "source_entrypoint": "passed",
                "demo_generation": "passed",
            }
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(receipt))


if __name__ == "__main__":
    main()
