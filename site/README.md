# Conceptual Watch — derived from Conceptual-X-16

This local adaptation is built directly on iamtechartist/Conceptual-X-16 (MIT).
The original archive and extracted project remain untouched next to this folder.

## Run

Run a static HTTP server in this folder, for example `python -m http.server 8766`.
Open http://localhost:8766 . ES modules require HTTP; do not open index.html via file://.
All browser dependencies are retained locally in vendor; no package install is needed.

## What was retained

- app.js, style.css, stage.js, materials.js, vendor/ and LICENSE are byte-for-byte original.
- engine.js retains the original semantic part registry, geometry helpers, material ownership and geometry batching.
- experience.js retains orbit controls, camera interpolation, menus, raycast selection, hover, isolation, material transitions, explosion easing, guided tour controls and responsive camera framing.

## What changed

- Replaced engine geometry with a manual-wind mechanical watch.
- Replaced slider-crank motion with a shared-time wheel train and balance model.
- Adapted presets, component descriptions, discovery steps, labels and HTML copy.
- Reused the speed slider as a 0.1–60x simulation time multiplier.
- Removed the engine stand from view and lowered the original exhibit pedestal to fit the strap.

## Scope

Educational geometry, not a production calibre or manufacturing specification. Balance frequency: 2.5 Hz (18,000 alternations/hour), referencing ETA 6497-1 technical documentation. Wheel, pallet, mainspring and hairspring geometry is simplified. This does not simulate torque, friction, or winding.

Original project: https://github.com/iamtechartist/Conceptual-X-16
Reference: https://portal.eta.ch/en/technicaldocuments/index/pdf/id/1792/
