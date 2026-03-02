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

## In Progress
- [ ] Fix Supabase connection — DNS not resolving for `nkkfagxkuryusiulilqn.supabase.co`
  - Verify correct project URL at supabase.com/dashboard → Settings → API
  - Update `projects/config.js` with correct URL
- [ ] Verify repo grouping works with live data — `groupTasksByRepo()` needs `t.repo` populated

## Backlog
- [ ] Add energy arcs between related repos
- [ ] Task creation from panel (POST to Supabase)
- [ ] Multi-day history view (scroll through past sessions)
- [ ] Repo color persistence (save palette to localStorage)
- [ ] Mobile responsive layout
- [ ] Click task in panel to expand/edit details
