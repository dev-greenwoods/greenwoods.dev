let currentToken = null;
let keyFormat = 'raw';

const KNOWN_CLAIMS = {
  iss: 'issuer', sub: 'subject', aud: 'audience',
  exp: 'expires at', iat: 'issued at', nbf: 'not before',
  jti: 'JWT ID'
};

const TIMESTAMP_CLAIMS = ['exp', 'iat', 'nbf'];

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

function b64urlToBytes(str) {
  const bin = b64urlDecode(str);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function strToBytes(str) {
  return new TextEncoder().encode(str);
}

function b64ToBytes(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function formatTimestamp(unix) {
  const d = new Date(unix * 1000);
  const now = Date.now();
  const diff = unix * 1000 - now;
  const abs = Math.abs(diff);
  let rel = '';
  if (abs < 60000) rel = 'just now';
  else if (abs < 3600000) rel = `${Math.round(abs/60000)}m ${diff < 0 ? 'ago' : 'from now'}`;
  else if (abs < 86400000) rel = `${Math.round(abs/3600000)}h ${diff < 0 ? 'ago' : 'from now'}`;
  else rel = `${Math.round(abs/86400000)}d ${diff < 0 ? 'ago' : 'from now'}`;
  return { human: d.toUTCString(), rel, raw: unix };
}

function parseJWT(token) {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT structure — expected 3 parts');
  try {
    const header = JSON.parse(b64urlDecode(parts[0]));
    const payload = JSON.parse(b64urlDecode(parts[1]));
    return { header, payload, sigB64: parts[2], parts };
  } catch(e) {
    throw new Error('Failed to decode JWT: ' + e.message);
  }
}

function handleInput() {
  const val = document.getElementById('jwtInput').value.trim();
  if (!val) { clearAll(); return; }

  try {
    currentToken = parseJWT(val);
    renderDecoded(currentToken);
    renderColoured(currentToken.parts);
    updateAlgoBadge(currentToken.header.alg);
    document.getElementById('verifyResult').className = 'verify-result hidden';
  } catch(e) {
    showError(e.message);
  }
}

function renderColoured(parts) {
  const el = document.getElementById('jwtColoured');
  el.style.display = 'block';
  document.getElementById('jwtInput').style.display = 'none';
  el.innerHTML =
    `<span class="jwt-part-header">${parts[0]}</span>` +
    `<span class="jwt-dot">.</span>` +
    `<span class="jwt-part-payload">${parts[1]}</span>` +
    `<span class="jwt-dot">.</span>` +
    `<span class="jwt-part-sig">${parts[2]}</span>`;
  el.onclick = () => {
    el.style.display = 'none';
    document.getElementById('jwtInput').style.display = 'block';
    document.getElementById('jwtInput').focus();
  };
}

function updateAlgoBadge(alg) {
  const el = document.getElementById('algoDisplay');
  el.textContent = `alg: ${alg || '—'}`;
  document.getElementById('verifyAlgo').textContent = alg || '';
  el.style.color = getAlgColor(alg);
  el.style.borderColor = getAlgColor(alg) + '44';
}

function getAlgColor(alg) {
  if (!alg) return '#555577';
  if (alg.startsWith('HS')) return '#00ff9f';
  if (alg.startsWith('RS')) return '#00b8ff';
  if (alg.startsWith('ES')) return '#ffd166';
  if (alg.startsWith('PS')) return '#ff79c6';
  return '#555577';
}

function renderDecoded(jwt) {
  const area = document.getElementById('decodedArea');
  const now = Math.floor(Date.now() / 1000);
  const { header, payload, sigB64 } = jwt;

  const pills = [];
  if (payload.exp) {
    if (payload.exp < now) pills.push(`<span class="status-pill expired">✗ expired</span>`);
    else pills.push(`<span class="status-pill valid-time">✓ valid</span>`);
  }
  if (payload.nbf && payload.nbf > now) pills.push(`<span class="status-pill nbf">⏳ not yet valid</span>`);
  if (header.alg) pills.push(`<span class="status-pill info">${header.alg}</span>`);
  document.getElementById('statusBar').innerHTML = pills.join('');

  area.innerHTML = '';
  area.appendChild(buildPartBlock('header', 'HEADER', header));
  area.appendChild(buildPartBlock('payload', 'PAYLOAD', payload));

  const sigBlock = document.createElement('div');
  sigBlock.className = 'part-block';
  sigBlock.innerHTML = `
    <div class="part-label signature">
      <span>SIGNATURE</span>
      <button class="copy-btn" onclick="copyText('${sigB64}', this)">copy</button>
    </div>
    <div class="part-body">
      <div class="sig-raw">${sigB64}</div>
    </div>
  `;
  area.appendChild(sigBlock);
}

function buildPartBlock(type, label, obj) {
  const block = document.createElement('div');
  block.className = 'part-block';

  let rows = '';
  for (const [k, v] of Object.entries(obj)) {
    const isKnown = KNOWN_CLAIMS[k];
    const isTs = TIMESTAMP_CLAIMS.includes(k);
    let valHtml = '';

    if (isTs && typeof v === 'number') {
      const ts = formatTimestamp(v);
      valHtml = `<div class="claim-val ts">
        <span class="ts-human">${ts.human}</span>
        <span class="ts-raw">${v} · ${ts.rel}</span>
      </div>`;
    } else if (typeof v === 'object') {
      valHtml = `<div class="claim-val">${JSON.stringify(v)}</div>`;
    } else {
      valHtml = `<div class="claim-val">${v}</div>`;
    }

    rows += `<div class="claim-row">
      <div class="claim-key ${isKnown ? 'known' : ''}">${k}${isKnown ? `<br><span style="font-size:0.6rem;opacity:0.6">${KNOWN_CLAIMS[k]}</span>` : ''}</div>
      ${valHtml}
    </div>`;
  }

  block.innerHTML = `
    <div class="part-label ${type}">
      <span>${label}</span>
      <button class="copy-btn" onclick="copyJSON(this, ${JSON.stringify(JSON.stringify(obj, null, 2))})">copy json</button>
    </div>
    <div class="part-body">
      <div class="claims">${rows}</div>
    </div>
  `;
  return block;
}

function showError(msg) {
  document.getElementById('decodedArea').innerHTML = `
    <div class="empty-state">
      <div style="font-size:1.5rem">⚠️</div>
      <div style="color:#ff4d6d">${msg}</div>
    </div>`;
  document.getElementById('statusBar').innerHTML = '';
}

function setKeyFormat(fmt) {
  keyFormat = fmt;
  ['Raw','B64','Pem'].forEach(f => {
    document.getElementById('tab'+f).classList.remove('active');
  });
  document.getElementById('tab' + fmt.charAt(0).toUpperCase() + fmt.slice(1)).classList.add('active');
}

async function verifySignature() {
  if (!currentToken) return;
  const alg = currentToken.header.alg;
  const secret = document.getElementById('secretInput').value.trim();
  const resultEl = document.getElementById('verifyResult');

  if (!secret) {
    showResult(resultEl, false, 'Please enter a secret or public key');
    return;
  }

  if (alg === 'none') {
    const hasSig = currentToken.sigB64.length > 0;
    showResult(resultEl, !hasSig, hasSig ? 'alg=none but signature is present — suspicious' : 'alg=none · no signature (warning: insecure)');
    return;
  }

  try {
    const { parts } = currentToken;
    const message = strToBytes(parts[0] + '.' + parts[1]);
    const sigBytes = b64urlToBytes(parts[2]);

    let valid = false;

    if (alg.startsWith('HS')) {
      valid = await verifyHMAC(alg, message, sigBytes, secret);
    } else if (alg.startsWith('RS')) {
      valid = await verifyRSA(alg, message, sigBytes, secret, 'RSASSA-PKCS1-v1_5');
    } else if (alg.startsWith('PS')) {
      valid = await verifyRSA(alg, message, sigBytes, secret, 'RSA-PSS');
    } else if (alg.startsWith('ES')) {
      valid = await verifyECDSA(alg, message, sigBytes, secret);
    } else {
      showResult(resultEl, false, `Unsupported algorithm: ${alg}`);
      return;
    }

    showResult(resultEl, valid, valid ? '✓ signature verified' : '✗ invalid signature');
  } catch(e) {
    showResult(resultEl, false, 'Verification error: ' + e.message);
  }
}

function showResult(el, valid, msg) {
  el.className = `verify-result ${valid ? 'valid' : 'invalid'}`;
  el.textContent = msg;
}

function hashName(alg) {
  const n = alg.slice(-3);
  return { '256': 'SHA-256', '384': 'SHA-384', '512': 'SHA-512' }[n] || 'SHA-256';
}

async function verifyHMAC(alg, message, sigBytes, secret) {
  let keyBytes;
  if (keyFormat === 'base64') keyBytes = b64ToBytes(secret);
  else keyBytes = strToBytes(secret);

  const key = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: hashName(alg) },
    false, ['verify']
  );
  return await crypto.subtle.verify('HMAC', key, sigBytes, message);
}

