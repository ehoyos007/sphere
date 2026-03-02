# PROGRESS.md

> Session-by-session work log.

## 2026-03-02 -- Session 2

### Summary
Reviewed and fixed Gemini's hex casing design changes. Reverted unauthorized root-level script.js edits, then tuned shader intensities in projects/script.js to fix blown-out sphere rendering.

### Completed
- [x] Reviewed all Gemini changes across 7 files
- [x] Reverted root-level `script.js` (should not be modified per CLAUDE.md)
- [x] Fixed hex fill intensity (0.32 → 0.03) — was flooding cells with solid color
- [x] Fixed volumetric inner glow (0.30 → 0.02)
- [x] Fixed neon border core (0.85*3.0 → 0.35*1.5) — way overdriven
- [x] Reduced bloom spread (0.30 → 0.15) and Voronoi borders (0.9 → 0.5)
- [x] Added alpha cap (0.7) and color clamp (1.2) to prevent additive blending blowout
- [x] Verified sphere renders correctly in browser — no console errors

### Files Changed
- `script.js` — Reverted to original (git checkout)
- `projects/script.js` — Shader intensity fixes in grid fragment shader

### What's Working
- Hex territory grid with neon borders and colored fills
- Voronoi boundary seams between repo territories
- Connection filaments (neon arcs) between nodes
- Neon-glow floating labels with territory colors
- Breathing animation on hex borders
- Bloom post-processing at subtle level

### Left Off
- Sphere is previewable at http://localhost:8090/projects/index.html
- All Gemini design features are functional, just intensity-tuned
- Root script.js is clean/original

## 2026-03-02 -- Session 1

### Summary
Implemented the high-fidelity hexagonal territory map sphere as requested. Transitioned from a simple grid sphere to a multi-layered futuristic "Session Manager" visual.

### Completed
- [x] Implemented `hexMat` with Hex SDF tiling (using 0.866025 constant).
- [x] Added territory logic for Cyan/Magenta regions using stable hex IDs and noise.
- [x] Created "solid neon tube" border styling with 3-layer smoothstep.
- [x] Implemented "Slower Breathing" animation (0.93-1.0 pulse range at 0.8Hz).
- [x] Maintained tech-grid and internal filaments beneath the hex casing.
- [x] Updated GUI and HUD to reflect new parameters and visual style.
- [x] Set default Bloom strength to 0.15 for better detail preservation.

### Files Changed
- `script.js` -- Major update to shaders, parameters, and animation loop.
- `PROGRESS.md`, `TASKS.md`, `CONTEXT.md`, `TEST_LOG.md` -- Initial documentation.

### Decisions Made
- **Hex SDF:** Used the precise `0.866025` constant to ensure regular tiling and eliminate artifacts.
- **Layering:** Placed `hexMesh` at radius 1.01 and `gridMesh` at 1.0 to ensure the hexagonal casing correctly overlays the tech-grid.
- **Neon Borders:** Optimized the smoothstep layers to balance sharp edges with a satisfying glow without washing out details.
