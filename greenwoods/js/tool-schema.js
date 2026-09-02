// ── State ─────────────────────────────────────────────────────────
let params = [];
let fmt = 'openai';

const TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

// ── DOM refs ──────────────────────────────────────────────────────
const fnName     = document.getElementById('fnName');
const fnDesc     = document.getElementById('fnDesc');
const paramList  = document.getElementById('paramList');
const noParams   = document.getElementById('noParams');
const outputPre  = document.getElementById('outputPre');
const schemaMeta = document.getElementById('schemaMeta');

// ── Param management ──────────────────────────────────────────────
function addParam(data = {}) {
  const id = Date.now() + Math.random();
  const p = {
    id,
    name: data.name || '',
    type: data.type || 'string',
    description: data.description || '',
    required: data.required !== false,
    enumValues: data.enumValues || [],
    itemType: data.itemType || 'string',
  };
  params.push(p);
  renderParams();
  render();
}

function removeParam(id) {
  params = params.filter(p => p.id !== id);
  renderParams();
  render();
}

function updateParam(id, key, value) {
  const p = params.find(p => p.id === id);
  if (p) { p[key] = value; render(); }
}

function addEnum(id, value) {
  const p = params.find(p => p.id === id);
  if (!p || !value.trim()) return;
  if (!p.enumValues.includes(value.trim())) {
    p.enumValues.push(value.trim());
    renderParams();
    render();
  }
}

function removeEnum(id, val) {
  const p = params.find(p => p.id === id);
  if (p) {
    p.enumValues = p.enumValues.filter(e => e !== val);
    renderParams();
    render();
  }
}

function renderParams() {
  noParams.style.display = params.length ? 'none' : '';
  paramList.innerHTML = '';
  params.forEach(p => {
    const card = document.createElement('div');
    card.className = 'param-card';
    card.innerHTML = `
      <div class="param-row">
        <div class="param-field" style="flex:2">
          <label>Name</label>
          <input type="text" value="${escHtml(p.name)}" placeholder="param_name" data-field="name" data-id="${p.id}" />
        </div>
        <div class="param-field" style="flex:1">
          <label>Type</label>
          <select data-field="type" data-id="${p.id}">
            ${TYPES.map(t => `<option value="${t}" ${p.type === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <label class="param-required">
          <input type="checkbox" ${p.required ? 'checked' : ''} data-field="required" data-id="${p.id}" />
          required
        </label>
        <button class="param-remove" data-remove="${p.id}">✕</button>
      </div>
      <div class="param-field">
        <label>Description</label>
        <textarea data-field="description" data-id="${p.id}" placeholder="What this parameter does…">${escHtml(p.description)}</textarea>
      </div>
      ${p.type === 'array' ? `
      <div class="param-field" style="max-width:180px">
        <label>Item type</label>
        <select data-field="itemType" data-id="${p.id}">
          ${['string','number','integer','boolean','object'].map(t=>`<option value="${t}" ${p.itemType===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>` : ''}
      ${p.type === 'string' ? `
      <div class="param-field">
        <label>Enum values <span style="color:var(--faint);text-transform:none;font-size:0.56rem">(optional — leave empty for free text)</span></label>
        <div class="enum-row">
          ${p.enumValues.map(v => `
            <div class="enum-chip">${escHtml(v)}<button data-rmenum="${escHtml(v)}" data-id="${p.id}">×</button></div>
          `).join('')}
          <input class="tool-input enum-add" type="text" placeholder="+ add value" data-enumadd="${p.id}" style="width:110px;min-height:auto;padding:3px 7px" />
        </div>
      </div>` : ''}
    `;
    paramList.appendChild(card);
  });

  // Wire events
  paramList.querySelectorAll('[data-field]').forEach(el => {
    const id = parseFloat(el.dataset.id);
    const field = el.dataset.field;
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      updateParam(id, field, el.type === 'checkbox' ? el.checked : el.value);
      if (field === 'type') { renderParams(); }
    });
  });
  paramList.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => removeParam(parseFloat(btn.dataset.remove)));
  });
  paramList.querySelectorAll('[data-enumadd]').forEach(inp => {
    const id = parseFloat(inp.dataset.enumadd);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEnum(id, inp.value); inp.value = ''; }
    });
    inp.addEventListener('blur', () => { if (inp.value.trim()) addEnum(id, inp.value); inp.value = ''; });
  });
  paramList.querySelectorAll('[data-rmenum]').forEach(btn => {
    const id = parseFloat(btn.dataset.id);
    btn.addEventListener('click', () => removeEnum(id, btn.dataset.rmenum));
  });
}

