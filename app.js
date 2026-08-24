// ============================================================
// app.js — GM Tool application logic
// ============================================================
// State flows: DB (data layer) → render functions → DOM
// User interactions update DB then re-render affected pieces.
// ============================================================

// ── APP STATE ────────────────────────────────────────────────

const App = {
  editMode: false,
  selectedMarkerId: null,
  panelView: 'empty',   // 'empty' | 'location' | 'npc' | 'quest' | 'worldMarker'
  panelId: null,        // id of currently shown entity
  dragState: null,      // active drag info
  mapAspect: null,      // aspect ratio of current map image (null = grid mode)
  mapImageToken: 0,     // guards async image loads against view switches
};

function isWorld() { return DB.isViewingWorld(); }

// ── INIT ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  DB.init();
  buildLocationSelector();
  renderSession();
  renderMap();
  renderPanelEmpty();
  wireTopbar();
  wireMapDrag(document.getElementById('map-grid'));
  wireMapDrop();
  window.addEventListener('resize', fitMapGrid);
});

// ── DRAG & DROP MAP IMAGE ────────────────────────────────────
// Drop an image file anywhere on the map panel to set it as the
// current map's background (world or town, whichever is showing).

function wireMapDrop() {
  const wrap = document.getElementById('map-wrap');

  ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => {
    if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault();
    wrap.classList.add('drop-hover');
  }));

  wrap.addEventListener('dragleave', e => {
    if (e.target === wrap) wrap.classList.remove('drop-hover');
  });

  wrap.addEventListener('drop', e => {
    e.preventDefault();
    wrap.classList.remove('drop-hover');
    const file = [...e.dataTransfer.files].find(f => f.type.startsWith('image/'));
    if (!file) return;
    readImageFileScaled(file, dataUrl => setCurrentMapImage(dataUrl));
  });
}

// ── TOP BAR ──────────────────────────────────────────────────

function wireTopbar() {
  // Location selector
  const sel = document.getElementById('loc-selector');
  sel.addEventListener('change', () => {
    if (sel.value === '__world') {
      DB.setViewingWorld(true);
    } else {
      DB.setViewingWorld(false);
      DB.setCurrentLocationKey(sel.value);
    }
    App.selectedMarkerId = null;
    App.panelView = 'empty';
    App.panelId = null;
    renderMap();
    renderPanelEmpty();
  });

  // World map button (shown when inside a location)
  document.getElementById('world-btn').addEventListener('click', () => {
    DB.setViewingWorld(true);
    buildLocationSelector();
    renderMap();
    renderPanelEmpty();
  });

  // Set map image button (edit mode)
  document.getElementById('map-image-btn').addEventListener('click', openMapImageModal);

  // Session controls
  document.getElementById('session-dec').addEventListener('click', () => {
    const n = Math.max(1, DB.getSession() - 1);
    DB.setSession(n);
    renderSession();
  });
  document.getElementById('session-inc').addEventListener('click', () => {
    DB.setSession(DB.getSession() + 1);
    renderSession();
  });

  // Session notes button
  document.getElementById('session-notes-btn').addEventListener('click', openSessionNotes);

  // Player characters / plot threads
  document.getElementById('pc-list-btn').addEventListener('click', openPcModal);
  document.getElementById('plot-thread-btn').addEventListener('click', openPlotThreadModal);

  // Backup / restore button
  document.getElementById('backup-btn').addEventListener('click', openBackupModal);

  // Edit mode toggle
  document.getElementById('edit-mode-btn').addEventListener('click', () => {
    App.editMode = !App.editMode;
    document.body.classList.toggle('edit-mode', App.editMode);
    document.getElementById('edit-mode-btn').classList.toggle('active', App.editMode);
    document.getElementById('edit-mode-btn').textContent = App.editMode ? '✏ Edit On' : '✏ Edit';
    updateMapToolbar();
    rerenderCurrentPanel();
  });

  // Add location button
  document.getElementById('add-location-btn').addEventListener('click', openAddLocationModal);
}

function buildLocationSelector() {
  const sel = document.getElementById('loc-selector');
  sel.innerHTML = '';

  const worldOpt = document.createElement('option');
  worldOpt.value = '__world';
  worldOpt.textContent = '🌍 World Map';
  if (isWorld()) worldOpt.selected = true;
  sel.appendChild(worldOpt);

  DB.getLocationKeys().forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = DB.getLocationName(key);
    if (!isWorld() && key === DB.getCurrentLocationKey()) opt.selected = true;
    sel.appendChild(opt);
  });
}

function updateMapToolbar() {
  document.getElementById('world-btn').style.display = isWorld() ? 'none' : 'inline-block';
  document.getElementById('map-image-btn').style.display = App.editMode ? 'inline-block' : 'none';
  document.getElementById('add-marker-btn').style.display = App.editMode ? 'inline-block' : 'none';
}

function renderSession() {
  document.getElementById('session-num').textContent = DB.getSession();
}

// ── MAP ──────────────────────────────────────────────────────

function renderMap() {
  if (App.sceneMode && typeof renderScene === 'function') { renderScene(); return; }
  const grid = document.getElementById('map-grid');
  grid.innerHTML = '';
  updateMapToolbar();

  if (isWorld()) {
    document.querySelector('#map-toolbar .map-title').textContent = DB.getWorld().name || 'World Map';
    applyMapImage(grid, DB.getWorld().image);
    DB.getWorldMarkers().forEach(m => grid.appendChild(buildWorldMarkerEl(m)));
    document.getElementById('add-marker-btn').onclick = () => openAddWorldMarkerModal();
  } else {
    const loc = DB.getCurrentLocationData();
    document.querySelector('#map-toolbar .map-title').textContent = loc.name;
    applyMapImage(grid, loc.image);
    DB.getMarkers().forEach(m => grid.appendChild(buildMarkerEl(m)));
    document.getElementById('add-marker-btn').onclick = () => openAddMarkerModal();
  }
}

// ── MAP BACKGROUND IMAGE ─────────────────────────────────────
// When a map has an image, the grid is sized to the image's aspect
// ratio (letterboxed inside the wrap) so marker % positions always
// line up with the same spot on the artwork.

function applyMapImage(grid, src) {
  const token = ++App.mapImageToken;
  App.mapAspect = null;
  grid.classList.remove('has-image');
  grid.style.backgroundImage = '';
  fitMapGrid();
  if (!src) return;

  const img = new Image();
  img.onload = () => {
    if (token !== App.mapImageToken) return; // view changed while loading
    App.mapAspect = img.naturalWidth / img.naturalHeight;
    grid.classList.add('has-image');
    grid.style.backgroundImage = `url("${src}")`;
    fitMapGrid();
  };
  // On error, silently keep the plain grid fallback
  img.src = src;
}

