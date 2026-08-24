// ============================================================
// combat.js — Combat / initiative tracker (DM side)
// ============================================================
// DM-LOCAL BY DESIGN: the initiative order lives only in this
// tool's save data and is NEVER written to Firebase — players
// cannot see it. The one shared piece is inbound:
//
//   PLAYER TOOL CONTRACT: when a player rolls initiative, the
//   player tool writes to their own member node (already allowed
//   by the security rules):
//     /parties/{CODE}/members/{uid}/initiative    (number)
//     /parties/{CODE}/members/{uid}/initiativeAt  (timestamp)
//
// The setup modal auto-fills those rolls; the DM can override,
// enter values manually (offline/paper players), and re-pull
// late rolls mid-combat.
//
// Combat state shape (DB.getCombat()):
//   { active, round, turnIndex, combatants: [
//       { id, kind: 'pc'|'monster', name, uid?, initiative,
//         hp, hpMax, ac, defeated, rollNote } ] }
// PC hp/ac are read live from the party feed when uid is set.
// ============================================================

const Combat = {
  isActive() { const c = DB.getCombat(); return !!(c && c.active); },
};

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Concentrating',
];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('combat-btn').addEventListener('click', () => {
    if (Combat.isActive()) openCombatMenu();
    else openCombatSetup();
  });
  updateCombatButton();
  if (Combat.isActive()) renderPartyStrip(); // delegates to the combat bar
});

function d20() { return Math.floor(Math.random() * 20) + 1; }

function updateCombatButton() {
  const btn = document.getElementById('combat-btn');
  const c = DB.getCombat();
  if (c && c.active) {
    btn.textContent = `⚔ Round ${c.round}`;
    btn.classList.add('active');
  } else {
    btn.textContent = '⚔ Combat';
    btn.classList.remove('active');
  }
}

// ── SETUP MODAL ──────────────────────────────────────────────

