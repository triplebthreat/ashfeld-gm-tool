# GM Tool ↔ Player Tool — Firebase Contract v1

The two apps (gm-tool = DM screen, lotto-luck.html = player sheets) share one
Firebase Realtime Database (`lottodnd`). This file is the source of truth for
every path they both touch. **Change nothing here without updating both apps.**

Security rules published 2026-07-15 (`database.rules.json`); `users/{uid}`
added 2026-08-24 (not yet published — see `FIREBASE-SETUP.md`).

## Roles

- **The DM creates parties from the GM tool** (claims `dmUid` atomically).
  The player tool's Create Party intentionally does NOT claim `dmUid`.
- Players join by code and own exactly their member node.

## Paths — `/users/{uid}/` (real accounts, player tool only)

| Path | Writers | Shape / semantics |
|---|---|---|
| `characters/{charId}` | that uid only | `{ meta, state, updatedAt }` — mirrors the player tool's local `meta`+`state` character shape. |

- Only written when the player tool's Firebase user is a **real (non-anonymous,
  Google-linked)** account — plain anonymous play never touches this path.
- `meta`/`state` mirror the shapes already used for `localStorage` character
  storage in the player tool (`dnd_chars_v1` index entries / `dnd_char_{id}`
  state blobs) — this is a straight mirror, not a separate schema.
- One-way conflict rule: the player tool tracks its own last-pushed timestamp
  per character (`dnd_cloud_sync_v1` in `localStorage`) and only accepts an
  incoming cloud record if its `updatedAt` is newer than that — so a device's
  own writes never bounce back and clobber a newer local edit made offline.
- `gm-tool` does not read or write this path — DM tooling only ever sees the
  live `parties/{CODE}/members/{uid}` snapshot, same as before.

## Paths — `/parties/{CODE}/`

| Path | Writers | Shape / semantics |
|---|---|---|
| `createdAt` | creator, once | server timestamp |
| `dmUid` | GM tool, transaction | uid of the DM; grants full party write |
| `members/{uid}` | that player + DM | see below |
| `handouts/{key}` | DM only | `{ title, text?, image? (small data URI), at }` |
| `log/{key}` | anyone, append-only | `{ at, who, kind: 'msg'\|'roll'\|'event', text }` |
| `combat` | DM only | RESERVED — deliberately unused; initiative order is DM-private |
| `scene` | DM only | battle map — see below |

## Scene node — `scene` (DM writes, players read live)

```
{ active: bool,
  name: string,
  image: data URI (downscaled ≤1000px, JPEG) | '',   // written once on present
  grid: { cols, rows, show },
  tokens: { <id>: { name, kind:'pc'|'monster'|'object', color, x, y, hp?, hpMax? } } }
```

- `x`,`y` are **0–100 (% of the map)** so tokens align on any screen size.
- GM tool (`scene.js`) sets the whole node on **Present**; token drags update
  only `scene/tokens/{id}/x,y` (throttled ~120ms). `image` is never rewritten
  per-move. Hidden tokens are simply omitted from the published set.
- Player tool listens on `scene`: when `active` flips true it surfaces a 🗺
  button + auto-opens a read-only viewer that redraws on every change; when
  `active` is false it hides. Blank scenes (no image) use `grid.cols/rows` as
  the aspect ratio so cells stay square.
- Players are view-only in v1 (moving your own token needs a rules change).

## Member node — `members/{uid}`

```
{ name, className, level, hp, hpMax, ac, updatedAt,
  initiative?, initiativeAt? }
```

- Player tool pushes the whole node (debounced 800ms) on every sheet change.
- `initiative`/`initiativeAt`: set when the player clicks their Initiative stat
  to roll; **cleared on long rest** (field omitted from the next push).
  GM tool reads them in combat setup and via the 🔄 re-pull button.
- **HP is two-way**: the DM may write `members/{uid}/hp` directly (dashboard /
  combat-bar damage inputs). The player tool listens on its own `hp` child and
  adopts remote changes (clamped to 0..hpMax, toast shown). Convergence rule:
  equal values are a no-op, so echo loops settle immediately. Last write wins
  on a true race — acceptable at table scale.

## Log conventions

- Player tool broadcasts every roll result (hooked at its single display
  choke-point) as `kind: 'roll'`, `who: <character name>`.
  Players can opt out: localStorage `dnd_share_rolls = '0'`.
- GM tool posts `kind: 'msg'` announcements and `kind: 'event'` records
  (handout sent, DM damage applied).
- Entries are append-only for players; the DM can prune via party-owner write.

## What stays private (never in Firebase)

- Initiative ORDER, monster HP/stat blocks, encounter prep, campaign data,
  session notes — all DM-local in the GM tool's localStorage.