function fitMapGrid() {
  const grid = document.getElementById('map-grid');
  const wrap = document.getElementById('map-wrap');
  if (!App.mapAspect) {
    grid.style.width = '';
    grid.style.height = '';
    return;
  }
  const W = wrap.clientWidth, H = wrap.clientHeight;
  let w = W, h = W / App.mapAspect;
  if (h > H) { h = H; w = H * App.mapAspect; }
  grid.style.width = w + 'px';
  grid.style.height = h + 'px';
}

function buildMarkerEl(marker) {
  const el = document.createElement('div');
  el.className = 'map-marker';
  el.dataset.id = marker.id;
  el.style.left = marker.x + '%';
  el.style.top  = marker.y + '%';
  if (marker.id === App.selectedMarkerId) el.classList.add('selected');

  el.innerHTML = `
    <button class="marker-delete-btn" title="Delete marker">×</button>
    <div class="marker-icon">${marker.icon || '📍'}</div>
    <div class="marker-label">${escHtml(marker.name)}</div>
  `;

  // Click → select / open location view
  el.addEventListener('click', e => {
    if (e.target.classList.contains('marker-delete-btn')) return;
    if (App.dragState?.moved) return;
    selectMarker(marker.id);
  });

  // Delete button
  el.querySelector('.marker-delete-btn').addEventListener('click', e => {
    e.stopPropagation();
    if (confirm(`Delete marker "${marker.name}"?`)) {
      DB.deleteMarker(marker.id);
      if (App.selectedMarkerId === marker.id) {
        App.selectedMarkerId = null;
        renderPanelEmpty();
      }
      renderMap();
    }
  });

  return el;
}

function selectMarker(id) {
  App.selectedMarkerId = id;
  // Update selected class
  document.querySelectorAll('.map-marker').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });
  renderPanelLocation(id);
}

// ── WORLD MARKERS ────────────────────────────────────────────

function buildWorldMarkerEl(marker) {
  const el = document.createElement('div');
  el.className = 'map-marker world-marker';
  el.dataset.id = marker.id;
  el.style.left = marker.x + '%';
  el.style.top  = marker.y + '%';
  if (marker.id === App.selectedMarkerId) el.classList.add('selected');

  el.innerHTML = `
    <button class="marker-delete-btn" title="Delete marker">×</button>
    <div class="marker-icon">${marker.icon || '📍'}</div>
    <div class="marker-label">${escHtml(marker.name)}</div>
  `;

  // Click → world marker panel
  el.addEventListener('click', e => {
    if (e.target.classList.contains('marker-delete-btn')) return;
    if (App.dragState?.moved) return;
    selectWorldMarker(marker.id);
  });

  // Double-click → enter linked location directly
  el.addEventListener('dblclick', e => {
    if (App.dragState?.moved) return;
    const m = DB.getWorldMarker(marker.id);
    if (m?.locationKey && DB.data.locations[m.locationKey]) enterLocation(m.locationKey);
  });

  el.querySelector('.marker-delete-btn').addEventListener('click', e => {
    e.stopPropagation();
    if (confirm(`Delete world marker "${marker.name}"? (The location itself is not deleted.)`)) {
      DB.deleteWorldMarker(marker.id);
      if (App.selectedMarkerId === marker.id) {
        App.selectedMarkerId = null;
        renderPanelEmpty();
      }
      renderMap();
    }
  });

  return el;
}

function selectWorldMarker(id) {
  App.selectedMarkerId = id;
  document.querySelectorAll('.map-marker').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });
  renderPanelWorldMarker(id);
}

function enterLocation(key) {
  DB.setViewingWorld(false);
  DB.setCurrentLocationKey(key);
  App.selectedMarkerId = null;
  App.panelView = 'empty';
  App.panelId = null;
  buildLocationSelector();
  renderMap();
  renderPanelEmpty();
}

// ── MAP DRAG ─────────────────────────────────────────────────

function wireMapDrag(grid) {
  grid.addEventListener('mousedown', e => {
    if (!App.editMode) return;
    const markerEl = e.target.closest('.map-marker');
    if (!markerEl) return;
    if (e.target.classList.contains('marker-delete-btn')) return;

    e.preventDefault();
    const markerId = markerEl.dataset.id;
    const rect = grid.getBoundingClientRect();

    App.dragState = {
      id: markerId,
      el: markerEl,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
    };

    markerEl.classList.add('dragging');
  });

  window.addEventListener('mousemove', e => {
    if (!App.dragState) return;
    const { el, startX, startY } = App.dragState;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx > 3 || dy > 3) App.dragState.moved = true;

    const grid = document.getElementById('map-grid');
    const rect = grid.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width)  * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top)  / rect.height) * 100));
    el.style.left = x + '%';
    el.style.top  = y + '%';
  });

  window.addEventListener('mouseup', e => {
    if (!App.dragState) return;
    const { id, el, moved } = App.dragState;

    if (moved) {
      const grid = document.getElementById('map-grid');
      const rect = grid.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width)  * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top)  / rect.height) * 100));
      const pos = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
      if (isWorld()) DB.updateWorldMarker(id, pos);
      else DB.updateMarker(id, pos);
    }

    el.classList.remove('dragging');
    App.dragState = null;
  });
}

// ── RIGHT PANEL — EMPTY ───────────────────────────────────────

function renderPanelEmpty() {
  App.panelView = 'empty';
  App.panelId = null;
  App.selectedMarkerId = null;
  document.querySelectorAll('.map-marker').forEach(el => el.classList.remove('selected'));

  document.getElementById('panel-header').innerHTML = '';
  document.getElementById('panel-body').innerHTML = `
    <div id="panel-empty">
      <div class="empty-icon">🗺</div>
      <div>Select a location on the map</div>
    </div>
  `;
}

// ── RIGHT PANEL — LOCATION ────────────────────────────────────