function openCombatSetup(prefillEnc) {
  const members = (typeof Party !== 'undefined' && Party.code) ? Party.members : {};
  const memberRows = Object.entries(members).map(([uid, m]) => `
    <div class="cs-row" data-uid="${escAttr(uid)}">
      <input type="checkbox" class="cs-pc-include" checked>
      <span class="cs-name">${escHtml(m.name || 'Unnamed')}</span>
      <input class="field-edit cs-init" type="number" placeholder="init"
             value="${m.initiative != null ? m.initiative : ''}"
             title="${m.initiative != null ? 'Rolled by player' : 'No roll from player yet — enter manually'}">
      <span class="cs-tag">${m.initiative != null ? '🎲 from player' : 'manual'}</span>
    </div>
  `).join('');

  openModal('Combat Setup', `
    <div class="section-label">Party</div>
    <div id="cs-pc-rows">
      ${memberRows || '<div class="party-empty">No party connected — add PCs manually below.</div>'}
    </div>
    <button class="add-item-btn" id="cs-add-pc" style="display:block">+ Add PC manually</button>

    <div class="section-label" style="margin-top:16px">Monsters / Enemies</div>
    <div class="cs-enc-bar">
      <select class="field-edit" id="cs-enc-select"></select>
      <button class="btn" id="cs-enc-load" title="Fill the monster rows from the selected encounter">Load</button>
      <button class="btn" id="cs-enc-save" title="Save the monster rows below as a prepared encounter">💾</button>
      <button class="btn" id="cs-enc-del" title="Delete the selected encounter">🗑</button>
    </div>
    <div class="cs-row cs-header-row">
      <span></span><span class="cs-name">Name</span>
      <span class="cs-h">Count</span><span class="cs-h">Init mod</span>
      <span class="cs-h">HP</span><span class="cs-h">AC</span><span></span>
    </div>
    <div id="cs-monster-rows"></div>
    <button class="add-item-btn" id="cs-add-monster" style="display:block">+ Add monster group</button>

    <div class="section-text" style="color:var(--text-muted);font-size:11px;margin-top:12px">
      Type a monster name to autofill from the SRD bestiary (CR 0–5). Initiative is
      rolled automatically on start (one d20 + mod per group, shared by the group —
      standard 5e). Players who haven't rolled yet can be pulled in later with 🔄.
    </div>
    <datalist id="monster-dl">${allMonsters().map(m => `<option value="${escAttr(m.name)}">`).join('')}</datalist>
  `, [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Start Combat', primary: true, onClick: startCombatFromSetup },
  ]);

  document.getElementById('cs-add-pc').addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'cs-row cs-manual-pc';
    div.innerHTML = `
      <input type="checkbox" class="cs-pc-include" checked>
      <input class="field-edit cs-name-input" placeholder="Character name">
      <input class="field-edit cs-init" type="number" placeholder="init">
      <span class="cs-tag">manual</span>
    `;
    document.getElementById('cs-pc-rows').appendChild(div);
  });

  document.getElementById('cs-add-monster').addEventListener('click', () => addMonsterRow());
  addMonsterRow(); // start with one empty row

  // ── Prepared encounters ──
  const refreshEncSelect = () => {
    const sel = document.getElementById('cs-enc-select');
    // Only encounters with prepped combatants can be loaded into a fight
    sel.innerHTML = '<option value="">Prepared encounters…</option>' +
      DB.getEncounters().filter(e => (e.groups || []).length).map(e =>
        `<option value="${escAttr(e.id)}">${escHtml(e.name)} — ${escHtml(e.groups.map(g => g.count + '× ' + g.name).join(', '))}</option>`
      ).join('');
  };
  refreshEncSelect();

  document.getElementById('cs-enc-load').addEventListener('click', () => {
    const enc = DB.getEncounters().find(e => e.id === document.getElementById('cs-enc-select').value);
    if (!enc) return;
    document.getElementById('cs-monster-rows').innerHTML = '';
    enc.groups.forEach(g => addMonsterRow(g));
  });

  document.getElementById('cs-enc-save').addEventListener('click', () => {
    const groups = collectMonsterRows();
    if (!groups.length) { alert('Fill in at least one monster row first.'); return; }
    const name = prompt('Encounter name? (e.g. "Sevryn\'s camp — outer guard")');
    if (!name || !name.trim()) return;
    DB.saveEncounter({ name: name.trim(), locationKey: DB.getCurrentLocationKey(), groups });
    refreshEncSelect();
  });

  document.getElementById('cs-enc-del').addEventListener('click', () => {
    const sel = document.getElementById('cs-enc-select');
    const enc = DB.getEncounters().find(e => e.id === sel.value);
    if (!enc) return;
    if (confirm(`Delete prepared encounter "${enc.name}"?`)) {
      DB.deleteEncounter(enc.id);
      refreshEncSelect();
    }
  });

  // Launched from a location/quest panel: preload that encounter
  if (prefillEnc) {
    document.getElementById('cs-monster-rows').innerHTML = '';
    prefillEnc.groups.forEach(g => addMonsterRow(g));
    const sel = document.getElementById('cs-enc-select');
    if ([...sel.options].some(o => o.value === prefillEnc.id)) sel.value = prefillEnc.id;
  }
}

// ── ENCOUNTER EDITOR (prep from location/quest panels) ───────
// An encounter is ANYTHING the party runs into — a conversation, a
// hazard, a puzzle, a scene. Combat is just one way it can go, so
// combatants are optional; the ⚔ Launch path only exists if some
// are prepped. After it happens at the table, mark it resolved and
// record the outcome.

const ENCOUNTER_TYPES = {
  social: '💬', combat: '⚔', exploration: '🧭',
  hazard: '⚠', puzzle: '🧩', event: '✨',
};

function encType(e) {
  if (e.type) return e.type;
  return (e.groups && e.groups.length) ? 'combat' : 'social'; // legacy entries
}

