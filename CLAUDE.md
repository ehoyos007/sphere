# Sphere — Claude Code Instructions

## Quick Start
```bash
python3 -m http.server 8090
# Open http://localhost:8090/projects/index.html
```

## Project Overview
Interactive 3D sphere (Three.js) that visualizes daily tasks from Supabase, grouped by repository. Each repo = a glowing node on the sphere. Click to see tasks, cycle statuses, navigate repos.

## Key Files
- `projects/script.js` — All logic (~1750 lines ES module). Data layer, 3D scene, UI panels, interactions.
- `projects/style.css` — All styles (~720 lines). HUD, panels, task items, repo nav.
- `projects/index.html` — Entry point. HUD, repo nav, task panel, settings toggle.
- `projects/config.js` — Supabase credentials (gitignored). Copy from `config.example.js`.

## Architecture
1. **Data**: `loadData()` → `fetchTodaySession()` → `fetchSessionTasks()` → `groupTasksByRepo()`
2. **3D**: `buildNodes()` creates particles on sphere surface, one per repo
3. **UI**: `buildRepoNav()` (left panel), `openPanel()` (right panel), `updateHudStats()` (bottom)
4. **Interaction**: Click node → `focusNode()` → camera animates → panel opens
5. **Refresh**: Auto 60s + manual R key, preserves focused repo

## Current Issues
- **Supabase DNS**: `nkkfagxkuryusiulilqn.supabase.co` returns NXDOMAIN. Verify URL at supabase.com/dashboard → Settings → API.
- **Repo grouping**: `groupTasksByRepo()` uses `t.repo` field. If null, all tasks go to "uncategorized". Check console `[sphere]` logs.

## Conventions
- No bundler — ES modules via importmap, served with any static server
- No framework — vanilla JS, Three.js, lil-gui
- Cyan/teal palette: `#00d4ff` primary, `#00ffe1` accent
- Frosted glass UI: `backdrop-filter: blur()`, `rgba(2, 4, 12, 0.88)` backgrounds
- JetBrains Mono font throughout

## Don't
- Don't add a bundler or framework
- Don't modify the root-level files (`/index.html`, `/script.js`, `/style.css`) — those are the original demo sphere
- Don't commit `projects/config.js` — it contains real Supabase keys
