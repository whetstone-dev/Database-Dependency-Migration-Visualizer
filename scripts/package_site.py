#!/usr/bin/env python3
"""Create a deterministic static-site archive with retained third-party notices."""

import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    site = ROOT / "site"
    built = site / "dist"
    if not (built / "index.html").is_file():
        raise ValueError("Build site/ before packaging")
    payloads = {
        p.relative_to(built).as_posix(): p.read_bytes()
        for p in sorted(built.rglob("*"))
        if p.is_file() and not p.is_symlink()
    }
    for source in sorted((site / "licenses").iterdir()):
        if source.is_file():
            payloads["licenses/" + source.name] = source.read_bytes()
    payloads["THIRD_PARTY_NOTICES.md"] = (site / "THIRD_PARTY_NOTICES.md").read_bytes()
    payloads["LICENSE"] = (ROOT / "LICENSE").read_bytes()
    out = ROOT / "dist"
    out.mkdir(exist_ok=True)
    archive = out / "database-dependency-migration-site-0.1.0.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for name, data in sorted(payloads.items()):
            info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, data)
    receipt = {
        "artifact": archive.name,
        "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
        "members": len(payloads),
        "notices_retained": True,
        "publication": "local only",
    }
    (out / "site-package.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt))


if __name__ == "__main__":
    main()
