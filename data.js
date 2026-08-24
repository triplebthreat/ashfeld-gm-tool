// ============================================================
// data.js — Seed data, data model, and localStorage persistence
// ============================================================
// To add a new world location: add an entry to SEED_DATA below
// with a unique key. The app will pick it up automatically.
//
// Data shape per world location:
//   markers[]  — map pins (id, name, icon, x, y, description, dmNotes, npcIds[], questIds[])
//   npcs[]     — characters (id, name, role, locationId, attitude, description, secret, sessionNotes)
//   quests[]   — missions (id, name, locationId, status, type, tier, description, outcome, dmNotes)
//
// Session notes stored at top level: sessionNotes[sessionNumber] = string
//
// Also stored at top level (not per-location — these travel with the party):
//   pcs[]         — player characters, narrative-only (mechanical stats live in the
//                   player tool / Firebase party sync, not here). Shape:
//                   { id, name, playerName, goals, arc, relationships, sessionNotes }
//   plotThreads[] — looser than quests: foreshadowing, planted hooks, slow-burns
//                   that aren't formal missions. Shape:
//                   { id, name, status: 'seeded'|'active'|'resolved'|'abandoned',
//                     description, relatedNpcIds[], relatedQuestIds[], dmNotes }
// ============================================================

// v2: campaign lore revised 2026-07 (Autumn Court exile canon).
// Old seed preserved in data-backup-old-campaign.js; old table data
// still lives in localStorage under 'gm_tool_v1' if ever needed.
const STORAGE_KEY = 'gm_tool_v2';

// ─── SEED DATA ───────────────────────────────────────────────
// Edit this block to change starting content.
// Only used when localStorage is empty (first load).

