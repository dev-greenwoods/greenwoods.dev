// ── Tokenizer setup ────────────────────────────────────────────────
let encodeFunc = null;

const statusEl = document.getElementById('tokenizerStatus');

function useApproximation() {
  statusEl.textContent = 'Using approximation (~±5% from actual tokenizer)';
  statusEl.className = 'tokenizer-note approx';
  runCount();
}

import('https://esm.sh/gpt-tokenizer@2.1.2')
  .then(mod => {
    encodeFunc = mod.encode;
    statusEl.textContent = 'cl100k_base tokenizer loaded — GPT-4 accurate';
    statusEl.className = 'tokenizer-note ready';
    runCount();
  })
  .catch(useApproximation);

// ── Approximation fallback ─────────────────────────────────────────
function approxTokenCount(text) {
  return window.GreenwoodsTokenCounter.approximateTokenCount(text);
}

function tokenCount(text) {
  if (!text) return 0;
  if (encodeFunc) return encodeFunc(text).length;
  return approxTokenCount(text);
}

// ── Model definitions ──────────────────────────────────────────────
const MODELS = [
  // OpenAI
  { group: 'OpenAI', name: 'GPT-4o',        ctx: 128_000,  factor: 1.00 },
  { group: 'OpenAI', name: 'GPT-4o mini',   ctx: 128_000,  factor: 1.00 },
  { group: 'OpenAI', name: 'o1',            ctx: 128_000,  factor: 1.00 },
  { group: 'OpenAI', name: 'o3-mini',       ctx: 200_000,  factor: 1.00 },
  // Anthropic
  { group: 'Anthropic', name: 'Claude Sonnet 4',  ctx: 200_000, factor: 1.06 },
  { group: 'Anthropic', name: 'Claude Opus 4',    ctx: 200_000, factor: 1.06 },
  { group: 'Anthropic', name: 'Claude Haiku 4.5', ctx: 200_000, factor: 1.06 },
  // Google
  { group: 'Google',    name: 'Gemini 2.5 Pro',   ctx: 1_000_000, factor: 1.10 },
  { group: 'Google',    name: 'Gemini 2.5 Flash',  ctx: 1_000_000, factor: 1.10 },
  // Meta / Open
  { group: 'Meta / Open', name: 'Llama 3.1 70B',  ctx: 128_000, factor: 1.08 },
  { group: 'Meta / Open', name: 'Llama 3.1 405B', ctx: 128_000, factor: 1.08 },
  { group: 'Meta / Open', name: 'Mistral Large',  ctx: 128_000, factor: 1.04 },
  { group: 'Meta / Open', name: 'DeepSeek R1',    ctx: 64_000,  factor: 1.15 },
];

// ── Render ─────────────────────────────────────────────────────────
const inputArea  = document.getElementById('inputArea');
const qsChars    = document.getElementById('qsChars');
const qsWords    = document.getElementById('qsWords');
const qsLines    = document.getElementById('qsLines');
const qsTokens   = document.getElementById('qsTokens');
const modelCards = document.getElementById('modelCards');

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function barClass(pct) {
  if (pct > 100) return 'bar-red';
  if (pct > 80)  return 'bar-orange';
  if (pct > 50)  return 'bar-yellow';
  return 'bar-green';
}

function pctClass(pct) {
  if (pct > 100) return 'pct-over';
  if (pct > 80)  return 'pct-danger';
  if (pct > 50)  return 'pct-warn';
  return '';
}

function renderModels(baseTokens) {
  let lastGroup = '';
  let html = '';

  for (const m of MODELS) {
    if (m.group !== lastGroup) {
      html += `<div class="model-group-label">${m.group}</div>`;
      lastGroup = m.group;
    }

    const tokens = Math.round(baseTokens * m.factor);
    const pct    = baseTokens ? Math.min((tokens / m.ctx) * 100, 105) : 0;
    const over   = tokens > m.ctx;
    const pctDisplay = over
      ? `<span class="model-pct pct-over">exceeds ctx</span>`
      : `<span class="model-pct ${pctClass(pct)}">${pct.toFixed(1)}%</span>`;

    const estimated = m.factor !== 1;
    html += `
      <div class="model-row">
        <div>
          <div class="model-name">${m.name}</div>
          <div class="model-provider">${fmt(m.ctx)} ctx</div>
        </div>
        <div class="model-tokens">${baseTokens ? (estimated ? '~' : '') + fmt(tokens) : '—'}</div>
        <div class="model-bar-wrap">
          <div class="model-bar ${barClass(pct)}" style="width:${Math.min(pct,100)}%"></div>
        </div>
        ${pctDisplay}
      </div>`;
  }

  if (baseTokens) {
    html += `<div class="tokenizer-note" style="text-align:left">~ = estimated count for non-OpenAI models: the cl100k count scaled by a typical per-family factor, not the provider's own tokenizer. OpenAI counts are exact (cl100k_base).</div>`;
  }

  modelCards.innerHTML = html;
}

let debounce;
function runCount() {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    const text = inputArea.value;
    const chars  = text.length;
    const words  = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines  = text ? text.split('\n').length : 0;
    const tokens = tokenCount(text);

    qsChars.textContent  = chars.toLocaleString();
    qsWords.textContent  = words.toLocaleString();
    qsLines.textContent  = lines.toLocaleString();
    qsTokens.textContent = tokens.toLocaleString();

    renderModels(tokens);
  }, 120);
}

inputArea.addEventListener('input', runCount);

// ── Sample ─────────────────────────────────────────────────────────
const SAMPLE = `You are an expert software engineer specializing in TypeScript and React.

Your task is to review the following code and:
1. Identify any potential bugs or edge cases
2. Suggest performance improvements
3. Check for accessibility issues
4. Ensure proper error handling

Here is the component to review:

\`\`\`tsx
import { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

export function UserList({ teamId }: { teamId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(\`/api/teams/\${teamId}/users\`)
      .then(r => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [teamId]);

  return (
    <div>
      {loading && <p>Loading...</p>}
      {users.map(u => <div key={u.id}>{u.name}</div>)}
    </div>
  );
}
\`\`\`

Please format your response as structured JSON with keys: bugs, performance, accessibility, errorHandling.`;

document.getElementById('btnSample').addEventListener('click', () => {
  inputArea.value = SAMPLE;
  runCount();
});

document.getElementById('btnClear').addEventListener('click', () => {
  inputArea.value = '';
  runCount();
});

// Initial render
renderModels(0);
