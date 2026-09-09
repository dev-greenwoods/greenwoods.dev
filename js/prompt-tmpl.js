const tmplInput  = document.getElementById('tmplInput');
const varList    = document.getElementById('varList');
const outputPre  = document.getElementById('outputPre');
const tmplStats  = document.getElementById('tmplStats');
const tmplFooter = document.getElementById('tmplFooter');

let vars = {}; // name -> value

function detectVars(template) {
  const found = [];
  const re = /\{\{([a-zA-Z_][a-zA-Z0-9_ ]*?)\}\}/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(template)) !== null) {
    const name = m[1].trim();
    if (!seen.has(name)) { seen.add(name); found.push(name); }
  }
  return found;
}

function renderVars(names) {
  // Preserve existing values; remove vars no longer in template
  const newVars = {};
  names.forEach(n => { newVars[n] = vars[n] !== undefined ? vars[n] : ''; });
  vars = newVars;

  if (!names.length) {
    varList.innerHTML = `<div class="empty-state" style="min-height:100px"><div class="empty-icon" style="font-size:1.4rem">⚙</div><div>Detected variables will appear here</div></div>`;
    return;
  }

  varList.innerHTML = '';
  names.forEach(name => {
    const card = document.createElement('div');
    card.className = 'var-card';
    const multiline = name.toLowerCase().includes('prompt') || name.toLowerCase().includes('text') || name.toLowerCase().includes('context') || name.toLowerCase().includes('task') || name.toLowerCase().includes('instructions');
    card.innerHTML = `
      <div class="var-name"><span class="var-badge">{{${name}}}</span></div>
      ${multiline
        ? `<textarea rows="3" data-var="${name}" placeholder="Value for ${name}…">${escHtml(vars[name]||'')}</textarea>`
        : `<input type="text" data-var="${name}" value="${escHtml(vars[name]||'')}" placeholder="Value for ${name}…"/>`}`;
    varList.appendChild(card);
    const el = card.querySelector('[data-var]');
    el.addEventListener('input', () => { vars[name] = el.value; renderOutput(); });
  });
}

function renderOutput() {
  const template = tmplInput.value;
  if (!template.trim()) {
    outputPre.innerHTML = `<span style="color:var(--faint);font-size:.72rem">Filled prompt will appear here…</span>`;
    tmplFooter.textContent = '';
    return;
  }

  // Build HTML with highlights
  let html = escHtml(template).replace(/\{\{([a-zA-Z_][a-zA-Z0-9_ ]*?)\}\}/g, (_, name) => {
    name = name.trim();
    const val = vars[name];
    if (val && val.trim()) return `<span class="tmpl-filled">${escHtml(val)}</span>`;
    return `<span class="tmpl-empty">{{${name}}}</span>`;
  });
  outputPre.innerHTML = html;

  const allNames = detectVars(template);
  const filled = allNames.filter(n => vars[n] && vars[n].trim()).length;
  const total = allNames.length;
  const charCount = getFilledText(template).length;
  tmplFooter.textContent = total
    ? `${filled}/${total} variables filled · ~${Math.round(charCount/4)} tokens`
    : `~${Math.round(template.length/4)} tokens`;
}

function getFilledText(template) {
  return template.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_ ]*?)\}\}/g, (_, name) => vars[name.trim()] || `{{${name.trim()}}}`);
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

let t;
tmplInput.addEventListener('input', () => {
  clearTimeout(t); t = setTimeout(() => {
    const names = detectVars(tmplInput.value);
    tmplStats.textContent = `${names.length} variable${names.length!==1?'s':''} detected`;
    renderVars(names);
    renderOutput();
  }, 80);
});

document.getElementById('btnCopy').addEventListener('click', function() {
  navigator.clipboard.writeText(getFilledText(tmplInput.value));
  this.textContent='copied!'; setTimeout(()=>this.textContent='copy',1500);
});
document.getElementById('btnClear').addEventListener('click', () => { tmplInput.value=''; vars={}; renderVars([]); renderOutput(); tmplStats.textContent='0 variables detected'; });
document.getElementById('btnClearVars').addEventListener('click', () => { Object.keys(vars).forEach(k=>vars[k]=''); renderVars(detectVars(tmplInput.value)); renderOutput(); });

const SAMPLE = `You are a {{role}} with deep expertise in {{domain}}.

Your task: {{task}}

Guidelines:
- Tone: {{tone}}
- Output format: {{output_format}}
- Target audience: {{audience}}
- Maximum length: {{max_length}}

Begin your response below.`;

document.getElementById('btnSample').addEventListener('click', () => {
  tmplInput.value = SAMPLE;
  const names = detectVars(SAMPLE);
  const defaults = { role:'senior software engineer', domain:'distributed systems', task:'review this architecture diagram and identify single points of failure', tone:'professional but direct', output_format:'numbered list with severity ratings', audience:'engineering team', max_length:'500 words' };
  names.forEach(n => { vars[n] = defaults[n] || ''; });
  tmplStats.textContent = `${names.length} variables detected`;
  renderVars(names);
  renderOutput();
});

renderOutput();