function openEncounterEditor(encounterId, ctx) {
  const existing = encounterId ? DB.getEncounters().find(e => e.id === encounterId) : null;
  const enc = existing || {
    name: '', type: 'social', description: '', ways: '', outcome: '', resolved: false, groups: [],
    markerId: ctx?.markerId || null,
    questId: ctx?.questId || null,
    locationKey: DB.getCurrentLocationKey(),
  };
  const type = encType(enc);

  openModal(existing ? `Encounter — ${enc.name}` : 'Prep Encounter', `
    <div class="form-group">
      <label class="form-label">Name</label>
      <input class="field-edit" id="ee-name" value="${escAttr(enc.name)}" placeholder="Strangers at the campsite">
    </div>
    <div class="form-group">
      <label class="form-label">Type</label>
      <div class="ee-type-track" id="ee-type">
        ${Object.entries(ENCOUNTER_TYPES).map(([t, icon]) =>
          `<button class="ee-type-btn${t === type ? ' active' : ''}" data-type="${t}">${icon} ${t}</button>`).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">What the party runs into</label>
      <textarea class="field-edit" id="ee-desc" rows="3" placeholder="The scene as they find it.">${escHtml(enc.description || enc.note || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Ways it can go (one per line)</label>
      <textarea class="field-edit" id="ee-ways" rows="4" placeholder="Friendly approach → they share rumors over food&#10;Party gets pushy → they clam up, break camp at dawn&#10;Accusations or Accord symbols → weapons come out">${escHtml(enc.ways || '')}</textarea>
    </div>
    <div class="section-label">If it comes to blows (optional)</div>
    <div class="cs-row cs-header-row">
      <span></span><span class="cs-name">Name</span>
      <span class="cs-h">Count</span><span class="cs-h">Init mod</span>
      <span class="cs-h">HP</span><span class="cs-h">AC</span><span></span>
    </div>
    <div id="cs-monster-rows"></div>
    <button class="add-item-btn" id="ee-add-monster" style="display:block">+ Add monster / NPC group</button>
    ${existing ? `
    <div class="form-group" style="margin-top:14px">
      <label class="form-label">
        <input type="checkbox" id="ee-resolved"${enc.resolved ? ' checked' : ''} style="width:auto;height:auto;margin-right:6px">
        Resolved — how did it actually go?
      </label>
      <textarea class="field-edit" id="ee-outcome" rows="2" placeholder="What happened at the table.">${escHtml(enc.outcome || '')}</textarea>
    </div>` : ''}
    <datalist id="monster-dl">${allMonsters().map(m => `<option value="${escAttr(m.name)}">`).join('')}</datalist>
  `, [
    { label: 'Cancel', onClick: () => { closeModal(); rerenderCurrentPanel(); } },
    { label: '⚔ Save & Launch Combat', onClick: () => {
        const saved = saveEncounterFromEditor(enc, !!existing);
        if (!saved) return;
        if (!saved.groups.length) { alert('No combatants prepped — add a group first, or just Save.'); return; }
        closeModal();
        openCombatSetup(saved);
      }},
    { label: 'Save', primary: true, onClick: () => {
        if (saveEncounterFromEditor(enc, !!existing)) { closeModal(); rerenderCurrentPanel(); }
      }},
  ]);

  // Type chips
  document.querySelectorAll('.ee-type-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.ee-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }));

  (enc.groups || []).forEach(g => addMonsterRow(g));
  document.getElementById('ee-add-monster').addEventListener('click', () => addMonsterRow());
}

function saveEncounterFromEditor(enc, isExisting) {
  const name = document.getElementById('ee-name').value.trim();
  if (!name) { alert('Name required.'); return null; }
  return DB.saveEncounter({
    ...enc,
    name,
    type: document.querySelector('.ee-type-btn.active')?.dataset.type || 'social',
    description: document.getElementById('ee-desc').value.trim(),
    ways: document.getElementById('ee-ways').value.trim(),
    note: undefined, // legacy field, folded into description
    groups: collectMonsterRows(), // may be empty — combat is optional
    resolved: isExisting ? document.getElementById('ee-resolved').checked : false,
    outcome: isExisting ? document.getElementById('ee-outcome').value.trim() : '',
  });
}

// Encounter list section for location/quest panels (app.js calls this)
function encounterSection(filterFn, ctx) {
  const encs = DB.getEncounters().filter(filterFn);
  const div = document.createElement('div');
  div.className = 'list-section';
  div.innerHTML = `
    <div class="list-header"><div class="section-label">Encounters</div></div>
    <div class="list-items"></div>
    <button class="add-item-btn enc-add" style="display:block">⚔ Prep encounter</button>
  `;
  const items = div.querySelector('.list-items');
  if (!encs.length) {
    items.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:6px 0">None prepped.</div>';
  }
  encs.forEach(e => {
    const type = encType(e);
    const hasCombat = (e.groups || []).length > 0;
    const hint = [e.description || e.note, e.ways].filter(Boolean).join('\n— ways it can go —\n');
    const sub = hasCombat
      ? `${type} · ${e.groups.map(g => g.count + '× ' + g.name).join(', ')}`
      : type;
    const el = document.createElement('div');
    el.className = 'list-item' + (e.resolved ? ' enc-resolved' : '');
    el.innerHTML = `
      <span class="item-icon">${ENCOUNTER_TYPES[type] || '✨'}</span>
      <span class="item-name">${escHtml(e.name)}${e.resolved ? ' ✓' : ''}${hint ? ` <span class="enc-note-hint" title="${escAttr(hint)}">📝</span>` : ''}</span>
      <span class="item-sub">${escHtml(sub)}</span>
      ${hasCombat ? '<button class="btn enc-launch" title="It came to blows — load into combat setup">⚔</button>' : ''}
      <button class="item-delete" title="Delete encounter">×</button>
    `;
    el.addEventListener('click', ev => {
      if (ev.target.closest('.enc-launch') || ev.target.closest('.item-delete')) return;
      openEncounterEditor(e.id, ctx);
    });
    el.querySelector('.enc-launch')?.addEventListener('click', ev => {
      ev.stopPropagation();
      openCombatSetup(e);
    });
    el.querySelector('.item-delete').addEventListener('click', ev => {
      ev.stopPropagation();
      if (confirm(`Delete encounter "${e.name}"?`)) {
        DB.deleteEncounter(e.id);
        rerenderCurrentPanel();
      }
    });
    items.appendChild(el);
  });
  div.querySelector('.enc-add').addEventListener('click', () => openEncounterEditor(null, ctx));
  return div;
}

// Shared monster-group row (combat setup + encounter editor).
// Appends to #cs-monster-rows in whichever modal is open.
function addMonsterRow(prefill) {
  const div = document.createElement('div');
  div.className = 'cs-row cs-monster';
  div.innerHTML = `
    <span></span>
    <input class="field-edit cs-name-input" placeholder="e.g. Wolf" list="monster-dl">
    <input class="field-edit cs-count" type="number" value="1" min="1">
    <input class="field-edit cs-mod" type="number" value="0" title="Initiative modifier (DEX)">
    <input class="field-edit cs-hp" type="number" placeholder="HP">
    <input class="field-edit cs-ac" type="number" placeholder="AC">
    <button class="item-delete" style="display:flex" title="Remove row">×</button>
  `;
  div.querySelector('.item-delete').addEventListener('click', () => div.remove());
  // Autofill stats when the name matches a bestiary entry
  const nameInp = div.querySelector('.cs-name-input');
  nameInp.addEventListener('change', () => {
    const mon = findMonsterByName(nameInp.value);
    if (!mon) return;
    div.querySelector('.cs-mod').value = abilityMod(mon.abl[1]);
    div.querySelector('.cs-hp').value = mon.hp;
    div.querySelector('.cs-ac').value = mon.ac;
  });
  if (prefill) {
    nameInp.value = prefill.name;
    div.querySelector('.cs-count').value = prefill.count;
    div.querySelector('.cs-mod').value = prefill.mod;
    div.querySelector('.cs-hp').value = prefill.hp;
    div.querySelector('.cs-ac').value = prefill.ac != null ? prefill.ac : '';
  }
  document.getElementById('cs-monster-rows').appendChild(div);
  return div;
}

function collectMonsterRows() {
  const groups = [];
  document.querySelectorAll('#cs-monster-rows .cs-monster').forEach(row => {
    const name = (row.querySelector('.cs-name-input').value || '').trim();
    if (!name) return;
    groups.push({
      name,
      count: Math.max(1, parseInt(row.querySelector('.cs-count').value) || 1),
      mod: parseInt(row.querySelector('.cs-mod').value) || 0,
      hp: parseInt(row.querySelector('.cs-hp').value) || 1,
      ac: parseInt(row.querySelector('.cs-ac').value) || null,
    });
  });
  return groups;
}

function startCombatFromSetup() {
  const combatants = [];
  let n = 0;
  const cid = () => 'c' + (++n) + '_' + Date.now();

  document.querySelectorAll('#cs-pc-rows .cs-row').forEach(row => {
    const include = row.querySelector('.cs-pc-include');
    if (!include || !include.checked) return;
    const uid = row.dataset.uid || null;
    const name = uid
      ? row.querySelector('.cs-name').textContent
      : (row.querySelector('.cs-name-input')?.value || '').trim();
    if (!name) return;
    const init = parseFloat(row.querySelector('.cs-init').value);
    combatants.push({
      id: cid(), kind: 'pc', name, uid,
      initiative: isNaN(init) ? null : init,
      hp: null, hpMax: null, ac: null, defeated: false, rollNote: '', conditions: [],
    });
  });

  collectMonsterRows().forEach(g => {
    const roll = d20();
    const init = roll + g.mod;
    const stat = findMonsterByName(g.name);
    for (let i = 1; i <= g.count; i++) {
      combatants.push({
        id: cid(), kind: 'monster',
        name: g.count > 1 ? `${g.name} ${i}` : g.name,
        uid: null, initiative: init, hp: g.hp, hpMax: g.hp, ac: g.ac,
        defeated: false, statId: stat ? stat.name : null, conditions: [],
        rollNote: `rolled ${roll}${g.mod ? (g.mod > 0 ? ' + ' + g.mod : ' − ' + Math.abs(g.mod)) : ''}`,
      });
    }
  });

  if (!combatants.length) { alert('Add at least one combatant.'); return; }

  sortCombatants(combatants);
  DB.setCombat({ active: true, round: 1, turnIndex: 0, combatants });
  updateCombatButton();
  renderPartyStrip();
  closeModal();
}

// Sort: highest initiative first; ties go to PCs, then by name.
// null initiative (player hasn't rolled) sinks to the bottom.
function sortCombatants(list) {
  list.sort((a, b) => {
    const ai = a.initiative == null ? -Infinity : a.initiative;
    const bi = b.initiative == null ? -Infinity : b.initiative;
    if (bi !== ai) return bi - ai;
    if (a.kind !== b.kind) return a.kind === 'pc' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ── ACTIVE COMBAT MENU (combat button while running) ─────────

function openCombatMenu() {
  const c = DB.getCombat();
  openModal('Combat', `
    <div class="section-text" style="text-align:center">
      Round ${c.round} — ${c.combatants.filter(x => !x.defeated).length} combatants standing
    </div>
  `, [
    { label: 'End Combat', onClick: () => {
        if (confirm('End combat and clear the tracker?')) {
          DB.setCombat(null);
          updateCombatButton();
          renderPartyStrip();
          closeModal();
        }
      }},
    { label: 'Close', primary: true, onClick: closeModal },
  ]);
}

// ── COMBAT BAR (takes over the party strip while active) ─────

function renderCombatBar() {
  const strip = document.getElementById('party-strip');
  const c = DB.getCombat();
  if (!c || !c.active) return;
  strip.style.display = 'flex';
  strip.classList.add('combat-mode');

  const members = (typeof Party !== 'undefined') ? Party.members : {};

  const controls = `
    <div class="combat-controls">
      <div class="combat-round">Round ${c.round}</div>
      <div class="combat-btns">
        <button id="cb-prev" title="Previous turn">◀</button>
        <button id="cb-next" title="Next turn">Next ▶</button>
      </div>
      <div class="combat-btns">
        <button id="cb-pull" title="Pull latest player initiative rolls and re-sort">🔄</button>
        <button id="cb-end" title="End combat">⏹</button>
      </div>
    </div>`;

  const cards = c.combatants.map((cb, i) => {
    const live = cb.uid && members[cb.uid] ? members[cb.uid] : null;
    const hp = cb.kind === 'pc' ? (live ? live.hp : null) : cb.hp;
    const hpMax = cb.kind === 'pc' ? (live ? live.hpMax : null) : cb.hpMax;
    const ac = cb.kind === 'pc' ? (live ? live.ac : null) : cb.ac;
    const pct = (hp != null && hpMax) ? Math.max(0, Math.min(100, (hp / hpMax) * 100)) : null;
    const hpClass = pct == null ? '' : pct > 50 ? 'hp-ok' : pct > 25 ? 'hp-hurt' : 'hp-critical';
    const current = i === c.turnIndex;

    const hpBlock = cb.kind === 'monster' ? `
      <div class="cb-hp-line">
        <input class="cb-hp-input" data-id="${cb.id}" type="number" value="${cb.hp}" title="Edit HP directly">
        <span class="cb-hpmax">/ ${cb.hpMax}</span>
        <input class="cb-dmg-input" data-id="${cb.id}" placeholder="dmg" title="Type damage and press Enter (use +5 to heal)">
      </div>` : `
      <div class="cb-hp-line">
        <span class="cb-pc-hp">${hp != null ? hp + ' / ' + hpMax + ' HP' : 'HP —'}</span>
        ${ac != null ? `<span class="party-card-ac">🛡 ${ac}</span>` : ''}
        ${cb.uid && typeof Party !== 'undefined' && Party.isDM && live ? `<input class="cb-dmg-input pc-dmg" data-uid="${escAttr(cb.uid)}" placeholder="dmg" title="Damage this PC — Enter applies (use +5 to heal). Syncs to their sheet.">` : ''}
      </div>`;

    const condChips = (cb.conditions || []).map(cn =>
      `<span class="cond-chip" data-id="${cb.id}" data-cond="${escAttr(cn)}" title="Click to remove">${escHtml(cn)}</span>`).join('');

    return `
      <div class="party-card combat-card ${current ? 'current-turn' : ''} ${cb.defeated ? 'defeated' : ''}" data-id="${cb.id}">
        <div class="party-card-top">
          <span class="cb-init" title="${escAttr(cb.rollNote || 'initiative')}">${cb.initiative != null ? cb.initiative : '—'}</span>
          <span class="party-card-name${cb.statId ? ' cb-stat-link' : ''}"${cb.statId ? ` data-stat="${escAttr(cb.statId)}" title="Open stat block"` : ''}>${cb.kind === 'pc' ? '👤' : '👹'} ${escHtml(cb.name)}</span>
          <button class="cb-skull" data-id="${cb.id}" title="${cb.defeated ? 'Revive' : 'Mark defeated'}">${cb.defeated ? '↺' : '💀'}</button>
        </div>
        ${pct != null && cb.kind === 'monster' ? `<div class="party-hp-bar"><div class="party-hp-fill ${hpClass}" style="width:${pct}%"></div></div>` : ''}
        ${cb.kind === 'pc' && pct != null ? `<div class="party-hp-bar"><div class="party-hp-fill ${hpClass}" style="width:${pct}%"></div></div>` : ''}
        ${hpBlock}
        <div class="cond-chips">${condChips}<button class="cb-cond-btn" data-id="${cb.id}" title="Add condition">+</button></div>
      </div>`;
  }).join('');

  strip.innerHTML = controls + cards;

  document.getElementById('cb-next').addEventListener('click', () => advanceTurn(1));
  document.getElementById('cb-prev').addEventListener('click', () => advanceTurn(-1));
  document.getElementById('cb-end').addEventListener('click', () => {
    if (confirm('End combat and clear the tracker?')) {
      DB.setCombat(null);
      updateCombatButton();
      strip.classList.remove('combat-mode');
      renderPartyStrip();
    }
  });
  document.getElementById('cb-pull').addEventListener('click', pullPlayerInitiatives);

  strip.querySelectorAll('.cb-stat-link').forEach(el => el.addEventListener('click', () => {
    renderPanelMonster(el.dataset.stat);
  }));

  strip.querySelectorAll('.cond-chip').forEach(ch => ch.addEventListener('click', () => {
    const cb = c.combatants.find(x => x.id === ch.dataset.id);
    cb.conditions = (cb.conditions || []).filter(x => x !== ch.dataset.cond);
    DB.setCombat(c);
    renderCombatBar();
  }));

  strip.querySelectorAll('.cb-cond-btn').forEach(b => b.addEventListener('click', () => {
    openConditionPicker(b.dataset.id);
  }));

  strip.querySelectorAll('.cb-skull').forEach(b => b.addEventListener('click', () => {
    const cb = c.combatants.find(x => x.id === b.dataset.id);
    cb.defeated = !cb.defeated;
    DB.setCombat(c);
    renderCombatBar();
  }));

  strip.querySelectorAll('.cb-hp-input').forEach(inp => inp.addEventListener('change', () => {
    const cb = c.combatants.find(x => x.id === inp.dataset.id);
    cb.hp = Math.max(0, parseInt(inp.value) || 0);
    if (cb.hp === 0) cb.defeated = true;
    DB.setCombat(c);
    renderCombatBar();
  }));

  strip.querySelectorAll('.cb-dmg-input').forEach(inp => inp.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const raw = inp.value.trim();
    if (!raw) return;
    const cb = c.combatants.find(x => x.id === inp.dataset.id);
    const val = parseInt(raw);
    if (isNaN(val)) return;
    // plain number = damage; leading + = healing
    cb.hp = Math.max(0, Math.min(cb.hpMax, raw.startsWith('+') ? cb.hp + val : cb.hp - val));
    if (cb.hp === 0) cb.defeated = true;
    else if (cb.defeated && cb.hp > 0) cb.defeated = false;
    DB.setCombat(c);
    renderCombatBar();
  }));

  // DM damage inputs on PC cards (writes to player sheets via Firebase)
  if (typeof wirePcDamageInputs === 'function') wirePcDamageInputs(strip);

  // Keep the current combatant visible
  const cur = strip.querySelector('.current-turn');
  if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function openConditionPicker(combatantId) {
  const c = DB.getCombat();
  const cb = c && c.combatants.find(x => x.id === combatantId);
  if (!cb) return;
  openModal(`Conditions — ${cb.name}`, `
    <div class="cond-grid">
      ${CONDITIONS.map(cn =>
        `<button class="cond-toggle${(cb.conditions || []).includes(cn) ? ' active' : ''}" data-cond="${escAttr(cn)}">${escHtml(cn)}</button>`).join('')}
    </div>
  `, [
    { label: 'Done', primary: true, onClick: () => { closeModal(); renderCombatBar(); } },
  ]);
  document.querySelectorAll('.cond-toggle').forEach(btn => btn.addEventListener('click', () => {
    cb.conditions = cb.conditions || [];
    const cn = btn.dataset.cond;
    if (cb.conditions.includes(cn)) cb.conditions = cb.conditions.filter(x => x !== cn);
    else cb.conditions.push(cn);
    btn.classList.toggle('active');
    DB.setCombat(c);
  }));
}

function advanceTurn(dir) {
  const c = DB.getCombat();
  if (!c) return;
  const alive = c.combatants.filter(x => !x.defeated).length;
  if (!alive) return;
  let i = c.turnIndex;
  do {
    i += dir;
    if (i >= c.combatants.length) { i = 0; c.round++; }
    if (i < 0) { i = c.combatants.length - 1; c.round = Math.max(1, c.round - 1); }
  } while (c.combatants[i].defeated);
  c.turnIndex = i;
  DB.setCombat(c);
  updateCombatButton();
  renderCombatBar();
}

// Re-read player initiative rolls from the live party feed, update
// PC combatants, re-sort, and keep the current combatant current.
function pullPlayerInitiatives() {
  const c = DB.getCombat();
  if (!c) return;
  const members = (typeof Party !== 'undefined') ? Party.members : {};
  const currentId = c.combatants[c.turnIndex]?.id;
  let updated = 0;
  c.combatants.forEach(cb => {
    if (cb.kind === 'pc' && cb.uid && members[cb.uid] && members[cb.uid].initiative != null) {
      if (cb.initiative !== members[cb.uid].initiative) updated++;
      cb.initiative = members[cb.uid].initiative;
    }
  });
  sortCombatants(c.combatants);
  const newIdx = c.combatants.findIndex(x => x.id === currentId);
  if (newIdx >= 0) c.turnIndex = newIdx;
  DB.setCombat(c);
  renderCombatBar();
  if (!updated) alert('No new player rolls found. Players push initiative from their sheets.');
}
