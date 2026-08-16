'use strict';

const opts = {
  useInterface: true,
  addExport: true,
  optionalFields: false,
};

let currentOutput = '';

const SAMPLE = `{
  "id": 1,
  "username": "alice_dev",
  "email": "alice@example.com",
  "active": true,
  "score": 98.5,
  "role": null,
  "tags": ["admin", "user"],
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "zip": "10001",
    "geo": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  },
  "posts": [
    {
      "id": 101,
      "title": "Hello World",
      "published": true,
      "views": 1234
    },
    {
      "id": 102,
      "title": "TypeScript Tips",
      "published": false,
      "views": 0
    }
  ]
}`;

// ── Utilities ─────────────────────────────────────────────────────────────────

function toPascalCase(str) {
  if (!str) return 'Unknown';
  return str
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Type inference ────────────────────────────────────────────────────────────

let interfaceList = [];  // ordered array of { name, fields }
let usedNames;

function uniqueName(base) {
  if (!usedNames.has(base)) { usedNames.add(base); return base; }
  let i = 2;
  while (usedNames.has(base + i)) i++;
  usedNames.add(base + i);
  return base + i;
}

function mergeArrayObjects(arr) {
  // Merge all objects in an array; track which keys are missing from some items
  const keyCounts = new Map();
  const firstValues = new Map();
  arr.forEach(obj => {
    Object.entries(obj).forEach(([k, v]) => {
      keyCounts.set(k, (keyCounts.get(k) || 0) + 1);
      if (!firstValues.has(k)) firstValues.set(k, v);
    });
  });
  const optionalKeys = new Set();
  keyCounts.forEach((count, k) => { if (count < arr.length) optionalKeys.add(k); });
  const merged = {};
  firstValues.forEach((v, k) => { merged[k] = v; });
  return { obj: merged, optionalKeys };
}

function inferType(value, fieldName) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'boolean') return 'boolean';
  if (t === 'number')  return 'number';
  if (t === 'string')  return 'string';

  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const allObjects = value.every(v => v !== null && typeof v === 'object' && !Array.isArray(v));
    if (allObjects) {
      const { obj, optionalKeys } = mergeArrayObjects(value);
      const itemName = uniqueName(toPascalCase(fieldName) + 'Item');
      buildInterface(obj, itemName, optionalKeys);
      return `${itemName}[]`;
    }
    // Mixed / primitive array
    const types = [...new Set(value.map(v => inferType(v, fieldName + 'Item')))];
    const inner = types.length === 1 ? types[0] : `(${types.join(' | ')})`;
    return `${inner}[]`;
  }

  if (t === 'object') {
    const name = uniqueName(toPascalCase(fieldName));
    buildInterface(value, name, new Set());
    return name;
  }

  return 'unknown';
}

// Post-order: nested interfaces are pushed before their parent
function buildInterface(obj, name, extraOptional = new Set()) {
  const fields = Object.entries(obj).map(([key, value]) => {
    const type = inferType(value, key);
    const isOpt = opts.optionalFields || value === null || extraOptional.has(key);
    const opt = isOpt ? '?' : '';
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
    return `  ${safeKey}${opt}: ${type};`;
  });
  interfaceList.push({ name, fields });
}

// ── Syntax highlighting ───────────────────────────────────────────────────────

function highlight(html) {
  // Order matters: primitives before PascalCase, keywords first
  return html
    .replace(/\b(export|interface|type)\b/g, '<span class="hl-kw">$1</span>')
    .replace(/\b(string|number|boolean|null|undefined|unknown|never|any|void)\b/g, '<span class="hl-prim">$1</span>')
    .replace(/\b([A-Z][a-zA-Z0-9]+)\b/g, '<span class="hl-iface">$1</span>');
}

// ── Main convert ──────────────────────────────────────────────────────────────

