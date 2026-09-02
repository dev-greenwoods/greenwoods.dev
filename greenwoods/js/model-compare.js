// ── Model data ────────────────────────────────────────────────────
// inputCost / outputCost in $/1M tokens
const MODELS = [
  // OpenAI
  { name:'GPT-4o',          id:'gpt-4o',                provider:'OpenAI',    context:128_000,  output:16_384,  inputCost:2.50,   outputCost:10.00,  vision:true,  tools:true,  streaming:true, note:'Flagship multimodal model' },
  { name:'GPT-4o mini',     id:'gpt-4o-mini',            provider:'OpenAI',    context:128_000,  output:16_384,  inputCost:0.15,   outputCost:0.60,   vision:true,  tools:true,  streaming:true, note:'Cost-efficient, fast' },
  { name:'o3',              id:'o3',                     provider:'OpenAI',    context:200_000,  output:100_000, inputCost:10.00,  outputCost:40.00,  vision:true,  tools:true,  streaming:true, note:'Best reasoning, slow' },
  { name:'o3-mini',         id:'o3-mini',                provider:'OpenAI',    context:200_000,  output:65_536,  inputCost:1.10,   outputCost:4.40,   vision:false, tools:true,  streaming:true, note:'Fast reasoning' },
  { name:'o4-mini',         id:'o4-mini',                provider:'OpenAI',    context:200_000,  output:100_000, inputCost:1.10,   outputCost:4.40,   vision:true,  tools:true,  streaming:true, note:'Compact reasoning + vision' },
  { name:'GPT-4.1',         id:'gpt-4.1',                provider:'OpenAI',    context:1_047_576,output:32_768,  inputCost:2.00,   outputCost:8.00,   vision:true,  tools:true,  streaming:true, note:'1M context window' },
  { name:'GPT-4.1 mini',    id:'gpt-4.1-mini',           provider:'OpenAI',    context:1_047_576,output:32_768,  inputCost:0.40,   outputCost:1.60,   vision:true,  tools:true,  streaming:true, note:'Budget 1M context' },
  // Anthropic
  { name:'Claude Opus 4',   id:'claude-opus-4',          provider:'Anthropic', context:200_000,  output:32_000,  inputCost:15.00,  outputCost:75.00,  vision:true,  tools:true,  streaming:true, note:'Most capable Claude' },
  { name:'Claude Sonnet 4', id:'claude-sonnet-4',        provider:'Anthropic', context:200_000,  output:16_000,  inputCost:3.00,   outputCost:15.00,  vision:true,  tools:true,  streaming:true, note:'Best perf/cost balance' },
  { name:'Claude Sonnet 4.5',id:'claude-sonnet-4-5',     provider:'Anthropic', context:200_000,  output:16_000,  inputCost:3.00,   outputCost:15.00,  vision:true,  tools:true,  streaming:true, note:'Latest Sonnet iteration' },
  { name:'Claude Haiku 4.5',id:'claude-haiku-4-5',       provider:'Anthropic', context:200_000,  output:8_096,   inputCost:0.80,   outputCost:4.00,   vision:true,  tools:true,  streaming:true, note:'Ultra-fast, very cheap' },
  // Google
  { name:'Gemini 2.5 Pro',  id:'gemini-2.5-pro',         provider:'Google',    context:1_048_576,output:65_536,  inputCost:1.25,   outputCost:10.00,  vision:true,  tools:true,  streaming:true, note:'1M ctx, best Google model' },
  { name:'Gemini 2.5 Flash',id:'gemini-2.5-flash',       provider:'Google',    context:1_048_576,output:65_536,  inputCost:0.15,   outputCost:0.60,   vision:true,  tools:true,  streaming:true, note:'Fast, huge context' },
  { name:'Gemini 2.0 Flash',id:'gemini-2.0-flash',       provider:'Google',    context:1_048_576,output:8_192,   inputCost:0.10,   outputCost:0.40,   vision:true,  tools:true,  streaming:true, note:'Budget multimodal' },
  // Meta / Open
  { name:'Llama 3.3 70B',   id:'llama-3.3-70b',          provider:'Meta',      context:128_000,  output:32_768,  inputCost:0.59,   outputCost:0.79,   vision:false, tools:true,  streaming:true, note:'Best open-weight model' },
  { name:'Llama 3.1 405B',  id:'llama-3.1-405b',         provider:'Meta',      context:128_000,  output:16_384,  inputCost:3.00,   outputCost:3.00,   vision:false, tools:true,  streaming:true, note:'Largest Llama, via API' },
  { name:'Llama 3.2 11B',   id:'llama-3.2-11b',          provider:'Meta',      context:128_000,  output:8_192,   inputCost:0.18,   outputCost:0.18,   vision:true,  tools:false, streaming:true, note:'Compact vision model' },
  { name:'DeepSeek R1',     id:'deepseek-r1',             provider:'Meta',      context:128_000,  output:32_768,  inputCost:0.55,   outputCost:2.19,   vision:false, tools:false, streaming:true, note:'Strong reasoning, open' },
  { name:'DeepSeek V3',     id:'deepseek-chat',           provider:'Meta',      context:64_000,   output:8_192,   inputCost:0.27,   outputCost:1.10,   vision:false, tools:true,  streaming:true, note:'Fast, affordable' },
  // Mistral
  { name:'Mistral Large',   id:'mistral-large-latest',   provider:'Mistral',   context:128_000,  output:8_192,   inputCost:2.00,   outputCost:6.00,   vision:false, tools:true,  streaming:true, note:'Top Mistral model' },
  { name:'Mistral Small',   id:'mistral-small-latest',   provider:'Mistral',   context:32_000,   output:8_192,   inputCost:0.10,   outputCost:0.30,   vision:false, tools:true,  streaming:true, note:'Fast, cheap' },
  { name:'Codestral',       id:'codestral-latest',       provider:'Mistral',   context:256_000,  output:32_768,  inputCost:0.30,   outputCost:0.90,   vision:false, tools:true,  streaming:true, note:'Specialized for code' },
  { name:'Pixtral Large',   id:'pixtral-large-latest',   provider:'Mistral',   context:128_000,  output:8_192,   inputCost:2.00,   outputCost:6.00,   vision:true,  tools:true,  streaming:true, note:'Multimodal Mistral' },
];

