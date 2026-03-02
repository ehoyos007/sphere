# Tasks — Sphere

## Completed
- [x] Connect PM variant to Supabase daily tasks
- [x] Dynamic node rebuilding from live data
- [x] 4-state task system (todo/in_progress/done/deferred)
- [x] Task type badges and priority dots
- [x] Subtask nesting in panel
- [x] Auto-refresh + manual refresh (R key)
- [x] Graceful fallback to sample data
- [x] Repo navigation panel (left side, click to focus, Tab toggle, arrow key cycling)
- [x] Debug logging for Supabase data (`[sphere]` prefix in console)
- [x] Fix Supabase connection — wrong project URL (`nkkfagxkuryusiulilqn` → `esasqrcxnktvojcxyxqs`)
- [x] Fix column name bug — `date` → `session_date` in `fetchTodaySession()`
- [x] Verify repo grouping with live data — 47 tasks, 7 repos, zero null repos

## In Progress
(none)

## Completed (cont.)
- [x] Repo territory regions on sphere surface (Voronoi tint + hex cells + zoom transition)

## Backlog
- [ ] Add energy arcs between related repos
- [ ] Task creation from panel (POST to Supabase)
- [ ] Multi-day history view (scroll through past sessions)
- [ ] Repo color persistence (save palette to localStorage)
- [ ] Mobile responsive layout
- [ ] Click task in panel to expand/edit details
