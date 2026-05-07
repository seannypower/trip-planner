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
- Database URL: `https://itinerary-planner-f85a6-default-rtdb.firebaseio.com`

### Known root keys
| Key | Trip | Status |
|-----|------|--------|
| `itinerary` | Old Nashville trip | Untouched, no tripConfig |
| `itinerary-vancouver` | Vancouver Sept 2026 | Active |
| `itinerary-finger-lakes` | Dan's Bachelor Trip – Ithaca (Apr 2026) | Active |
| `itinerary-finger-lakes-2026` | finger-lakes stub | Near-empty, not used by live app |
| `itinerary-nashville-preaks-2026` | Preaks in Nash (May 2026) | Active |
| `preaks-nashville` | Nashville stub | Empty, not used by live app |

### Finding the correct key for a deployment
Each Vercel project has `REACT_APP_ITINERARY_KEY` set in its environment variables. That value is baked into the JS bundle at build time. To confirm which key a live app is reading:
```
# grep the minified bundle (replace URL/filename as needed)
curl -s https://<app>.vercel.app/static/js/main.*.js | grep -o 'itinerary-[a-z0-9-]*'
```
Always verify the key + cross-check with `tripConfig.tripName` and activity count before writing — there are stub/duplicate keys that look plausible but are not what the live app reads.

### ⚠️ Direct Firebase write conflict warning
The app saves with a full `set()` on the entire itinerary root key (e.g. `itinerary-nashville-preaks-2026`). This means:

1. **Every save is a full overwrite.** The app serializes its entire in-memory activity list and calls `set()` on the root key, replacing everything in Firebase. There is no patch/merge — it's a destructive replace.
2. **5-second debounce.** Any user interaction (drag, edit, delete) queues a save. That save fires ~5 seconds later and silently wipes any direct Firebase write that happened after the app last loaded its state.
3. **External scripts lose the race.** If you write to Firebase directly (via script or external tool) while the app is open and a user has interacted with it, the app's pending debounced save will overwrite your write within seconds. The write will verify successfully immediately after, then disappear.

**Safe procedure for direct Firebase writes:**
1. Write to Firebase (read current state first, add/modify, write back the full object).
2. **Immediately hard-refresh the app tab** (`⌘R` / `Ctrl+R`) before touching anything.
3. The app reloads from Firebase and now has your new data in memory.
4. Subsequent auto-saves will include your data.

If you can't guarantee the user won't interact between your write and the refresh, the only safe option is: close the app tab → write → reopen.

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
- When re-populating Firebase while app is running, app auto-save overwrites the script. Always: kill app → populate → restart. (See full write conflict warning in Firebase section above.)
- There are multiple Firebase keys per trip concept (active key vs. empty stubs). Always confirm the correct key before writing — see "Finding the correct key" above.
- CodeSandbox preview URLs have a click-through gate — can't fetch programmatically
- When CodeSandbox loses snapshot (503): open fresh via `https://codesandbox.io/p/github/seannypower/trip-planner/main`, run `yarn install`. Old detached sandbox is trash.
- `react-scripts` TypeScript strict mode = friction; use `strict: false` + `downlevelIteration: true`
