const TYPES = ['string','number','integer','boolean','array','object'];
const PY_TYPES = { string:'str', number:'float', integer:'int', boolean:'bool', array:'list', object:'dict' };

let fields = [];
let outFmt = 'openai';

const schemaName = document.getElementById('schemaName');
const schemaDesc = document.getElementById('schemaDesc');
const fieldList  = document.getElementById('fieldList');
const outputPre  = document.getElementById('outputPre');
const optAdditional = document.getElementById('optAdditional');
const optStrict  = document.getElementById('optStrict');

function uid() { return Date.now() + Math.random(); }

function addField(d = {}) {
  fields.push({ id: uid(), name: d.name||'', type: d.type||'string', description: d.description||'', required: d.required!==false, enumValues: d.enumValues||[], nullable: d.nullable||false });
  renderFields(); render();
}

function removeField(id) { fields = fields.filter(f => f.id !== id); renderFields(); render(); }

function updateField(id, key, val) {
  const f = fields.find(f => f.id === id);
  if (f) { f[key] = val; render(); }
}

function renderFields() {
  if (!fields.length) {
    fieldList.innerHTML = `<div style="font-size:.68rem;color:var(--faint);padding:12px;text-align:center;background:var(--surface2);border:1.5px dashed var(--border);border-radius:8px">No fields — click "+ add field"</div>`;
    return;
  }
  fieldList.innerHTML = '';
  fields.forEach(f => {
    const card = document.createElement('div');
    card.className = 'so-field-card';
    card.innerHTML = `
      <div class="sof-row">
        <div class="sof-field" style="flex:2">
          <label>Field name</label>
          <input type="text" value="${escHtml(f.name)}" placeholder="field_name" data-k="name" data-id="${f.id}" />
        </div>
        <div class="sof-field" style="flex:1">
          <label>Type</label>
          <select data-k="type" data-id="${f.id}">
            ${TYPES.map(t=>`<option value="${t}" ${f.type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <label class="sof-req">
          <input type="checkbox" ${f.required?'checked':''} data-k="required" data-id="${f.id}" />required
        </label>
        <label class="sof-req">
          <input type="checkbox" ${f.nullable?'checked':''} data-k="nullable" data-id="${f.id}" />nullable
        </label>
        <button class="sof-rm" data-rm="${f.id}">✕</button>
      </div>
      <div class="sof-field">
        <label>Description</label>
        <input type="text" class="desc-in" value="${escHtml(f.description)}" placeholder="Describe this field…" data-k="description" data-id="${f.id}" />
      </div>`;
    fieldList.appendChild(card);
    card.querySelector('[data-rm]').addEventListener('click', () => removeField(f.id));
    card.querySelectorAll('[data-k]').forEach(el => {
      el.addEventListener(el.type==='checkbox'?'change':'input', () => {
        updateField(f.id, el.dataset.k, el.type==='checkbox'?el.checked:el.value);
        if (el.dataset.k==='type') renderFields();
      });
    });
  });
}

// ── Schema builders ───────────────────────────────────────────────
function buildProps() {
  const props = {}; const required = [];
  fields.forEach(f => {
    if (!f.name.trim()) return;
    const nm = f.name.trim();
    const prop = { type: f.type, description: f.description||undefined };
    if (f.nullable) prop.type = [f.type, 'null'];
    if (!f.description) delete prop.description;
    props[nm] = prop;
    if (f.required) required.push(nm);
  });
  return { props, required };
}

function buildJSONSchema() {
  const { props, required } = buildProps();
  const name = schemaName.value.trim() || 'Schema';
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: name,
    description: schemaDesc.value.trim() || undefined,
    type: 'object',
    properties: props,
    required: required.length ? required : undefined,
  };
  if (optAdditional.checked) schema.additionalProperties = false;
  return cleanObj(schema);
}

function buildOpenAI() {
  const { props, required } = buildProps();
  const name = (schemaName.value.trim() || 'schema').toLowerCase().replace(/\s+/g,'_');
  const schema = {
    type: 'object',
    properties: props,
    required: required.length ? required : undefined,
    additionalProperties: false,
  };
  const out = {
    type: 'json_schema',
    json_schema: {
      name,
      description: schemaDesc.value.trim() || undefined,
      schema: cleanObj(schema),
      strict: optStrict.checked,
    }
  };
  return cleanObj(out);
}

function buildPydantic() {
  const name = schemaName.value.trim() || 'Schema';
  const desc = schemaDesc.value.trim();
  let code = `from pydantic import BaseModel, Field\nfrom typing import Optional, List\n\n`;
  code += `class ${name}(BaseModel):\n`;
  if (desc) code += `    """${desc}"""\n`;
  if (!fields.length) { code += '    pass\n'; return code; }
  fields.forEach(f => {
    if (!f.name.trim()) return;
    let pyType = PY_TYPES[f.type] || 'str';
    if (f.type === 'array') pyType = 'List[str]';
    if (f.nullable) pyType = `Optional[${pyType}]`;
    if (!f.required) pyType = `Optional[${pyType}]`;
    const fieldKwargs = [];
    if (f.description) fieldKwargs.push(`description="${f.description}"`);
    if (!f.required || f.nullable) fieldKwargs.push('default=None');
    const fieldStr = fieldKwargs.length ? ` = Field(${fieldKwargs.join(', ')})` : '';
    code += `    ${f.name.trim()}: ${pyType}${fieldStr}\n`;
  });
  return code;
}

function buildZod() {
  const name = (schemaName.value.trim() || 'Schema').replace(/\s+/g,'');
  const ZOD = { string:'z.string()', number:'z.number()', integer:'z.number().int()', boolean:'z.boolean()', array:'z.array(z.string())', object:'z.object({})' };
  let code = `import { z } from "zod";\n\n`;
  code += `const ${name}Schema = z.object({\n`;
  fields.forEach(f => {
    if (!f.name.trim()) return;
    let t = ZOD[f.type] || 'z.string()';
    if (f.nullable) t += '.nullable()';
    if (!f.required) t += '.optional()';
    const desc = f.description ? `.describe("${f.description}")` : '';
    code += `  ${f.name.trim()}: ${t}${desc},\n`;
  });
  code += `});\n\nexport type ${name} = z.infer<typeof ${name}Schema>;\n`;
  return code;
}

function cleanObj(o) {
  return JSON.parse(JSON.stringify(o, (_,v) => v === undefined ? undefined : v));
}

function syntaxHL(json) {
  return json
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?)/g, m => {
      let c = 'j-num';
      if (/^"/.test(m)) c = /:$/.test(m) ? 'j-key' : 'j-str';
      else if (/true|false/.test(m)) c = 'j-bool';
      return `<span class="${c}">${m}</span>`;
    });
}

function render() {
  let out = '';
  if (outFmt === 'openai') out = JSON.stringify(buildOpenAI(), null, 2);
  else if (outFmt === 'jsonschema') out = JSON.stringify(buildJSONSchema(), null, 2);
  else if (outFmt === 'pydantic') { outputPre.textContent = buildPydantic(); return; }
  else { outputPre.textContent = buildZod(); return; }
  outputPre.innerHTML = syntaxHL(out);
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

document.getElementById('btnAddField').addEventListener('click', () => addField());
document.getElementById('btnReset').addEventListener('click', () => { fields = []; schemaName.value=''; schemaDesc.value=''; renderFields(); render(); });
document.getElementById('btnExample').addEventListener('click', () => {
  schemaName.value = 'NewsArticle';
  schemaDesc.value = 'Structured news article extracted from raw text';
  fields = [];
  addField({ name:'title', type:'string', description:'Article headline', required:true });
  addField({ name:'author', type:'string', description:'Author name', required:false, nullable:true });
  addField({ name:'published_at', type:'string', description:'ISO 8601 publish date', required:true });
  addField({ name:'sentiment', type:'string', description:'Overall sentiment: positive, negative, or neutral', required:true });
  addField({ name:'word_count', type:'integer', description:'Total word count of the article', required:true });
  addField({ name:'is_opinion', type:'boolean', description:'True if this is an opinion or editorial piece', required:true });
});
document.getElementById('btnCopy').addEventListener('click', function() {
  navigator.clipboard.writeText(outputPre.textContent);
  this.textContent = 'copied!'; setTimeout(()=>this.textContent='copy',1500);
});
document.querySelectorAll('.tab[data-out]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-out]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); outFmt = btn.dataset.out; render();
  });
});
[schemaName, schemaDesc, optAdditional, optStrict].forEach(el => el.addEventListener('input', render));

renderFields(); render();