const SEED_DATA = {
  currentLocation: 'ashfeld',
  currentSession: 1,
  sessionNotes: {},
  pcs: [],
  plotThreads: [],

  // ── WORLD MAP ────────────────────────────────────────────
  // The top-level map. Markers with a locationKey drill down into
  // that location's town map. `image` is a filename/URL next to
  // index.html, or a data URI set via the "Set Map Image" button.
  viewingWorld: true,
  world: {
    name: 'World Map',
    image: 'Maps/WorldMap.webp',
    markers: [
      {
        id: 'w1', name: 'Ashfeld', icon: '🌲', x: 24, y: 18,
        description: 'A declining logging town on the forested northern edge of the temperate settled continent.',
        dmNotes: '',
        locationKey: 'ashfeld'
      }
    ]
  },

  locations: {
    ashfeld: {
      name: 'Ashfeld',
      image: 'Maps/Ashfeld/Ashfeld Village Map.png',
      description: 'A declining logging town of 50–100 people on a forested borderland edge, on the northern edge of the temperate settled continent. Economy built on logging, now fading. Quiet, close-knit, wary of outsiders in the way small dying towns are.',

      // ── MAP MARKERS ──────────────────────────────────────
      // x/y are percentages on the map grid (0–100)
      markers: [
        {
          id: 'm0', name: 'Town of Ashfeld', icon: '🏘', x: 18, y: 18,
          description: 'A declining logging town of 50–100 people on a forested borderland edge, on the northern edge of the temperate settled continent. Economy built on logging, now fading. Quiet, close-knit, wary of outsiders in the way small dying towns are.',
          dmNotes: 'CAMPAIGN STRUCTURE — Two acts. Act 1 (levels 1–2) and Act 2 (levels 3–4) with a natural break point where the party either confronts Corvyn and realizes they\'re outmatched, or has a collaborative conversation with him where he explains they aren\'t ready to deal with Sevryn. This break should emerge from player understanding and agency — not a forced/mandatory single event.',
          npcIds: [], questIds: ['q1']
        },
        {
          id: 'm1', name: 'Ashfeld Manor', icon: '🏰', x: 68, y: 26,
          description: 'Home of the Ashfeld family — the town\'s founding and ruling house.',
          dmNotes: '',
          npcIds: ['npc1', 'npc2', 'npc3', 'npc4'], questIds: ['q2']
        },
        {
          id: 'm2', name: 'Guard Post', icon: '⚖', x: 44, y: 56,
          description: 'Ashfeld\'s small guard post, run by the Crane family.',
          dmNotes: '',
          npcIds: ['npc6'], questIds: []
        },
        {
          id: 'm3', name: 'Crane Household', icon: '🏠', x: 36, y: 40,
          description: 'Home of the Crane family, longtime servants to the Ashfelds.',
          dmNotes: '',
          npcIds: ['npc5'], questIds: []
        },
        {
          id: 'm4', name: 'Old Logging Camp', icon: '⛺', x: 82, y: 66,
          description: 'A disused logging camp on the outskirts, at the forest edge. Recently reoccupied.',
          dmNotes: 'Sevryn\'s base of operations — reposition or rename this marker once you settle where he actually is (camp, outskirts cabin, etc.).',
          npcIds: ['npc7'], questIds: []
        }
      ],

      // ── NPCS ─────────────────────────────────────────────
      // attitude: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'trusted'
      npcs: [
        {
          id: 'npc1', name: 'Lord Edric Ashfeld (Corvyn)', role: 'Town lord — Autumn Court fey exile',
          locationId: 'm1', attitude: 'neutral',
          description: 'Currently inhabits the body of a 10-year-old boy. Genuinely pleasant, warm, well-liked by the town. Territorial about Ashfeld.',
          secret: 'Corvyn is centuries-old fey nobility, cast out from the Autumn Court for disrupting a cycle the court had decreed — likely one meant to end something the court wanted ended. He self-anchored to the land Ashfeld sits on as a survival mechanism after his exile. His form cycles through ages with partial-to-no control; he\'s currently stuck as a 10-year-old and operating at diminished magical capacity until the form matures. His magic is non-mortal in flavor — subtle autumnal wrongness, things that quietly happen rather than spells being cast. He has a history of quietly handling people who pushed too hard or got too close to the truth (past incidents cluster around the grandfather generation, not recent). He is investigating Sevryn\'s rituals because they threaten his anchor to the land. Genuinely loves the town — moral complexity, not a villain.',
          sessionNotes: ''
        },
        {
          id: 'npc2', name: 'The Adoptive Father', role: 'Father of "Edric" — fully human',
          locationId: 'm1', attitude: 'neutral',
          description: 'Raised by Corvyn\'s previous form (i.e., raised his own "father" without knowing it). Devoted, ordinary, no idea what his son actually is.',
          secret: 'Does not know the truth about Edric.',
          sessionNotes: ''
        },
        {
          id: 'npc3', name: 'The Mother', role: 'Married into the Ashfeld family',
          locationId: 'm1', attitude: 'neutral',
          description: 'Married in and eventually learned the truth about her son.',
          secret: 'Knows what Edric really is. Carries that alone (or possibly with the Crane family head — decide whether she has anyone to talk to about it).',
          sessionNotes: ''
        },
        {
          id: 'npc4', name: 'The Elder Sister', role: 'Edric\'s sister, ~12–13 years old',
          locationId: 'm1', attitude: 'neutral',
          description: 'Was never told the secret, but instinctively knows something is wrong with her brother.',
          secret: 'No hard knowledge — this is a good avenue for a party that\'s paying attention to picking up on subtext without a full reveal.',
          sessionNotes: ''
        },
        {
          id: 'npc5', name: 'Crane Family Head', role: 'Head of the Crane household (servant family to the Ashfelds)',
          locationId: 'm3', attitude: 'neutral',
          description: 'Loyal, discreet, carries real weight in town matters despite servant status.',
          secret: 'Knows everything about Corvyn/Edric.',
          sessionNotes: ''
        },
        {
          id: 'npc6', name: 'Captain of the Guard', role: 'Head of Ashfeld\'s guard (Crane family)',
          locationId: 'm2', attitude: 'neutral',
          description: 'Practical, protective of the town.',
          secret: 'Knows Edric is not what he appears to be, though not necessarily the full truth.',
          sessionNotes: ''
        },
        {
          id: 'npc7', name: 'Sevryn', role: 'Warlock — antagonist (functionally, not a clear villain)',
          locationId: 'm4', attitude: 'hostile',
          description: 'Conducting rituals that are causing visible harm around Ashfeld. Corvyn is actively investigating him.',
          secret: 'True believer, not a mercenary — this is what makes him dangerous and sympathetic rather than a stock villain. He\'s an inner-sect member of the Waking Accord who has done the theological math: magic is the scattered essence of the Stranger (a departed god of secrets, crossroads, and mystery), ancient concentrations of magic like Corvyn are holy sites the Stranger deliberately seeded, and harvesting Corvyn\'s essence can force the Stranger\'s return. He believes he\'s doing sacred work. This sits in tension with the Waking Accord\'s mainstream reverence for the same "holy sites" his inner sect is exploiting. Default attitude Hostile — adjust based on how first contact plays.',
          sessionNotes: ''
        }
      ],

      // ── QUESTS ───────────────────────────────────────────
      // status: 'available' | 'active' | 'completed' | 'failed' | 'hidden'
      // type: free text — Investigation, Mystery, Fetch, Social, etc.
      quests: [
        {
          id: 'q1', name: 'The Harm in the Woods',
          locationId: 'm0', status: 'available', type: 'Investigation', tier: 'Act 1 (levels 1–2)',
          description: 'Something is causing visible harm around Ashfeld — sick livestock, blighted patches of forest, unsettled townsfolk. The cause traces back to Sevryn\'s rituals, though the party won\'t know that at the outset.',
          outcome: '',
          dmNotes: 'This is the entry point into the Sevryn thread. Keep the early clues ambiguous enough that Corvyn isn\'t automatically implicated or exonerated in the party\'s minds.'
        },
        {
          id: 'q2', name: 'What Lord Edric Is',
          locationId: 'm1', status: 'hidden', type: 'Mystery', tier: 'Act 1–2',
          description: 'The slow-burn mystery of the town\'s lord. Surfaces through the sister\'s unease, rumors clustered around the grandfather generation, and Corvyn\'s own occasional slips.',
          outcome: '',
          dmNotes: 'This isn\'t meant to resolve on a single roll — it\'s environmental storytelling that compounds over several sessions. The act break happens once the party has enough of this picture to understand why Sevryn is dangerous to Corvyn specifically.'
        }
      ]
    }
    // ── Add more world locations here following the same structure ──
    // example_dungeon: { name: 'Example Dungeon', description: '...', markers: [], npcs: [], quests: [] }
  }
};