const MAX_CTX = Math.max(...MODELS.map(m => m.context));

// ── State ─────────────────────────────────────────────────────────
let activeProvider = 'all';
let sortCol = 'name';
let sortDir = 'asc';

// ── DOM ───────────────────────────────────────────────────────────
const tbody      = document.getElementById('modelTbody');
const modelCount = document.getElementById('modelCount');

// Provider filter
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeProvider = btn.dataset.provider;
    render();
  });
});

// Sort
document.querySelectorAll('th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortCol = col; sortDir = 'asc'; }
    document.querySelectorAll('th.sortable').forEach(t => t.classList.remove('sorted-asc','sorted-desc'));
    th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    render();
  });
});

function provClass(p) {
  const m = { 'OpenAI':'prov-openai','Anthropic':'prov-anthropic','Google':'prov-google','Meta':'prov-meta','Mistral':'prov-mistral' };
  return m[p] || 'prov-deepseek';
}

function fmtCtx(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
  return String(n);
}

function costClass(v) {
  if (v <= 0.5) return 'cost-lo';
  if (v <= 5)   return 'cost-mid';
  return 'cost-hi';
}

function capIcon(v) {
  return v
    ? '<span class="cap-yes">✓</span>'
    : '<span class="cap-no">·</span>';
}

function render() {
  let list = activeProvider === 'all' ? [...MODELS] : MODELS.filter(m => m.provider === activeProvider);

  // Sort
  list.sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol];
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  modelCount.textContent = `${list.length} model${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="no-results">No models for this filter</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(m => {
    const barW = Math.max(4, Math.round((m.context / MAX_CTX) * 100));
    return `
    <tr>
      <td>
        <div class="model-name">${m.name}</div>
        <div class="model-id">${m.id}</div>
      </td>
      <td><span class="prov-badge ${provClass(m.provider)}">${m.provider}</span></td>
      <td class="num-col">
        <div class="ctx-cell">
          <div class="ctx-bar-wrap"><div class="ctx-bar" style="width:${barW}%"></div></div>
          ${fmtCtx(m.context)}
        </div>
      </td>
      <td class="num-col">${fmtCtx(m.output)}</td>
      <td class="num-col"><span class="${costClass(m.inputCost)}">$${m.inputCost.toFixed(2)}</span></td>
      <td class="num-col"><span class="${costClass(m.outputCost)}">$${m.outputCost.toFixed(2)}</span></td>
      <td class="center-col">${capIcon(m.vision)}</td>
      <td class="center-col">${capIcon(m.tools)}</td>
      <td class="center-col">${capIcon(m.streaming)}</td>
      <td class="model-note">${m.note}</td>
    </tr>`;
  }).join('');
}

render();
