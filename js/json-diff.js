'use strict';

// ── Deep diff ─────────────────────────────────────────────────────────────────
// Returns a flat list of changes: { path, type, left, right }
function deepDiff(left, right, path = '') {
  const changes = [];
  const type = (v) => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;

  const lType = type(left);
  const rType = type(right);

  if (lType !== rType) {
    changes.push({ path: path || '(root)', type: 'changed', left, right });
    return changes;
  }

  if (lType === 'object') {
    const lKeys = new Set(Object.keys(left));
    const rKeys = new Set(Object.keys(right));
    const all   = new Set([...lKeys, ...rKeys]);

    all.forEach(k => {
      const p = path ? `${path}.${k}` : k;
      if (!lKeys.has(k)) {
        changes.push({ path: p, type: 'added',   left: undefined, right: right[k] });
      } else if (!rKeys.has(k)) {
        changes.push({ path: p, type: 'removed', left: left[k], right: undefined });
      } else {
        changes.push(...deepDiff(left[k], right[k], p));
      }
    });
    return changes;
  }

  if (lType === 'array') {
    const len = Math.max(left.length, right.length);
    for (let i = 0; i < len; i++) {
      const p = `${path || ''}[${i}]`;
      if (i >= left.length)  { changes.push({ path: p, type: 'added',   left: undefined, right: right[i] }); }
      else if (i >= right.length) { changes.push({ path: p, type: 'removed', left: left[i], right: undefined }); }
      else { changes.push(...deepDiff(left[i], right[i], p)); }
    }
    return changes;
  }

  if (left !== right) {
    changes.push({ path: path || '(root)', type: 'changed', left, right });
  }
  return changes;
}

// ── Render ────────────────────────────────────────────────────────────────────
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function valueStr(v) {
  if (v === undefined) return '';
  if (v === null) return '<span class="jv-null">null</span>';
  if (typeof v === 'boolean') return `<span class="jv-bool">${v}</span>`;
  if (typeof v === 'number')  return `<span class="jv-num">${v}</span>`;
  if (typeof v === 'string')  return `<span class="jv-str">"${escHtml(v)}"</span>`;
  if (typeof v === 'object')  return `<span class="jv-obj">${escHtml(JSON.stringify(v))}</span>`;
  return escHtml(String(v));
}

function renderChanges(changes) {
  if (!changes.length) return `<div class="diff-equal">✓ JSON objects are identical</div>`;

  return `<table class="diff-table">
    <thead><tr>
      <th>path</th>
      <th>left</th>
      <th>right</th>
      <th>type</th>
    </tr></thead>
    <tbody>${changes.map(c => `
      <tr class="row-${c.type}">
        <td class="col-path"><span class="path-str">${escHtml(c.path)}</span></td>
        <td class="col-val">${valueStr(c.left)}</td>
        <td class="col-val">${valueStr(c.right)}</td>
        <td class="col-type"><span class="badge-${c.type}">${c.type}</span></td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

// ── Annotated view ────────────────────────────────────────────────────────────
// Build a side-by-side formatted JSON with line highlights
function fmtJson(obj) {
  return JSON.stringify(obj, null, 2);
}

// ── Run ───────────────────────────────────────────────────────────────────────
function runDiff() {
  const lRaw  = document.getElementById('leftInput').value.trim();
  const rRaw  = document.getElementById('rightInput').value.trim();
  const out   = document.getElementById('diffOutput');
  const lErr  = document.getElementById('leftError');
  const rErr  = document.getElementById('rightError');
  const sum   = document.getElementById('summary');
  const status= document.getElementById('statusText');

  lErr.classList.add('hidden');
  rErr.classList.add('hidden');

  if (!lRaw && !rRaw) {
    out.innerHTML = emptyState();
    sum.innerHTML = '';
    status.textContent = 'Paste JSON in both panels to compare.';
    return;
  }

  let left, right;
  let hasErr = false;

  try { left  = JSON.parse(lRaw || 'null'); } catch(e) { lErr.textContent = e.message; lErr.classList.remove('hidden'); hasErr = true; }
  try { right = JSON.parse(rRaw || 'null'); } catch(e) { rErr.textContent = e.message; rErr.classList.remove('hidden'); hasErr = true; }
  if (hasErr) { out.innerHTML = emptyState(); return; }

  const changes = deepDiff(left, right);
  const changed = changes.filter(c => c.type === 'changed').length;
  const added   = changes.filter(c => c.type === 'added').length;
  const removed = changes.filter(c => c.type === 'removed').length;

  out.innerHTML = renderChanges(changes);
  sum.innerHTML = changes.length
    ? `<span class="sum-pill sum-changed">${changed} changed</span>
       <span class="sum-pill sum-added">${added} added</span>
       <span class="sum-pill sum-removed">${removed} removed</span>`
    : `<span class="sum-pill sum-same">✓ identical</span>`;

  status.textContent = changes.length
    ? `${changes.length} difference${changes.length !== 1 ? 's' : ''} — ${changed} changed · ${added} added · ${removed} removed`
    : 'JSON objects are identical';
}

function emptyState() {
  return `<div class="empty-state"><div class="empty-icon" style="opacity:.2;font-size:1.1rem;font-family:'JetBrains Mono',monospace">{}</div><div>Paste JSON in both panels to compare</div></div>`;
}

// ── Samples ───────────────────────────────────────────────────────────────────
const LEFT_SAMPLE = `{
  "name": "greenwoods-api",
  "version": "1.4.2",
  "port": 3000,
  "debug": true,
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "mydb"
  },
  "features": ["search", "export"],
  "deprecated": "will be removed"
}`;

const RIGHT_SAMPLE = `{
  "name": "greenwoods-api",
  "version": "2.0.0",
  "port": 8080,
  "debug": false,
  "database": {
    "host": "prod-db.rds.amazonaws.com",
    "port": 5432,
    "name": "mydb",
    "ssl": true
  },
  "features": ["search", "export", "import"],
  "rateLimit": 100
}`;

function loadSample() {
  document.getElementById('leftInput').value  = LEFT_SAMPLE;
  document.getElementById('rightInput').value = RIGHT_SAMPLE;
  runDiff();
}

function clearAll() {
  document.getElementById('leftInput').value  = '';
  document.getElementById('rightInput').value = '';
  document.getElementById('leftError').classList.add('hidden');
  document.getElementById('rightError').classList.add('hidden');
  runDiff();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('leftInput').addEventListener('input',  runDiff);
  document.getElementById('rightInput').addEventListener('input', runDiff);
});