function renderPanelLocation(markerId) {
  App.panelView = 'location';
  App.panelId = markerId;
  const marker = DB.getMarker(markerId);
  if (!marker) return;

  const npcs   = DB.getNpcsByMarker(markerId);
  const quests = DB.getQuestsByMarker(markerId);

  // Header
  document.getElementById('panel-header').innerHTML = `
    <div class="panel-type">Location</div>
    <div class="panel-name">${escHtml(marker.icon)} ${escHtml(marker.name)}</div>
  `;

  // Body
  const body = document.getElementById('panel-body');
  body.innerHTML = '';

  // Description
  const descSec = section('Description',
    App.editMode
      ? textarea(marker.description, 'desc-field', 5)
      : `<div class="section-text">${escHtml(marker.description) || '<span style="color:var(--text-muted)">No description.</span>'}</div>`
  );
  if (App.editMode) {
    descSec.querySelector('#desc-field').addEventListener('input', e => {
      DB.updateMarker(markerId, { description: e.target.value });
    });
  }
  body.appendChild(descSec);

  // DM Notes
  const dmSec = dmNotesSection(marker.dmNotes, App.editMode, val => DB.updateMarker(markerId, { dmNotes: val }));
  body.appendChild(dmSec);

  body.appendChild(divider());

  // Edit controls for marker itself (name/icon) — edit mode
  if (App.editMode) {
    const editSec = section('Marker Settings', `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="field-edit" id="marker-name-field" value="${escAttr(marker.name)}">
        </div>
        <div class="form-group">
          <label class="form-label">Icon (emoji)</label>
          <input class="field-edit" id="marker-icon-field" value="${escAttr(marker.icon)}" style="font-size:18px;text-align:center">
        </div>
      </div>
    `);
    editSec.querySelector('#marker-name-field').addEventListener('input', e => {
      DB.updateMarker(markerId, { name: e.target.value });
      document.querySelector('.panel-name').innerHTML = `${e.target.value}`;
      // Update map label live
      const mapEl = document.querySelector(`.map-marker[data-id="${markerId}"] .marker-label`);
      if (mapEl) mapEl.textContent = e.target.value;
    });
    editSec.querySelector('#marker-icon-field').addEventListener('input', e => {
      DB.updateMarker(markerId, { icon: e.target.value });
      const mapEl = document.querySelector(`.map-marker[data-id="${markerId}"] .marker-icon`);
      if (mapEl) mapEl.textContent = e.target.value;
    });
    body.appendChild(editSec);
    body.appendChild(divider());
  }

  // NPCs list
  const npcList = listSection('NPCs', npcs, npc => {
    const badge = attBadge(npc.attitude);
    return `
      <span class="item-icon">👤</span>
      <span class="item-name">${escHtml(npc.name)}</span>
      <span class="item-sub">${escHtml(npc.role)}</span>
      ${badge}
      <button class="item-delete" data-id="${npc.id}" title="Remove NPC from location">×</button>
    `;
  }, npc => renderPanelNpc(npc.id, markerId),
    npc => {
      if (confirm(`Remove ${npc.name} from this location's list?`)) {
        const m = DB.getMarker(markerId);
        m.npcIds = m.npcIds.filter(id => id !== npc.id);
        DB.save();
        renderPanelLocation(markerId);
      }
    },
    () => openAddNpcModal(markerId),
    'Add NPC'
  );
  body.appendChild(npcList);

  // Quests list
  const questList = listSection('Quests', quests, q => {
    const badge = statusBadge(q.status);
    return `
      <span class="item-icon">📜</span>
      <span class="item-name">${escHtml(q.name)}</span>
      <span class="item-sub">${escHtml(q.type)}</span>
      ${badge}
      <button class="item-delete" data-id="${q.id}" title="Remove quest from location">×</button>
    `;
  }, q => renderPanelQuest(q.id, markerId),
    q => {
      if (confirm(`Remove "${q.name}" from this location's list?`)) {
        const m = DB.getMarker(markerId);
        m.questIds = m.questIds.filter(id => id !== q.id);
        DB.save();
        renderPanelLocation(markerId);
      }
    },
    () => openAddQuestModal(markerId),
    'Add Quest'
  );
  body.appendChild(questList);

  // Encounters prepped at this location
  if (typeof encounterSection === 'function') {
    body.appendChild(encounterSection(e => e.markerId === markerId, { markerId }));
  }
}

// ── RIGHT PANEL — WORLD MARKER ────────────────────────────────

function renderPanelWorldMarker(markerId) {
  App.panelView = 'worldMarker';
  App.panelId = markerId;
  const marker = DB.getWorldMarker(markerId);
  if (!marker) return;

  const linkedLoc = marker.locationKey && DB.data.locations[marker.locationKey];

  document.getElementById('panel-header').innerHTML = `
    <div class="panel-type">World Location</div>
    <div class="panel-name">${escHtml(marker.icon)} ${escHtml(marker.name)}</div>
  `;

  const body = document.getElementById('panel-body');
  body.innerHTML = '';

  // Enter button — the drill-down into the location map
  if (linkedLoc) {
    const enterBtn = document.createElement('button');
    enterBtn.className = 'btn btn-primary enter-loc-btn';
    enterBtn.textContent = `Enter ${DB.getLocationName(marker.locationKey)} →`;
    enterBtn.addEventListener('click', () => enterLocation(marker.locationKey));
    body.appendChild(enterBtn);
  }

  // Description
  const descSec = section('Description',
    App.editMode
      ? textarea(marker.description, 'wm-desc', 4)
      : `<div class="section-text">${escHtml(marker.description) || '<span style="color:var(--text-muted)">No description.</span>'}</div>`
  );
  if (App.editMode) {
    descSec.querySelector('#wm-desc').addEventListener('input', e => {
      DB.updateWorldMarker(markerId, { description: e.target.value });
    });
  }
  body.appendChild(descSec);

  // DM Notes
  body.appendChild(dmNotesSection(marker.dmNotes, App.editMode, val => DB.updateWorldMarker(markerId, { dmNotes: val })));

  // Edit controls
  if (App.editMode) {
    body.appendChild(divider());
    const locOptions = ['<option value="">— None —</option>']
      .concat(DB.getLocationKeys().map(key =>
        `<option value="${escAttr(key)}"${key === marker.locationKey ? ' selected' : ''}>${escHtml(DB.getLocationName(key))}</option>`
      )).join('');
    const editSec = section('Marker Settings', `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="field-edit" id="wm-name-field" value="${escAttr(marker.name)}">
        </div>
        <div class="form-group">
          <label class="form-label">Icon (emoji)</label>
          <input class="field-edit" id="wm-icon-field" value="${escAttr(marker.icon)}" style="font-size:18px;text-align:center">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Links to Location</label>
        <select class="field-edit" id="wm-link-field">${locOptions}</select>
      </div>
    `);
    editSec.querySelector('#wm-name-field').addEventListener('input', e => {
      DB.updateWorldMarker(markerId, { name: e.target.value });
      document.querySelector('.panel-name').textContent = e.target.value;
      const mapEl = document.querySelector(`.map-marker[data-id="${markerId}"] .marker-label`);
      if (mapEl) mapEl.textContent = e.target.value;
    });
    editSec.querySelector('#wm-icon-field').addEventListener('input', e => {
      DB.updateWorldMarker(markerId, { icon: e.target.value });
      const mapEl = document.querySelector(`.map-marker[data-id="${markerId}"] .marker-icon`);
      if (mapEl) mapEl.textContent = e.target.value;
    });
    editSec.querySelector('#wm-link-field').addEventListener('change', e => {
      DB.updateWorldMarker(markerId, { locationKey: e.target.value });
      renderPanelWorldMarker(markerId); // refresh Enter button
    });
    body.appendChild(editSec);
  }
}

