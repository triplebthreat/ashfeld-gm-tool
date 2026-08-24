// ============================================================
// share.js — Handouts + shared event log (Firebase)
// ============================================================
// PLAYER TOOL CONTRACT (both paths under /parties/{CODE}/):
//
//   handouts/{pushKey} — DM-only writes, everyone reads:
//     { title, text?, image? (small data URI), at }
//     Player tool: listen and display; new handout = show the party.
//
//   log/{pushKey} — append-only for everyone (no edits/deletes
//   except by the DM via party-owner write):
//     { at, who, kind: 'msg'|'roll'|'event', text }
//     Player tool: push player rolls/events here; render the feed.
//
// Security rules for both were published 2026-07-15.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('handout-btn').addEventListener('click', openHandoutModal);
  document.getElementById('log-btn').addEventListener('click', openLogModal);
});

function shareReady() {
  return typeof Party !== 'undefined' && Party.ready && Party.code;
}

function requirePartyModal(feature) {
  openModal(feature, `<div class="section-text">Connect to a party first (🎲 Party) — ${feature.toLowerCase()} are shared with your players through the party connection.</div>`,
    [{ label: 'Close', primary: true, onClick: closeModal }]);
}

// ── HANDOUTS ─────────────────────────────────────────────────

function sendHandout(title, text, image, cb) {
  Party.db.ref(`parties/${Party.code}/handouts`).push({
    title: title || 'Handout',
    text: text || '',
    image: image || null,
    at: firebase.database.ServerValue.TIMESTAMP,
  }).then(() => cb && cb(null)).catch(e => cb && cb(e));
}

function openHandoutModal() {
  if (!shareReady()) { requirePartyModal('Handouts'); return; }

  openModal('📣 Send Handout to Party', `
    <div class="form-group">
      <label class="form-label">Title</label>
      <input class="field-edit" id="ho-title" placeholder="A torn letter…">
    </div>
    <div class="form-group">
      <label class="form-label">Text</label>
      <textarea class="field-edit" id="ho-text" rows="5" placeholder="What the players see…"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Image (optional — sent small)</label>
      <input type="file" id="ho-image" accept="image/*" class="field-edit" style="height:auto;padding:6px">
    </div>
    <div id="ho-error" style="color:#e07070;font-size:12px;min-height:16px"></div>
    <div class="section-label" style="margin-top:10px">Sent Handouts</div>
    <div id="ho-list" class="bestiary-list" style="max-height:22vh"></div>
  `, [
    { label: 'Close', onClick: closeModal },
    { label: 'Send', primary: true, onClick: () => {
        const title = document.getElementById('ho-title').value.trim();
        const text = document.getElementById('ho-text').value.trim();
        const file = document.getElementById('ho-image').files[0];
        if (!title && !text && !file) { document.getElementById('ho-error').textContent = 'Add a title, text, or image.'; return; }
        const finish = (err) => {
          if (err) { document.getElementById('ho-error').textContent = 'Send failed: ' + err.message; return; }
          document.getElementById('ho-title').value = '';
          document.getElementById('ho-text').value = '';
          document.getElementById('ho-image').value = '';
          renderHandoutList();
          postLog('event', `Handout shared: ${title || '(untitled)'}`);
        };
        if (file) {
          readImageFileScaledTo(file, 1024, dataUrl => {
            if (dataUrl.length > 900000) { document.getElementById('ho-error').textContent = 'Image too large even after compression — try a smaller one.'; return; }
            sendHandout(title, text, dataUrl, finish);
          });
        } else {
          sendHandout(title, text, null, finish);
        }
      }},
  ]);
  renderHandoutList();
}

function renderHandoutList() {
  const listEl = document.getElementById('ho-list');
  if (!listEl) return;
  Party.db.ref(`parties/${Party.code}/handouts`).limitToLast(20).get().then(snap => {
    const entries = Object.entries(snap.val() || {}).reverse();
    if (!listEl.isConnected) return;
    listEl.innerHTML = entries.map(([key, h]) => `
      <div class="bestiary-item" style="cursor:default">
        <span class="item-name">${escHtml(h.title || '(untitled)')}${h.image ? ' 🖼' : ''}</span>
        <span class="item-sub">${h.at ? new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
        <button class="item-delete" style="display:flex" data-key="${escAttr(key)}" title="Retract handout">×</button>
      </div>`).join('') || '<div class="party-empty">Nothing sent yet.</div>';
    listEl.querySelectorAll('.item-delete').forEach(b => b.addEventListener('click', () => {
      Party.db.ref(`parties/${Party.code}/handouts/${b.dataset.key}`).remove().then(renderHandoutList);
    }));
  });
}

// Downscale helper (variant of the map-image one, with target size)
function readImageFileScaledTo(file, maxW, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      cb(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// ── SHARED EVENT LOG ─────────────────────────────────────────

function postLog(kind, text, cb) {
  if (!shareReady() || !text) { cb && cb(new Error('not connected')); return; }
  Party.db.ref(`parties/${Party.code}/log`).push({
    at: firebase.database.ServerValue.TIMESTAMP,
    who: 'DM',
    kind: kind || 'msg',
    text,
  }).then(() => cb && cb(null)).catch(e => cb && cb(e));
}

let logListener = null, logRef = null;

function openLogModal() {
  if (!shareReady()) { requirePartyModal('Shared log'); return; }

  openModal('📜 Party Log', `
    <div id="log-feed" class="log-feed"><div class="party-empty">Loading…</div></div>
    <div class="log-compose">
      <input class="field-edit" id="log-input" placeholder="Announce something to the party…">
      <button class="btn btn-primary" id="log-send">Send</button>
    </div>
  `, [{ label: 'Close', primary: true, onClick: () => { detachLog(); closeModal(); } }]);

  const feed = document.getElementById('log-feed');
  detachLog();
  logRef = Party.db.ref(`parties/${Party.code}/log`).limitToLast(60);
  logListener = snap => {
    if (!feed.isConnected) { detachLog(); return; }
    const entries = Object.values(snap.val() || {}).sort((a, b) => (b.at || 0) - (a.at || 0));
    feed.innerHTML = entries.map(e => `
      <div class="log-line log-${escAttr(e.kind || 'msg')}">
        <span class="log-who">${escHtml(e.who || '?')}</span>
        <span class="log-text">${escHtml(e.text || '')}</span>
        <span class="log-time">${e.at ? new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
      </div>`).join('') || '<div class="party-empty">Nothing logged yet.</div>';
  };
  logRef.on('value', logListener);

  const send = () => {
    const inp = document.getElementById('log-input');
    const text = inp.value.trim();
    if (!text) return;
    postLog('msg', text, err => { if (!err) inp.value = ''; });
  };
  document.getElementById('log-send').addEventListener('click', send);
  document.getElementById('log-input').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
}

function detachLog() {
  if (logRef && logListener) logRef.off('value', logListener);
  logRef = null;
  logListener = null;
}