function convert() {
  const raw    = document.getElementById('jsonInput').value.trim();
  const outEl  = document.getElementById('tsOutput');
  const errEl  = document.getElementById('inputError');
  const status = document.getElementById('statusText');

  errEl.classList.add('hidden');
  currentOutput = '';

  if (!raw) {
    outEl.innerHTML = emptyState();
    status.textContent = 'Paste JSON to generate TypeScript types.';
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    errEl.textContent = `JSON parse error: ${e.message}`;
    errEl.classList.remove('hidden');
    outEl.innerHTML = `<div class="empty-state"><div class="empty-icon ts-icon">TS</div><div>Fix the error above</div></div>`;
    status.textContent = 'Invalid JSON.';
    return;
  }

  // Reset state
  interfaceList = [];
  usedNames = new Set();

  const rootName = document.getElementById('rootName').value.trim() || 'Root';
  const exp = opts.addExport ? 'export ' : '';
  const kw  = opts.useInterface ? 'interface' : 'type';
  let extraLine = '';

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      extraLine = `${exp}type ${rootName} = unknown[];\n`;
    } else if (parsed.every(v => v !== null && typeof v === 'object' && !Array.isArray(v))) {
      const { obj, optionalKeys } = mergeArrayObjects(parsed);
      const itemName = uniqueName(rootName + 'Item');
      buildInterface(obj, itemName, optionalKeys);
      extraLine = `${exp}type ${rootName} = ${itemName}[];\n`;
    } else {
      const types = [...new Set(parsed.map(v => inferType(v, 'item')))];
      extraLine = `${exp}type ${rootName} = ${types.join(' | ')}[];\n`;
    }
  } else if (typeof parsed === 'object' && parsed !== null) {
    buildInterface(parsed, uniqueName(rootName), new Set());
  } else {
    extraLine = `${exp}type ${rootName} = ${typeof parsed};\n`;
  }

  // Render interfaces
  const parts = interfaceList.map(({ name, fields }) => {
    if (opts.useInterface) {
      return `${exp}interface ${name} {\n${fields.join('\n')}\n}`;
    } else {
      return `${exp}type ${name} = {\n${fields.join('\n')}\n};`;
    }
  });

  if (extraLine) parts.push(extraLine.trim());

  currentOutput = parts.join('\n\n');

  outEl.innerHTML = `<pre>${highlight(escapeHtml(currentOutput))}</pre>`;

  const fieldCount = interfaceList.reduce((s, i) => s + i.fields.length, 0);
  status.textContent = `${interfaceList.length} interface${interfaceList.length !== 1 ? 's' : ''} · ${fieldCount} field${fieldCount !== 1 ? 's' : ''} generated`;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function emptyState() {
  return `<div class="empty-state"><div class="empty-icon ts-icon">TS</div><div>Output will appear here</div></div>`;
}

function loadSample() {
  document.getElementById('jsonInput').value = SAMPLE;
  convert();
}

function clearAll() {
  document.getElementById('jsonInput').value = '';
  currentOutput = '';
  document.getElementById('inputError').classList.add('hidden');
  document.getElementById('tsOutput').innerHTML = emptyState();
  document.getElementById('statusText').textContent = 'Paste JSON to generate TypeScript types.';
}

function copyOutput() {
  if (!currentOutput) return;
  const btn = document.getElementById('copyBtn');
  navigator.clipboard.writeText(currentOutput).then(() => {
    btn.textContent = 'copied!';
    btn.classList.add('active');
    setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('active'); }, 1500);
  });
}

function toggleOption(key) {
  opts[key] = !opts[key];
  const btn = document.getElementById('opt_' + key);
  if (btn) btn.classList.toggle('active', opts[key]);
  convert();
}

document.addEventListener('DOMContentLoaded', () => {
  Object.entries(opts).forEach(([k, v]) => {
    const btn = document.getElementById('opt_' + k);
    if (btn) btn.classList.toggle('active', v);
  });
});