// ── RIGHT PANEL — NPC ─────────────────────────────────────────

function renderPanelNpc(npcId, fromMarkerId) {
  App.panelView = 'npc';
  App.panelId = npcId;
  const npc = DB.getNpc(npcId);
  if (!npc) return;

  document.getElementById('panel-header').innerHTML = `
    <div class="panel-type">NPC</div>
    <div class="panel-name">${escHtml(npc.name)}</div>
    <div class="panel-sub">${escHtml(npc.role)}</div>
  `;

  const body = document.getElementById('panel-body');
  body.innerHTML = '';

  // Back button
  if (fromMarkerId) {
    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.innerHTML = '← Back to location';
    backBtn.addEventListener('click', () => {
      selectMarker(fromMarkerId);
    });
    body.appendChild(backBtn);
  }

  // Attitude tracker (always interactive)
  const attSec = document.createElement('div');
  attSec.className = 'section';
  attSec.innerHTML = '<div class="section-label">Attitude</div>';
  attSec.appendChild(buildAttitudeTrack(npc.attitude, val => {
    DB.updateNpc(npcId, { attitude: val });
  }));
  body.appendChild(attSec);

  // Stat-block bridge: an NPC with a matching bestiary entry can fight
  if (typeof findMonsterByName === 'function') {
    const stat = findMonsterByName(npc.name);
    const statBtn = document.createElement('button');
    statBtn.className = 'btn npc-stat-btn';
    statBtn.textContent = stat ? '👹 Open stat block' : '👹 Create stat block';
    statBtn.title = stat
      ? 'This NPC has combat stats — usable in encounters by name'
      : 'Give this NPC combat stats so encounters can include them by name';
    statBtn.addEventListener('click', () => {
      if (stat) renderPanelMonster(npc.name);
      else openMonsterEditor(null, npc.name);
    });
    body.appendChild(statBtn);
  }

  // Role / name (edit mode)
  if (App.editMode) {
    const meta = section('Identity', `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="field-edit" id="npc-name-field" value="${escAttr(npc.name)}">
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <input class="field-edit" id="npc-role-field" value="${escAttr(npc.role)}">
        </div>
      </div>
    `);
    meta.querySelector('#npc-name-field').addEventListener('input', e => {
      DB.updateNpc(npcId, { name: e.target.value });
      document.querySelector('.panel-name').textContent = e.target.value;
    });
    meta.querySelector('#npc-role-field').addEventListener('input', e => {
      DB.updateNpc(npcId, { role: e.target.value });
      document.querySelector('.panel-sub').textContent = e.target.value;
    });
    body.appendChild(meta);
  }

  // Description
  const descSec = section('Description',
    App.editMode
      ? textarea(npc.description, 'npc-desc', 4)
      : `<div class="section-text">${escHtml(npc.description) || '<span style="color:var(--text-muted)">None.</span>'}</div>`
  );
  if (App.editMode) {
    descSec.querySelector('#npc-desc').addEventListener('input', e => DB.updateNpc(npcId, { description: e.target.value }));
  }
  body.appendChild(descSec);

  // Reveal to party (player-safe description only — never the secret)
  if (typeof Party !== 'undefined' && Party.code && Party.isDM && npc.description) {
    const revealBtn = document.createElement('button');
    revealBtn.className = 'btn reveal-btn';
    revealBtn.textContent = '📣 Send description to party';
    revealBtn.addEventListener('click', () => {
      if (confirm(`Send ${npc.name}'s public description to the party?`)) {
        sendHandout(npc.name, npc.description, null, err => {
          revealBtn.textContent = err ? '📣 Failed — retry?' : '📣 Sent ✓';
        });
      }
    });
    body.appendChild(revealBtn);
  }

  // Secret / DM Notes
  const secretSec = dmNotesSection(npc.secret, App.editMode, val => DB.updateNpc(npcId, { secret: val }), 'DM Notes / Secret');
  body.appendChild(secretSec);

  body.appendChild(divider());

  // Session notes (always editable)
  const snLabel = `Session Notes — Session ${DB.getSession()}`;
  const snSec = section(snLabel, textarea(npc.sessionNotes || '', 'npc-session-notes', 5));
  snSec.querySelector('#npc-session-notes').addEventListener('input', e => {
    DB.updateNpc(npcId, { sessionNotes: e.target.value });
  });
  body.appendChild(snSec);
}

// ── RIGHT PANEL — QUEST ───────────────────────────────────────

