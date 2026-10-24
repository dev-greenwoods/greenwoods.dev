'use strict';

// ── Directive definitions ─────────────────────────────────────────────────────
const DIRECTIVES = [
  {
    key: 'default-src',
    label: "default-src",
    desc: "Fallback for all fetch directives not explicitly set.",
    sources: true,
  },
  {
    key: 'script-src',
    label: "script-src",
    desc: "Valid sources for JavaScript. Overrides default-src for scripts.",
    sources: true,
    keywords: ["'unsafe-inline'", "'unsafe-eval'", "'strict-dynamic'", "'unsafe-hashes'"],
  },
  {
    key: 'style-src',
    label: "style-src",
    desc: "Valid sources for stylesheets.",
    sources: true,
    keywords: ["'unsafe-inline'"],
  },
  {
    key: 'img-src',
    label: "img-src",
    desc: "Valid sources for images and favicons.",
    sources: true,
  },
  {
    key: 'font-src',
    label: "font-src",
    desc: "Valid sources for fonts loaded via @font-face.",
    sources: true,
  },
  {
    key: 'connect-src',
    label: "connect-src",
    desc: "Valid endpoints for fetch, XHR, WebSocket, and EventSource.",
    sources: true,
  },
  {
    key: 'media-src',
    label: "media-src",
    desc: "Valid sources for <audio> and <video> elements.",
    sources: true,
  },
  {
    key: 'object-src',
    label: "object-src",
    desc: "Valid sources for <object> and <embed>. Should be 'none' in modern apps.",
    sources: true,
  },
  {
    key: 'frame-src',
    label: "frame-src",
    desc: "Valid sources for <frame> and <iframe>.",
    sources: true,
  },
  {
    key: 'worker-src',
    label: "worker-src",
    desc: "Valid sources for Worker, SharedWorker, and ServiceWorker scripts.",
    sources: true,
  },
  {
    key: 'manifest-src',
    label: "manifest-src",
    desc: "Valid sources for Web App Manifests.",
    sources: true,
  },
  {
    key: 'base-uri',
    label: "base-uri",
    desc: "Restricts the URLs allowed in a <base> element.",
    sources: true,
  },
  {
    key: 'form-action',
    label: "form-action",
    desc: "Restricts the URLs that can be used as the target of form submissions.",
    sources: true,
  },
  {
    key: 'frame-ancestors',
    label: "frame-ancestors",
    desc: "Specifies parents that can embed this page in a frame. Replaces X-Frame-Options.",
    sources: true,
    noKeywords: true,
  },
  {
    key: 'upgrade-insecure-requests',
    label: "upgrade-insecure-requests",
    desc: "Instructs browsers to rewrite HTTP URLs to HTTPS before fetching.",
    toggle: true,
  },
  {
    key: 'block-all-mixed-content',
    label: "block-all-mixed-content",
    desc: "Blocks loading any assets over HTTP when the page is served over HTTPS.",
    toggle: true,
  },
  {
    key: 'report-uri',
    label: "report-uri",
    desc: "URI to which the browser sends violation reports (deprecated — use report-to).",
    uri: true,
  },
  {
    key: 'report-to',
    label: "report-to",
    desc: "Group name defined in the Report-To header for violation reporting.",
    text: true,
  },
];

const SOURCE_KEYWORDS = [
  { val: "'self'",        label: "'self'",        desc: "Same origin" },
  { val: "'none'",        label: "'none'",        desc: "Block everything" },
  { val: "'unsafe-inline'",label:"'unsafe-inline'",desc:"Inline scripts/styles (avoid if possible)" },
  { val: "'unsafe-eval'", label: "'unsafe-eval'", desc: "eval() and similar (avoid if possible)" },
  { val: "'strict-dynamic'",label:"'strict-dynamic'",desc:"Propagates to dynamically-added scripts" },
  { val: "'wasm-unsafe-eval'",label:"'wasm-unsafe-eval'",desc:"Allow WebAssembly execution" },
  { val: 'https:',        label: 'https:',        desc: "Any HTTPS source" },
  { val: 'data:',         label: 'data:',         desc: "data: URI scheme" },
  { val: 'blob:',         label: 'blob:',         desc: "blob: URI scheme" },
];

// ── State ─────────────────────────────────────────────────────────────────────
const state = {};  // key → { enabled, values: Set(), custom: string }

DIRECTIVES.forEach(d => {
  state[d.key] = { enabled: false, values: new Set(), custom: '' };
});

