// ============================================================
// party.js — Firebase party bridge (DM side)
// ============================================================
// Connects the GM tool to the same Firebase Realtime Database the
// player tool (lotto-luck.html) uses. The DM creates a party or
// connects to an existing 4-letter code, claims the dmUid slot,
// and gets a live dashboard of party members at the bottom of the
// screen.
//
// DATA CONTRACT (shared with the player tool — do not change one
// side without the other):
//   /parties/{CODE}/createdAt      — set once on creation
//   /parties/{CODE}/dmUid          — uid of the DM (claimed once, transaction)
//   /parties/{CODE}/members/{uid}  — { name, className, level, hp, hpMax, ac, updatedAt,
//                                      initiative?, initiativeAt? }
//                                    written by each player's own client.
//                                    initiative/initiativeAt: set when the player rolls
//                                    initiative on their sheet; the combat tracker
//                                    (combat.js) pulls them. Order stays DM-local.
// Reserved for upcoming phases (DM writes, players read):
//   /parties/{CODE}/combat, /scene, /handouts, /log
// ============================================================

const PARTY_CODE_STORE = 'gm_tool_party_code';

const Party = {
  ready: false,          // SDK loaded + anonymous sign-in complete
  uid: null,
  code: null,
  isDM: false,
  members: {},
  membersRef: null,
  membersListener: null,
  db: null,
};

document.addEventListener('DOMContentLoaded', initParty);

function initParty() {
  document.getElementById('party-btn').addEventListener('click', openPartyModal);

  // Offline or CDN unreachable — campaign tools still work fully,
  // party features just stay disabled.
  if (typeof firebase === 'undefined') return;

  firebase.initializeApp({
    apiKey: "AIzaSyDINBwyXiUAitBjNBllkuL6jx4Rc-Z8rgc",
    authDomain: "lottodnd.firebaseapp.com",
    databaseURL: "https://lottodnd-default-rtdb.firebaseio.com",
    projectId: "lottodnd",
    storageBucket: "lottodnd.firebasestorage.app",
    messagingSenderId: "676228122891",
    appId: "1:676228122891:web:8d809b375421a615573a0e",
  });
  Party.db = firebase.database();

  firebase.auth().onAuthStateChanged(user => {
    if (!user) return;
    Party.uid = user.uid;
    Party.ready = true;
    updatePartyButton();
    // Auto-reconnect to the last party
    const saved = localStorage.getItem(PARTY_CODE_STORE);
    if (saved && !Party.code) {
      connectToParty(saved, err => {
        if (err) { localStorage.removeItem(PARTY_CODE_STORE); updatePartyButton(); }
      });
    }
  });
  firebase.auth().signInAnonymously().catch(e => console.error('Party: sign-in failed', e));
}

// Same alphabet as the player tool (no I/O to avoid confusion)
function genPartyCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

function createParty(cb) {
  const code = genPartyCode();
  const ref = Party.db.ref('parties/' + code);
  ref.get().then(snap => {
    if (snap.exists()) return createParty(cb); // rare collision — reroll
    return ref.set({
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      dmUid: Party.uid,
    }).then(() => connectToParty(code, cb));
  }).catch(e => cb && cb(e));
}

function connectToParty(code, cb) {
  code = String(code || '').trim().toUpperCase();
  Party.db.ref('parties/' + code).get().then(snap => {
    if (!snap.exists()) { cb && cb(new Error('No party found with code ' + code)); return; }
    // Claim the DM slot if it's free or already ours
    Party.db.ref('parties/' + code + '/dmUid').transaction(
      cur => (cur === null || cur === Party.uid) ? Party.uid : cur,
      (err, committed, dmSnap) => {
        Party.code = code;
        Party.isDM = !err && dmSnap && dmSnap.val() === Party.uid;
        localStorage.setItem(PARTY_CODE_STORE, code);
        subscribeMembers(code);
        updatePartyButton();
        cb && cb(null);
      }
    );
  }).catch(e => cb && cb(e));
}

function subscribeMembers(code) {
  if (Party.membersRef && Party.membersListener) {
    Party.membersRef.off('value', Party.membersListener);
  }
  Party.membersRef = Party.db.ref('parties/' + code + '/members');
  Party.membersListener = snap => {
    Party.members = snap.val() || {};
    renderPartyStrip();
  };
  Party.membersRef.on('value', Party.membersListener);
}

function disconnectParty() {
  if (Party.membersRef && Party.membersListener) {
    Party.membersRef.off('value', Party.membersListener);
  }
  Party.membersRef = null;
  Party.membersListener = null;
  Party.code = null;
  Party.isDM = false;
  Party.members = {};
  localStorage.removeItem(PARTY_CODE_STORE);
  renderPartyStrip();
  updatePartyButton();
}

// ── UI ───────────────────────────────────────────────────────

function updatePartyButton() {
  const btn = document.getElementById('party-btn');
  if (Party.code) {
    btn.textContent = `🎲 ${Party.code}${Party.isDM ? ' · DM' : ''}`;
    btn.classList.add('active');
  } else {
    btn.textContent = '🎲 Party';
    btn.classList.remove('active');
  }
}

