let records = []; // [{line, data, error}]
let view = 'pretty';
let filterTerm = '';

const inputArea    = document.getElementById('inputArea');
const jlTotal      = document.getElementById('jlTotal');
const jlValid      = document.getElementById('jlValid');
const jlInvalid    = document.getElementById('jlInvalid');
const recordsPanel = document.getElementById('recordsPanel');
const filterInput  = document.getElementById('filterInput');

function parse() {
  const text = inputArea.value;
  records = [];
  text.split('\n').forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      records.push({ line: i + 1, data: JSON.parse(trimmed), error: null });
    } catch (e) {
      records.push({ line: i + 1, data: null, error: e.message });
    }
  });
  updateStats();
  render();
}

function updateStats() {
  const valid = records.filter(r => !r.error).length;
  const invalid = records.filter(r => r.error).length;
  jlTotal.textContent = `${records.length} line${records.length !== 1 ? 's' : ''}`;
  jlValid.textContent = `${valid} valid`;
  jlInvalid.textContent = `${invalid} error${invalid !== 1 ? 's' : ''}`;
  jlInvalid.style.display = invalid ? '' : 'none';
}

function syntaxHL(json) {
  return json
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, m => {
      let c = 'jn';
      if (/^"/.test(m)) c = /:$/.test(m) ? 'jk' : 'js';
      else if (/true|false/.test(m)) c = 'jb';
      else if (/null/.test(m)) c = 'jnull';
      return `<span class="${c}">${m}</span>`;
    });
}

function matchesFilter(r) {
  if (!filterTerm) return true;
  const raw = r.error ? r.error : JSON.stringify(r.data);
  return raw.toLowerCase().includes(filterTerm.toLowerCase());
}

function render() {
  const visible = records.filter(matchesFilter);
  if (!records.length) {
    recordsPanel.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><div>Paste JSONL to inspect records</div><div style="font-size:.65rem;color:var(--faint)">One JSON object per line</div></div>`;
    return;
  }
  if (!visible.length) {
    recordsPanel.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div>No records match "${filterTerm}"</div></div>`;
    return;
  }

  if (view === 'compact') {
    const html = visible.map(r => {
      if (r.error) return `<div class="jl-compact-row" style="color:#dc2626"><span class="jl-cn">${r.line}</span>ERROR: ${r.error}</div>`;
      const short = JSON.stringify(r.data);
      return `<div class="jl-compact-row" title="${short.replace(/"/g,'&quot;')}"><span class="jl-cn">${r.line}</span><span>${short.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span></div>`;
    }).join('');
    recordsPanel.innerHTML = `<div class="output-block" style="flex:1;border-radius:8px;overflow:auto">${html}</div>`;
    return;
  }

  recordsPanel.innerHTML = '';
  visible.forEach(r => {
    const card = document.createElement('div');
    card.className = 'jl-record' + (r.error ? ' error-record' : '');
    if (r.error) {
      card.innerHTML = `
        <div class="jl-rec-hd"><span class="jl-line-num">line ${r.line}</span><span style="font-size:.6rem;color:#dc2626">parse error</span></div>
        <div class="jl-error-msg">${r.error}</div>`;
    } else {
      const keys = typeof r.data === 'object' && r.data !== null ? Object.keys(r.data) : [];
      const keysHtml = keys.slice(0, 8).map(k => `<span class="jl-key-chip">${k}</span>`).join('');
      const pretty = JSON.stringify(r.data, null, 2);
      card.innerHTML = `
        <div class="jl-rec-hd">
          <span class="jl-line-num">line ${r.line}</span>
          <div class="jl-keys">${keysHtml}${keys.length > 8 ? `<span class="jl-key-chip">+${keys.length-8}</span>` : ''}</div>
          <button class="jl-copy" data-line="${r.line}">copy</button>
        </div>
        <div class="jl-rec-body"><pre>${syntaxHL(pretty)}</pre></div>`;
      card.querySelector('.jl-copy').addEventListener('click', function() {
        navigator.clipboard.writeText(pretty);
        this.textContent = 'copied!'; setTimeout(() => this.textContent = 'copy', 1500);
      });
    }
    recordsPanel.appendChild(card);
  });
}

let t;
inputArea.addEventListener('input', () => { clearTimeout(t); t = setTimeout(parse, 120); });
filterInput.addEventListener('input', () => { filterTerm = filterInput.value; render(); });
document.querySelectorAll('.tab[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-view]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); view = btn.dataset.view; render();
  });
});

document.getElementById('btnClear').addEventListener('click', () => { inputArea.value = ''; records = []; updateStats(); render(); });

document.getElementById('fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { inputArea.value = ev.target.result; parse(); };
  reader.readAsText(file);
});

document.getElementById('btnSample').addEventListener('click', () => {
  inputArea.value = [
    JSON.stringify({ messages: [{ role: 'system', content: 'You are a coding assistant.' }, { role: 'user', content: 'What is a closure?' }, { role: 'assistant', content: 'A closure is a function that captures variables from its enclosing scope.' }] }),
    JSON.stringify({ messages: [{ role: 'user', content: 'Reverse a string in Python.' }, { role: 'assistant', content: 's[::-1]' }] }),
    JSON.stringify({ prompt: 'Translate to French:', completion: 'Traduire en français :' }),
    'this is not valid json',
    JSON.stringify({ id: 42, label: 'positive', text: 'Great product, would recommend!', confidence: 0.97 }),
  ].join('\n');
  parse();
});
