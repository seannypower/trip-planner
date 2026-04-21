# Trip Planner App — PROJECT.md

## Links
- **GitHub:** https://github.com/seannypower/trip-planner
- **Vercel (primary):** https://trip-planner-two-iota.vercel.app/ (auto-deploys on push)
- **CodeSandbox (backup/dev only):** https://fs4yq3-3000.csb.app/
- **Local:** `/Users/hilsonmini/.openclaw/workspace/itinerary planner/event-planner1-forked/`

## Stack
React, TypeScript, Firebase Realtime DB, Tailwind CSS

## Firebase
- Project: `itinerary-planner-f85a6`
- `itinerary` = Nashville trip (old, untouched)
- `itinerary-vancouver` = Vancouver Sept 2026 (active)

## Vancouver Trip Status (as of 2026-03-19)
- Dates: Sep 8–13, 2026 (6 days incl. Seattle overnight + departure buffer)
- Schedule roughed in, 20 activities populated
- Open: car vs. train decision, hotel not booked, flights not booked (book late May–July)
- Features built: date flexibility, smart duration defaults, activity modal, fixed 60min snap bug

## Feature Roadmap
1. ✅ Date range flexibility
2. ✅ Smart duration defaults
3. Weather alerts (Open-Meteo, free)
4. Address input + map preview (Mapbox free tier)
5. Chat/LLM integration (me as interface first, built-in later)
6. Traffic/routing (Google Maps API, paid — defer)
7. Multi-trip selector (after data model is stable)

## Dev Workflow
- Edit locally → `git push` → Vercel auto-deploys
- `populate.js` script handles Firebase seeding/reset
- **Never edit in CodeSandbox browser editor**

## Key Lessons
- When re-populating Firebase while app is running, app auto-save overwrites the script. Always: kill app → populate → restart.
- CodeSandbox preview URLs have a click-through gate — can't fetch programmatically
- When CodeSandbox loses snapshot (503): open fresh via `https://codesandbox.io/p/github/seannypower/trip-planner/main`, run `yarn install`. Old detached sandbox is trash.
- `react-scripts` TypeScript strict mode = friction; use `strict: false` + `downlevelIteration: true`