// ── Schema generation ─────────────────────────────────────────────
function buildProperties() {
  const props = {};
  const required = [];
  params.forEach(p => {
    if (!p.name.trim()) return;
    const name = p.name.trim();
    const prop = { type: p.type, description: p.description || undefined };
    if (p.type === 'array') prop.items = { type: p.itemType };
    if (p.type === 'string' && p.enumValues.length) prop.enum = [...p.enumValues];
    // Clean undefined
    Object.keys(prop).forEach(k => prop[k] === undefined && delete prop[k]);
    props[name] = prop;
    if (p.required) required.push(name);
  });
  return { props, required };
}

function buildOpenAI() {
  const { props, required } = buildProperties();
  return {
    type: 'function',
    function: {
      name: fnName.value.trim() || 'my_function',
      description: fnDesc.value.trim() || undefined,
      parameters: {
        type: 'object',
        properties: props,
        required: required.length ? required : undefined,
      }
    }
  };
}

function buildAnthropic() {
  const { props, required } = buildProperties();
  return {
    name: fnName.value.trim() || 'my_function',
    description: fnDesc.value.trim() || undefined,
    input_schema: {
      type: 'object',
      properties: props,
      required: required.length ? required : undefined,
    }
  };
}

function buildGemini() {
  const { props, required } = buildProperties();
  return {
    name: fnName.value.trim() || 'my_function',
    description: fnDesc.value.trim() || undefined,
    parameters: {
      type: 'object',
      properties: props,
      required: required.length ? required : undefined,
    }
  };
}

function cleanObj(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) => v === undefined ? undefined : v));
}

function render() {
  let schema;
  if (fmt === 'openai') schema = buildOpenAI();
  else if (fmt === 'anthropic') schema = buildAnthropic();
  else schema = buildGemini();

  const clean = cleanObj(schema);
  const json = JSON.stringify(clean, null, 2);
  outputPre.innerHTML = syntaxHL(json);

  const { props, required } = buildProperties();
  const pCount = Object.keys(props).length;
  schemaMeta.textContent = pCount
    ? `${pCount} parameter${pCount !== 1 ? 's' : ''} · ${required.length} required`
    : 'No parameters defined';
}

function syntaxHL(json) {
  return json
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
      let cls = 'json-num';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-str';
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Events ────────────────────────────────────────────────────────
document.getElementById('btnAddParam').addEventListener('click', () => addParam());

document.getElementById('btnReset').addEventListener('click', () => {
  fnName.value = '';
  fnDesc.value = '';
  params = [];
  renderParams();
  render();
});

document.getElementById('btnExample').addEventListener('click', () => {
  fnName.value = 'get_weather';
  fnDesc.value = 'Get current weather conditions and forecast for a specified location.';
  params = [];
  addParam({ name: 'location', type: 'string', description: 'City name or zip code, e.g. "San Francisco, CA"', required: true });
  addParam({ name: 'unit', type: 'string', description: 'Temperature unit', required: false, enumValues: ['celsius', 'fahrenheit'] });
  addParam({ name: 'days', type: 'integer', description: 'Number of forecast days (1–7)', required: false });
});

document.getElementById('btnCopy').addEventListener('click', function() {
  let schema;
  if (fmt === 'openai') schema = buildOpenAI();
  else if (fmt === 'anthropic') schema = buildAnthropic();
  else schema = buildGemini();
  navigator.clipboard.writeText(JSON.stringify(cleanObj(schema), null, 2));
  this.textContent = 'copied!';
  setTimeout(() => this.textContent = 'copy', 1500);
});

document.querySelectorAll('.tab[data-fmt]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-fmt]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    fmt = btn.dataset.fmt;
    render();
  });
});

fnName.addEventListener('input', render);
fnDesc.addEventListener('input', render);

// ── Init ──────────────────────────────────────────────────────────
renderParams();
render();
