// ============================================================
// scene.js — Battle map / scenes & tokens (DM side)
// ============================================================
// Scene mode takes over the map panel: a battle-map background, a
// grid overlay, and draggable tokens. When the DM "presents" a
// scene it publishes to /parties/{CODE}/scene and the player tool
// renders it live. Token positions are 0–100 % of the map, so they
// land in the same spot on every screen.
//
// PLAYER TOOL CONTRACT — /parties/{CODE}/scene (DM-only writes):
//   active : bool
//   name   : string
//   image  : data URI (downscaled ≤1000px) | '' (grid only)
//   grid   : { cols, rows, show }
//   tokens/{id} : { name, kind:'pc'|'monster'|'object', color, x, y, hp?, hpMax? }
//     x,y are 0–100 (% of the map). Written once on present; token
//     drags update only x/y (tiny). image is written once, never per-move.
// ============================================================

const Scene = {
  live: false,          // currently published to players?
  pushTimer: null,
  drag: null,
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('scene-btn').addEventListener('click', toggleSceneMode);
});

function toggleSceneMode() {
  App.sceneMode = !App.sceneMode;
  document.body.classList.toggle('scene-mode', App.sceneMode);
  document.getElementById('scene-btn').classList.toggle('active', App.sceneMode);
  if (App.sceneMode) {
    App.selectedMarkerId = null;
    ensureSceneToolbar();
    renderScene();
    renderPanelSceneHelp();
  } else {
    const tb = document.getElementById('scene-toolbar');
    if (tb) tb.remove();
    renderMap();
    renderPanelEmpty();
  }
}

// ── TOOLBAR ──────────────────────────────────────────────────

function ensureSceneToolbar() {
  if (document.getElementById('scene-toolbar')) { updateSceneToolbar(); return; }
  const bar = document.createElement('div');
  bar.id = 'scene-toolbar';
  bar.innerHTML = `
    <input class="field-edit sc-name" id="sc-name" title="Scene name">
    <span class="sc-grid-ctl">Grid
      <input type="number" id="sc-cols" min="1" max="60" title="Columns">×
      <input type="number" id="sc-rows" min="1" max="60" title="Rows">
      <button id="sc-gridtoggle" title="Show/hide grid">▦</button>
      <button id="sc-snaptoggle" title="Snap tokens to grid">🧲</button>
    </span>
    <button id="sc-bg" title="Set battle-map background">🖼 Map</button>
    <button id="sc-add-pc" title="Add tokens for connected party members">+ PCs</button>
    <button id="sc-add-mon" title="Add tokens from the active combat">+ Combat</button>
    <button id="sc-add-tok" title="Add a blank token">+ Token</button>
    <button id="sc-present" class="sc-present" title="Show this scene to players">▶ Present</button>
  `;
  const panel = document.getElementById('map-panel');
  panel.insertBefore(bar, document.getElementById('map-wrap'));

  const s = DB.getScene();
  bar.querySelector('#sc-name').value = s.name || 'Battle Map';
  bar.querySelector('#sc-cols').value = s.cols;
  bar.querySelector('#sc-rows').value = s.rows;

  bar.querySelector('#sc-name').addEventListener('input', e => { s.name = e.target.value; DB.setScene(s); if (Scene.live) publishSceneMeta(); });
  const onGrid = () => {
    s.cols = Math.max(1, parseInt(bar.querySelector('#sc-cols').value) || 20);
    s.rows = Math.max(1, parseInt(bar.querySelector('#sc-rows').value) || 15);
    DB.setScene(s); drawGridOverlay();
    if (Scene.live) publishSceneMeta();
  };
  bar.querySelector('#sc-cols').addEventListener('change', onGrid);
  bar.querySelector('#sc-rows').addEventListener('change', onGrid);
  bar.querySelector('#sc-gridtoggle').addEventListener('click', () => {
    s.showGrid = !s.showGrid; DB.setScene(s); drawGridOverlay(); updateSceneToolbar();
    if (Scene.live) publishSceneMeta();
  });
  bar.querySelector('#sc-snaptoggle').addEventListener('click', () => {
    s.snap = !s.snap; DB.setScene(s); updateSceneToolbar();
  });
  bar.querySelector('#sc-bg').addEventListener('click', openSceneBgModal);
  bar.querySelector('#sc-add-pc').addEventListener('click', addPartyTokens);
  bar.querySelector('#sc-add-mon').addEventListener('click', addCombatTokens);
  bar.querySelector('#sc-add-tok').addEventListener('click', () => openTokenEditor());
  bar.querySelector('#sc-present').addEventListener('click', togglePresent);
  updateSceneToolbar();
}