async function verifyRSA(alg, message, sigBytes, pemOrKey, rsaName) {
  const pem = pemOrKey.includes('-----') ? pemOrKey : pemOrKey;
  const der = pemToDer(pem);
  const params = rsaName === 'RSA-PSS'
    ? { name: 'RSA-PSS', hash: hashName(alg) }
    : { name: 'RSASSA-PKCS1-v1_5', hash: hashName(alg) };

  const key = await crypto.subtle.importKey('spki', der, params, false, ['verify']);
  const verifyParams = rsaName === 'RSA-PSS'
    ? { name: 'RSA-PSS', saltLength: parseInt(alg.slice(-3)) / 8 }
    : 'RSASSA-PKCS1-v1_5';
  return await crypto.subtle.verify(verifyParams, key, sigBytes, message);
}

async function verifyECDSA(alg, message, sigBytes, pemOrKey) {
  const curveMap = { 'ES256': 'P-256', 'ES384': 'P-384', 'ES512': 'P-521' };
  const der = pemToDer(pemOrKey);
  const key = await crypto.subtle.importKey(
    'spki', der,
    { name: 'ECDSA', namedCurve: curveMap[alg] },
    false, ['verify']
  );
  const rawSig = derToRawECDSA(sigBytes, alg);
  return await crypto.subtle.verify(
    { name: 'ECDSA', hash: hashName(alg) },
    key, rawSig, message
  );
}

