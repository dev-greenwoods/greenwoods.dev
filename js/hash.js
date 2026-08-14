// MD5 implementation (pure JS)
function md5(inputStr) {
  function safeAdd(x, y) {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xFFFF);
  }
  function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
  function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
  function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
  function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }

  const str = unescape(encodeURIComponent(inputStr));
  const length8 = str.length;
  const nblocks = (length8 + 8 >> 6) + 1;
  const blocks = new Array(nblocks * 16).fill(0);
  for (let i = 0; i < length8; i++) blocks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
  blocks[length8 >> 2] |= 0x80 << ((length8 % 4) * 8);
  blocks[nblocks * 16 - 2] = length8 * 8;

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < blocks.length; i += 16) {
    const [oa, ob, oc, od] = [a, b, c, d];
    a = md5ff(a,b,c,d,blocks[i],7,-680876936); d = md5ff(d,a,b,c,blocks[i+1],12,-389564586);
    c = md5ff(c,d,a,b,blocks[i+2],17,606105819); b = md5ff(b,c,d,a,blocks[i+3],22,-1044525330);
    a = md5ff(a,b,c,d,blocks[i+4],7,-176418897); d = md5ff(d,a,b,c,blocks[i+5],12,1200080426);
    c = md5ff(c,d,a,b,blocks[i+6],17,-1473231341); b = md5ff(b,c,d,a,blocks[i+7],22,-45705983);
    a = md5ff(a,b,c,d,blocks[i+8],7,1770035416); d = md5ff(d,a,b,c,blocks[i+9],12,-1958414417);
    c = md5ff(c,d,a,b,blocks[i+10],17,-42063); b = md5ff(b,c,d,a,blocks[i+11],22,-1990404162);
    a = md5ff(a,b,c,d,blocks[i+12],7,1804603682); d = md5ff(d,a,b,c,blocks[i+13],12,-40341101);
    c = md5ff(c,d,a,b,blocks[i+14],17,-1502002290); b = md5ff(b,c,d,a,blocks[i+15],22,1236535329);
    a = md5gg(a,b,c,d,blocks[i+1],5,-165796510); d = md5gg(d,a,b,c,blocks[i+6],9,-1069501632);
    c = md5gg(c,d,a,b,blocks[i+11],14,643717713); b = md5gg(b,c,d,a,blocks[i],20,-373897302);
    a = md5gg(a,b,c,d,blocks[i+5],5,-701558691); d = md5gg(d,a,b,c,blocks[i+10],9,38016083);
    c = md5gg(c,d,a,b,blocks[i+15],14,-660478335); b = md5gg(b,c,d,a,blocks[i+4],20,-405537848);
    a = md5gg(a,b,c,d,blocks[i+9],5,568446438); d = md5gg(d,a,b,c,blocks[i+14],9,-1019803690);
    c = md5gg(c,d,a,b,blocks[i+3],14,-187363961); b = md5gg(b,c,d,a,blocks[i+8],20,1163531501);
    a = md5gg(a,b,c,d,blocks[i+13],5,-1444681467); d = md5gg(d,a,b,c,blocks[i+2],9,-51403784);
    c = md5gg(c,d,a,b,blocks[i+7],14,1735328473); b = md5gg(b,c,d,a,blocks[i+12],20,-1926607734);
    a = md5hh(a,b,c,d,blocks[i+5],4,-378558); d = md5hh(d,a,b,c,blocks[i+8],11,-2022574463);
    c = md5hh(c,d,a,b,blocks[i+11],16,1839030562); b = md5hh(b,c,d,a,blocks[i+14],23,-35309556);
    a = md5hh(a,b,c,d,blocks[i+1],4,-1530992060); d = md5hh(d,a,b,c,blocks[i+4],11,1272893353);
    c = md5hh(c,d,a,b,blocks[i+7],16,-155497632); b = md5hh(b,c,d,a,blocks[i+10],23,-1094730640);
    a = md5hh(a,b,c,d,blocks[i+13],4,681279174); d = md5hh(d,a,b,c,blocks[i],11,-358537222);
    c = md5hh(c,d,a,b,blocks[i+3],16,-722521979); b = md5hh(b,c,d,a,blocks[i+6],23,76029189);
    a = md5hh(a,b,c,d,blocks[i+9],4,-640364487); d = md5hh(d,a,b,c,blocks[i+12],11,-421815835);
    c = md5hh(c,d,a,b,blocks[i+15],16,530742520); b = md5hh(b,c,d,a,blocks[i+2],23,-995338651);
    a = md5ii(a,b,c,d,blocks[i],6,-198630844); d = md5ii(d,a,b,c,blocks[i+7],10,1126891415);
    c = md5ii(c,d,a,b,blocks[i+14],15,-1416354905); b = md5ii(b,c,d,a,blocks[i+5],21,-57434055);
    a = md5ii(a,b,c,d,blocks[i+12],6,1700485571); d = md5ii(d,a,b,c,blocks[i+3],10,-1894986606);
    c = md5ii(c,d,a,b,blocks[i+10],15,-1051523); b = md5ii(b,c,d,a,blocks[i+1],21,-2054922799);
    a = md5ii(a,b,c,d,blocks[i+8],6,1873313359); d = md5ii(d,a,b,c,blocks[i+15],10,-30611744);
    c = md5ii(c,d,a,b,blocks[i+6],15,-1560198380); b = md5ii(b,c,d,a,blocks[i+13],21,1309151649);
    a = md5ii(a,b,c,d,blocks[i+4],6,-145523070); d = md5ii(d,a,b,c,blocks[i+11],10,-1120210379);
    c = md5ii(c,d,a,b,blocks[i+2],15,718787259); b = md5ii(b,c,d,a,blocks[i+9],21,-343485551);
    a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
  }

  const output = [a, b, c, d];
  return output.map(n => {
    let hex = '';
    for (let j = 0; j < 4; j++) hex += ('0' + ((n >> (j * 8)) & 0xFF).toString(16)).slice(-2);
    return hex;
  }).join('');
}

