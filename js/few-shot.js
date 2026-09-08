let examples = [];
let fmt = 'messages';

const taskDesc  = document.getElementById('taskDesc');
const testInput = document.getElementById('testInput');
const exList    = document.getElementById('exList');
const fewOutput = document.getElementById('fewOutput');
const fewMeta   = document.getElementById('fewMeta');

function uid() { return Date.now() + Math.random(); }

function addExample(inp = '', out = '') {
  examples.push({ id: uid(), input: inp, output: out });
  renderExamples(); render();
}

function removeExample(id) {
  examples = examples.filter(e => e.id !== id);
  renderExamples(); render();
}

function updateExample(id, key, val) {
  const ex = examples.find(e => e.id === id);
  if (ex) { ex[key] = val; render(); }
}

function renderExamples() {
  if (!examples.length) {
    exList.innerHTML = `<div class="empty-state" style="min-height:80px;flex:0"><div class="empty-icon" style="font-size:1.4rem">✦</div><div>Add examples to build your few-shot prompt</div></div>`;
    return;
  }
  exList.innerHTML = '';
  examples.forEach((ex, idx) => {
    const card = document.createElement('div');
    card.className = 'fs-card';
    card.innerHTML = `
      <div class="fs-hd">
        <span class="fs-num">example ${idx + 1}</span>
        <button class="btn-rm-s" data-rm="${ex.id}">remove</button>
      </div>
      <div class="fs-body">
        <div class="fs-col">
          <span class="fs-col-label">Input</span>
          <textarea data-field="input" data-id="${ex.id}" placeholder="Input example…">${escHtml(ex.input)}</textarea>
        </div>
        <div class="fs-col">
          <span class="fs-col-label">Output</span>
          <textarea data-field="output" data-id="${ex.id}" placeholder="Expected output…">${escHtml(ex.output)}</textarea>
        </div>
      </div>`;
    exList.appendChild(card);
    card.querySelector('[data-rm]').addEventListener('click', () => removeExample(ex.id));
    card.querySelectorAll('textarea').forEach(ta => {
      ta.addEventListener('input', () => updateExample(ex.id, ta.dataset.field, ta.value));
    });
  });
}

// ── Formatters ────────────────────────────────────────────────────
function fmtMessages() {
  const task = taskDesc.value.trim();
  const test = testInput.value.trim();
  const msgs = [];
  if (task) msgs.push({ role: 'system', content: task });
  examples.filter(e => e.input || e.output).forEach(e => {
    if (e.input) msgs.push({ role: 'user', content: e.input });
    if (e.output) msgs.push({ role: 'assistant', content: e.output });
  });
  if (test) msgs.push({ role: 'user', content: test });
  return JSON.stringify(msgs, null, 2);
}

function fmtXML() {
  const task = taskDesc.value.trim();
  const test = testInput.value.trim();
  let out = '';
  if (task) out += `<task>\n${task}\n</task>\n\n`;
  const filled = examples.filter(e => e.input || e.output);
  if (filled.length) {
    out += `<examples>\n`;
    filled.forEach((e, i) => {
      out += `  <example index="${i + 1}">\n`;
      if (e.input)  out += `    <input>${e.input}</input>\n`;
      if (e.output) out += `    <output>${e.output}</output>\n`;
      out += `  </example>\n`;
    });
    out += `</examples>\n`;
  }
  if (test) out += `\n<input>${test}</input>`;
  return out;
}

function fmtMarkdown() {
  const task = taskDesc.value.trim();
  const test = testInput.value.trim();
  let out = '';
  if (task) out += `## Task\n${task}\n\n`;
  const filled = examples.filter(e => e.input || e.output);
  if (filled.length) {
    out += `## Examples\n\n`;
    out += `| Input | Output |\n|-------|--------|\n`;
    filled.forEach(e => {
      const inp = (e.input||'').replace(/\|/g,'\\|').replace(/\n/g,' ');
      const outp = (e.output||'').replace(/\|/g,'\\|').replace(/\n/g,' ');
      out += `| ${inp} | ${outp} |\n`;
    });
  }
  if (test) out += `\n## Your Input\n${test}`;
  return out;
}

function fmtPlain() {
  const task = taskDesc.value.trim();
  const test = testInput.value.trim();
  let out = '';
  if (task) out += `${task}\n\n`;
  const filled = examples.filter(e => e.input || e.output);
  filled.forEach((e, i) => {
    out += `Example ${i + 1}:\n`;
    if (e.input)  out += `Input: ${e.input}\n`;
    if (e.output) out += `Output: ${e.output}\n`;
    out += '\n';
  });
  if (test) out += `Input: ${test}\nOutput:`;
  return out;
}

function render() {
  let out = '';
  if (fmt === 'messages') out = fmtMessages();
  else if (fmt === 'xml')  out = fmtXML();
  else if (fmt === 'markdown') out = fmtMarkdown();
  else out = fmtPlain();
  fewOutput.textContent = out;
  const n = examples.filter(e => e.input || e.output).length;
  const approxTok = Math.round(out.length / 4);
  fewMeta.textContent = n ? `${n} example${n !== 1 ? 's' : ''} · ~${approxTok.toLocaleString()} tokens` : '';
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

document.getElementById('btnAdd').addEventListener('click', () => addExample());
document.getElementById('btnCopy').addEventListener('click', function() {
  navigator.clipboard.writeText(fewOutput.textContent);
  this.textContent = 'copied!'; setTimeout(() => this.textContent = 'copy', 1500);
});
document.querySelectorAll('.tab[data-fmt]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-fmt]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); fmt = btn.dataset.fmt; render();
  });
});
[taskDesc, testInput].forEach(el => el.addEventListener('input', render));

document.getElementById('btnSample').addEventListener('click', () => {
  taskDesc.value = 'Classify the sentiment of the movie review as exactly one of: positive, negative, or neutral.';
  testInput.value = 'The pacing was off and the ending felt rushed, but the lead performance was genuinely moving.';
  examples = [];
  addExample('A masterpiece — every scene drips with meaning and the performances are unforgettable.', 'positive');
  addExample('Two hours I\'ll never get back. Predictable plot, wooden acting, nothing redeeming.', 'negative');
  addExample('It was fine. Some good moments, some slow ones. Worth a watch if you have nothing else on.', 'neutral');
  addExample('The cinematography was breathtaking and the score was haunting. Easily in my top 10.', 'positive');
});

renderExamples(); render();
