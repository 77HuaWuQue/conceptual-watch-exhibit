# 时械 · Mechanical Watch

This repository migrates the existing watch exhibit without changing its rendering or interaction code.

- Original site: https://conceptual-watch-exhibit.zdf13402548264.chatgpt.site/
- Target Pages URL: https://77HuaWuQue.github.io/conceptual-watch-exhibit/
- `site/`: all 15 files from the published source, unchanged.
- `migration-baseline.json`: SHA-256 hashes of the original publication files.
- `scripts/build.py`: validates references and copies `site/` to `dist/` byte-for-byte.
- `.github/workflows/pages.yml`: automatically builds and deploys pushes to `main`.

## Architecture and compatibility

Static HTML/CSS and native JavaScript ES modules, with Three.js r185 and OrbitControls vendored locally. Models, studio environment, text textures and animation are generated in browser code. There are no server routes, database, remote model files, web fonts or audio/video assets. Relative imports and the existing import map work under `/conceptual-watch-exhibit/` without source edits.

The optional `document.modelContext` enhancement remains unchanged; it only registers in browsers that expose that API. All visible controls are independent of it.

## Local preview

Run `python scripts/build.py`, then `python -m http.server 8767 --directory dist`. Open http://localhost:8767/ in a WebGL 2 capable browser. Do not open the modular entry point with `file://`.

## Updating with Codex

Open this repository in Codex and request the desired change in `site/`. Ask Codex to run `python scripts/build.py`, verify desktop and mobile interactions, commit and push to `main`, and check the GitHub Actions deployment result and live Pages URL. Changes to this repository do not change the separate ChatGPT Sites publication.

The initial `migration-baseline.json` should remain as a historical comparison. Later intentional edits will be reported by the build; they are not silently overwritten.

## Attribution

Based on iamtechartist/Conceptual-X-16, licensed under MIT. Original license and adaptation notes are retained in `site/LICENSE` and `site/README.md`. This is the existing educational watch model, not a new model or a manufacturing simulation.
