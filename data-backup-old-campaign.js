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
// ============================================================

const STORAGE_KEY = 'gm_tool_v1';

// ─── SEED DATA ───────────────────────────────────────────────
// Edit this block to change starting content.
// Only used when localStorage is empty (first load).

const SEED_DATA = {
  currentLocation: 'ashfeld',
  currentSession: 1,
  sessionNotes: {},

  locations: {
    ashfeld: {
      name: 'Ashfeld',
      description: 'A logging town of 50–100 people on the edge of a forest in the northern borderlands. Founded hundreds of years ago by Corvyn Ashfeld. Declining slowly — the good timber is gone, the mill runs half-shifts, young people leave. Sits in loosely claimed borderland territory. Recently experienced a boom during post-war reconstruction that ended fifteen years ago. Half the decline is just economics. The darkness is underneath.',

      // ── MAP MARKERS ──────────────────────────────────────
      // x/y are percentages on the map grid (0–100)
      markers: [
        {
          id: 'm1', name: 'Ashfeld Mill', icon: '⚙', x: 62, y: 45,
          description: 'The town mill, running half-shifts. The lower level is locked by standing order.',
          dmNotes: 'The locked lower level contains the binding circle anchoring Corvyn\'s fey bargain.',
          npcIds: ['npc3'], questIds: ['q1','q2']
        },
        {
          id: 'm2', name: 'The Felled Oak', icon: '🍺', x: 38, y: 55,
          description: 'The town tavern. Warm, worn, and the only place people gather willingly.',
          dmNotes: 'Maren keeps her private journal behind the bar in a locked strongbox.',
          npcIds: ['npc4'], questIds: ['q3','q4']
        },
        {
          id: 'm3', name: 'Ashfeld Manor', icon: '🏚', x: 72, y: 25,
          description: 'Seat of the Ashfeld family. Older than it looks. Some rooms have been sealed for decades.',
          dmNotes: 'Sealed rooms contain Corvyn\'s original journals and the full account of his bargain.',
          npcIds: ['npc1','npc7'], questIds: ['q9','q10']
        },
        {
          id: 'm4', name: "Constable's Post", icon: '⚖', x: 45, y: 65,
          description: 'A small stone building. Evidence boxes, a locked cabinet, a permanently tired constable.',
          dmNotes: 'The locked evidence box contains personal effects of the three missing persons.',
          npcIds: ['npc5'], questIds: ['q11']
        },
        {
          id: 'm5', name: "Brynn's Remedies", icon: '⚕', x: 28, y: 40,
          description: 'Herbalist and healer. Smells of dried plants and worry. Shelves meticulously organized.',
          dmNotes: 'Brynn has a map on the back wall pinning every creeping grey case — all cluster within 300 feet of the mill.',
          npcIds: ['npc6'], questIds: ['q7','q8']
        },
        {
          id: 'm6', name: 'The Ashfeld Shrine', icon: '⛩', x: 50, y: 30,
          description: 'A town shrine to the Ashfeld founder. Old stone, recent maintenance.',
          dmNotes: 'A binding seal is carved into the back — Aldric the shrine-keeper doesn\'t know what it means.',
          npcIds: [], questIds: ['q5','q6']
        },
        {
          id: 'm7', name: "Sawyer's Row", icon: '🪵', x: 20, y: 60,
          description: 'A row of workers\' cottages. Several are empty. The quiet is wrong.',
          dmNotes: 'One has scratch marks on the inside of the front door. One has a child\'s drawing of a dark branching tree. One is pristine — somehow the most unsettling.',
          npcIds: [], questIds: ['q12']
        },
        {
          id: 'm8', name: 'The Forest Edge', icon: '🌲', x: 82, y: 50,
          description: 'Where the town ends and the Ashfeld Wood begins. The light changes here.',
          dmNotes: 'Sable\'s watch marks are carved into trees along this edge — first hint the hermit exists.',
          npcIds: ['npc9'], questIds: ['q13','q14']
        },
        {
          id: 'm9', name: 'Ruined Watchtower', icon: '🗼', x: 88, y: 72,
          description: 'A crumbling watchtower at the forest edge. Recently occupied.',
          dmNotes: 'Sevryn\'s ritual equipment is here. His work is causing the creeping grey, bad dreams, and at least one disappearance — unknowingly.',
          npcIds: ['npc2'], questIds: []
        }
      ],

      // ── NPCS ─────────────────────────────────────────────
      // attitude: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'trusted'
      npcs: [
        {
          id: 'npc1', name: 'Lord Edric Ashfeld', role: 'Noble Lord of Ashfeld',
          locationId: 'm3', attitude: 'neutral',
          description: 'Composed, precise, unnervingly calm. Has his ancestor\'s eyes — literally. Seems to know the town\'s history better than anyone should.',
          secret: 'Corvyn Ashfeld in his current form. Fey-touched, hundreds of years old, bound to the town. Feeds on townspeople\'s vitality in small amounts. Genuinely loves Ashfeld. Not the villain — the complication.',
          sessionNotes: ''
        },
        {
          id: 'npc2', name: 'Sevryn', role: 'Warlock — Ruined Watchtower',
          locationId: 'm9', attitude: 'neutral',
          description: 'Arrived eight months ago with a small crew. Keeps to himself. Politely deflects questions about his work.',
          secret: 'Hunting a fey crossing point near town. His rituals are causing the creeping grey, bad dreams, and at least one disappearance. Has Waking Accord backing he doesn\'t know about. Doesn\'t know Corvyn exists.',
          sessionNotes: ''
        },
        {
          id: 'npc3', name: 'Dara Voss', role: 'Mill Foreman',
          locationId: 'm1', attitude: 'neutral',
          description: 'Stocky, fifties, always has sawdust on her. Competent, closed off, jumpy if anyone asks about the lower level of the mill.',
          secret: 'Knows the lower level is off limits by standing order. Has heard things from below. Has never asked why. Terrified someone will make her open it.',
          sessionNotes: ''
        },
        {
          id: 'npc4', name: 'Maren Sol', role: 'Tavern Keeper',
          locationId: 'm2', attitude: 'friendly',
          description: 'Warm, observant, sharp memory. Has run The Felled Oak for twenty years. Knows everyone\'s business.',
          secret: 'Keeps a private journal of strange happenings going back fifteen years. Will share it only with players she genuinely trusts.',
          sessionNotes: ''
        },
        {
          id: 'npc5', name: 'Constable Wren Mast', role: 'Town Constable',
          locationId: 'm4', attitude: 'neutral',
          description: 'Thirties, lean, permanently tired. Committed to doing the job right in a town that makes it hard.',
          secret: 'Has three unsolved disappearances, a locked evidence box, and a strong suspicion that asking too many questions in this town makes people stop talking.',
          sessionNotes: ''
        },
        {
          id: 'npc6', name: 'Brynn Holt', role: 'Healer and Herbalist',
          locationId: 'm5', attitude: 'friendly',
          description: 'Methodical, quietly fierce. Has been fighting an illness she can\'t explain for three years.',
          secret: 'Has a map pinning every case of the creeping grey by address. All within 300 feet of the mill. Afraid to say it out loud.',
          sessionNotes: ''
        },
        {
          id: 'npc7', name: "Edric's Steward", role: "Lord's Steward",
          locationId: 'm3', attitude: 'neutral',
          description: 'Efficient, loyal, has worked for the Ashfeld family his entire adult life.',
          secret: "Genuinely doesn't know the truth about his employer. Has noticed small inconsistencies over the years and filed them under things he doesn't ask about.",
          sessionNotes: ''
        },
        {
          id: 'npc8', name: 'Old Nan', role: 'Retired — Town Elder',
          locationId: 'm2', attitude: 'friendly',
          description: 'Oldest person in town. Sharp as a tack. Remembers things nobody else does.',
          secret: 'Was a child when the town was founded — in its current iteration. Remembers twelve people disappearing in the first year. Remembers Corvyn had a strange light in his eyes after the last one.',
          sessionNotes: ''
        },
        {
          id: 'npc9', name: 'Hermit Sable', role: 'Forest Hermit',
          locationId: 'm8', attitude: 'neutral',
          description: 'Age unclear. Speaks in observations not conversation. Has lived in the Ashfeld Wood for at least twenty years.',
          secret: "Knows what Corvyn is and roughly what his bargain entails. Has been watching. Waiting for someone to ask the right questions.",
          sessionNotes: ''
        },
        {
          id: 'npc10', name: 'The Researcher', role: 'Drift Scholar — Passing Through',
          locationId: 'm2', attitude: 'friendly',
          description: "Eccentric, enthusiastic, easy to like. Working on something he's vague about.",
          secret: "Attempting to create warforged constructs without a creation forge. Will reappear periodically throughout the wider campaign. When he succeeds his creations are monstrosities with no regard for humanity or their creator.",
          sessionNotes: ''
        }
      ],

      // ── QUESTS ───────────────────────────────────────────
      // status: 'available' | 'active' | 'completed' | 'failed' | 'hidden'
      // type: free text — Investigation, Fetch, Social, Exploration, etc.
      quests: [
        {
          id: 'q1', name: 'Something Under the Mill',
          locationId: 'm1', status: 'available', type: 'Investigation', tier: '',
          description: 'Orin the mill hand has been hearing things from beneath the mill floor at night. Too scared to investigate alone.',
          outcome: '',
          dmNotes: "Players find the locked door. Cannot open it yet. Cold air, low hum. Don't let them in — the point is the discovery."
        },
        {
          id: 'q2', name: 'Missing Stock',
          locationId: 'm1', status: 'available', type: 'Fetch', tier: '',
          description: 'Dara needs someone to track down three loads of timber that were logged and never delivered. She suspects theft.',
          outcome: '',
          dmNotes: 'The timber was reclaimed by the forest. Players find it grown over at the treeline. First evidence the forest is active.'
        },
        {
          id: 'q3', name: 'The Crooked Tab',
          locationId: 'm2', status: 'available', type: 'Social', tier: '',
          description: 'Maren is owed a debt by a mill worker now sick with the creeping grey. Needs someone to collect gently.',
          outcome: '',
          dmNotes: "The worker can't pay but offers something better — he saw something come up from the lower level of the mill six months ago and go back down."
        },
        {
          id: 'q4', name: "Maren's Ledger",
          locationId: 'm2', status: 'hidden', type: 'Investigation', tier: '',
          description: "Maren's private journal of fifteen years of strange events. She'll share it only when she trusts the players.",
          outcome: '',
          dmNotes: 'Unlock after players complete 2–3 quests with visible integrity. Connects the creeping grey, the forest, and a description matching Sable.'
        },
        {
          id: 'q5', name: 'Defaced in the Night',
          locationId: 'm6', status: 'available', type: 'Investigation', tier: '',
          description: "Someone scratched out Corvyn Ashfeld's name on the shrine plaque overnight.",
          outcome: '',
          dmNotes: "The vandal is a young mill worker whose father was one of the missing persons. Players decide whether to turn him in, protect him, or dig into why he did it."
        },
        {
          id: 'q6', name: 'The Mark on the Stone',
          locationId: 'm6', status: 'available', type: 'Investigation', tier: '',
          description: "A carving on the back of the shrine that doesn't look decorative. Arcana DC 14 or Nature DC 12 to identify.",
          outcome: '',
          dmNotes: "A binding seal. Aldric doesn't know what it means. If players ask him he'll privately alert Lord Edric."
        },
        {
          id: 'q7', name: 'The Creeping Grey',
          locationId: 'm5', status: 'available', type: 'Investigation', tier: '',
          description: 'Brynn needs someone to visit a declining mill worker and document symptoms. Also asks them to check two nearby cases.',
          outcome: '',
          dmNotes: 'Players see the symptom map. All cases cluster around the mill. One patient dreams of a dark tree with too many branches — the true form of Corvyn\'s fey patron.'
        },
        {
          id: 'q8', name: 'Herb Run',
          locationId: 'm5', status: 'available', type: 'Fetch', tier: '',
          description: "Brynn needs a specific root from the forest edge. Her knee is bad.",
          outcome: '',
          dmNotes: "Easy job. Players find Sable's watch marks on the trees — first hint the hermit exists."
        },
        {
          id: 'q9', name: 'A Simple Delivery',
          locationId: 'm3', status: 'available', type: 'Fetch', tier: '',
          description: "Lord Edric needs a sealed letter delivered to a contact in the next village. Not to be opened.",
          outcome: '',
          dmNotes: "The contact tells players 'the ink is running out' — a message for Edric. He looks stricken when they report it. Refers to his blood losing efficacy in the binding rituals."
        },
        {
          id: 'q10', name: "What's Upstairs",
          locationId: 'm3', status: 'hidden', type: 'Investigation', tier: '',
          description: "Edric invites players to witness the opening of sealed rooms in the manor.",
          outcome: '',
          dmNotes: "Unlock after players earn Edric's trust. Contains Corvyn's original journals, the full account of the bargain, a binding circle diagram, and a list of the original twelve who disappeared."
        },
        {
          id: 'q11', name: 'Three Names',
          locationId: 'm4', status: 'available', type: 'Investigation', tier: '',
          description: 'Constable Wren will quietly deputize players to investigate three disappearances over the past year.',
          outcome: '',
          dmNotes: 'Leads to the forest edge, then Sable, then the truth that the fey patron has been pulling at the binding from inside.'
        },
        {
          id: 'q12', name: 'Left in a Hurry',
          locationId: 'm7', status: 'available', type: 'Investigation', tier: '',
          description: "Three empty houses. Two belonged to missing persons. Players can investigate freely.",
          outcome: '',
          dmNotes: "One has scratch marks on the inside of the front door. One has a child's drawing of a dark branching tree. One is pristine — somehow the most unsettling."
        },
        {
          id: 'q13', name: 'Into the Ashfeld Wood',
          locationId: 'm8', status: 'available', type: 'Exploration', tier: '',
          description: "Players attempt to enter the forest without a guide.",
          outcome: '',
          dmNotes: "Wisdom saves or lose direction. Dreamlike and recursive. Use description to unsettle — paths that loop, sounds that move. Finding Sable from here is possible with extraordinary luck."
        },
        {
          id: 'q14', name: 'Find the Hermit',
          locationId: 'm8', status: 'available', type: 'Exploration', tier: '',
          description: "Finding Sable requires navigating the forest, reading the watch marks, or finding a guide.",
          outcome: '',
          dmNotes: "Sable confirms the nature of Corvyn's bargain and what breaking it might require. Won't sugarcoat the options. Won't fight the battle for them."
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
  },

  save() {
    saveData(this.data);
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
  }
};