function renderPartyStrip() {
  const strip = document.getElementById('party-strip');
  // During combat the strip becomes the initiative bar (combat.js)
  if (typeof Combat !== 'undefined' && Combat.isActive()) { renderCombatBar(); return; }
  strip.classList.remove('combat-mode');
  if (!Party.code) { strip.style.display = 'none'; strip.innerHTML = ''; return; }
  strip.style.display = 'flex';

  const entries = Object.entries(Party.members);
  if (!entries.length) {
    strip.innerHTML = `<div class="party-empty">No players connected yet — share code <b>${escHtml(Party.code)}</b> and they join from their character sheet.</div>`;
    return;
  }

  strip.innerHTML = entries.map(([uid, m]) => {
    const hp = (m.hp != null) ? m.hp : 0;
    const hpMax = m.hpMax || 1;
    const pct = Math.max(0, Math.min(100, (hp / hpMax) * 100));
    const hpClass = pct > 50 ? 'hp-ok' : pct > 25 ? 'hp-hurt' : 'hp-critical';
    return `
      <div class="party-card" data-uid="${escAttr(uid)}">
        <div class="party-card-top">
          <span class="party-card-name">${escHtml(m.name || 'Unnamed')}</span>
          <span class="party-card-ac" title="Armor Class">🛡 ${m.ac != null ? m.ac : '—'}</span>
        </div>
        <div class="party-card-sub">${escHtml(m.className || '')}${m.level ? ' · Lv ' + m.level : ''}</div>
        <div class="party-hp-bar"><div class="party-hp-fill ${hpClass}" style="width:${pct}%"></div></div>
        <div class="party-hp-text">${hp} / ${m.hpMax != null ? m.hpMax : '—'} HP
          ${Party.isDM ? `<input class="cb-dmg-input pc-dmg" data-uid="${escAttr(uid)}" placeholder="dmg" title="Damage this PC — Enter applies (use +5 to heal). Syncs to their sheet.">` : ''}
        </div>
      </div>`;
  }).join('');

  wirePcDamageInputs(strip);
}

// DM applies damage/healing straight to a player's sheet: writes the
// member node's hp; the player tool listens and adopts the change.
function wirePcDamageInputs(root) {
  root.querySelectorAll('.pc-dmg').forEach(inp => inp.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const raw = inp.value.trim();
    const val = parseInt(raw);
    if (!raw || isNaN(val)) return;
    const uid = inp.dataset.uid;
    const m = Party.members[uid];
    if (!m || m.hp == null) return;
    const newHp = Math.max(0, Math.min(m.hpMax || 999, raw.startsWith('+') ? m.hp + val : m.hp - val));
    Party.db.ref(`parties/${Party.code}/members/${uid}/hp`).set(newHp)
      .then(() => {
        if (typeof postLog === 'function') {
          postLog('event', raw.startsWith('+')
            ? `${m.name} regains ${val} HP (${newHp}/${m.hpMax})`
            : `${m.name} takes ${val} damage (${newHp}/${m.hpMax})`);
        }
      })
      .catch(err => alert('HP write failed: ' + err.message));
    inp.value = '';
  }));
}

function openPartyModal() {
  if (typeof firebase === 'undefined') {
    openModal('Party', `<div class="section-text">Party features need an internet connection — the Firebase scripts didn't load. Everything else in the GM tool works normally offline.</div>`,
      [{ label: 'Close', primary: true, onClick: closeModal }]);
    return;
  }
  if (!Party.ready) {
    openModal('Party', `<div class="section-text">Still connecting to Firebase — give it a second and try again.</div>`,
      [{ label: 'Close', primary: true, onClick: closeModal }]);
    return;
  }

  if (Party.code) {
    openModal('Party Connection', `
      <div class="party-code-display">${escHtml(Party.code)}</div>
      <div class="section-text" style="text-align:center;margin-bottom:12px">
        ${Party.isDM ? 'You are the DM of this party.' : '⚠ Another device holds the DM slot for this party — you are connected as an observer.'}
      </div>
      <div class="section-text" style="color:var(--text-muted);font-size:12px">
        Players join by entering this code in their character sheet's Party menu.
        ${Object.keys(Party.members).length} member(s) connected.
      </div>
    `, [
      { label: 'Disconnect', onClick: () => { disconnectParty(); closeModal(); } },
      { label: 'Copy Code', onClick: () => {
          navigator.clipboard?.writeText(Party.code);
        }},
      { label: 'Close', primary: true, onClick: closeModal },
    ]);
    return;
  }

  openModal('Connect to Party', `
    <div class="form-group">
      <label class="form-label">Join an existing party</label>
      <input class="field-edit" id="party-code-input" maxlength="4" placeholder="4-letter code, e.g. GMFT"
             style="text-transform:uppercase;letter-spacing:.2em;text-align:center;font-size:16px">
    </div>
    <div class="section-text" style="color:var(--text-muted);font-size:12px;margin-bottom:8px">
      …or create a new party and share the code with your players.
    </div>
    <div id="party-modal-error" style="color:#e07070;font-size:12px;min-height:16px"></div>
  `, [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Create New Party', onClick: () => {
        createParty(err => {
          if (err) { document.getElementById('party-modal-error').textContent = err.message; return; }
          closeModal();
          openPartyModal(); // reopen in connected state to show the code
        });
      }},
    { label: 'Connect', primary: true, onClick: () => {
        const code = document.getElementById('party-code-input').value;
        if (!code || code.trim().length !== 4) {
          document.getElementById('party-modal-error').textContent = 'Enter the 4-letter party code.';
          return;
        }
        connectToParty(code, err => {
          if (err) { document.getElementById('party-modal-error').textContent = err.message; return; }
          closeModal();
        });
      }},
  ]);
}