function updateSceneToolbar() {
  const s = DB.getScene();
  const g = document.getElementById('sc-gridtoggle');
  const sn = document.getElementById('sc-snaptoggle');
  if (g) g.classList.toggle('active', s.showGrid);
  if (sn) sn.classList.toggle('active', s.snap);
  const p = document.getElementById('sc-present');
  if (p) {
    p.textContent = Scene.live ? '■ Stop' : '▶ Present';
    p.classList.toggle('live', Scene.live);
    p.title = Scene.live ? 'Stop showing the scene to players' : 'Show this scene to players';
    if (!Party.code) { p.disabled = true; p.title = 'Connect to a party first (🎲 Party)'; }
    else p.disabled = false;
  }
}

// ── RENDER ───────────────────────────────────────────────────

function renderScene() {
  const grid = document.getElementById('map-grid');
  grid.innerHTML = '';
  const s = DB.getScene();
  document.querySelector('#map-toolbar .map-title').textContent =
    (Scene.live ? '🔴 LIVE — ' : 'Scene — ') + (s.name || 'Battle Map');
  applyMapImage(grid, s.image);
  if (!s.image) { grid.classList.add('scene-blank'); grid.style.width = ''; grid.style.height = ''; }
  else grid.classList.remove('scene-blank');

  const overlay = document.createElement('div');
  overlay.id = 'scene-grid-overlay';
  grid.appendChild(overlay);
  drawGridOverlay();

  s.tokens.forEach(t => grid.appendChild(buildSceneTokenEl(t)));
}

function drawGridOverlay() {
  const s = DB.getScene();
  const ov = document.getElementById('scene-grid-overlay');
  if (!ov) return;
  if (!s.showGrid) { ov.style.backgroundImage = 'none'; return; }
  const cw = 100 / s.cols, ch = 100 / s.rows;
  ov.style.backgroundImage =
    'linear-gradient(to right, rgba(255,255,255,.22) 1px, transparent 1px),' +
    'linear-gradient(to bottom, rgba(255,255,255,.22) 1px, transparent 1px)';
  ov.style.backgroundSize = cw + '% ' + ch + '%';
}

function buildSceneTokenEl(t) {
  const el = document.createElement('div');
  el.className = 'scene-token kind-' + t.kind;
  el.dataset.id = t.id;
  el.style.left = t.x + '%';
  el.style.top = t.y + '%';
  el.style.setProperty('--tok-color', t.color || '#c9a227');
  const hpBar = (t.hp != null && t.hpMax) ? `<div class="tok-hp"><div class="tok-hp-fill" style="width:${Math.max(0, Math.min(100, t.hp / t.hpMax * 100))}%"></div></div>` : '';
  el.innerHTML = `
    <div class="tok-disc">${escHtml(tokenGlyph(t))}</div>
    ${hpBar}
    <div class="tok-label">${escHtml(t.name || '')}</div>
  `;
  el.addEventListener('mousedown', e => startTokenDrag(e, t.id));
  el.addEventListener('dblclick', () => openTokenEditor(t.id));
  return el;
}

function tokenGlyph(t) {
  if (t.kind === 'pc') return (t.name || '?').trim().charAt(0).toUpperCase();
  if (t.kind === 'monster') return '👹';
  return '◆';
}

