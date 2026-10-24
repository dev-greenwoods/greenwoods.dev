// State: 3-bit objects for owner/group/other + special
const state = {
  owner:  { r: true,  w: true,  x: true  },
  group:  { r: true,  w: false, x: true  },
  other:  { r: true,  w: false, x: true  },
  suid:   false,
  sgid:   false,
  sticky: false,
};

const WHO = ['owner', 'group', 'other'];

// ── Compute ────────────────────────────────────────────────────────
function whoOctal(who) {
  return (state[who].r ? 4 : 0) + (state[who].w ? 2 : 0) + (state[who].x ? 1 : 0);
}

function specialOctal() {
  return (state.suid ? 4 : 0) + (state.sgid ? 2 : 0) + (state.sticky ? 1 : 0);
}

function toOctalStr() {
  const sp = specialOctal();
  const o = `${whoOctal('owner')}${whoOctal('group')}${whoOctal('other')}`;
  return sp > 0 ? `${sp}${o}` : o;
}

function toSymbolic() {
  function bits(who, sKey, hasX) {
    const r = state[who].r ? 'r' : '-';
    const w = state[who].w ? 'w' : '-';
    let x;
    if (who === 'owner') {
      x = state.suid ? (state[who].x ? 's' : 'S') : (state[who].x ? 'x' : '-');
    } else if (who === 'group') {
      x = state.sgid ? (state[who].x ? 's' : 'S') : (state[who].x ? 'x' : '-');
    } else {
      x = state.sticky ? (state[who].x ? 't' : 'T') : (state[who].x ? 'x' : '-');
    }
    return r + w + x;
  }
  return bits('owner') + bits('group') + bits('other');
}

// ── Render ─────────────────────────────────────────────────────────
function render() {
  // Update checkboxes
  document.querySelectorAll('[data-who][data-bit]').forEach(chk => {
    const who = chk.dataset.who;
    const bit = chk.dataset.bit;
    chk.checked = state[who][bit];
  });
  document.getElementById('chkSuid').checked   = state.suid;
  document.getElementById('chkSgid').checked   = state.sgid;
  document.getElementById('chkSticky').checked = state.sticky;

  // Update octal cells
  WHO.forEach(who => {
    document.getElementById(`octal-${who}`).textContent = whoOctal(who);
  });
  document.getElementById('octal-suid').textContent   = state.suid   ? '4000' : '0';
  document.getElementById('octal-sgid').textContent   = state.sgid   ? '2000' : '0';
  document.getElementById('octal-sticky').textContent = state.sticky ? '1000' : '0';

  // Update text inputs
  const oct = toOctalStr();
  const sym = toSymbolic();
  document.getElementById('octalInput').value    = oct;
  document.getElementById('symbolicInput').value = sym;
  document.getElementById('cmdText').textContent = `chmod ${oct} <file>`;
}

// ── Parse octal string → state ─────────────────────────────────────
function parseOctal(str) {
  str = str.trim().replace(/^0+/, '') || '0';
  if (!/^\d{1,4}$/.test(str)) return false;

  let sp = 0, o = 0, g = 0, ot = 0;
  if (str.length === 4) {
    [sp, o, g, ot] = str.split('').map(Number);
  } else {
    const padded = str.padStart(3, '0');
    [o, g, ot] = padded.split('').map(Number);
  }
  if ([sp, o, g, ot].some(n => n > 7)) return false;

  state.owner.r = !!(o & 4); state.owner.w = !!(o & 2); state.owner.x = !!(o & 1);
  state.group.r = !!(g & 4); state.group.w = !!(g & 2); state.group.x = !!(g & 1);
  state.other.r = !!(ot& 4); state.other.w = !!(ot& 2); state.other.x = !!(ot& 1);
  state.suid   = !!(sp & 4);
  state.sgid   = !!(sp & 2);
  state.sticky = !!(sp & 1);
  return true;
}

// ── Parse symbolic string → state ─────────────────────────────────
function parseSymbolic(str) {
  str = str.trim();
  // Accept 9 or 10 chars (with leading type char)
  if (str.length === 10) str = str.slice(1);
  if (str.length !== 9) return false;
  if (!/^[r\-][w\-][xsStT\-][r\-][w\-][xsS\-][r\-][w\-][xtT\-]$/.test(str)) return false;

  const ownerX = str[2];
  const groupX = str[5];
  const otherX = str[8];

  state.owner.r = str[0] === 'r';
  state.owner.w = str[1] === 'w';
  state.owner.x = ownerX === 'x' || ownerX === 's';
  state.suid    = ownerX === 's' || ownerX === 'S';

  state.group.r = str[3] === 'r';
  state.group.w = str[4] === 'w';
  state.group.x = groupX === 'x' || groupX === 's';
  state.sgid    = groupX === 's' || groupX === 'S';

  state.other.r = str[6] === 'r';
  state.other.w = str[7] === 'w';
  state.other.x = otherX === 'x' || otherX === 't';
  state.sticky  = otherX === 't' || otherX === 'T';
  return true;
}

// ── Event Listeners ────────────────────────────────────────────────
document.querySelectorAll('[data-who][data-bit]').forEach(chk => {
  chk.addEventListener('change', () => {
    state[chk.dataset.who][chk.dataset.bit] = chk.checked;
    render();
  });
});

document.getElementById('chkSuid').addEventListener('change',   e => { state.suid   = e.target.checked; render(); });
document.getElementById('chkSgid').addEventListener('change',   e => { state.sgid   = e.target.checked; render(); });
document.getElementById('chkSticky').addEventListener('change', e => { state.sticky = e.target.checked; render(); });

function setOctalMsg(text) {
  const msg = document.getElementById('octalMsg');
  if (!msg) return;
  msg.textContent = text || '';
  msg.classList.toggle('hidden', !text);
}

document.getElementById('octalInput').addEventListener('input', e => {
  const v = e.target.value;
  if (parseOctal(v)) { setOctalMsg(''); render(); }
  else if (v.trim()) setOctalMsg('Invalid octal — use digits 0–7 only, e.g. 755 or 0644.');
  else setOctalMsg('');
});

// Don't overwrite input while user is typing; only parse on blur/enter
document.getElementById('octalInput').addEventListener('blur', e => {
  if (!parseOctal(e.target.value)) { setOctalMsg(''); render(); } // restore valid value
  else { setOctalMsg(''); render(); }
});

document.getElementById('symbolicInput').addEventListener('input', e => {
  if (parseSymbolic(e.target.value)) render();
});

document.getElementById('symbolicInput').addEventListener('blur', e => {
  if (!parseSymbolic(e.target.value)) render();
});

// Prevent render from firing while user is actively typing in octal/symbolic
document.getElementById('octalInput').addEventListener('focus', () => {});

document.getElementById('btnReset').addEventListener('click', () => {
  state.owner = { r: true, w: true, x: true };
  state.group = { r: true, w: false, x: true };
  state.other = { r: true, w: false, x: true };
  state.suid = state.sgid = state.sticky = false;
  render();
});

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (parseOctal(btn.dataset.val)) render();
  });
});

document.getElementById('copyCmd').addEventListener('click', function() {
  navigator.clipboard.writeText(`chmod ${toOctalStr()} <file>`).then(() => {
    this.textContent = 'copied!';
    setTimeout(() => this.textContent = 'copy', 1500);
  });
});

// ── Init ───────────────────────────────────────────────────────────
render();
