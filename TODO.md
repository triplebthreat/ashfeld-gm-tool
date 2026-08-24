# GM Tool — Roadmap / TODO

A Foundry-style D&D toolset built from two connected apps sharing one Firebase
backend:
- **GM Tool** (this app, `C:\Users\brodi\gm-tool`) — the DM screen
- **Player Tool** (`C:\Users\brodi\lotto-luck.html`) — player character sheets

The apps stay separate but act as one system through the Firebase contract
(`CONTRACT.md`). Everything below is grouped by phase, newest work at the bottom.

---

## ✅ Done

### Campaign brain
- World map → town maps with clickable markers, drill-down (world → Ashfeld),
  image backgrounds, drag-and-drop map art
- NPCs (public description + DM secret), quests (status/type/tier), session notes
- Revised Ashfeld canon seeded (Corvyn/Autumn Court, Sevryn/Waking Accord)
- `/campaign` skill + `CAMPAIGN.md` brief + seed-merge engine (append to data.js,
  auto-flows into saves without overwriting table edits)

### Multiplayer backbone (Firebase)
- Security rules published + verified live (`database.rules.json`)
- DM party create/join by 4-letter code, claims `dmUid`, live party dashboard
- `CONTRACT.md` — source of truth for every shared path

### Combat
- Initiative tracker — DM-LOCAL by design (players never see order); party
  auto-pull + manual PCs + monster groups, sort, current-turn, round counter,
  defeated-skipping, 🔄 late-roll re-sort
- Damage/heal quick inputs, conditions chips (15 conditions + Concentrating)
- 60-monster SRD bestiary (CR 0–5) with CR + type filters, search
- Custom monster editor (Sevryn built as CR 4); stat blocks with 🎯/💥 rolls
- Encounters as SCENES (social/combat/exploration/hazard/puzzle/event) with
  "ways it can go" + resolved/outcome, attachable to markers & quests, optional
  combatants, ⚔ Launch into combat, prepared-encounter save/load
- NPC → stat-block bridge (open or create combat stats for any NPC)

### Handouts & log
- 📣 Handout composer (title/text/image) + reveal-to-party on NPC/quest panels
- 📜 Shared append-only event log

### Player tool integration (verified live E2E)
- DM damage → player's real sheet (two-way HP with toast)
- Player clickable Initiative → rolls + pushes to DM (cleared on long rest)
- Player-side handout viewer (+ notification badge) and log viewer
- All player rolls broadcast to the shared log
- Player-created parties no longer steal the DM slot

### Scenes & tokens (verified live E2E)
- 🗺 Scene mode: battle-map background (upload / reuse location map),
  configurable grid, snap-to-grid, tokens from party / combat / manual,
  drag to move, double-click to edit
- ▶ Present publishes to `/scene`; token drags sync live (x/y only)
- Player tool: 🗺 button + auto-opening read-only live viewer
- Players are view-only in v1 (moving own token needs a rules change)

---

## 🔜 Now / small

- [ ] **Publish updated `database.rules.json`** (adds `users/{uid}` for the
      player tool's new Google Sign-In / cloud character sync) — see
      `FIREBASE-SETUP.md`. Not live yet as of 2026-08-24.
- [ ] **Reposition Ashfeld town markers** onto the village art (edit mode, drag)
- [ ] **Decide Sevryn's real location** — "Old Logging Camp" is a placeholder
- [ ] Delete orphaned test-party stub `XNVP` in Firebase console (cosmetic)
- [ ] **Play a session** — surface real friction before building more

## 🗺 Phase: Scenes & Tokens — ✅ DONE 2026-07-16

Follow-ups (optional polish):
- [ ] Let players move their OWN token (needs a `/scene/tokens/{id}` rules
      change keyed to uid, + player-side drag)
- [ ] Save/name multiple scenes (currently one working scene at a time)
- [ ] Token HP quick-edit from the scene (currently via combat / editor)
- [ ] Auto-sync token HP from combat/member nodes while presenting

## 🌫 Phase: Fog of War (deliberately last)

- [ ] DM hide/reveal brush over scene maps (region masks in `/scene`)
- [ ] No line-of-sight simulation — not worth the complexity for one table

## 🧰 Polish / quality of life

- [x] Campaign data export/backup button (💾 → download/restore JSON) — insurance
      against a cleared browser profile
- [ ] Party join deep-link (URL with the code prefilled)
- [x] `/campaign` session-recap workflow — DONE 2026-08-24. Takes a pasted
      recording transcript/summary (no active note-taking needed) and turns it
      into: a clean session recap, NPC session-note updates, quest status/outcome
      changes, new/updated Player Character profiles (goals/arc/relationships —
      narrative only, no mechanical stats), new/advanced Plot Threads, and a
      regenerated `CAMPAIGN.md`. New top-level entities `SEED_DATA.pcs` /
      `SEED_DATA.plotThreads` in `data.js`, `DB.*Pc*`/`DB.*PlotThread*` API,
      minimal browsing/edit UI in the GM tool (🎭 PCs / 🧵 Threads topbar
      buttons) for manual tweaks at the table. Full workflow documented in
      `~/.claude/skills/campaign/SKILL.md`.
- [ ] (Maybe) DM whisper to a single player
- [ ] (Maybe) shrink `Ashfeld Village Map.png` (3.7 MB) if load feels slow

---

## Key files

- `index.html` · `app.js` (map/panels) · `data.js` (data + persistence)
- `combat.js` (tracker + encounters) · `monsters.js` (bestiary)
- `party.js` (Firebase bridge + dashboard) · `share.js` (handouts + log)
- `CONTRACT.md` (cross-app schema) · `CAMPAIGN.md` (canon brief)
- `FIREBASE-SETUP.md` · `database.rules.json`
- Backups: `data-backup-old-campaign.js`, `lotto-luck-backup-pre-integration.html`

---

## Deployment / operating notes

- **This folder (`C:\Users\brodi\gm-tool`) is the git working tree itself** —
  unlike `lotto-luck.html`, there's no separate "edit here, copy into the repo
  folder" step. It's a real git repo (initialized 2026-08-24) pushed to
  **`https://github.com/triplebthreat/ashfeld-gm-tool`** (public repo, GitHub
  Pages live at **https://triplebthreat.github.io/ashfeld-gm-tool/**).
- **Any change here needs an explicit `git add` / `commit` / `push` to reach
  the live Pages site** — editing the local files alone (or testing via the
  `gm-tool` preview server) does NOT auto-publish. Easy to forget since the
  local copy and the live site can silently drift apart otherwise.
- **Repo is public — DM secrets live in plaintext source (`data.js`).** Corvyn,
  Sevryn, every NPC `secret`/`dmNotes` field, monster stat blocks — all
  readable by anyone with the URL (view-source, or just fetching `data.js`
  directly bypasses the app's own player/DM display split entirely). This was
  a deliberate accepted tradeoff (private repos need paid GitHub Pro for
  Pages) — **never share this URL with players**, same as you'd never hand
  them your prep notes.
- Local dev unaffected: preview server "gm-tool" (port 8124, launch config in
  `.claude/launch.json`) still points at these same local files for testing
  before pushing.