// ── TOKEN DRAG (self-contained; snaps to grid) ───────────────

function startTokenDrag(e, id) {
  e.preventDefault();
  const grid = document.getElementById('map-grid');
  const el = grid.querySelector(`.scene-token[data-id="${id}"]`);
  Scene.drag = { id, el, moved: false, sx: e.clientX, sy: e.clientY };
  el.classList.add('dragging');

  const move = ev => {
    if (!Scene.drag) return;
    if (Math.abs(ev.clientX - Scene.drag.sx) > 2 || Math.abs(ev.clientY - Scene.drag.sy) > 2) Scene.drag.moved = true;
    const r = grid.getBoundingClientRect();
    let x = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100));
    let y = Math.max(0, Math.min(100, (ev.clientY - r.top) / r.height * 100));
    el.style.left = x + '%';
    el.style.top = y + '%';
  };
  const up = ev => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    el.classList.remove('dragging');
    if (!Scene.drag) return;
    if (Scene.drag.moved) {
      const s = DB.getScene();
      const r = grid.getBoundingClientRect();
      let x = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100));
      let y = Math.max(0, Math.min(100, (ev.clientY - r.top) / r.height * 100));
      if (s.snap) { const cw = 100 / s.cols, ch = 100 / s.rows;
        x = (Math.floor(x / cw) + 0.5) * cw; y = (Math.floor(y / ch) + 0.5) * ch; }
      el.style.left = x + '%'; el.style.top = y + '%';
      DB.updateSceneToken(id, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
      if (Scene.live) pushTokenPos(id, x, y);
    }
    Scene.drag = null;
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

// ── TOKEN SOURCES ────────────────────────────────────────────

function addPartyTokens() {
  const members = (typeof Party !== 'undefined') ? Party.members : {};
  const entries = Object.entries(members);
  if (!entries.length) { alert('No party members connected.'); return; }
  const s = DB.getScene();
  let n = 0;
  entries.forEach(([uid, m]) => {
    if (s.tokens.some(t => t.uid === uid)) return;
    DB.addSceneToken({ name: m.name || 'Hero', kind: 'pc', color: colorFor(m.name),
      x: 10 + (n % 6) * 4, y: 88, uid, hp: m.hp, hpMax: m.hpMax });
    n++;
  });
  renderScene();
  if (Scene.live) publishSceneTokens();
}

function addCombatTokens() {
  const c = (typeof DB.getCombat === 'function') ? DB.getCombat() : null;
  if (!c || !c.combatants) { alert('No active combat. Start one from ⚔ Combat, or use + Token.'); return; }
  const s = DB.getScene();
  let n = 0;
  c.combatants.filter(x => x.kind === 'monster' && !x.defeated).forEach(mon => {
    if (s.tokens.some(t => t.combatId === mon.id)) return;
    DB.addSceneToken({ name: mon.name, kind: 'monster', color: '#8b2f2f',
      x: 30 + (n % 8) * 5, y: 15, hp: mon.hp, hpMax: mon.hpMax, combatId: mon.id });
    n++;
  });
  if (!n) { alert('No living monsters in the active combat to add.'); return; }
  renderScene();
  if (Scene.live) publishSceneTokens();
}

function colorFor(name) {
  const palette = ['#4a7fa5', '#5a9c6e', '#a0689c', '#c08a3e', '#5aa0a0', '#9c5a5a'];
  let h = 0; for (const ch of (name || 'x')) h = (h * 31 + ch.charCodeAt(0)) % palette.length;
  return palette[h];
}

// ── TOKEN EDITOR ─────────────────────────────────────────────

