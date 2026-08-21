'use strict';

// ── Parse .env ────────────────────────────────────────────────────────────────
function parseEnv(text) {
  const result = new Map(); // key → { value, lineNum, comment }
  const lines  = text.split('\n');
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const eq = line.indexOf('=');
    if (eq === -1) return;
    const key = line.slice(0, eq).trim();
    let val    = line.slice(eq + 1).trim();
    // Strip inline comments (but not inside quotes)
    const comment = '';
    // Strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) result.set(key, { value: val, line: i + 1 });
  });
  return result;
}

// ── Diff ──────────────────────────────────────────────────────────────────────
function diff(leftMap, rightMap) {
  const allKeys = new Set([...leftMap.keys(), ...rightMap.keys()]);
  const results = [];

  allKeys.forEach(key => {
    const inLeft  = leftMap.has(key);
    const inRight = rightMap.has(key);
    const lVal    = inLeft  ? leftMap.get(key).value  : null;
    const rVal    = inRight ? rightMap.get(key).value : null;

    if (inLeft && inRight) {
      if (lVal === rVal) {
        results.push({ key, status: 'same', lVal, rVal });
      } else {
        results.push({ key, status: 'changed', lVal, rVal });
      }
    } else if (inLeft) {
      results.push({ key, status: 'removed', lVal, rVal: null });
    } else {
      results.push({ key, status: 'added', lVal: null, rVal });
    }
  });

  // Sort: changed first, then added, then removed, then same
  const order = { changed: 0, added: 1, removed: 2, same: 3 };
  results.sort((a, b) => order[a.status] - order[b.status] || a.key.localeCompare(b.key));
  return results;
}

// ── Mask values ───────────────────────────────────────────────────────────────
let maskValues = true;

function mask(val) {
  if (val === null) return '';
  if (!maskValues) return escHtml(val) || '<span class="val-empty">(empty)</span>';
  if (!val) return '<span class="val-empty">(empty)</span>';
  // Show first 2 and last 2 chars if long enough, else all asterisks
  if (val.length <= 4) return '••••';
  return escHtml(val.slice(0, 2)) + '•'.repeat(Math.min(val.length - 4, 12)) + escHtml(val.slice(-2));
}

// ── Render ────────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderDiff() {
  const leftText  = document.getElementById('leftInput').value;
  const rightText = document.getElementById('rightInput').value;
  const out       = document.getElementById('diffOutput');
  const status    = document.getElementById('statusText');

  if (!leftText.trim() && !rightText.trim()) {
    out.innerHTML = emptyState();
    status.textContent = 'Paste .env files in both panels to compare.';
    updateSummary(null);
    return;
  }

  const leftMap  = parseEnv(leftText);
  const rightMap = parseEnv(rightText);
  const results  = diff(leftMap, rightMap);

  const showSame = document.getElementById('showSame').checked;
  const visible  = showSame ? results : results.filter(r => r.status !== 'same');

  if (visible.length === 0) {
    out.innerHTML = `<div class="diff-empty">✓ Files are identical — ${results.length} key${results.length !== 1 ? 's' : ''} match</div>`;
  } else {
    out.innerHTML = `<table class="diff-table">
      <thead><tr>
        <th class="col-key">key</th>
        <th class="col-val">left</th>
        <th class="col-val">right</th>
        <th class="col-status">status</th>
      </tr></thead>
      <tbody>${visible.map(renderRow).join('')}</tbody>
    </table>`;
  }

  const changed = results.filter(r => r.status === 'changed').length;
  const added   = results.filter(r => r.status === 'added').length;
  const removed = results.filter(r => r.status === 'removed').length;
  const same    = results.filter(r => r.status === 'same').length;

  updateSummary({ changed, added, removed, same });

  const issues = changed + added + removed;
  status.textContent = issues === 0
    ? `✓ ${same} key${same !== 1 ? 's' : ''} — files are identical`
    : `${changed} changed · ${added} added · ${removed} removed · ${same} same`;
}

function renderRow(r) {
  const cls = `row-${r.status}`;
  const badge = {
    changed: `<span class="badge-changed">changed</span>`,
    added:   `<span class="badge-added">added</span>`,
    removed: `<span class="badge-removed">removed</span>`,
    same:    `<span class="badge-same">same</span>`,
  }[r.status];

  const lCell = r.lVal !== null
    ? `<span class="val-pill ${r.status === 'changed' ? 'val-old' : ''}">${mask(r.lVal)}</span>`
    : `<span class="val-absent">—</span>`;

  const rCell = r.rVal !== null
    ? `<span class="val-pill ${r.status === 'changed' ? 'val-new' : ''}">${mask(r.rVal)}</span>`
    : `<span class="val-absent">—</span>`;

  return `<tr class="${cls}">
    <td class="col-key"><span class="key-name">${escHtml(r.key)}</span></td>
    <td class="col-val">${lCell}</td>
    <td class="col-val">${rCell}</td>
    <td class="col-status">${badge}</td>
  </tr>`;
}

function updateSummary(counts) {
  const el = document.getElementById('summary');
  if (!counts) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <span class="sum-pill sum-changed">${counts.changed} changed</span>
    <span class="sum-pill sum-added">${counts.added} added</span>
    <span class="sum-pill sum-removed">${counts.removed} removed</span>
    <span class="sum-pill sum-same">${counts.same} same</span>
  `;
}

function emptyState() {
  return `<div class="empty-state"><div class="empty-icon" style="opacity:.2;font-size:1.1rem">.env</div><div>Paste .env files in both panels to compare</div></div>`;
}

function toggleMask() {
  maskValues = !maskValues;
  const btn = document.getElementById('maskBtn');
  btn.textContent = maskValues ? 'show values' : 'hide values';
  btn.classList.toggle('active', !maskValues);
  renderDiff();
}

// ── Samples ───────────────────────────────────────────────────────────────────
const SAMPLE_LEFT = `# App config — staging
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgres://user:pass@staging-db:5432/myapp
REDIS_URL=redis://staging-redis:6379
API_KEY=sk-staging-abc123xyz
SECRET_KEY=supersecretstaging
FEATURE_FLAG_DARK_MODE=false
LOG_LEVEL=debug
MAX_UPLOAD_MB=10
APP_VERSION=1.4.2`;

const SAMPLE_RIGHT = `# App config — production
NODE_ENV=production
PORT=8080
DATABASE_URL=postgres://user:pass@prod-db.rds.amazonaws.com:5432/myapp
REDIS_URL=redis://prod-redis-cluster:6379
API_KEY=sk-prod-xyz789abc
SECRET_KEY=supersecretproduction
FEATURE_FLAG_DARK_MODE=true
LOG_LEVEL=warn
MAX_UPLOAD_MB=50
SENTRY_DSN=https://abc@sentry.io/123
NEW_RELIC_LICENSE_KEY=nr-license-key-here`;

function loadSample() {
  document.getElementById('leftInput').value  = SAMPLE_LEFT;
  document.getElementById('rightInput').value = SAMPLE_RIGHT;
  renderDiff();
}

function clearAll() {
  document.getElementById('leftInput').value  = '';
  document.getElementById('rightInput').value = '';
  renderDiff();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('leftInput').addEventListener('input', renderDiff);
  document.getElementById('rightInput').addEventListener('input', renderDiff);
  document.getElementById('showSame').addEventListener('change', renderDiff);
});