function renderPanelQuest(questId, fromMarkerId) {
  App.panelView = 'quest';
  App.panelId = questId;
  const q = DB.getQuest(questId);
  if (!q) return;

  document.getElementById('panel-header').innerHTML = `
    <div class="panel-type">Quest</div>
    <div class="panel-name">${escHtml(q.name)}</div>
    <div class="panel-sub">${escHtml(q.type)}${q.tier ? ' · ' + escHtml(q.tier) : ''}</div>
  `;

  const body = document.getElementById('panel-body');
  body.innerHTML = '';

  // Back button
  if (fromMarkerId) {
    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.innerHTML = '← Back to location';
    backBtn.addEventListener('click', () => selectMarker(fromMarkerId));
    body.appendChild(backBtn);
  }

  // Status tracker (always interactive)
  const statusSec = document.createElement('div');
  statusSec.className = 'section';
  statusSec.innerHTML = '<div class="section-label">Status</div>';
  statusSec.appendChild(buildStatusTrack(q.status, val => {
    DB.updateQuest(questId, { status: val });
  }));
  body.appendChild(statusSec);

  // Meta (edit mode)
  if (App.editMode) {
    const meta = section('Details', `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="field-edit" id="q-name-field" value="${escAttr(q.name)}">
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <input class="field-edit" id="q-type-field" value="${escAttr(q.type)}">
        </div>
      </div>
    `);
    meta.querySelector('#q-name-field').addEventListener('input', e => {
      DB.updateQuest(questId, { name: e.target.value });
      document.querySelector('.panel-name').textContent = e.target.value;
    });
    meta.querySelector('#q-type-field').addEventListener('input', e => {
      DB.updateQuest(questId, { type: e.target.value });
    });
    body.appendChild(meta);
  }

  // Description
  const descSec = section('Description',
    App.editMode
      ? textarea(q.description, 'q-desc', 4)
      : `<div class="section-text">${escHtml(q.description) || '<span style="color:var(--text-muted)">None.</span>'}</div>`
  );
  if (App.editMode) {
    descSec.querySelector('#q-desc').addEventListener('input', e => DB.updateQuest(questId, { description: e.target.value }));
  }
  body.appendChild(descSec);

  // Reveal to party (player-facing description only)
  if (typeof Party !== 'undefined' && Party.code && Party.isDM && q.description) {
    const revealBtn = document.createElement('button');
    revealBtn.className = 'btn reveal-btn';
    revealBtn.textContent = '📣 Send quest to party';
    revealBtn.addEventListener('click', () => {
      if (confirm(`Send "${q.name}" (player-facing description) to the party?`)) {
        sendHandout('Quest: ' + q.name, q.description, null, err => {
          revealBtn.textContent = err ? '📣 Failed — retry?' : '📣 Sent ✓';
        });
      }
    });
    body.appendChild(revealBtn);
  }

  // Outcome
  const outSec = section('Outcome / Resolution', textarea(q.outcome || '', 'q-outcome', 3));
  outSec.querySelector('#q-outcome').addEventListener('input', e => DB.updateQuest(questId, { outcome: e.target.value }));
  body.appendChild(outSec);

  // DM Notes
  const dmSec = dmNotesSection(q.dmNotes, App.editMode, val => DB.updateQuest(questId, { dmNotes: val }));
  body.appendChild(dmSec);

  // Encounters tied to this quest
  if (typeof encounterSection === 'function') {
    body.appendChild(encounterSection(e => e.questId === questId, { questId, markerId: q.locationId }));
  }
}

// ── RE-RENDER HELPER ──────────────────────────────────────────

function rerenderCurrentPanel() {
  if (App.panelView === 'location') renderPanelLocation(App.panelId);
  else if (App.panelView === 'npc')  renderPanelNpc(App.panelId, App.selectedMarkerId);
  else if (App.panelView === 'quest') renderPanelQuest(App.panelId, App.selectedMarkerId);
  else if (App.panelView === 'worldMarker') renderPanelWorldMarker(App.panelId);
  else if (App.panelView === 'monster') renderPanelMonster(App.panelId);
  else renderPanelEmpty();
}

// ── SESSION NOTES MODAL ───────────────────────────────────────

function openSessionNotes() {
  const n = DB.getSession();
  const notes = DB.getSessionNotes(n);
  openModal(`Session ${n} Notes`, `
    <div class="form-group">
      <label class="form-label">Notes for Session ${n}</label>
      <textarea id="session-notes-ta" class="field-edit" rows="12" style="resize:vertical">${escHtml(notes)}</textarea>
    </div>
  `, [
    { label: 'Done', primary: true, onClick: () => {
      const val = document.getElementById('session-notes-ta').value;
      DB.setSessionNotes(n, val);
      closeModal();
    }}
  ]);
  // Live save
  setTimeout(() => {
    const ta = document.getElementById('session-notes-ta');
    if (ta) ta.addEventListener('input', e => DB.setSessionNotes(n, e.target.value));
  }, 0);
}

// ── PLAYER CHARACTERS (narrative-only — mechanical stats live in the player tool) ──

function openPcModal() {
  const pcs = DB.getPcs();
  const cards = pcs.length
    ? pcs.map(pcCardHtml).join('')
    : `<div style="color:var(--text-muted);font-size:12px;padding:6px 0">No player characters yet — add one below, or let a session recap add them automatically.</div>`;
  openModal('Player Characters', `
    <div class="section-text" style="margin-bottom:14px">
      Narrative memory only — goals, arcs, relationships. Mechanical stats (HP, level, class) live in each player's own sheet.
    </div>
    <div id="pc-cards">${cards}</div>
    <button id="pc-add-btn" class="btn" style="margin-top:10px">+ Add Player Character</button>
  `, [{ label: 'Done', primary: true, onClick: closeModal }]);
  wirePcModalEvents();
}

function pcCardHtml(pc) {
  return `
    <div class="section" data-pc-id="${escAttr(pc.id)}" style="border:1px solid var(--border-color, #333);border-radius:6px;padding:10px;margin-bottom:10px">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Character Name</label>
          <input class="field-edit pc-name" value="${escAttr(pc.name || '')}"></div>
        <div class="form-group"><label class="form-label">Player</label>
          <input class="field-edit pc-player" value="${escAttr(pc.playerName || '')}"></div>
      </div>
      <div class="section-label" style="margin-top:8px">Goals &amp; Fears</div>
      ${textarea(pc.goals || '', '', 2)}
      <div class="section-label" style="margin-top:8px">Arc / Development</div>
      ${textarea(pc.arc || '', '', 2)}
      <div class="section-label" style="margin-top:8px">Relationships</div>
      ${textarea(pc.relationships || '', '', 2)}
      <div class="section-label" style="margin-top:8px">Session Notes — Session ${DB.getSession()}</div>
      ${textarea(pc.sessionNotes || '', '', 2)}
      <button class="btn pc-delete" style="margin-top:8px">Delete</button>
    </div>`;
}

function wirePcModalEvents() {
  document.querySelectorAll('#pc-cards [data-pc-id]').forEach(card => {
    const id = card.dataset.pcId;
    const fields = card.querySelectorAll('.pc-name, .pc-player, textarea');
    const keys = ['name', 'playerName', 'goals', 'arc', 'relationships', 'sessionNotes'];
    fields.forEach((el, i) => el.addEventListener('input', e => DB.updatePc(id, { [keys[i]]: e.target.value })));
    card.querySelector('.pc-delete').addEventListener('click', () => {
      const pc = DB.getPc(id);
      if (confirm(`Delete "${pc?.name || 'this character'}"? This cannot be undone.`)) {
        DB.deletePc(id);
        openPcModal();
      }
    });
  });
  document.getElementById('pc-add-btn').addEventListener('click', () => {
    DB.addPc({ name: 'New Character', playerName: '' });
    openPcModal();
  });
}

