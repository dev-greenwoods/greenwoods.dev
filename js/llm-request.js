// ── Config ────────────────────────────────────────────────────────
const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    envVar: 'OPENAI_API_KEY',
    headerKey: 'Authorization',
    headerVal: 'Bearer YOUR_API_KEY',
    sdkPkg: 'openai',
    models: ['gpt-4o','gpt-4o-mini','gpt-4.1','gpt-4.1-mini','o3','o3-mini','o4-mini'],
  },
  anthropic: {
    label: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    envVar: 'ANTHROPIC_API_KEY',
    headerKey: 'x-api-key',
    headerVal: 'YOUR_API_KEY',
    sdkPkg: '@anthropic-ai/sdk',
    models: ['claude-opus-4','claude-sonnet-4-5','claude-sonnet-4','claude-haiku-4-5'],
  },
  google: {
    label: 'Google AI',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
    envVar: 'GOOGLE_API_KEY',
    headerKey: 'x-goog-api-key',
    headerVal: 'YOUR_API_KEY',
    sdkPkg: '@google/generative-ai',
    models: ['gemini-2.5-pro','gemini-2.5-flash','gemini-2.0-flash','gemini-1.5-pro'],
  },
};

// ── State ─────────────────────────────────────────────────────────
let provider = 'openai';
let messages = [{ role: 'user', id: Date.now() }];
let lang = 'curl';

// ── DOM ───────────────────────────────────────────────────────────
const modelSel    = document.getElementById('modelSel');
const systemPrompt= document.getElementById('systemPrompt');
const msgList     = document.getElementById('msgList');
const tempSlider  = document.getElementById('tempSlider');
const tempVal     = document.getElementById('tempVal');
const maxTokens   = document.getElementById('maxTokens');
const stopSeqs    = document.getElementById('stopSeqs');
const codeOutput  = document.getElementById('codeOutput');
const codeMeta    = document.getElementById('codeMeta');

// Provider tabs
document.querySelectorAll('.prov-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.prov-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    provider = btn.dataset.prov;
    populateModels();
    render();
  });
});

function populateModels() {
  const prov = PROVIDERS[provider];
  modelSel.innerHTML = prov.models.map(m => `<option value="${m}">${m}</option>`).join('');
}

// Language tabs
document.querySelectorAll('.tab[data-lang]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-lang]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    lang = btn.dataset.lang;
    render();
  });
});

// Temperature
tempSlider.addEventListener('input', () => {
  tempVal.textContent = parseFloat(tempSlider.value).toFixed(1);
  render();
});

// Other fields
[modelSel, systemPrompt, maxTokens, stopSeqs].forEach(el => {
  el.addEventListener('input', render);
});

// Messages
function addMessage(role) {
  messages.push({ role, id: Date.now() + Math.random() });
  renderMessages();
  render();
}

function removeMessage(id) {
  messages = messages.filter(m => m.id !== id);
  renderMessages();
  render();
}

function renderMessages() {
  msgList.innerHTML = '';
  messages.forEach((msg, i) => {
    const card = document.createElement('div');
    card.className = `msg-card role-${msg.role}`;
    card.innerHTML = `
      <div class="msg-hd">
        <span class="msg-role role-${msg.role}">${msg.role}</span>
        <button class="msg-rm" data-rm="${msg.id}">remove</button>
      </div>
      <textarea rows="2" placeholder="${msg.role === 'user' ? 'User message…' : 'Assistant message…'}"
        data-msgid="${msg.id}">${escHtml(msg.content || '')}</textarea>
    `;
    msgList.appendChild(card);
    card.querySelector('[data-rm]').addEventListener('click', () => removeMessage(msg.id));
    card.querySelector('textarea').addEventListener('input', function() {
      const m = messages.find(m => m.id === msg.id);
      if (m) { m.content = this.value; render(); }
    });
  });
}

document.getElementById('btnAddUser').addEventListener('click', () => addMessage('user'));
document.getElementById('btnAddAssistant').addEventListener('click', () => addMessage('assistant'));

document.getElementById('btnReset').addEventListener('click', () => {
  systemPrompt.value = '';
  messages = [{ role: 'user', id: Date.now() }];
  tempSlider.value = 0.7; tempVal.textContent = '0.7';
  maxTokens.value = 1024;
  stopSeqs.value = '';
  renderMessages();
  render();
});

document.getElementById('btnCopy').addEventListener('click', function() {
  navigator.clipboard.writeText(codeOutput.textContent);
  this.textContent = 'copied!';
  setTimeout(() => this.textContent = 'copy', 1500);
});

// ── Code generation ───────────────────────────────────────────────
function getParams() {
  const prov = PROVIDERS[provider];
  const model = modelSel.value || prov.models[0];
  const sys = systemPrompt.value.trim();
  const temp = parseFloat(tempSlider.value);
  const maxTok = parseInt(maxTokens.value) || 1024;
  const stops = stopSeqs.value.split(',').map(s => s.trim().replace(/^"|"$/g,'')).filter(Boolean);
  const msgs = messages.filter(m => m.content?.trim());
  return { prov, model, sys, temp, maxTok, stops, msgs };
}

function buildOpenAIBody({ model, sys, temp, maxTok, stops, msgs }) {
  const body = {
    model,
    messages: [
      ...(sys ? [{ role: 'system', content: sys }] : []),
      ...msgs.map(m => ({ role: m.role, content: m.content })),
    ],
    temperature: temp,
    max_tokens: maxTok,
  };
  if (stops.length) body.stop = stops;
  return body;
}