function openTokenEditor(id) {
  const s = DB.getScene();
  const t = id ? s.tokens.find(x => x.id === id) : null;
  const cur = t || { name: '', kind: 'monster', color: '#8b2f2f', hp: null, hpMax: null };
  const kinds = ['pc', 'monster', 'object'];
  const swatches = ['#4a7fa5','#5a9c6e','#a0689c','#c08a3e','#5aa0a0','#8b2f2f','#c9a227','#7a5aa0'];
  openModal(t ? `Token — ${cur.name}` : 'Add Token', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Name</label>
        <input class="field-edit" id="tok-name" value="${escAttr(cur.name)}"></div>
      <div class="form-group"><label class="form-label">Kind</label>
        <select class="field-edit" id="tok-kind">${kinds.map(k => `<option value="${k}"${k === cur.kind ? ' selected' : ''}>${k}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Color</label>
      <div class="tok-swatches" id="tok-swatches">${swatches.map(c => `<button class="tok-swatch${c === cur.color ? ' active' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">HP (optional)</label>
        <input class="field-edit" id="tok-hp" type="number" value="${cur.hp != null ? cur.hp : ''}"></div>
      <div class="form-group"><label class="form-label">Max HP</label>
        <input class="field-edit" id="tok-hpmax" type="number" value="${cur.hpMax != null ? cur.hpMax : ''}"></div>
    </div>
  `, [
    ...(t ? [{ label: 'Delete', onClick: () => { DB.deleteSceneToken(id); closeModal(); renderScene(); if (Scene.live) publishSceneTokens(); } }] : []),
    { label: 'Cancel', onClick: closeModal },
    { label: t ? 'Save' : 'Add', primary: true, onClick: () => {
        const data = {
          name: document.getElementById('tok-name').value.trim() || 'Token',
          kind: document.getElementById('tok-kind').value,
          color: document.querySelector('.tok-swatch.active')?.dataset.c || cur.color,
          hp: intOrNull(document.getElementById('tok-hp').value),
          hpMax: intOrNull(document.getElementById('tok-hpmax').value),
        };
        if (t) DB.updateSceneToken(id, data);
        else DB.addSceneToken({ ...data, x: 50, y: 50 });
        closeModal(); renderScene();
        if (Scene.live) publishSceneTokens();
      }},
  ]);
  document.querySelectorAll('.tok-swatch').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tok-swatch').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  }));
}

function intOrNull(v) { const n = parseInt(v); return isNaN(n) ? null : n; }

// ── BACKGROUND IMAGE ─────────────────────────────────────────

function openSceneBgModal() {
  const s = DB.getScene();
  const loc = DB.getCurrentLocationData();
  openModal('Battle-Map Background', `
    <div class="form-group">
      <label class="form-label">Upload a battle map</label>
      <input type="file" id="sc-bg-file" accept="image/*" class="field-edit" style="height:auto;padding:6px">
    </div>
    ${loc && loc.image ? `<button class="btn" id="sc-use-loc" style="width:100%;margin-bottom:10px">Use current location's map (${escHtml(loc.name)})</button>` : ''}
    <div class="section-text" style="color:var(--text-muted);font-size:11px">
      Used as the token grid's backdrop and (downscaled) sent to players when you Present.
      Leave empty for a plain gridded board.
    </div>
    <div id="sc-bg-err" style="color:#e07070;font-size:12px;min-height:15px;margin-top:6px"></div>
  `, [
    { label: 'Clear', onClick: () => { s.image = ''; DB.setScene(s); closeModal(); renderScene(); if (Scene.live) publishSceneMeta(); } },
    { label: 'Close', primary: true, onClick: closeModal },
  ]);
  document.getElementById('sc-bg-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    readImageFileScaled(file, dataUrl => { s.image = dataUrl; DB.setScene(s); closeModal(); renderScene(); if (Scene.live) publishSceneMeta(); });
  });
  const useLoc = document.getElementById('sc-use-loc');
  if (useLoc) useLoc.addEventListener('click', () => {
    // Location image may be a filename or a data URI; normalize to a data URI
    // so it survives publishing to players.
    imageToDataUrl(loc.image, 1000, dataUrl => {
      s.image = dataUrl || loc.image; DB.setScene(s); closeModal(); renderScene(); if (Scene.live) publishSceneMeta();
    });
  });
}

// Load any image src (filename or data URI) → downscaled data URI.
// Falls back to the original src if canvas export is blocked.
function imageToDataUrl(src, maxW, cb) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const scale = Math.min(1, maxW / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', 0.6));
    } catch (e) { cb(null); }
  };
  img.onerror = () => cb(null);
  img.src = src;
}

// ── PRESENT / PUBLISH ────────────────────────────────────────

function togglePresent() {
  if (!Party.code) { alert('Connect to a party first (🎲 Party).'); return; }
  if (Scene.live) {
    Party.db.ref(`parties/${Party.code}/scene`).update({ active: false });
    Scene.live = false;
  } else {
    presentScene();
    Scene.live = true;
  }
  updateSceneToolbar();
  renderScene();
  if (typeof postLog === 'function') postLog('event', Scene.live ? `Scene presented: ${DB.getScene().name}` : 'Scene ended');
}

function presentScene() {
  const s = DB.getScene();
  const tokens = {};
  s.tokens.forEach(t => {
    if (t.hidden) return; // hidden tokens are never published
    tokens[t.id] = {
      name: t.name || '', kind: t.kind, color: t.color || '#c9a227',
      x: t.x, y: t.y,
      ...(t.hp != null ? { hp: t.hp } : {}),
      ...(t.hpMax != null ? { hpMax: t.hpMax } : {}),
    };
  });
  Party.db.ref(`parties/${Party.code}/scene`).set({
    active: true,
    name: s.name || 'Battle Map',
    image: s.image || '',
    grid: { cols: s.cols, rows: s.rows, show: !!s.showGrid },
    tokens,
  });
}

function publishSceneMeta() {
  const s = DB.getScene();
  Party.db.ref(`parties/${Party.code}/scene`).update({
    name: s.name || 'Battle Map',
    image: s.image || '',
    grid: { cols: s.cols, rows: s.rows, show: !!s.showGrid },
  });
}

function publishSceneTokens() {
  const s = DB.getScene();
  const tokens = {};
  s.tokens.forEach(t => {
    if (t.hidden) return;
    tokens[t.id] = { name: t.name || '', kind: t.kind, color: t.color || '#c9a227', x: t.x, y: t.y,
      ...(t.hp != null ? { hp: t.hp } : {}), ...(t.hpMax != null ? { hpMax: t.hpMax } : {}) };
  });
  Party.db.ref(`parties/${Party.code}/scene/tokens`).set(tokens);
}

// Throttled single-token position push (drag)
function pushTokenPos(id, x, y) {
  clearTimeout(Scene.pushTimer);
  Scene.pushTimer = setTimeout(() => {
    Party.db.ref(`parties/${Party.code}/scene/tokens/${id}`).update({ x, y });
  }, 120);
}

// ── RIGHT PANEL HELP ─────────────────────────────────────────

function renderPanelSceneHelp() {
  App.panelView = 'scene';
  document.getElementById('panel-header').innerHTML = `
    <div class="panel-type">Battle Map</div>
    <div class="panel-name">🗺 Scene Mode</div>`;
  document.getElementById('panel-body').innerHTML = `
    <div class="section"><div class="section-text">
      Build the board in the map panel:
      <ul style="margin:8px 0 0 16px;line-height:1.8">
        <li><b>🖼 Map</b> — set a battle-map background (or leave blank)</li>
        <li><b>Grid</b> — set columns × rows; ▦ toggles lines, 🧲 snap-to-grid</li>
        <li><b>+ PCs / + Combat</b> — drop tokens from the party or the active fight</li>
        <li><b>+ Token</b> — add anything; double-click a token to edit</li>
        <li>Drag tokens to move them</li>
        <li><b>▶ Present</b> — show the live board to players (needs a party)</li>
      </ul>
      <p style="margin-top:10px;color:var(--text-muted)">
        Tokens and moves sync live to the player tool. The background is sent once,
        downscaled. Exit scene mode with the 🗺 Scene button.</p>
    </div></div>`;
}