// ─── PERSISTENCE ─────────────────────────────────────────────

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('GM Tool: Failed to parse saved data, resetting.', e);
    }
  }
  // First load — clone seed data into localStorage
  const data = JSON.parse(JSON.stringify(SEED_DATA));
  saveData(data);
  return data;
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // Most likely a quota overflow from a large embedded map image
    alert('Save failed — storage is full. Try a smaller map image, or reference an image file by name instead of uploading it.');
    throw e;
  }
}

// ─── ID GENERATION ───────────────────────────────────────────

function genId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ─── EXPORTED API ────────────────────────────────────────────
// The app accesses all data through this object.

const DB = {
  data: null,

  init() {
    this.data = loadData();
    // Migrate saves created before the world map existed
    if (!this.data.world) this.data.world = JSON.parse(JSON.stringify(SEED_DATA.world));
    if (this.data.viewingWorld === undefined) this.data.viewingWorld = true;
    // Migrate saves created before PCs / plot threads existed
    if (!this.data.pcs) this.data.pcs = [];
    if (!this.data.plotThreads) this.data.plotThreads = [];
    this.mergeSeedContent();
    this.save();
  },

  // Content sync: entities appended to SEED_DATA between sessions
  // (e.g. by Claude during campaign development) flow into existing
  // saves on load. Matching is by id — entities already in the save
  // are NEVER overwritten, so edits made at the table are safe.
  // New NPCs/quests are auto-linked to their marker via locationId.
  mergeSeedContent() {
    const clone = o => JSON.parse(JSON.stringify(o));

    (SEED_DATA.world.markers || []).forEach(sm => {
      if (!this.data.world.markers.some(m => m.id === sm.id)) {
        this.data.world.markers.push(clone(sm));
      }
    });

    Object.entries(SEED_DATA.locations).forEach(([key, sloc]) => {
      if (!this.data.locations[key]) {
        this.data.locations[key] = clone(sloc);
        return;
      }
      const loc = this.data.locations[key];

      (sloc.markers || []).forEach(sm => {
        if (!loc.markers.some(m => m.id === sm.id)) loc.markers.push(clone(sm));
      });

      (sloc.npcs || []).forEach(sn => {
        if (loc.npcs.some(n => n.id === sn.id)) return;
        loc.npcs.push(clone(sn));
        const marker = loc.markers.find(m => m.id === sn.locationId);
        if (marker && !marker.npcIds.includes(sn.id)) marker.npcIds.push(sn.id);
      });

      (sloc.quests || []).forEach(sq => {
        if (loc.quests.some(q => q.id === sq.id)) return;
        loc.quests.push(clone(sq));
        const marker = loc.markers.find(m => m.id === sq.locationId);
        if (marker && !marker.questIds.includes(sq.id)) marker.questIds.push(sq.id);
      });
    });

    // PCs and plot threads travel with the party, not a location — merge as flat top-level lists.
    (SEED_DATA.pcs || []).forEach(sp => {
      if (!this.data.pcs.some(p => p.id === sp.id)) this.data.pcs.push(clone(sp));
    });
    (SEED_DATA.plotThreads || []).forEach(st => {
      if (!this.data.plotThreads.some(t => t.id === st.id)) this.data.plotThreads.push(clone(st));
    });
  },

  save() {
    saveData(this.data);
  },

  // ── Backup / restore (whole save: locations, NPCs, quests,
  //    encounters, custom monsters, scene, session notes, world) ──
  exportJSON() {
    return JSON.stringify({ _gmToolBackup: STORAGE_KEY, exportedAt: new Date().toISOString(), data: this.data }, null, 2);
  },
  importJSON(str) {
    let parsed;
    try { parsed = JSON.parse(str); } catch (e) { throw new Error('Not valid JSON.'); }
    // Accept either a wrapped backup or a bare data object
    const incoming = parsed && parsed.data && parsed.data.locations ? parsed.data
      : (parsed && parsed.locations ? parsed : null);
    if (!incoming || typeof incoming.locations !== 'object') {
      throw new Error('This file does not look like a GM Tool backup.');
    }
    this.data = incoming;
    // Re-run migrations so an older backup gains any newer fields
    if (!this.data.world) this.data.world = JSON.parse(JSON.stringify(SEED_DATA.world));
    if (this.data.viewingWorld === undefined) this.data.viewingWorld = true;
    if (!this.data.pcs) this.data.pcs = [];
    if (!this.data.plotThreads) this.data.plotThreads = [];
    this.mergeSeedContent();
    this.save();
  },

  // ── Current location ──
  getCurrentLocationKey() {
    return this.data.currentLocation;
  },
  setCurrentLocationKey(key) {
    this.data.currentLocation = key;
    this.save();
  },
  getCurrentLocationData() {
    return this.data.locations[this.data.currentLocation];
  },
  getLocationKeys() {
    return Object.keys(this.data.locations);
  },
  getLocationName(key) {
    return this.data.locations[key]?.name || key;
  },
  addLocation(key, name) {
    this.data.locations[key] = { name, description: '', markers: [], npcs: [], quests: [] };
    this.save();
  },
  setLocationImage(key, src) {
    this.data.locations[key].image = src;
    this.save();
  },

  // ── World map ──
  isViewingWorld() { return !!this.data.viewingWorld; },
  setViewingWorld(v) { this.data.viewingWorld = !!v; this.save(); },
  getWorld() { return this.data.world; },
  setWorldImage(src) { this.data.world.image = src; this.save(); },
  getWorldMarkers() { return this.data.world.markers; },
  getWorldMarker(id) { return this.data.world.markers.find(m => m.id === id); },
  addWorldMarker(marker) {
    marker.id = genId('w');
    this.data.world.markers.push(marker);
    this.save();
    return marker;
  },
  updateWorldMarker(id, changes) {
    const m = this.getWorldMarker(id);
    if (m) { Object.assign(m, changes); this.save(); }
  },
  deleteWorldMarker(id) {
    this.data.world.markers = this.data.world.markers.filter(m => m.id !== id);
    this.save();
  },

  // ── Combat (DM-local; deliberately never synced to Firebase —
  //     players must not see initiative order) ──
  getCombat() { return this.data.combat || null; },
  setCombat(c) { this.data.combat = c; this.save(); },

  // ── Prepared encounters (DM-local) ──
  getEncounters() { return this.data.encounters || []; },
  saveEncounter(enc) {
    if (!this.data.encounters) this.data.encounters = [];
    if (enc.id) {
      const i = this.data.encounters.findIndex(e => e.id === enc.id);
      if (i >= 0) { this.data.encounters[i] = enc; this.save(); return enc; }
    }
    enc.id = enc.id || genId('enc');
    this.data.encounters.push(enc);
    this.save();
    return enc;
  },
  deleteEncounter(id) {
    this.data.encounters = (this.data.encounters || []).filter(e => e.id !== id);
    this.save();
  },

  // ── Custom monsters (user-authored bestiary entries) ──
  getCustomMonsters() { return this.data.customMonsters || []; },
  saveCustomMonster(mon) {
    if (!this.data.customMonsters) this.data.customMonsters = [];
    mon.custom = true;
    const i = this.data.customMonsters.findIndex(m => m.name.toLowerCase() === mon.name.toLowerCase());
    if (i >= 0) this.data.customMonsters[i] = mon;
    else this.data.customMonsters.push(mon);
    this.save();
  },
  deleteCustomMonster(name) {
    this.data.customMonsters = (this.data.customMonsters || [])
      .filter(m => m.name.toLowerCase() !== String(name).toLowerCase());
    this.save();
  },

  // ── Scene / battle map (DM-local working copy; publishing to
  //    Firebase is handled in scene.js) ──
  // Shape: { name, image, cols, rows, showGrid, snap, tokens: [
  //   { id, name, kind: 'pc'|'monster'|'object', color, x, y (0–100 %),
  //     hp?, hpMax?, uid?, hidden? } ] }
  getScene() {
    if (!this.data.scene) {
      this.data.scene = { name: 'Battle Map', image: '', cols: 20, rows: 15, showGrid: true, snap: true, tokens: [] };
    }
    return this.data.scene;
  },
  setScene(s) { this.data.scene = s; this.save(); },
  updateSceneToken(id, changes) {
    const t = this.getScene().tokens.find(t => t.id === id);
    if (t) { Object.assign(t, changes); this.save(); }
  },
  addSceneToken(tok) {
    tok.id = tok.id || genId('tok');
    this.getScene().tokens.push(tok);
    this.save();
    return tok;
  },
  deleteSceneToken(id) {
    const s = this.getScene();
    s.tokens = s.tokens.filter(t => t.id !== id);
    this.save();
  },

  // ── Session ──
  getSession() { return this.data.currentSession; },
  setSession(n) { this.data.currentSession = n; this.save(); },
  getSessionNotes(n) { return this.data.sessionNotes[n] || ''; },
  setSessionNotes(n, text) { this.data.sessionNotes[n] = text; this.save(); },

  // ── Markers ──
  getMarkers() { return this.getCurrentLocationData().markers; },
  getMarker(id) { return this.getMarkers().find(m => m.id === id); },
  addMarker(marker) {
    marker.id = genId('m');
    if (!marker.npcIds) marker.npcIds = [];
    if (!marker.questIds) marker.questIds = [];
    this.getMarkers().push(marker);
    this.save();
    return marker;
  },
  updateMarker(id, changes) {
    const m = this.getMarker(id);
    if (m) { Object.assign(m, changes); this.save(); }
  },
  deleteMarker(id) {
    const loc = this.getCurrentLocationData();
    loc.markers = loc.markers.filter(m => m.id !== id);
    this.save();
  },

  // ── NPCs ──
  getNpcs() { return this.getCurrentLocationData().npcs; },
  getNpc(id) { return this.getNpcs().find(n => n.id === id); },
  getNpcsByMarker(markerId) {
    const marker = this.getMarker(markerId);
    if (!marker) return [];
    return marker.npcIds.map(id => this.getNpc(id)).filter(Boolean);
  },
  addNpc(npc) {
    npc.id = genId('npc');
    if (!npc.sessionNotes) npc.sessionNotes = '';
    this.getNpcs().push(npc);
    this.save();
    return npc;
  },
  updateNpc(id, changes) {
    const n = this.getNpc(id);
    if (n) { Object.assign(n, changes); this.save(); }
  },
  deleteNpc(id) {
    const loc = this.getCurrentLocationData();
    loc.npcs = loc.npcs.filter(n => n.id !== id);
    // Remove from marker lists
    loc.markers.forEach(m => {
      m.npcIds = m.npcIds.filter(nid => nid !== id);
    });
    this.save();
  },

  // ── Quests ──
  getQuests() { return this.getCurrentLocationData().quests; },
  getQuest(id) { return this.getQuests().find(q => q.id === id); },
  getQuestsByMarker(markerId) {
    const marker = this.getMarker(markerId);
    if (!marker) return [];
    return marker.questIds.map(id => this.getQuest(id)).filter(Boolean);
  },
  addQuest(quest) {
    quest.id = genId('q');
    this.getQuests().push(quest);
    this.save();
    return quest;
  },
  updateQuest(id, changes) {
    const q = this.getQuest(id);
    if (q) { Object.assign(q, changes); this.save(); }
  },
  deleteQuest(id) {
    const loc = this.getCurrentLocationData();
    loc.quests = loc.quests.filter(q => q.id !== id);
    loc.markers.forEach(m => {
      m.questIds = m.questIds.filter(qid => qid !== id);
    });
    this.save();
  },

  // ── Player Characters (narrative-only — mechanical stats live in the player tool) ──
  getPcs() { return this.data.pcs; },
  getPc(id) { return this.data.pcs.find(p => p.id === id); },
  addPc(pc) {
    pc.id = genId('pc');
    pc.goals = pc.goals || '';
    pc.arc = pc.arc || '';
    pc.relationships = pc.relationships || '';
    pc.sessionNotes = pc.sessionNotes || '';
    this.data.pcs.push(pc);
    this.save();
    return pc;
  },
  updatePc(id, changes) {
    const p = this.getPc(id);
    if (p) { Object.assign(p, changes); this.save(); }
  },
  deletePc(id) {
    this.data.pcs = this.data.pcs.filter(p => p.id !== id);
    this.save();
  },

  // ── Plot Threads (looser than quests — foreshadowing, hooks, slow-burns) ──
  getPlotThreads() { return this.data.plotThreads; },
  getPlotThread(id) { return this.data.plotThreads.find(t => t.id === id); },
  addPlotThread(thread) {
    thread.id = genId('thread');
    thread.status = thread.status || 'seeded';
    thread.description = thread.description || '';
    thread.relatedNpcIds = thread.relatedNpcIds || [];
    thread.relatedQuestIds = thread.relatedQuestIds || [];
    thread.dmNotes = thread.dmNotes || '';
    this.data.plotThreads.push(thread);
    this.save();
    return thread;
  },
  updatePlotThread(id, changes) {
    const t = this.getPlotThread(id);
    if (t) { Object.assign(t, changes); this.save(); }
  },
  deletePlotThread(id) {
    this.data.plotThreads = this.data.plotThreads.filter(t => t.id !== id);
    this.save();
  }
};
