'use strict';

let countdownTimer = null;

// ── Base64url decode ──────────────────────────────────────────────────────────
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  try {
    return JSON.parse(atob(str));
  } catch {
    return atob(str);
  }
}

// ── Parse JWT ─────────────────────────────────────────────────────────────────
function parseJwt(token) {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('JWT must have exactly 3 parts separated by dots');
  const header    = b64urlDecode(parts[0]);
  const payload   = b64urlDecode(parts[1]);
  const signature = parts[2];
  return { header, payload, signature, raw: parts };
}

// ── Time helpers ──────────────────────────────────────────────────────────────
function fmtTime(unix) {
  if (!unix) return null;
  const d = new Date(unix * 1000);
  return d.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

function timeAgo(unix) {
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 0) return `in ${fmtDuration(-diff)}`;
  return `${fmtDuration(diff)} ago`;
}

function fmtDuration(secs) {
  if (secs < 60)   return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs/60)}m ${secs%60}s`;
  if (secs < 86400)return `${Math.floor(secs/3600)}h ${Math.floor((secs%3600)/60)}m`;
  return `${Math.floor(secs/86400)}d ${Math.floor((secs%86400)/3600)}h`;
}

function expiryStatus(exp) {
  if (!exp) return { cls: 'exp-none', label: 'no expiry', expired: false };
  const now = Math.floor(Date.now() / 1000);
  const diff = exp - now;
  if (diff <= 0) return { cls: 'exp-expired', label: 'EXPIRED', expired: true };
  if (diff < 300)  return { cls: 'exp-critical', label: 'expires soon', expired: false };
  if (diff < 3600) return { cls: 'exp-warn', label: 'expires soon', expired: false };
  return { cls: 'exp-ok', label: 'valid', expired: false };
}

// ── Render ────────────────────────────────────────────────────────────────────
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderJson(obj) {
  const json = JSON.stringify(obj, null, 2);
  return json
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"([^"]+)":/g, '<span class="jk">"$1"</span>:')
    .replace(/: "(.*?)"/g, ': <span class="jstr">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="jnum">$1</span>')
    .replace(/: (true|false)/g, ': <span class="jbool">$1</span>')
    .replace(/: (null)/g, ': <span class="jnull">$1</span>');
}

function timeRow(label, unix) {
  if (!unix) return '';
  return `<div class="time-row">
    <span class="time-label">${label}</span>
    <span class="time-val">${fmtTime(unix)}</span>
    <span class="time-rel">${timeAgo(unix)}</span>
  </div>`;
}

function renderCountdown(exp) {
  if (!exp) return '';
  const now  = Math.floor(Date.now() / 1000);
  const diff = exp - now;
  if (diff <= 0) return `<div class="countdown expired">Token has expired</div>`;

  const total = diff;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const label = h > 0
    ? `${h}h ${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`
    : `${m}m ${s.toString().padStart(2,'0')}s`;

  return `<div class="countdown" id="countdown">expires in <strong>${label}</strong></div>`;
}

function startCountdown(exp) {
  if (countdownTimer) clearInterval(countdownTimer);
  if (!exp) return;
  const el = () => document.getElementById('countdown');
  countdownTimer = setInterval(() => {
    const node = el();
    if (!node) { clearInterval(countdownTimer); return; }
    node.outerHTML = renderCountdown(exp);
  }, 1000);
}

// ── Main ──────────────────────────────────────────────────────────────────────
function inspect() {
  const raw    = document.getElementById('tokenInput').value.trim();
  const out    = document.getElementById('output');
  const errEl  = document.getElementById('tokenError');
  const status = document.getElementById('statusText');

  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  errEl.classList.add('hidden');

  if (!raw) {
    out.innerHTML = emptyState();
    status.textContent = 'Paste a JWT token above to inspect.';
    return;
  }

  let jwt;
  try {
    jwt = parseJwt(raw);
  } catch(e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
    out.innerHTML = emptyState();
    return;
  }

  const { header, payload } = jwt;
  const exp  = payload.exp  || null;
  const iat  = payload.iat  || null;
  const nbf  = payload.nbf  || null;
  const expSt= expiryStatus(exp);

  out.innerHTML = `
    <div class="jwt-sections">

      <!-- Status banner -->
      <div class="status-banner ${expSt.cls}">
        <span class="status-dot"></span>
        <span>${expSt.label.toUpperCase()}</span>
        ${exp ? renderCountdown(exp) : ''}
      </div>

      <!-- Header -->
      <div class="jwt-section">
        <div class="section-header"><span class="section-dot dot-header"></span>header</div>
        <pre class="json-block">${renderJson(header)}</pre>
      </div>

      <!-- Payload -->
      <div class="jwt-section">
        <div class="section-header"><span class="section-dot dot-payload"></span>payload</div>
        <pre class="json-block">${renderJson(payload)}</pre>

        <!-- Time claims -->
        ${(iat || exp || nbf) ? `
        <div class="time-claims">
          ${timeRow('issued at (iat)',    iat)}
          ${timeRow('not before (nbf)',   nbf)}
          ${timeRow('expires at (exp)',   exp)}
        </div>` : ''}
      </div>

      <!-- Claims quick reference -->
      ${renderKnownClaims(payload)}

      <!-- Signature -->
      <div class="jwt-section">
        <div class="section-header"><span class="section-dot dot-sig"></span>signature</div>
        <div class="sig-block">${escHtml(jwt.raw[2])}</div>
        <div class="sig-note">Signature cannot be verified without the secret key — this tool is read-only and safe.</div>
      </div>

    </div>`;

  startCountdown(exp);

  const alg = header.alg || '?';
  status.textContent = `alg: ${alg} · ${Object.keys(payload).length} claims · ${expSt.label}`;
}

function renderKnownClaims(p) {
  const known = {
    sub: ['Subject', p.sub],
    iss: ['Issuer',  p.iss],
    aud: ['Audience',Array.isArray(p.aud) ? p.aud.join(', ') : p.aud],
    jti: ['JWT ID',  p.jti],
    azp: ['Authorized Party', p.azp],
    scope: ['Scope', p.scope],
    email: ['Email', p.email],
    name:  ['Name',  p.name],
    roles: ['Roles', Array.isArray(p.roles) ? p.roles.join(', ') : p.roles],
  };
  const rows = Object.entries(known).filter(([,v]) => v[1] != null && v[1] !== '');
  if (!rows.length) return '';
  return `<div class="jwt-section">
    <div class="section-header">known claims</div>
    <div class="claims-grid">${rows.map(([k,[l,v]]) => `
      <div class="claim-row">
        <span class="claim-key">${l}</span>
        <span class="claim-val">${escHtml(String(v))}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

function emptyState() {
  return `<div class="empty-state"><div class="empty-icon" style="opacity:.2;font-size:0.9rem;font-family:'JetBrains Mono',monospace">JWT</div><div>Paste a token above to inspect</div></div>`;
}

const SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJBbGljZSBEZXYiLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUuY29tIiwicm9sZXMiOlsiYWRtaW4iLCJ1c2VyIl0sImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo0ODUzNjUxNjAwLCJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJhdWQiOiJteS1hcHAifQ.signature';

function loadSample() {
  document.getElementById('tokenInput').value = SAMPLE;
  inspect();
}

function clearAll() {
  document.getElementById('tokenInput').value = '';
  inspect();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('tokenInput').addEventListener('input', inspect);
});
