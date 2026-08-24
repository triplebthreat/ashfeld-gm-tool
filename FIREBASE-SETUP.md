# Firebase Security Rules

✅ **PUBLISHED 2026-07-15** (including the DM-full-write amendment) and verified
live with a full permission matrix.

⚠️ **`database.rules.json` was updated 2026-08-24 to add the `users/{uid}`
node (real accounts / cloud character sync in `lotto-luck.html`) — this
change has NOT been published yet.** Follow the steps below to push it live.

`database.rules.json` in this folder is the
source of truth — if rules ever need changing, edit that file and re-publish:

1. Open https://console.firebase.google.com and pick the **lottodnd** project.
2. Left sidebar → **Build → Realtime Database** → **Rules** tab.
3. Replace everything in the editor with the contents of `database.rules.json`.
4. Click **Publish**.

## What the rules enforce

- `users/{uid}/*`: only that signed-in uid may read or write its own subtree.
  Used for real (non-anonymous, Google Sign-In) accounts' cloud-synced
  characters — anonymous sessions never touch this path.
- Anyone signed in (anonymous auth counts) who knows a party code can **read**
  that party — party codes act as invite keys, same trust model as before.
- A party node can be **created** by anyone signed in; after that, only its DM
  has full write over it (disband, prune members, clear old combat/log data).
- `dmUid` can be claimed once; only the same device (uid) can re-claim it.
  This is what makes the GM tool the DM.
- Each player can only write **their own** member node; the DM can write any
  member node (needed later for applying damage from the dashboard).
- `combat`, `scene`, `handouts`: **DM-only writes**, everyone reads.
  (Reserved for the combat tracker / battle map / handout phases.)
- `log`: append-only for everyone (no editing or deleting past entries).

## Compatibility

These rules were written against the current flows in BOTH apps:
- Player tool (lotto-luck.html): create party (`set {createdAt}`), join,
  live member sync, leave (delete own member node) — all still allowed.
- GM tool (party.js): create party with dmUid, claim dmUid via transaction,
  read members — all still allowed.

## Heads-up for the player tool

If a player clears their browser storage they get a new anonymous uid and
their old member node becomes orphaned (nobody can write it, the DM can
delete it). Rejoining with the same code creates a fresh node — that's fine,
but the DM may want a "remove member" button eventually.
