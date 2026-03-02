# Progress Log — Sphere

## Session 1 — 2026-03-02

**Summary:** Cloned magic plasma sphere gist and transformed it into a modern cyber tech grid sphere

### What was done:
- Cloned gist `a42f8307e8517b3c8df2b38da8259ed2` (CodePen by Sabo Sugi) into `/Projects/sphere`
- Rewrote `index.html` into a standalone servable file (was CodePen split-pane format)
- Fixed ES module import whitespace issues in `script.js`
- **Major rework:** Replaced the plasma bubble with a see-through tech grid sphere:
  - Lat/lon grid shader with anti-aliased lines and glow falloff
  - Animated vertical scan line sweep
  - Data pulse traveling along longitude lines
  - Simplex noise shimmer on grid brightness
  - 400 pulsing intersection node particles snapped to grid crossings
  - 200 sparse floating data particles inside the sphere
  - Fresnel rim light on the outer shell
  - Cyan/electric blue/white color palette on near-black background
- Slowed rotation speeds (~3-4x slower on all axes)
- Reduced zoom min distance from 1.5 → 0.5 for close-up inspection
- Added toggleable settings panel (gear button + S key shortcut)
- Styled GUI panel with frosted glass/cyber aesthetic (backdrop blur, cyan tints, monospace font, rounded corners)

---

## Session 2 — 2026-03-02

**Summary:** Added deep space background, dark void aesthetic, and interactive node focus system

### What was done:
- **Space background** — Separate render pass with:
  - Fullscreen nebula shader (simplex noise clouds), later stripped to near-black void with single faint wisp
  - 3-layer starfield (1200 distant dust / 200 mid / 30 bright pinpoints) with independent twinkle
  - 4 shooting stars with staggered timing, muted grey streaks
  - Each star layer rotates at different speed for parallax depth
- **Dark void aesthetic** — Stripped nebula colors to near-black, reduced star counts/brightness, dimmed shooting stars, hard vignette to pure black at edges
- **Interactive node focus system:**
  - Raycaster click detection on node particles
  - Smooth eased camera animation to zoom into clicked node
  - Dual focus rings (accent + grid color) orbiting the selected node with counter-rotation
  - Glass-style info label showing Node ID, lat/lon, signal strength, pulsing ACTIVE status
  - Pointer cursor on hover over clickable nodes
  - Click empty space or Escape to unfocus with smooth camera return
  - Auto-rotation pauses while a node is focused
- **Label styling** — Frosted glass card with fade-in animation, monospace font, matching cyber theme

### Current state:
- Serving locally via `python3 -m http.server 8091`
- All GUI controls (Grid, Scan, Shell, Animation, Nodes) functional and real-time
- Node interaction fully working (click to focus, Escape to unfocus)
- Files: `index.html`, `script.js`, `style.css`, `magic-plasma-sphere-three-js.markdown`, `PROGRESS.md`
