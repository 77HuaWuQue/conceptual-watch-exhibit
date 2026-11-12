"""Copy the original static site byte-for-byte; validate local module and asset paths."""
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "site"
DEST = ROOT / "dist"
files = sorted(p for p in SOURCE.rglob("*") if p.is_file())
assert (SOURCE / "index.html").is_file(), "Missing entry point"
for file in files:
    if file.suffix not in {".html", ".css", ".js"}:
        continue
    text = file.read_text(encoding="utf-8")
    refs = re.findall(r'''(?:src|href)=["']([^"']+)["']''', text) if file.suffix == ".html" else []
    if file.suffix == ".js":
        refs += re.findall(r'''(?:from\s*|import\s*\(\s*)["']([^"']+)["']''', text)
    if file.suffix == ".css":
        refs += re.findall(r'''url\(["']?([^)'"\s]+)''', text)
    for ref in refs:
        if ref.startswith(("data:", "https:", "http:", "#")):
            continue
        assert not ref.startswith("/"), f"Root-relative path breaks project Pages: {file.name}: {ref}"
        if ref == "three":
            target = SOURCE / "vendor/three.module.js"
        elif ref.startswith("three/"):
            target = SOURCE / "vendor" / ref[6:]
        else:
            target = file.parent / ref.split("?")[0].split("#")[0]
        assert target.is_file(), f"Missing local asset: {file.name}: {ref}"
if DEST.exists():
    shutil.rmtree(DEST)
shutil.copytree(SOURCE, DEST)
for file in files:
    assert file.read_bytes() == (DEST / file.relative_to(SOURCE)).read_bytes()
baseline = json.loads((ROOT / "migration-baseline.json").read_text(encoding="utf-8"))
changed = [str(p.relative_to(SOURCE)).replace("\\", "/") for p in files
           if baseline["files"].get(str(p.relative_to(SOURCE)).replace("\\", "/")) != hashlib.sha256(p.read_bytes()).hexdigest()]
print(f"Validated {len(files)} static files; output is byte-identical to site/. No transpilation or model conversion.")
print(f"Files changed since original migration: {changed}")