// ── PLOT THREADS (looser than quests — foreshadowing, hooks, slow-burns) ──

function openPlotThreadModal() {
  const threads = DB.getPlotThreads();
  const cards = threads.length
    ? threads.map(threadCardHtml).join('')
    : `<div style="color:var(--text-muted);font-size:12px;padding:6px 0">No plot threads yet — add one below, or let a session recap seed them automatically.</div>`;
  openModal('Plot Threads', `
    <div class="section-text" style="margin-bottom:14px">
      Foreshadowing, planted hooks, slow-burns — narrative threads that aren't formal quests yet (or won't ever become one).
    </div>
    <div id="thread-cards">${cards}</div>
    <button id="thread-add-btn" class="btn" style="margin-top:10px">+ Add Plot Thread</button>
  `, [{ label: 'Done', primary: true, onClick: closeModal }]);
  wireThreadModalEvents();
}

function threadCardHtml(t) {
  return `
    <div class="section" data-thread-id="${escAttr(t.id)}" style="border:1px solid var(--border-color, #333);border-radius:6px;padding:10px;margin-bottom:10px">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Name</label>
          <input class="field-edit thread-name" value="${escAttr(t.name || '')}"></div>
      </div>
      <div class="section-label" style="margin-top:8px">Status</div>
      <select class="field-edit thread-status">
        ${['seeded','active','resolved','abandoned'].map(s => `<option value="${s}"${s===t.status?' selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}
      </select>
      <div class="section-label" style="margin-top:8px">Description</div>
      ${textarea(t.description || '', '', 2)}
      <div class="section-label" style="margin-top:8px">DM Notes</div>
      ${textarea(t.dmNotes || '', '', 2)}
      <button class="btn thread-delete" style="margin-top:8px">Delete</button>
    </div>`;
}

function wireThreadModalEvents() {
  document.querySelectorAll('#thread-cards [data-thread-id]').forEach(card => {
    const id = card.dataset.threadId;
    card.querySelector('.thread-name').addEventListener('input', e => DB.updatePlotThread(id, { name: e.target.value }));
    card.querySelector('.thread-status').addEventListener('change', e => DB.updatePlotThread(id, { status: e.target.value }));
    const textareas = card.querySelectorAll('textarea');
    textareas[0].addEventListener('input', e => DB.updatePlotThread(id, { description: e.target.value }));
    textareas[1].addEventListener('input', e => DB.updatePlotThread(id, { dmNotes: e.target.value }));
    card.querySelector('.thread-delete').addEventListener('click', () => {
      const t = DB.getPlotThread(id);
      if (confirm(`Delete "${t?.name || 'this thread'}"? This cannot be undone.`)) {
        DB.deletePlotThread(id);
        openPlotThreadModal();
      }
    });
  });
  document.getElementById('thread-add-btn').addEventListener('click', () => {
    DB.addPlotThread({ name: 'New Thread' });
    openPlotThreadModal();
  });
}

// ── BACKUP / RESTORE ──────────────────────────────────────────

function openBackupModal() {
  const d = DB.data;
  const locs = Object.keys(d.locations || {}).length;
  const npcs = Object.values(d.locations || {}).reduce((n, l) => n + (l.npcs || []).length, 0);
  const quests = Object.values(d.locations || {}).reduce((n, l) => n + (l.quests || []).length, 0);
  const encs = (d.encounters || []).length;
  const mons = (d.customMonsters || []).length;
  openModal('Backup & Restore', `
    <div class="section-text" style="margin-bottom:14px">
      Your entire campaign lives in this browser. Download a backup file to keep it
      safe — restore it here, or in another browser, to bring everything back.
    </div>
    <div class="backup-stats">
      <div><b>${locs}</b> locations</div>
      <div><b>${npcs}</b> NPCs</div>
      <div><b>${quests}</b> quests</div>
      <div><b>${encs}</b> encounters</div>
      <div><b>${mons}</b> custom monsters</div>
    </div>
    <button class="btn btn-primary" id="backup-download" style="width:100%;margin-top:14px">⬇ Download Backup (.json)</button>
    <div class="divider"></div>
    <label class="form-label">Restore from a backup file</label>
    <input type="file" id="backup-file" accept="application/json,.json" class="field-edit" style="height:auto;padding:6px">
    <div style="font-size:11px;color:var(--text-muted);margin-top:6px">
      Restoring replaces your current campaign data (the app reloads afterward).
    </div>
    <div id="backup-msg" style="font-size:12px;min-height:16px;margin-top:8px"></div>
  `, [{ label: 'Close', primary: true, onClick: closeModal }]);

  document.getElementById('backup-download').addEventListener('click', () => {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const blob = new Blob([DB.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gm-tool-backup-${stamp}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    document.getElementById('backup-msg').innerHTML = '<span style="color:#7acc94">Backup downloaded ✓</span>';
  });

  document.getElementById('backup-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const msg = document.getElementById('backup-msg');
      try {
        // Peek at the contents to summarize before overwriting
        const peek = JSON.parse(reader.result);
        const pd = peek.data && peek.data.locations ? peek.data : peek;
        const pLocs = Object.keys(pd.locations || {}).length;
        if (!confirm(`Restore this backup? It contains ${pLocs} location(s) and will replace your current campaign data. This can't be undone (download a backup of the current data first if unsure).`)) {
          e.target.value = ''; return;
        }
        DB.importJSON(reader.result);
        msg.innerHTML = '<span style="color:#7acc94">Restored ✓ Reloading…</span>';
        setTimeout(() => location.reload(), 700);
      } catch (err) {
        msg.innerHTML = `<span style="color:#e07070">${escHtml(err.message)}</span>`;
      }
    };
    reader.readAsText(file);
  });
}

// ── ADD LOCATION MODAL ────────────────────────────────────────

function openAddLocationModal() {
  openModal('Add New Location', `
    <div id="new-location-form">
      <div class="form-group">
        <label class="form-label">Location Key (no spaces, e.g. "darkwood_dungeon")</label>
        <input class="field-edit" id="new-loc-key" placeholder="my_location">
      </div>
      <div class="form-group">
        <label class="form-label">Display Name</label>
        <input class="field-edit" id="new-loc-name" placeholder="My Location">
      </div>
    </div>
  `, [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Add Location', primary: true, onClick: () => {
      const key  = document.getElementById('new-loc-key').value.trim().replace(/\s+/g,'_');
      const name = document.getElementById('new-loc-name').value.trim();
      if (!key || !name) { alert('Both fields required.'); return; }
      if (DB.data.locations[key]) { alert('Key already exists.'); return; }
      DB.addLocation(key, name);
      buildLocationSelector();
      closeModal();
    }}
  ]);
}

