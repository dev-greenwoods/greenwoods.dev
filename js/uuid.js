let version = 4;
let count = 1;
let format = 'standard';
let currentUUIDs = [];

function setVersion(v) {
  version = v;
  document.getElementById('tabV4').classList.toggle('active', v === 4);
  document.getElementById('tabV7').classList.toggle('active', v === 7);
}

function setCount(n) {
  count = n;
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === String(n));
  });
}

function setFormat(f) {
  format = f;
  ['Std','Upper','NoBraces','Braces'].forEach(id => {
    document.getElementById('tabFmt' + id).classList.remove('active');
  });
  const map = { standard: 'tabFmtStd', upper: 'tabFmtUpper', nobraces: 'tabFmtNoBraces', braces: 'tabFmtBraces' };
  document.getElementById(map[f]).classList.add('active');
  renderUUIDs();
}

function generateV4() {
  return crypto.randomUUID();
}

function generateV7() {
  // UUID v7: time-ordered with millisecond precision
  const now = BigInt(Date.now());
  const msHigh = (now >> 16n) & 0xFFFFFFFFn;
  const msLow = now & 0xFFFFn;
  const rand = new Uint8Array(10);
  crypto.getRandomValues(rand);
  const hex = (n, len) => n.toString(16).padStart(len, '0');
  const r = Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('');
  const ver = '7';
  const var_ = ((rand[2] & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return `${hex(msHigh, 8)}-${hex(msLow, 4)}-${ver}${r.slice(0, 3)}-${var_}${r.slice(4, 6)}-${r.slice(6, 18)}`;
}

function applyFormat(uuid) {
  const quote = document.getElementById('chkQuote').checked;
  const comma = document.getElementById('chkComma').checked;
  let out = uuid;
  switch (format) {
    case 'upper': out = uuid.toUpperCase(); break;
    case 'nobraces': out = uuid.replace(/-/g, ''); break;
    case 'braces': out = '{' + uuid + '}'; break;
  }
  if (quote) out = `"${out}"`;
  if (comma) out = out + ',';
  return out;
}

function generate() {
  currentUUIDs = Array.from({ length: count }, () =>
    version === 7 ? generateV7() : generateV4()
  );
  renderUUIDs();
}

function regenerate() { generate(); }

function renderUUIDs() {
  if (!currentUUIDs.length) return;
  document.getElementById('outputTitle').textContent = `output · ${currentUUIDs.length} uuid${currentUUIDs.length !== 1 ? 's' : ''}`;

  const formatted = currentUUIDs.map(applyFormat);
  document.getElementById('uuidOutput').innerHTML = formatted.map((u, i) =>
    `<div class="uuid-item">
      <span class="uuid-val" onclick="copyOne(this, '${u.replace(/'/g, "\\'")}')">${u}</span>
      <button class="uuid-copy" onclick="copyOne(this, '${u.replace(/'/g, "\\'")}')">copy</button>
    </div>`
  ).join('');
}

function copyOne(el, text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = el.tagName === 'BUTTON' ? el : el.nextElementSibling;
    const orig = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = orig; }, 1000);
  });
}

function copyAll() {
  if (!currentUUIDs.length) return;
  const text = currentUUIDs.map(applyFormat).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = 'copy all'; }, 1400);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setCount(1);
  generate();
});