function pemToDer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  return b64ToBytes(b64).buffer;
}

function derToRawECDSA(der, alg) {
  const keyLen = { ES256: 32, ES384: 48, ES512: 66 }[alg] || 32;
  try {
    let offset = 2;
    if (der[1] & 0x80) offset += der[1] & 0x7f;
    offset++;
    let rLen = der[offset++];
    let r = der.slice(offset, offset + rLen);
    offset += rLen;
    offset++;
    let sLen = der[offset++];
    let s = der.slice(offset, offset + sLen);

    const pad = (arr, len) => {
      const start = arr[0] === 0 ? 1 : 0;
      const trimmed = arr.slice(start);
      const result = new Uint8Array(len);
      result.set(trimmed, len - trimmed.length);
      return result;
    };
    const raw = new Uint8Array(keyLen * 2);
    raw.set(pad(r, keyLen), 0);
    raw.set(pad(s, keyLen), keyLen);
    return raw;
  } catch(e) {
    return der;
  }
}

function copyJSON(btn, json) {
  navigator.clipboard.writeText(json).then(() => {
    btn.textContent = 'copied!';
    setTimeout(() => btn.textContent = 'copy json', 1500);
  });
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'copied!';
    setTimeout(() => btn.textContent = 'copy', 1500);
  });
}

function clearAll() {
  currentToken = null;
  document.getElementById('jwtInput').value = '';
  document.getElementById('jwtInput').style.display = 'block';
  document.getElementById('jwtColoured').style.display = 'none';
  document.getElementById('decodedArea').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🔐</div>
      <div>Paste a JWT on the left to decode it</div>
      <div style="font-size:0.65rem;margin-top:4px">Supports all standard algorithms</div>
    </div>`;
  document.getElementById('statusBar').innerHTML = '';
  document.getElementById('algoDisplay').textContent = 'alg: —';
  document.getElementById('algoDisplay').style.color = '';
  document.getElementById('verifyAlgo').textContent = '';
  document.getElementById('verifyResult').className = 'verify-result hidden';
}

function loadSample() {
  const sample = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMTIzNDU2IiwibmFtZSI6IkphbmUgRGV2ZWxvcGVyIiwiaWF0IjoxNzE2MDAwMDAwLCJleHAiOjI1MzQwMjMwMDgsIm5iZiI6MTcxNjAwMDAwMCwiaXNzIjoiZ3JlZW53b29kcy5kZXYiLCJhdWQiOiJkZXZzIiwianRpIjoiYjNkM2ZhYjItY2MwMS00ZjQ2LWE3ZDMtNzBhNzIyZmU1NjM5Iiwicm9sZXMiOlsiZGV2IiwiYWRtaW4iXX0.sampleSignature123';
  document.getElementById('jwtInput').value = sample;
  handleInput();
  document.getElementById('secretInput').placeholder = 'Try: greenwoods';
}
