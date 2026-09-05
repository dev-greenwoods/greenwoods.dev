// ── State ─────────────────────────────────────────────────────────
let examples = []; // [{id, turns:[{role,content}]}]
let fmt = 'openai';

// ── DOM ───────────────────────────────────────────────────────────
const globalSystem = document.getElementById('globalSystem');
const exList       = document.getElementById('exList');
const jsonlOutput  = document.getElementById('jsonlOutput');
const dsExCount    = document.getElementById('dsExCount');
const dsTurns      = document.getElementById('dsTurns');
const dsTokens     = document.getElementById('dsTokens');
const outputMeta   = document.getElementById('outputMeta');

function uid() { return Date.now() + Math.random(); }

// ── Example management ────────────────────────────────────────────
function addExample(turns = []) {
  const id = uid();
  examples.push({ id, turns: turns.length ? turns : [
    { role: 'user', content: '', id: uid() },
    { role: 'assistant', content: '', id: uid() }
  ]});
  renderExamples();
  render();
}

function removeExample(id) {
  examples = examples.filter(e => e.id !== id);
  renderExamples();
  render();
}

function addTurn(exId, role) {
  const ex = examples.find(e => e.id === exId);
  if (ex) { ex.turns.push({ role, content: '', id: uid() }); renderExamples(); render(); }
}

function removeTurn(exId, turnId) {
  const ex = examples.find(e => e.id === exId);
  if (ex) { ex.turns = ex.turns.filter(t => t.id !== turnId); renderExamples(); render(); }
}

function updateTurn(exId, turnId, content) {
  const ex = examples.find(e => e.id === exId);
  if (ex) { const t = ex.turns.find(t => t.id === turnId); if (t) { t.content = content; render(); } }
}

function renderExamples() {
  exList.innerHTML = '';
  if (!examples.length) {
    exList.innerHTML = `<div class="empty-state" style="min-height:120px"><div class="empty-icon">📋</div><div>No examples yet — click "+ add example"</div></div>`;
    return;
  }
  examples.forEach((ex, idx) => {
    const card = document.createElement('div');
    card.className = 'ex-card';
    card.innerHTML = `
      <div class="ex-hd">
        <span class="ex-num">example ${idx + 1}</span>
        <div class="ex-actions">
          <button class="btn-rm-small" data-rmex="${ex.id}">remove</button>
        </div>
      </div>
      <div class="ex-body" id="turns-${ex.id}">
        ${ex.turns.map(t => `
          <div class="turn-row" data-turnrow="${t.id}">
            <span class="turn-role ${t.role}">${t.role}</span>
            <textarea class="turn-text" data-exid="${ex.id}" data-turnid="${t.id}"
              placeholder="${t.role} message…" rows="2">${escHtml(t.content)}</textarea>
            <button class="btn-rm-small" style="margin:8px 8px 0 0;align-self:flex-start" data-rmturn="${t.id}" data-exid="${ex.id}">✕</button>
          </div>`).join('')}
      </div>
      <div class="ex-add-turn">
        <button class="btn-role user" data-addturn="user" data-exid="${ex.id}">+ user</button>
        <button class="btn-role assistant" data-addturn="assistant" data-exid="${ex.id}">+ assistant</button>
      </div>
    `;
    exList.appendChild(card);

    card.querySelector(`[data-rmex]`).addEventListener('click', () => removeExample(ex.id));
    card.querySelectorAll('[data-rmturn]').forEach(btn => {
      btn.addEventListener('click', () => removeTurn(ex.id, parseFloat(btn.dataset.rmturn)));
    });
    card.querySelectorAll('textarea[data-turnid]').forEach(ta => {
      ta.addEventListener('input', () => updateTurn(ex.id, parseFloat(ta.dataset.turnid), ta.value));
    });
    card.querySelectorAll('[data-addturn]').forEach(btn => {
      btn.addEventListener('click', () => addTurn(ex.id, btn.dataset.addturn));
    });
  });
}