// ── ADD WORLD MARKER MODAL ────────────────────────────────────

function openAddWorldMarkerModal() {
  const locOptions = ['<option value="">— None —</option>']
    .concat(DB.getLocationKeys().map(key =>
      `<option value="${escAttr(key)}">${escHtml(DB.getLocationName(key))}</option>`
    )).join('');
  openModal('Add World Marker', `
    <div id="entity-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="field-edit" id="wm-n" placeholder="Region or settlement">
        </div>
        <div class="form-group">
          <label class="form-label">Icon (emoji)</label>
          <input class="field-edit" id="wm-i" placeholder="🏔" style="font-size:18px;text-align:center" maxlength="4">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Links to Location (drill-down target)</label>
        <select class="field-edit" id="wm-l">${locOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="field-edit" id="wm-d" rows="3"></textarea>
      </div>
    </div>
  `, [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Add Marker', primary: true, onClick: () => {
      const name = document.getElementById('wm-n').value.trim();
      if (!name) { alert('Name required.'); return; }
      DB.addWorldMarker({
        name,
        icon: document.getElementById('wm-i').value.trim() || '📍',
        x: 50, y: 50,
        description: document.getElementById('wm-d').value,
        dmNotes: '',
        locationKey: document.getElementById('wm-l').value
      });
      renderMap();
      closeModal();
    }}
  ]);
}

// ── SET MAP IMAGE MODAL ───────────────────────────────────────
// Sets the background image for the current map (world or town).
// Accepts an uploaded file (downscaled and stored in localStorage)
// or a filename/URL kept next to index.html.

function openMapImageModal() {
  const target = isWorld() ? DB.getWorld() : DB.getCurrentLocationData();
  const targetName = isWorld() ? 'World Map' : DB.getCurrentLocationData().name;
  const current = target.image || '';
  const isDataUri = current.startsWith('data:');

  openModal(`Set Map Image — ${targetName}`, `
    <div id="entity-form">
      <div class="form-group">
        <label class="form-label">Upload image file</label>
        <input type="file" id="map-img-file" accept="image/*" class="field-edit" style="height:auto;padding:6px">
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
          Stored inside the tool's save data — works anywhere, no separate file needed.
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Or filename / URL</label>
        <input class="field-edit" id="map-img-url" placeholder="world-map.jpg" value="${isDataUri ? '' : escAttr(current)}">
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
          A filename refers to a file kept next to index.html (e.g. world-map.jpg).
        </div>
      </div>
    </div>
  `, [
    { label: 'Clear Image', onClick: () => {
      setCurrentMapImage('');
      closeModal();
    }},
    { label: 'Cancel', onClick: closeModal },
    { label: 'Save', primary: true, onClick: () => {
      const file = document.getElementById('map-img-file').files[0];
      if (file) {
        readImageFileScaled(file, dataUrl => {
          setCurrentMapImage(dataUrl);
          closeModal();
        });
      } else {
        setCurrentMapImage(document.getElementById('map-img-url').value.trim());
        closeModal();
      }
    }}
  ]);
}

function setCurrentMapImage(src) {
  if (isWorld()) DB.setWorldImage(src);
  else DB.setLocationImage(DB.getCurrentLocationKey(), src);
  renderMap();
}

// Downscale to keep the data URI comfortably inside localStorage limits
function readImageFileScaled(file, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const MAX_W = 2048;
      const scale = Math.min(1, MAX_W / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.naturalWidth  * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        cb(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        alert('Could not process that image.');
      }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// ── ADD MARKER MODAL ──────────────────────────────────────────

function openAddMarkerModal() {
  openModal('Add Map Marker', `
    <div id="entity-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="field-edit" id="m-name" placeholder="The Old Mill">
        </div>
        <div class="form-group">
          <label class="form-label">Icon (emoji)</label>
          <input class="field-edit" id="m-icon" placeholder="⚙" style="font-size:18px;text-align:center" maxlength="4">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="field-edit" id="m-desc" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">DM Notes</label>
        <textarea class="field-edit" id="m-dmnotes" rows="3"></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">X Position (0–100)</label>
          <input class="field-edit" id="m-x" type="number" min="0" max="100" value="50">
        </div>
        <div class="form-group">
          <label class="form-label">Y Position (0–100)</label>
          <input class="field-edit" id="m-y" type="number" min="0" max="100" value="50">
        </div>
      </div>
    </div>
  `, [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Add Marker', primary: true, onClick: () => {
      const name = document.getElementById('m-name').value.trim();
      const icon = document.getElementById('m-icon').value.trim() || '📍';
      if (!name) { alert('Name required.'); return; }
      DB.addMarker({
        name, icon,
        x: parseFloat(document.getElementById('m-x').value) || 50,
        y: parseFloat(document.getElementById('m-y').value) || 50,
        description: document.getElementById('m-desc').value,
        dmNotes: document.getElementById('m-dmnotes').value,
        npcIds: [], questIds: []
      });
      renderMap();
      closeModal();
    }}
  ]);
}

// ── ADD NPC MODAL ─────────────────────────────────────────────