async function sha(algo, data) {
  const buf = await crypto.subtle.digest(algo, data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

let inputMode = 'text';
let allHashes = {};

function setInputMode(mode) {
  inputMode = mode;
  document.getElementById('tabText').classList.toggle('active', mode === 'text');
  document.getElementById('tabFile').classList.toggle('active', mode === 'file');
  document.getElementById('textPane').classList.toggle('hidden', mode !== 'text');
  document.getElementById('filePane').classList.toggle('hidden', mode !== 'file');
}

function showLoading() {
  const algos = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
  document.getElementById('hashOutput').innerHTML = algos.map(a =>
    `<div class="hash-row">
      <div class="hash-algo-row">
        <span class="hash-algo">${a}</span>
      </div>
      <span class="hash-val loading">computing...</span>
    </div>`
  ).join('');
}

function renderHashes(hashes) {
  allHashes = hashes;
  document.getElementById('hashOutput').innerHTML = Object.entries(hashes).map(([algo, val]) =>
    `<div class="hash-row">
      <div class="hash-algo-row">
        <span class="hash-algo">${algo}</span>
        <button class="copy-btn" onclick="copyHash('${algo}')">copy</button>
      </div>
      <span class="hash-val">${val}</span>
    </div>`
  ).join('');
}

async function computeHashes() {
  const raw = document.getElementById('hashInput').value;
  if (!raw) {
    document.getElementById('hashOutput').innerHTML = `<div class="empty-state"><div class="empty-icon">#</div><div>Enter text or a file to generate hashes</div></div>`;
    return;
  }

  showLoading();
  const enc = new TextEncoder();
  const data = enc.encode(raw);

  const hashes = {
    'MD5': md5(raw),
    'SHA-1': await sha('SHA-1', data),
    'SHA-256': await sha('SHA-256', data),
    'SHA-384': await sha('SHA-384', data),
    'SHA-512': await sha('SHA-512', data),
  };

  renderHashes(hashes);
}

function onDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.add('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('drag-over');
  processFile(e.dataTransfer.files[0]);
}

function onFileSelect(e) {
  processFile(e.target.files[0]);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function processFile(file) {
  if (!file) return;
  const info = document.getElementById('fileInfo');
  info.innerHTML = `<span>📄 ${escapeHtml(file.name)}</span><span>${(file.size / 1024).toFixed(2)} KB · ${file.type || 'unknown'}</span>`;
  info.classList.remove('hidden');

  showLoading();

  const buf = await file.arrayBuffer();
  const u8 = new Uint8Array(buf);

  // For MD5, read as binary string
  let binStr = '';
  u8.forEach(b => binStr += String.fromCharCode(b));

  const hashes = {
    'MD5': md5(binStr),
    'SHA-1': await sha('SHA-1', buf),
    'SHA-256': await sha('SHA-256', buf),
    'SHA-384': await sha('SHA-384', buf),
    'SHA-512': await sha('SHA-512', buf),
  };

  renderHashes(hashes);
}

function copyHash(algo) {
  const val = allHashes[algo];
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => {
    const btns = document.querySelectorAll('.copy-btn');
    btns.forEach(btn => {
      if (btn.getAttribute('onclick') === `copyHash('${algo}')`) {
        btn.textContent = 'copied!';
        setTimeout(() => { btn.textContent = 'copy'; }, 1400);
      }
    });
  });
}

function copyAll() {
  const text = Object.entries(allHashes).map(([k, v]) => `${k}: ${v}`).join('\n');
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = 'copy all'; }, 1400);
  });
}

function clearAll() {
  document.getElementById('hashInput').value = '';
  document.getElementById('fileInfo').classList.add('hidden');
  allHashes = {};
  document.getElementById('hashOutput').innerHTML = `<div class="empty-state"><div class="empty-icon">#</div><div>Enter text or a file to generate hashes</div></div>`;
}