// ── JSONL generation ──────────────────────────────────────────────
function approxTokens(s) { return Math.round((s||'').length / 4); }

function buildOpenAI(ex) {
  const sys = globalSystem.value.trim();
  const messages = [];
  if (sys) messages.push({ role: 'system', content: sys });
  ex.turns.forEach(t => { if (t.content.trim()) messages.push({ role: t.role, content: t.content }); });
  return { messages };
}

function buildAlpaca(ex) {
  const sys = globalSystem.value.trim();
  const user = ex.turns.find(t => t.role === 'user');
  const asst = ex.turns.find(t => t.role === 'assistant');
  return {
    instruction: sys || (user?.content || ''),
    input: sys ? (user?.content || '') : '',
    output: asst?.content || '',
  };
}

function buildShareGPT(ex) {
  const sys = globalSystem.value.trim();
  const convs = [];
  if (sys) convs.push({ from: 'system', value: sys });
  ex.turns.forEach(t => {
    if (t.content.trim()) convs.push({ from: t.role === 'user' ? 'human' : 'gpt', value: t.content });
  });
  return { conversations: convs };
}

function render() {
  const lines = examples.filter(ex => ex.turns.some(t => t.content.trim())).map(ex => {
    let obj;
    if (fmt === 'openai') obj = buildOpenAI(ex);
    else if (fmt === 'alpaca') obj = buildAlpaca(ex);
    else obj = buildShareGPT(ex);
    return JSON.stringify(obj);
  });

  jsonlOutput.textContent = lines.join('\n') || '// examples will appear here';

  // Stats
  const totalTurns = examples.reduce((s, e) => s + e.turns.length, 0);
  const totalTok = examples.reduce((s, e) => s + e.turns.reduce((ss, t) => ss + approxTokens(t.content), 0), 0);
  dsExCount.textContent = `${examples.length} example${examples.length !== 1 ? 's' : ''}`;
  dsTurns.textContent = `${totalTurns} turns`;
  dsTokens.textContent = `~${totalTok.toLocaleString()} tokens`;
  outputMeta.textContent = lines.length ? `${lines.length} line${lines.length !== 1 ? 's' : ''} · ${fmt} format` : '';
}

// ── Events ────────────────────────────────────────────────────────
document.getElementById('btnAddEx').addEventListener('click', () => addExample());
globalSystem.addEventListener('input', render);

document.querySelectorAll('.tab[data-fmt]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-fmt]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    fmt = btn.dataset.fmt;
    render();
  });
});

document.getElementById('btnCopyJson').addEventListener('click', function() {
  navigator.clipboard.writeText(jsonlOutput.textContent);
  this.textContent = 'copied!';
  setTimeout(() => this.textContent = 'copy', 1500);
});

document.getElementById('btnDownload').addEventListener('click', () => {
  const blob = new Blob([jsonlOutput.textContent], { type: 'application/jsonl' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'dataset.jsonl' });
  a.click();
});

document.getElementById('btnSample').addEventListener('click', () => {
  globalSystem.value = 'You are a concise coding assistant. Respond with short, correct code snippets.';
  examples = [];
  addExample([
    { role: 'user', content: 'Write a Python function to reverse a string.', id: uid() },
    { role: 'assistant', content: 'def reverse_string(s: str) -> str:\n    return s[::-1]', id: uid() }
  ]);
  addExample([
    { role: 'user', content: 'How do I check if a number is prime in Python?', id: uid() },
    { role: 'assistant', content: 'def is_prime(n: int) -> bool:\n    if n < 2: return False\n    return all(n % i != 0 for i in range(2, int(n**0.5)+1))', id: uid() }
  ]);
  addExample([
    { role: 'user', content: 'Flatten a nested list in Python.', id: uid() },
    { role: 'assistant', content: 'def flatten(lst):\n    return [x for sub in lst for x in (flatten(sub) if isinstance(sub, list) else [sub])]', id: uid() }
  ]);
});

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Init
renderExamples();
render();