// Sensible defaults for a new site
function applyTemplate(tpl) {
  // Reset
  DIRECTIVES.forEach(d => { state[d.key] = { enabled: false, values: new Set(), custom: '' }; });

  if (tpl === 'strict') {
    set('default-src',  true, ["'none'"]);
    set('script-src',   true, ["'self'"]);
    set('style-src',    true, ["'self'"]);
    set('img-src',      true, ["'self'", 'data:']);
    set('font-src',     true, ["'self'"]);
    set('connect-src',  true, ["'self'"]);
    set('object-src',   true, ["'none'"]);
    set('base-uri',     true, ["'self'"]);
    set('form-action',  true, ["'self'"]);
    set('frame-ancestors', true, ["'none'"]);
    state['upgrade-insecure-requests'].enabled = true;
  } else if (tpl === 'moderate') {
    set('default-src',  true, ["'self'"]);
    set('img-src',      true, ["'self'", 'data:', 'https:']);
    set('font-src',     true, ["'self'", 'https://fonts.gstatic.com']);
    set('style-src',    true, ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']);
    set('script-src',   true, ["'self'"]);
    set('connect-src',  true, ["'self'"]);
    set('object-src',   true, ["'none'"]);
    set('frame-ancestors', true, ["'self'"]);
    state['upgrade-insecure-requests'].enabled = true;
  } else if (tpl === 'report') {
    set('default-src',  true, ["'self'"]);
    state['report-uri'].enabled = true;
    state['report-uri'].custom = '/csp-report';
  }

  renderAll();
  generateHeader();
}

function set(key, enabled, vals) {
  state[key].enabled = enabled;
  state[key].values  = new Set(vals || []);
}

// ── Render UI ─────────────────────────────────────────────────────────────────
function renderAll() {
  const container = document.getElementById('directives');
  container.innerHTML = DIRECTIVES.map(renderDirective).join('');
  // Attach events
  container.querySelectorAll('[data-key]').forEach(el => {
    el.addEventListener('change', () => { syncFromDOM(); generateHeader(); });
    el.addEventListener('input',  () => { syncFromDOM(); generateHeader(); });
    el.addEventListener('click',  () => { syncFromDOM(); generateHeader(); });
  });
}

function renderDirective(d) {
  const s = state[d.key];
  const enabled = s.enabled;

  let body = '';

  if (d.toggle) {
    body = ``;  // just the enable toggle is enough
  } else if (d.sources) {
    const chips = SOURCE_KEYWORDS.map(kw => {
      const on = s.values.has(kw.val);
      return `<button class="kw-chip ${on ? 'on' : ''}" data-key="${d.key}" data-val="${kw.val}" title="${kw.desc}" onclick="toggleChip(this)">${kw.val}</button>`;
    }).join('');

    body = `
      <div class="kw-row">${chips}</div>
      <input type="text" class="custom-src" data-key="${d.key}" placeholder="custom: example.com *.cdn.com …" value="${escHtml(s.custom)}" />
    `;
  } else if (d.uri || d.text) {
    body = `<input type="text" class="custom-src" data-key="${d.key}" placeholder="${d.uri ? 'https://example.com/csp-report' : 'reporting-endpoint-group'}" value="${escHtml(s.custom)}" />`;
  }

  return `
    <div class="directive-card ${enabled ? 'enabled' : ''}">
      <div class="dir-header">
        <label class="dir-toggle">
          <input type="checkbox" data-key="${d.key}" data-type="enable" ${enabled ? 'checked' : ''} />
          <span class="dir-name">${d.key}</span>
        </label>
        <span class="dir-desc">${d.desc}</span>
      </div>
      ${enabled && body ? `<div class="dir-body">${body}</div>` : ''}
    </div>`;
}

function toggleChip(btn) {
  btn.classList.toggle('on');
  syncFromDOM();
  generateHeader();
}

// ── Sync DOM → state ──────────────────────────────────────────────────────────
function syncFromDOM() {
  DIRECTIVES.forEach(d => {
    const enableEl = document.querySelector(`input[data-key="${d.key}"][data-type="enable"]`);
    if (enableEl) {
      const wasEnabled = state[d.key].enabled;
      state[d.key].enabled = enableEl.checked;
      // If just enabled, re-render to show body
      if (!wasEnabled && enableEl.checked) {
        renderAll(); generateHeader(); return;
      }
      if (wasEnabled && !enableEl.checked) {
        renderAll(); generateHeader(); return;
      }
    }

    // Keyword chips
    const chips = document.querySelectorAll(`.kw-chip[data-key="${d.key}"].on`);
    state[d.key].values = new Set([...chips].map(c => c.dataset.val));

    // Custom input
    const customEl = document.querySelector(`.custom-src[data-key="${d.key}"]`);
    if (customEl) state[d.key].custom = customEl.value.trim();
  });
}

// ── Generate header ───────────────────────────────────────────────────────────
function generateHeader() {
  const parts = [];

  DIRECTIVES.forEach(d => {
    const s = state[d.key];
    if (!s.enabled) return;

    if (d.toggle) {
      parts.push(d.key);
      return;
    }

    if (d.uri || d.text) {
      if (s.custom) parts.push(`${d.key} ${s.custom}`);
      return;
    }

    const vals = [...s.values];
    if (s.custom) {
      s.custom.split(/\s+/).filter(Boolean).forEach(v => { if (!vals.includes(v)) vals.push(v); });
    }

    if (vals.length === 0) return;
    parts.push(`${d.key} ${vals.join(' ')}`);
  });

  const header = parts.join('; ');

  // Render output
  const outEl   = document.getElementById('headerOutput');
  const metaEl  = document.getElementById('metaOutput');
  const warnEl  = document.getElementById('warnings');
  const status  = document.getElementById('statusText');

  if (!header) {
    outEl.innerHTML  = `<div class="empty-state"><div class="empty-icon" style="opacity:.2;font-size:1.6rem">CSP</div><div>Enable directives to build the header</div></div>`;
    metaEl.innerHTML = '';
    warnEl.innerHTML = '';
    status.textContent = 'Enable directives on the left to build your policy.';
    return;
  }

  outEl.innerHTML = `<div class="header-name">Content-Security-Policy</div><div class="header-val">${highlight(header)}</div>`;
  metaEl.innerHTML = `<div class="meta-tag">&lt;meta http-equiv="Content-Security-Policy" content="${escHtml(header)}"&gt;</div>`;

  // Warnings
  const warns = analyzePolicy(parts);
  warnEl.innerHTML = warns.map(w =>
    `<div class="warn-row warn-${w.level}"><span class="warn-icon">${w.level === 'danger' ? '✕' : '!'}</span><span>${w.msg}</span></div>`
  ).join('');

  status.textContent = `${parts.length} directive${parts.length !== 1 ? 's' : ''} · ${header.length} characters`;
}

function analyzePolicy(parts) {
  const warns = [];
  const hasDir = key => parts.some(p => p.startsWith(key));
  const hasVal = (key, val) => {
    const p = parts.find(p => p.startsWith(key));
    return p && p.includes(val);
  };

  if (hasVal('script-src', "'unsafe-inline'"))
    warns.push({ level:'danger', msg:"script-src: 'unsafe-inline' allows arbitrary inline scripts — XSS risk." });
  if (hasVal('script-src', "'unsafe-eval'"))
    warns.push({ level:'danger', msg:"script-src: 'unsafe-eval' allows eval() — code injection risk." });
  if (hasVal('style-src', "'unsafe-inline'"))
    warns.push({ level:'warn', msg:"style-src: 'unsafe-inline' may allow CSS-based data exfiltration." });
  if (!hasDir('object-src') && !hasDir('default-src'))
    warns.push({ level:'warn', msg:"object-src not set — plugins (Flash etc.) are unrestricted." });
  if (hasVal('object-src', 'https:') || (!hasDir('object-src') && hasVal('default-src', 'https:')))
    warns.push({ level:'warn', msg:"object-src https: is too permissive — prefer 'none'." });
  if (!hasDir('base-uri'))
    warns.push({ level:'warn', msg:"base-uri not set — attackers could inject a <base> tag." });
  if (!hasDir('frame-ancestors'))
    warns.push({ level:'warn', msg:"frame-ancestors not set — page can be embedded in iframes (clickjacking risk)." });
  if (hasVal('default-src', "'unsafe-inline'"))
    warns.push({ level:'danger', msg:"default-src: 'unsafe-inline' is very permissive — set explicit per-resource directives instead." });

  return warns;
}

function highlight(header) {
  // Build highlighted HTML from the RAW header, escaping each piece as it is
  // wrapped. The previous version ran its ';' replacement over the escaped
  // string, which also rewrote the ';' inside the &#x27; quote entities and
  // corrupted the display (e.g. default-src ';self';) even though the copied
  // header was correct.
  return header.split('; ').map(part => {
    const sp = part.indexOf(' ');
    const dir = sp === -1 ? part : part.slice(0, sp);
    const rest = sp === -1 ? '' : part.slice(sp + 1);
    const restHtml = rest
      ? ' ' + rest.split(' ').map(tok =>
          /^'[^']*'$/.test(tok) ? `<span class="csp-kw">${escHtml(tok)}</span>` : escHtml(tok)
        ).join(' ')
      : '';
    return `<span class="csp-dir">${escHtml(dir)}</span>${restHtml}`;
  }).join('<span class="csp-sep">;</span> ');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#x27;');
}

function copyHeader() {
  const parts = [];
  DIRECTIVES.forEach(d => {
    const s = state[d.key];
    if (!s.enabled) return;
    if (d.toggle) { parts.push(d.key); return; }
    if (d.uri || d.text) { if (s.custom) parts.push(`${d.key} ${s.custom}`); return; }
    const vals = [...s.values];
    if (s.custom) s.custom.split(/\s+/).filter(Boolean).forEach(v => { if (!vals.includes(v)) vals.push(v); });
    if (vals.length) parts.push(`${d.key} ${vals.join(' ')}`);
  });
  const header = parts.join('; ');
  if (!header) return;
  navigator.clipboard.writeText(header).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'copied!'; btn.classList.add('active');
    setTimeout(() => { btn.textContent = 'copy header'; btn.classList.remove('active'); }, 1500);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  generateHeader();
});
