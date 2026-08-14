let pwCount = 1;

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const NUMS  = '0123456789';
const SYMS  = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const AMB   = new Set('0O1lI');

function setLength(n) {
  document.getElementById('lengthSlider').value = n;
  document.getElementById('lenDisplay').textContent = n;
  document.querySelectorAll('.len-presets .count-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === String(n)));
  generate();
}

function onLengthChange() {
  const n = document.getElementById('lengthSlider').value;
  document.getElementById('lenDisplay').textContent = n;
  document.querySelectorAll('.len-presets .count-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === String(n)));
  generate();
}

function setCount(n) {
  pwCount = n;
  document.querySelectorAll('.field-group:last-of-type .count-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === String(n)));
  generate();
}

function buildCharset() {
  let chars = '';
  if (document.getElementById('chkUpper').checked) chars += UPPER;
  if (document.getElementById('chkLower').checked) chars += LOWER;
  if (document.getElementById('chkNum').checked)   chars += NUMS;
  if (document.getElementById('chkSym').checked)   chars += SYMS;
  if (document.getElementById('chkNoAmb').checked)
    chars = chars.split('').filter(c => !AMB.has(c)).join('');
  return chars;
}

function secureRandInt(max) {
  const buf = new Uint32Array(1);
  let val;
  do {
    crypto.getRandomValues(buf);
    val = buf[0];
  } while (val >= Math.floor(0xFFFFFFFF / max) * max);
  return val % max;
}

function generateOne(len, chars, noRepeat) {
  if (!chars) return '';
  const pool = noRepeat ? chars.split('') : null;
  let pw = '';
  for (let i = 0; i < len; i++) {
    if (noRepeat && pool.length === 0) break;
    const src = noRepeat ? pool : chars.split('');
    const idx = secureRandInt(src.length);
    pw += src[idx];
    if (noRepeat) pool.splice(idx, 1);
  }
  return pw;
}

function entropy(len, charsetSize) {
  return (len * Math.log2(charsetSize)).toFixed(1);
}

function strengthLabel(bits) {
  if (bits < 28) return { label: 'Terrible', color: '#ff4d6d', pct: 5 };
  if (bits < 36) return { label: 'Weak', color: '#ff4d6d', pct: 20 };
  if (bits < 60) return { label: 'Fair', color: '#ffd166', pct: 45 };
  if (bits < 80) return { label: 'Good', color: '#00b8ff', pct: 70 };
  if (bits < 120) return { label: 'Strong', color: '#00ff9f', pct: 88 };
  return { label: 'Very Strong', color: '#00ff9f', pct: 100 };
}

function generate() {
  const len = parseInt(document.getElementById('lengthSlider').value);
  const noRepeat = document.getElementById('chkNoRep').checked;
  const chars = buildCharset();

  if (!chars) {
    document.getElementById('pwOutput').innerHTML =
      '<div class="error-msg" style="margin:16px">Select at least one character set.</div>';
    return;
  }

  const passwords = Array.from({ length: pwCount }, () => generateOne(len, chars, noRepeat));

  // Strength (based on first password)
  const bits = parseFloat(entropy(len, chars.length));
  const str = strengthLabel(bits);
  document.getElementById('strengthFill').style.width = str.pct + '%';
  document.getElementById('strengthFill').style.background = str.color;
  document.getElementById('strengthInfo').innerHTML =
    `<span style="color:${str.color}">${str.label}</span><span>${bits} bits of entropy</span><span>${chars.length} possible chars</span>`;
  document.getElementById('strengthMeter').classList.remove('hidden');
  document.getElementById('strengthBadge').textContent = 'strength: ' + str.label.toLowerCase();

  document.getElementById('pwOutput').innerHTML = passwords.map(pw =>
    `<div class="pw-item">
      <span class="pw-val" onclick="copyPw(this, '${pw.replace(/'/g, "\\'")}')">${pw}</span>
      <button class="pw-copy" onclick="copyPw(this, '${pw.replace(/'/g, "\\'")}')">copy</button>
    </div>`
  ).join('');
}

function copyPw(el, text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = el.tagName === 'BUTTON' ? el : el.nextElementSibling;
    const orig = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = orig; }, 1000);
  });
}

function copyAll() {
  const vals = [...document.querySelectorAll('.pw-val')].map(el => el.textContent);
  if (!vals.length) return;
  navigator.clipboard.writeText(vals.join('\n')).then(() => {
    const btn = event.target;
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = 'copy all'; }, 1400);
  });
}

window.addEventListener('DOMContentLoaded', () => { setLength(16); setCount(1); generate(); });
