const inputArea  = document.getElementById('inputArea');
const chatPanel  = document.getElementById('chatPanel');
const parseError = document.getElementById('parseError');
const cvMeta     = document.getElementById('cvMeta');

// ── Parse helpers ─────────────────────────────────────────────────
function extractMessages(obj) {
  // Already a messages array
  if (Array.isArray(obj)) return { messages: obj, meta: {} };

  // OpenAI request
  if (obj.messages && Array.isArray(obj.messages)) {
    return { messages: obj.messages, meta: { model: obj.model, temp: obj.temperature, maxTok: obj.max_tokens } };
  }

  // OpenAI response
  if (obj.choices && Array.isArray(obj.choices)) {
    const msgs = [];
    obj.choices.forEach(c => {
      if (c.message) msgs.push(c.message);
    });
    return {
      messages: msgs,
      meta: { model: obj.model, usage: obj.usage, finish: obj.choices[0]?.finish_reason }
    };
  }

  // Anthropic request
  if (obj.messages && obj.model?.startsWith('claude')) {
    const msgs = [];
    if (obj.system) msgs.push({ role: 'system', content: obj.system });
    obj.messages.forEach(m => msgs.push(m));
    return { messages: msgs, meta: { model: obj.model, temp: obj.temperature, maxTok: obj.max_tokens } };
  }

  // Anthropic response
  if (obj.content && obj.type === 'message') {
    const msgs = [];
    if (obj.system) msgs.push({ role: 'system', content: obj.system });
    obj.content.forEach(block => msgs.push({ role: obj.role || 'assistant', content: block.text || JSON.stringify(block) }));
    return { messages: msgs, meta: { model: obj.model, usage: obj.usage, finish: obj.stop_reason } };
  }

  // Single message object
  if (obj.role && (obj.content !== undefined)) {
    return { messages: [obj], meta: {} };
  }

  return null;
}

function getContent(msg) {
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.map(block => {
      if (typeof block === 'string') return block;
      if (block.type === 'text') return block.text;
      if (block.type === 'tool_use') return `[tool: ${block.name}]\n${JSON.stringify(block.input, null, 2)}`;
      if (block.type === 'tool_result') return `[tool result]\n${JSON.stringify(block.content, null, 2)}`;
      if (block.type === 'image') return '[image]';
      return JSON.stringify(block);
    }).join('\n');
  }
  return JSON.stringify(msg.content);
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function approxTok(s) { return Math.round((s||'').length / 4); }

// ── Render ────────────────────────────────────────────────────────
function render() {
  const raw = inputArea.value.trim();
  parseError.style.display = 'none';

  if (!raw) {
    chatPanel.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><div>Paste an API request or response to render the conversation</div><div style="font-size:.65rem;color:var(--faint)">Supports OpenAI & Anthropic formats</div></div>`;
    cvMeta.innerHTML = '';
    return;
  }

  let obj;
  try { obj = JSON.parse(raw); } catch (e) {
    parseError.textContent = 'JSON parse error: ' + e.message;
    parseError.style.display = '';
    chatPanel.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠</div><div>Fix the JSON to render the conversation</div></div>`;
    cvMeta.innerHTML = '';
    return;
  }

  const result = extractMessages(obj);
  if (!result) {
    parseError.textContent = 'Could not extract messages from this JSON shape. Expected a messages array, OpenAI, or Anthropic format.';
    parseError.style.display = '';
    return;
  }

  const { messages, meta } = result;
  chatPanel.innerHTML = '';

  const AVATARS = { user: '👤', assistant: '🤖', system: '⚙', tool: '🔧' };

  messages.forEach(msg => {
    const role = msg.role || 'user';
    const content = getContent(msg);

    if (role === 'system') {
      const banner = document.createElement('div');
      banner.className = 'sys-banner';
      banner.innerHTML = `<div class="sys-label">System</div>${escHtml(content)}`;
      chatPanel.appendChild(banner);
      return;
    }

    const row = document.createElement('div');
    row.className = `bubble-row ${role}-row`;

    const avatar = document.createElement('div');
    avatar.className = `avatar avatar-${role === 'tool' ? 'tool' : role}`;
    avatar.textContent = AVATARS[role] || '?';

    const wrap = document.createElement('div');
    wrap.style.display = 'flex'; wrap.style.flexDirection = 'column';
    wrap.style.alignItems = role === 'user' ? 'flex-end' : 'flex-start';

    const bubble = document.createElement('div');
    bubble.className = `bubble bubble-${role}`;
    bubble.textContent = content;

    const bm = document.createElement('div');
    bm.className = 'bubble-meta';
    bm.textContent = `${role} · ~${approxTok(content)} tokens`;

    wrap.appendChild(bubble); wrap.appendChild(bm);
    if (role === 'user') { row.appendChild(wrap); row.appendChild(avatar); }
    else { row.appendChild(avatar); row.appendChild(wrap); }
    chatPanel.appendChild(row);
  });

  // Meta chips
  const chips = [];
  if (meta.model) chips.push(`<span class="cv-chip ai">${meta.model}</span>`);
  if (meta.finish) chips.push(`<span class="cv-chip">stop: ${meta.finish}</span>`);
  if (meta.usage) {
    const u = meta.usage;
    const toks = u.total_tokens || (u.prompt_tokens || 0) + (u.completion_tokens || 0) || (u.input_tokens || 0) + (u.output_tokens || 0);
    if (toks) chips.push(`<span class="cv-chip">${toks.toLocaleString()} tokens</span>`);
  }
  chips.push(`<span class="cv-chip">${messages.length} message${messages.length !== 1 ? 's' : ''}</span>`);
  cvMeta.innerHTML = chips.join('');
}

let t;
inputArea.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 150); });
document.getElementById('btnClear').addEventListener('click', () => { inputArea.value = ''; render(); });

const OAI_SAMPLE = JSON.stringify({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful coding assistant. Keep answers concise.' },
    { role: 'user', content: 'What\'s the difference between == and === in JavaScript?' },
    { role: 'assistant', content: '`==` does type coercion before comparing, so `"5" == 5` is `true`.\n`===` checks both value and type, so `"5" === 5` is `false`.\n\nAlways prefer `===` to avoid unexpected coercion bugs.' }
  ],
  temperature: 0.7,
  max_tokens: 512
}, null, 2);

const ANT_SAMPLE = JSON.stringify({
  id: 'msg_01XFDUDYJgAACzvnptvVoYEL',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-4-5',
  system: 'You are a concise technical assistant.',
  content: [
    { type: 'text', text: 'Retrieval-Augmented Generation (RAG) combines a retrieval system with a language model. When a query arrives, relevant documents are fetched from a vector store and injected into the prompt as context, grounding the model\'s response in up-to-date information it wasn\'t trained on.' }
  ],
  stop_reason: 'end_turn',
  usage: { input_tokens: 42, output_tokens: 67 }
}, null, 2);

document.getElementById('btnOAI').addEventListener('click', () => { inputArea.value = OAI_SAMPLE; render(); });
document.getElementById('btnAnt').addEventListener('click', () => { inputArea.value = ANT_SAMPLE; render(); });
