// ── State ──────────────────────────────────────────────────────
let headers = [], params = [], auth = 'none', bodyType = 'none', multiline = true;

// ── Helpers ────────────────────────────────────────────────────
function esc(s) { return String(s).replace(/'/g, "'\\''"); }
function q(s)   { return s.includes(' ') || s.includes('"') || s.includes("'") ? `'${esc(s)}'` : s || "''";}
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

const $ = id => document.getElementById(id);

// ── KV rows ────────────────────────────────────────────────────
function addKvRow(listId, arr) {
  const id = Date.now() + Math.random();
  arr.push({ id, key: '', val: '' });
  renderKv(listId, arr);
}

function removeKvRow(listId, id) {
  const arr = listId === 'headersList' ? headers : params;
  const idx = arr.findIndex(r => r.id === id);
  if (idx > -1) arr.splice(idx, 1);
  renderKv(listId, arr);
  build();
}

function renderKv(listId, arr) {
  const el = $(listId);
  el.innerHTML = arr.map(r => `
    <div class="kv-row" data-id="${r.id}">
      <input class="kv-key" type="text" placeholder="Key" value="${escHtml(r.key)}"
        oninput="updateKv('${listId}',${r.id},'key',this.value)" spellcheck="false" />
      <input type="text" placeholder="Value" value="${escHtml(r.val)}"
        oninput="updateKv('${listId}',${r.id},'val',this.value)" spellcheck="false" />
      <button class="kv-del" onclick="removeKvRow('${listId}',${r.id})">✕</button>
    </div>`).join('');
}

function updateKv(listId, id, field, val) {
  const arr = listId === 'headersList' ? headers : params;
  const row = arr.find(r => r.id === id);
  if (row) row[field] = val;
  build();
}

// ── Auth fields ────────────────────────────────────────────────
function renderAuth() {
  const el = $('authFields');
  if (auth === 'basic') {
    el.innerHTML = `
      <input class="auth-input" id="authUser" type="text" placeholder="Username" spellcheck="false" oninput="build()" />
      <input class="auth-input" id="authPass" type="password" placeholder="Password" oninput="build()" />`;
  } else if (auth === 'bearer') {
    el.innerHTML = `<input class="auth-input" id="authToken" type="text" placeholder="Bearer token" spellcheck="false" oninput="build()" />`;
  } else if (auth === 'apikey') {
    el.innerHTML = `
      <input class="auth-input" id="authKeyName" type="text" placeholder="Header name (e.g. X-API-Key)" spellcheck="false" oninput="build()" />
      <input class="auth-input" id="authKeyVal"  type="text" placeholder="Key value" spellcheck="false" oninput="build()" />`;
  } else {
    el.innerHTML = '';
  }
}

// ── Body fields ────────────────────────────────────────────────
function renderBody() {
  const el = $('bodyFields');
  const method = $('method').value;
  const show = !['GET','HEAD','OPTIONS'].includes(method);
  $('bodyGroup').style.display = show ? '' : 'none';
  if (!show) { bodyType = 'none'; el.innerHTML = ''; return; }
  if (bodyType === 'json') {
    el.innerHTML = `<textarea class="body-textarea" id="bodyJson" placeholder='{"key": "value"}' spellcheck="false" oninput="build()"></textarea>`;
  } else if (bodyType === 'form') {
    el.innerHTML = `<textarea class="body-textarea" id="bodyForm" placeholder="field1=value1&amp;field2=value2" spellcheck="false" oninput="build()"></textarea>`;
  } else if (bodyType === 'raw') {
    el.innerHTML = `<textarea class="body-textarea" id="bodyRaw" placeholder="Raw request body" spellcheck="false" oninput="build()"></textarea>`;
  } else {
    el.innerHTML = '';
  }
}

// ── Build command ──────────────────────────────────────────────
function buildCmd() {
  const method  = $('method').value;
  const rawUrl  = $('url').value.trim();
  const verbose = $('optVerbose').checked;
  const follow  = $('optFollow').checked;
  const insecure= $('optInsecure').checked;
  const silent  = $('optSilent').checked;
  const headOnly= $('optHead').checked;
  const compressed = $('optCompressed').checked;
  const timeout = $('optTimeout').value;

  // Build URL with params
  let url = rawUrl;
  const activeParams = params.filter(p => p.key);
  if (activeParams.length) {
    const qs = activeParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.val)}`).join('&');
    url = url + (url.includes('?') ? '&' : '?') + qs;
  }

  const parts = ['curl'];

  // Method (skip -X GET since it's default)
  if (method !== 'GET') parts.push(`-X ${method}`);

  // Flags
  if (verbose)   parts.push('-v');
  if (follow)    parts.push('-L');
  if (insecure)  parts.push('-k');
  if (silent)    parts.push('-s');
  if (headOnly)  parts.push('-I');
  if (compressed)parts.push('--compressed');
  if (timeout)   parts.push(`--max-time ${timeout}`);

  // Auth
  if (auth === 'basic') {
    const u = $('authUser')?.value || '';
    const p = $('authPass')?.value || '';
    if (u || p) parts.push(`-u ${q(`${u}:${p}`)}`);
  } else if (auth === 'bearer') {
    const t = $('authToken')?.value || '';
    if (t) parts.push(`-H ${q(`Authorization: Bearer ${t}`)}`);
  } else if (auth === 'apikey') {
    const n = $('authKeyName')?.value || 'X-API-Key';
    const v = $('authKeyVal')?.value  || '';
    if (v) parts.push(`-H ${q(`${n}: ${v}`)}`);
  }

  // Headers
  headers.filter(h => h.key).forEach(h => {
    parts.push(`-H ${q(`${h.key}: ${h.val}`)}`);
  });

  // Body
  if (bodyType === 'json') {
    const json = $('bodyJson')?.value || '';
    if (json) {
      parts.push(`-H 'Content-Type: application/json'`);
      parts.push(`-d ${q(json)}`);
    }
  } else if (bodyType === 'form') {
    const form = $('bodyForm')?.value || '';
    if (form) parts.push(`--data-urlencode ${q(form)}`);
  } else if (bodyType === 'raw') {
    const raw = $('bodyRaw')?.value || '';
    if (raw) parts.push(`-d ${q(raw)}`);
  }

  // URL (always last)
  parts.push(q(url || 'https://api.example.com'));
  return parts;
}

function syntaxHighlight(parts) {
  return parts.map((p, i) => {
    if (i === 0) return `<span class="curl-kw">${p}</span>`;
    if (p.startsWith('-'))  return `<span class="curl-flag">${escHtml(p)}</span>`;
    if (p.startsWith("'") || p.startsWith('"')) return `<span class="curl-str">${escHtml(p)}</span>`;
    if (p.startsWith('http')) return `<span class="curl-url">${escHtml(p)}</span>`;
    return escHtml(p);
  });
}

function build() {
  const parts  = buildCmd();
  const sep    = multiline ? ' \\\n  ' : ' ';
  const cont   = multiline ? `<span class="curl-cont"> \\</span>\n  ` : ' ';
  const html   = syntaxHighlight(parts).join(cont);
  $('curlOutput').innerHTML = html;
  renderBreakdown(parts);
}

function renderBreakdown(parts) {
  const method = $('method').value;
  const url    = $('url').value.trim() || '—';
  const hdrs   = headers.filter(h => h.key).map(h => `${h.key}: ${h.val}`).join(', ') || '—';
  const prms   = params.filter(p => p.key).map(p => `${p.key}=${p.val}`).join(', ') || '—';

  const rows = [
    ['method',  method],
    ['url',     url],
    ['headers', hdrs],
    ['params',  prms],
    ['auth',    auth],
    ['body',    bodyType],
  ];

  $('breakdown').innerHTML = rows.map(([k,v]) => `
    <div class="bd-row">
      <span class="bd-key">${k}</span>
      <span class="bd-val">${escHtml(v)}</span>
    </div>`).join('');
}

// ── Events ─────────────────────────────────────────────────────
$('addHeader').addEventListener('click', () => addKvRow('headersList', headers));
$('addParam').addEventListener('click',  () => addKvRow('paramsList',  params));
$('method').addEventListener('change', () => { renderBody(); build(); });
$('url').addEventListener('input', build);

document.querySelectorAll('[data-auth]').forEach(btn => {
  btn.addEventListener('click', () => {
    auth = btn.dataset.auth;
    document.querySelectorAll('[data-auth]').forEach(b => b.classList.toggle('active', b === btn));
    renderAuth(); build();
  });
});

document.querySelectorAll('[data-body]').forEach(btn => {
  btn.addEventListener('click', () => {
    bodyType = btn.dataset.body;
    document.querySelectorAll('[data-body]').forEach(b => b.classList.toggle('active', b === btn));
    renderBody(); build();
  });
});

['optVerbose','optFollow','optInsecure','optSilent','optHead','optCompressed','optTimeout'].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener('change', build);
  if (el && el.type === 'number') el.addEventListener('input', build);
});

$('btnOneliner').addEventListener('click', function() {
  multiline = false;
  this.classList.add('active');
  $('btnMultiline').classList.remove('active');
  build();
});

$('btnMultiline').addEventListener('click', function() {
  multiline = true;
  this.classList.add('active');
  $('btnOneliner').classList.remove('active');
  build();
});

$('btnCopy').addEventListener('click', function() {
  const parts = buildCmd();
  const text  = parts.join(multiline ? ' \\\n  ' : ' ');
  navigator.clipboard.writeText(text).then(() => {
    this.textContent = 'copied!';
    setTimeout(() => this.textContent = 'copy', 1500);
  });
});

$('btnReset').addEventListener('click', () => {
  $('url').value = '';
  $('method').value = 'GET';
  $('optFollow').checked = true;
  $('optCompressed').checked = true;
  $('optVerbose').checked = false;
  $('optInsecure').checked = false;
  $('optSilent').checked = false;
  $('optHead').checked = false;
  $('optTimeout').value = '';
  headers = []; params = []; auth = 'none'; bodyType = 'none';
  document.querySelectorAll('[data-auth]').forEach(b => b.classList.toggle('active', b.dataset.auth === 'none'));
  document.querySelectorAll('[data-body]').forEach(b => b.classList.toggle('active', b.dataset.body === 'none'));
  renderKv('headersList', headers);
  renderKv('paramsList',  params);
  renderAuth(); renderBody(); build();
});

// ── Init ───────────────────────────────────────────────────────
renderAuth();
renderBody();
build();