function buildAnthropicBody({ model, sys, temp, maxTok, stops, msgs }) {
  const body = {
    model,
    max_tokens: maxTok,
    temperature: temp,
    messages: msgs.map(m => ({ role: m.role, content: m.content })),
  };
  if (sys) body.system = sys;
  if (stops.length) body.stop_sequences = stops;
  return body;
}

function buildGoogleBody({ sys, temp, maxTok, msgs }) {
  const contents = msgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const body = {
    contents,
    generationConfig: { temperature: temp, maxOutputTokens: maxTok },
  };
  if (sys) body.systemInstruction = { parts: [{ text: sys }] };
  return body;
}

function genCurl(p) {
  const { prov } = p;
  let url = prov.endpoint.replace('{MODEL}', p.model);
  if (provider === 'google') url += `?key=YOUR_API_KEY`;

  let body;
  if (provider === 'openai') body = buildOpenAIBody(p);
  else if (provider === 'anthropic') body = buildAnthropicBody(p);
  else body = buildGoogleBody(p);

  const headers = [`  -H 'Content-Type: application/json'`];
  if (provider !== 'google') headers.push(`  -H '${prov.headerKey}: ${prov.headerVal}'`);
  if (provider === 'anthropic') headers.push(`  -H 'anthropic-version: 2023-06-01'`);

  return `curl -X POST '${url}' \\
${headers.join(' \\\n')} \\
  -d '${JSON.stringify(body, null, 2).replace(/'/g, "'\\''")}'`;
}

function genPython(p) {
  const { prov } = p;
  if (provider === 'openai') {
    const body = buildOpenAIBody(p);
    return `from openai import OpenAI
import os

client = OpenAI(api_key=os.environ["${prov.envVar}"])

response = client.chat.completions.create(
    model="${p.model}",
    messages=${JSON.stringify(body.messages, null, 4).replace(/^/gm, '    ').trim()},
    temperature=${p.temp},
    max_tokens=${p.maxTok},${p.stops.length ? `\n    stop=${JSON.stringify(p.stops)},` : ''}
)

print(response.choices[0].message.content)`;
  } else if (provider === 'anthropic') {
    const msgs = p.msgs.map(m => `{"role": "${m.role}", "content": "${(m.content||'').replace(/"/g,'\\"')}"}`);
    return `import anthropic
import os

client = anthropic.Anthropic(api_key=os.environ["${prov.envVar}"])

message = client.messages.create(
    model="${p.model}",
    max_tokens=${p.maxTok},
    temperature=${p.temp},${p.sys ? `\n    system="${p.sys.replace(/"/g,'\\"')}",` : ''}
    messages=[
        ${msgs.join(',\n        ')}
    ],
)

print(message.content[0].text)`;
  } else {
    return `import google.generativeai as genai
import os

genai.configure(api_key=os.environ["${prov.envVar}"])
model = genai.GenerativeModel("${p.model}"${p.sys ? `,\n    system_instruction="${p.sys.replace(/"/g,'\\"')}"` : ''})

response = model.generate_content(
    "${((p.msgs.find(m=>m.role==='user')?.content)||'Hello!').replace(/"/g,'\\"')}",
    generation_config=genai.GenerationConfig(
        temperature=${p.temp},
        max_output_tokens=${p.maxTok},
    )
)

print(response.text)`;
  }
}

function genJS(p) {
  const { prov } = p;
  if (provider === 'openai') {
    const msgs = p.msgs.map(m => `  { role: "${m.role}", content: \`${(m.content||'').replace(/`/g,'\\`')}\` }`);
    const sysPart = p.sys ? `  { role: "system", content: \`${p.sys.replace(/`/g,'\\`')}\` },\n` : '';
    return `import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.${prov.envVar} });

const response = await client.chat.completions.create({
  model: "${p.model}",
  messages: [
${sysPart}${msgs.join(',\n')}
  ],
  temperature: ${p.temp},
  max_tokens: ${p.maxTok},${p.stops.length ? `\n  stop: ${JSON.stringify(p.stops)},` : ''}
});

console.log(response.choices[0].message.content);`;
  } else if (provider === 'anthropic') {
    const msgs = p.msgs.map(m => `  { role: "${m.role}", content: \`${(m.content||'').replace(/`/g,'\\`')}\` }`);
    return `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.${prov.envVar} });

const message = await client.messages.create({
  model: "${p.model}",
  max_tokens: ${p.maxTok},
  temperature: ${p.temp},${p.sys ? `\n  system: \`${p.sys.replace(/`/g,'\\`')}\`,` : ''}
  messages: [
${msgs.join(',\n')}
  ],
});

console.log(message.content[0].text);`;
  } else {
    return `import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.${prov.envVar});
const model = genAI.getGenerativeModel({
  model: "${p.model}",${p.sys ? `\n  systemInstruction: \`${p.sys.replace(/`/g,'\\`')}\`,` : ''}
});

const result = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: \`${((p.msgs.find(m=>m.role==='user')?.content)||'Hello!').replace(/`/g,'\\`')}\` }] }],
  generationConfig: { temperature: ${p.temp}, maxOutputTokens: ${p.maxTok} },
});

console.log(result.response.text());`;
  }
}

function render() {
  const p = getParams();
  let code = '';
  if (lang === 'curl') code = genCurl(p);
  else if (lang === 'python') code = genPython(p);
  else code = genJS(p);

  codeOutput.textContent = code;
  const prov = PROVIDERS[provider];
  codeMeta.textContent = `${prov.label} · ${p.model} · ${p.msgs.length} message${p.msgs.length!==1?'s':''}`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ──────────────────────────────────────────────────────────
populateModels();
renderMessages();
render();