function openAddNpcModal(markerId) {
  const attOptions = ['hostile','unfriendly','neutral','friendly','trusted'];
  openModal('Add NPC', `
    <div id="entity-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="field-edit" id="npc-n" placeholder="Character Name">
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <input class="field-edit" id="npc-r" placeholder="Blacksmith">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Attitude</label>
        <select class="field-edit" id="npc-att">
          ${attOptions.map(a => `<option value="${a}"${a==='neutral'?' selected':''}>${capitalize(a)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="field-edit" id="npc-d" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">DM Notes / Secret</label>
        <textarea class="field-edit" id="npc-s" rows="3"></textarea>
      </div>
    </div>
  `, [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Add NPC', primary: true, onClick: () => {
      const name = document.getElementById('npc-n').value.trim();
      if (!name) { alert('Name required.'); return; }
      const npc = DB.addNpc({
        name,
        role: document.getElementById('npc-r').value.trim(),
        locationId: markerId,
        attitude: document.getElementById('npc-att').value,
        description: document.getElementById('npc-d').value,
        secret: document.getElementById('npc-s').value,
      });
      // Link to marker
      const m = DB.getMarker(markerId);
      if (m && !m.npcIds.includes(npc.id)) { m.npcIds.push(npc.id); DB.save(); }
      renderPanelLocation(markerId);
      closeModal();
    }}
  ]);
}

// ── ADD QUEST MODAL ───────────────────────────────────────────

function openAddQuestModal(markerId) {
  const statusOptions = ['available','active','completed','failed','hidden'];
  openModal('Add Quest', `
    <div id="entity-form">
      <div class="form-group">
        <label class="form-label">Name</label>
        <input class="field-edit" id="q-n" placeholder="Quest Name">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Type</label>
          <input class="field-edit" id="q-t" placeholder="Investigation">
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="field-edit" id="q-s">
            ${statusOptions.map(s => `<option value="${s}"${s==='available'?' selected':''}>${capitalize(s)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description (player-facing)</label>
        <textarea class="field-edit" id="q-d" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">DM Notes</label>
        <textarea class="field-edit" id="q-dm" rows="3"></textarea>
      </div>
    </div>
  `, [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Add Quest', primary: true, onClick: () => {
      const name = document.getElementById('q-n').value.trim();
      if (!name) { alert('Name required.'); return; }
      const quest = DB.addQuest({
        name,
        locationId: markerId,
        type: document.getElementById('q-t').value.trim(),
        status: document.getElementById('q-s').value,
        description: document.getElementById('q-d').value,
        dmNotes: document.getElementById('q-dm').value,
        outcome: '', tier: ''
      });
      const m = DB.getMarker(markerId);
      if (m && !m.questIds.includes(quest.id)) { m.questIds.push(quest.id); DB.save(); }
      renderPanelLocation(markerId);
      closeModal();
    }}
  ]);
}

// ── MODAL SYSTEM ─────────────────────────────────────────────

function openModal(title, bodyHtml, actions) {
  const overlay = document.getElementById('modal-overlay');
  overlay.querySelector('.modal-header h2').textContent = title;
  overlay.querySelector('.modal-body').innerHTML = bodyHtml;

  const footer = overlay.querySelector('.modal-footer');
  footer.innerHTML = '';
  (actions || []).forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'btn' + (a.primary ? ' btn-primary' : '');
    btn.textContent = a.label;
    btn.addEventListener('click', a.onClick);
    footer.appendChild(btn);
  });

  overlay.classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});
document.querySelector('.modal-close').addEventListener('click', closeModal);

// ── UI COMPONENT HELPERS ──────────────────────────────────────

function section(labelText, contentHtml) {
  const div = document.createElement('div');
  div.className = 'section';
  div.innerHTML = `<div class="section-label">${escHtml(labelText)}</div>${contentHtml}`;
  return div;
}

function dmNotesSection(value, editMode, onChange, labelOverride) {
  const label = labelOverride || 'DM Notes';
  const div = document.createElement('div');
  div.className = 'section dm-notes-section';
  if (editMode) {
    div.innerHTML = `<div class="section-label">${escHtml(label)}</div>` + textarea(value, 'dm-notes-ta', 4);
    div.querySelector('#dm-notes-ta').addEventListener('input', e => onChange(e.target.value));
  } else {
    div.innerHTML = `
      <div class="section-label">${escHtml(label)}</div>
      <div class="section-text">${escHtml(value) || '<span style="color:var(--text-muted)">None.</span>'}</div>
    `;
  }
  return div;
}

function textarea(value, id, rows) {
  return `<textarea class="field-edit" id="${id}" rows="${rows}">${escHtml(value)}</textarea>`;
}

function divider() {
  const d = document.createElement('div');
  d.className = 'divider';
  return d;
}

function listSection(labelText, items, renderItemHtml, onItemClick, onItemDelete, onAdd, addLabel) {
  const div = document.createElement('div');
  div.className = 'list-section';

  div.innerHTML = `
    <div class="list-header">
      <div class="section-label">${escHtml(labelText)}</div>
    </div>
    <div class="list-items"></div>
    <button class="add-item-btn">${escHtml(addLabel || '+ Add')}</button>
  `;

  const listEl = div.querySelector('.list-items');
  if (items.length === 0) {
    listEl.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:6px 0">None.</div>`;
  } else {
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'list-item';
      el.innerHTML = renderItemHtml(item);
      el.addEventListener('click', e => {
        if (e.target.classList.contains('item-delete')) return;
        onItemClick(item);
      });
      const delBtn = el.querySelector('.item-delete');
      if (delBtn) {
        delBtn.addEventListener('click', e => { e.stopPropagation(); onItemDelete(item); });
      }
      listEl.appendChild(el);
    });
  }

  div.querySelector('.add-item-btn').addEventListener('click', onAdd);
  return div;
}

function buildAttitudeTrack(currentAtt, onChange) {
  const atts = ['hostile','unfriendly','neutral','friendly','trusted'];
  const labels = { hostile:'Hostile', unfriendly:'Unfriendly', neutral:'Neutral', friendly:'Friendly', trusted:'Trusted' };
  const wrap = document.createElement('div');
  wrap.className = 'attitude-track';
  atts.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'att-btn' + (a === currentAtt ? ' active' : '');
    btn.dataset.att = a;
    btn.textContent = labels[a];
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(a);
    });
    wrap.appendChild(btn);
  });
  return wrap;
}

function buildStatusTrack(currentStatus, onChange) {
  const statuses = ['available','active','completed','failed','hidden'];
  const labels = { available:'Available', active:'Active', completed:'Completed', failed:'Failed', hidden:'Hidden' };
  const wrap = document.createElement('div');
  wrap.className = 'status-track';
  statuses.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'status-btn' + (s === currentStatus ? ' active' : '');
    btn.dataset.status = s;
    btn.textContent = labels[s];
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(s);
    });
    wrap.appendChild(btn);
  });
  return wrap;
}

function statusBadge(status) {
  const labels = { available:'Available', active:'Active', completed:'Completed', failed:'Failed', hidden:'Hidden' };
  return `<span class="status-badge ${status}">${labels[status] || status}</span>`;
}

function attBadge(att) {
  const labels = { hostile:'Hostile', unfriendly:'Unfriendly', neutral:'Neutral', friendly:'Friendly', trusted:'Trusted' };
  return `<span class="att-badge ${att}">${labels[att] || att}</span>`;
}

// ── UTILITY ───────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function escAttr(str) { return escHtml(str); }

function capitalize(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : '';
}
