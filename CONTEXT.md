# Context — Sphere

## What is this?
A Three.js 3D visualization that renders an interactive cyber-tech sphere. The primary variant (`/projects/`) is a **daily task manager** — it fetches tasks from Supabase, groups them by repository, and displays each repo as an interactive node on the sphere surface.

## File Structure
```
sphere/
├── index.html              # Original cyber grid sphere (standalone demo)
├── script.js               # Original sphere JS
├── style.css               # Original sphere CSS
├── magic-plasma-sphere-three-js.markdown  # Original CodePen source reference
├── .gitignore              # Ignores projects/config.js
├── CONTEXT.md              # This file
├── TASKS.md                # Active task tracking
├── PROGRESS.md             # Session-by-session development log
└── projects/
    ├── index.html          # PM variant entry point
    ├── script.js           # PM variant (~1750 lines, ES module)
    ├── style.css           # PM variant styles (~720 lines)
    ├── config.example.js   # Supabase credential template
    └── config.js           # Real Supabase creds (gitignored)
```

## Tech Stack
- **Three.js 0.160** via importmap (CDN, no bundler)
- **ES modules** (`type="module"`) — top-level await works
- **Vanilla JS** — no framework, no build step
- **JetBrains Mono** from Google Fonts
- **Supabase** REST API for daily task data
- **lil-gui** for settings panel (from Three.js addons)

## Variants
| Path | Purpose |
|------|---------|
| `/index.html` | Original cyber tech grid sphere — network monitor aesthetic (no data) |
| `/projects/` | **Daily Task PM** — Supabase tasks, grouped by repo, interactive |

## PM Variant — Architecture

### Data Flow
1. `config.js` exports `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. `loadData()` fetches today's session → fetches tasks for that session
3. `groupTasksByRepo(tasks)` groups flat task array by `t.repo` field
4. Each repo becomes a `project` object with `name`, `color`, `tasks[]`, `_allTasks[]`
5. `buildNodes()` creates sphere particles + floating labels
6. `buildRepoNav()` populates the left-side repo navigation panel
7. Auto-refresh every 60s when live

### Supabase Tables
- **`daily_sessions`** — one row per day (`id`, `date`)
- **`daily_session_tasks`** — tasks for a session:
  - `id`, `session_id`, `title`, `repo`, `status`, `task_type`, `priority`, `parent_task_id`, `created_at`

### Task Schema
| Field | Values |
|-------|--------|
| `status` | `todo` \| `in_progress` \| `done` \| `deferred` |
| `task_type` | `task` \| `bug` \| `feature` \| `mit` \| `test` |
| `priority` | `critical` \| `high` \| `medium` \| `low` |
| `parent_task_id` | UUID of parent task (null for top-level) |
| `repo` | Repository name string (used for grouping) |

### Grouping Logic
- `groupTasksByRepo()` at script.js:73 groups tasks by `t.repo || 'uncategorized'`
- Each unique repo value becomes a sphere node
- Tasks with `parent_task_id` are nested as subtasks under their parent
- Each repo is assigned a color from `REPO_COLORS` palette

### Key Functions (script.js)
| Function | Line | Purpose |
|----------|------|---------|
| `supaFetch(path)` | ~36 | Generic Supabase REST GET |
| `fetchTodaySession()` | ~47 | Get today's daily_sessions row |
| `fetchSessionTasks(id)` | ~53 | Get all tasks for a session |
| `patchTaskStatus(id, status)` | ~59 | PATCH task status to Supabase |
| `groupTasksByRepo(tasks)` | ~73 | Group flat tasks into repo-based projects |
| `loadData()` | ~177 | Full data load (session → tasks → group) |
| `buildNodes()` | ~770 | Create/rebuild sphere particles from projects |
| `buildRepoNav()` | ~1439 | Build left-side repo navigation panel |
| `openPanel(idx)` | ~1021 | Open right-side task detail panel |
| `cycleTaskStatus(task, idx)` | ~1100 | Click-cycle: todo → in_progress → done |
| `focusNode(idx)` | ~1252 | Animate camera to a repo node |
| `unfocusNode()` | ~1291 | Return camera to orbit view |
| `refreshData()` | ~1545 | Reload data, rebuild nodes + nav |

### UI Components
1. **Sphere** — 3D grid sphere with additive blending, simplex noise shimmer
2. **Repo Nodes** — Glowing particles on sphere surface, one per repo, sized by completion
3. **Floating Labels** — HTML labels above each node showing repo name
4. **Repo Nav Panel** (left side) — List of all repos with dots, names, progress bars, click to navigate
5. **Task Detail Panel** (right side) — Opens when clicking a node, shows tasks with checkboxes
6. **HUD** — Top-left title, bottom-left stats (repos/wip/completion/source), FPS
7. **Hover Tooltip** — Shows repo name + stats on mouse hover
8. **Focus Rings** — Animated rings around focused node
9. **Pulse Wave** — Ripple across sphere surface on node click
10. **Settings Panel** — lil-gui with Animation, Nodes, Bloom controls (gear icon or S key)

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Tab` | Toggle repo navigation panel |
| `Arrow Up/Down` | Cycle through repos (when nav is open) |
| `Escape` | Unfocus node / close panel |
| `R` | Manual data refresh |
| `S` | Toggle settings panel |

### Visual Design
- Dark void background with subtle nebula and starfield
- Cyan/teal primary palette (`#00d4ff`, `#00ffe1`)
- Frosted glass UI panels with `backdrop-filter: blur()`
- Additive blending for all sphere elements
- 15 repo colors in `REPO_COLORS` array

### Sample Data
When Supabase is unreachable or no config.js exists, falls back to `SAMPLE_PROJECTS` (3 hardcoded repos: sphere, fhe-studio, ally-api).

## Credentials
- `projects/config.js` (gitignored) exports `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- `projects/config.example.js` (tracked) is the template
- RLS is open on the Supabase tables (anon key is sufficient)
- **Current issue**: The Supabase URL `nkkfagxkuryusiulilqn.supabase.co` returns NXDOMAIN (DNS not resolving). Project may be paused or URL may be wrong. Verify at supabase.com/dashboard → Settings → API.

## Serving
```bash
python3 -m http.server 8090
# Then open http://localhost:8090/projects/index.html
```

## Known Issues
1. **Supabase DNS not resolving** — `nkkfagxkuryusiulilqn.supabase.co` returns NXDOMAIN. Need to verify correct project URL in Supabase dashboard.
2. **Repo grouping untested with live data** — `groupTasksByRepo()` relies on `t.repo` field being populated. If tasks in Supabase have `repo: null`, they all land under "uncategorized". Debug logging added (console `[sphere]` prefix).
