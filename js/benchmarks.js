// null = not publicly reported
const MODELS = [
  // OpenAI
  { name:'GPT-4o',        id:'gpt-4o',             provider:'OpenAI',    mmlu:88.7, humaneval:90.2, math:76.6, gpqa:53.6, mmmu:69.1 },
  { name:'GPT-4o mini',   id:'gpt-4o-mini',         provider:'OpenAI',    mmlu:82.0, humaneval:87.2, math:70.2, gpqa:40.2, mmmu:59.4 },
  { name:'o3',            id:'o3',                  provider:'OpenAI',    mmlu:91.8, humaneval:99.2, math:97.9, gpqa:87.7, mmmu:82.9 },
  { name:'o3-mini',       id:'o3-mini',             provider:'OpenAI',    mmlu:86.9, humaneval:97.3, math:90.0, gpqa:79.7, mmmu:null },
  { name:'o4-mini',       id:'o4-mini',             provider:'OpenAI',    mmlu:89.4, humaneval:99.4, math:93.4, gpqa:79.9, mmmu:73.0 },
  { name:'GPT-4.1',       id:'gpt-4.1',             provider:'OpenAI',    mmlu:90.4, humaneval:96.0, math:85.5, gpqa:66.3, mmmu:74.0 },
  { name:'GPT-4.1 mini',  id:'gpt-4.1-mini',        provider:'OpenAI',    mmlu:85.0, humaneval:93.1, math:71.4, gpqa:49.8, mmmu:65.0 },
  // Anthropic
  { name:'Claude Opus 4', id:'claude-opus-4',       provider:'Anthropic', mmlu:90.4, humaneval:96.0, math:89.9, gpqa:78.1, mmmu:78.2 },
  { name:'Claude Sonnet 4.5',id:'claude-sonnet-4-5',provider:'Anthropic', mmlu:88.7, humaneval:95.6, math:85.0, gpqa:67.2, mmmu:74.3 },
  { name:'Claude Sonnet 4',id:'claude-sonnet-4',    provider:'Anthropic', mmlu:88.7, humaneval:95.6, math:85.0, gpqa:67.2, mmmu:74.3 },
  { name:'Claude Haiku 4.5',id:'claude-haiku-4-5',  provider:'Anthropic', mmlu:74.0, humaneval:82.5, math:57.0, gpqa:41.0, mmmu:58.0 },
  // Google
  { name:'Gemini 2.5 Pro',  id:'gemini-2.5-pro',   provider:'Google',    mmlu:91.8, humaneval:99.3, math:97.0, gpqa:86.4, mmmu:81.7 },
  { name:'Gemini 2.5 Flash',id:'gemini-2.5-flash',  provider:'Google',    mmlu:89.2, humaneval:97.5, math:92.4, gpqa:78.4, mmmu:77.5 },
  { name:'Gemini 2.0 Flash',id:'gemini-2.0-flash',  provider:'Google',    mmlu:85.6, humaneval:90.0, math:82.0, gpqa:62.1, mmmu:71.7 },
  { name:'Gemini 1.5 Pro',  id:'gemini-1.5-pro',    provider:'Google',    mmlu:85.9, humaneval:84.1, math:67.7, gpqa:46.2, mmmu:62.2 },
  // Meta / Open
  { name:'Llama 3.3 70B',  id:'llama-3.3-70b',     provider:'Meta',      mmlu:86.0, humaneval:88.4, math:77.0, gpqa:50.5, mmmu:null },
  { name:'Llama 3.1 405B', id:'llama-3.1-405b',    provider:'Meta',      mmlu:88.6, humaneval:89.0, math:73.8, gpqa:51.1, mmmu:null },
  { name:'DeepSeek R1',    id:'deepseek-r1',        provider:'Meta',      mmlu:90.8, humaneval:92.3, math:97.3, gpqa:71.5, mmmu:null },
  { name:'DeepSeek V3',    id:'deepseek-v3',        provider:'Meta',      mmlu:88.5, humaneval:90.2, math:90.2, gpqa:59.1, mmmu:null },
  { name:'Qwen2.5 72B',   id:'qwen2.5-72b',        provider:'Meta',      mmlu:88.3, humaneval:93.5, math:83.1, gpqa:49.0, mmmu:null },
];

let activeProv = 'all';
let sortCol = 'mmlu';
let sortDir = 'desc';

function avg(m) {
  const scores = [m.mmlu, m.humaneval, m.math, m.gpqa, m.mmmu].filter(s => s !== null);
  return scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
}

function scoreBar(val, max=100) {
  if (val === null) return `<span class="score-na">—</span>`;
  const w = Math.round((val/max)*100);
  const cls = val >= 85 ? 'score-hi' : val >= 65 ? 'score-md' : 'score-lo';
  const barColor = val >= 85 ? '#10b981' : val >= 65 ? '#f59e0b' : '#ef4444';
  return `<div class="score-cell">
    <div class="score-bar-w"><div class="score-bar-f" style="width:${w}%;background:${barColor}"></div></div>
    <span class="${cls}">${val.toFixed(1)}</span>
  </div>`;
}

function provClass(p) {
  return {'OpenAI':'prov-openai','Anthropic':'prov-anthropic','Google':'prov-google','Meta':'prov-meta'}[p]||'prov-meta';
}

function render() {
  let list = activeProv === 'all' ? [...MODELS] : MODELS.filter(m => m.provider === activeProv);
  list.sort((a,b) => {
    let av = sortCol === 'avg' ? avg(a) : a[sortCol];
    let bv = sortCol === 'avg' ? avg(b) : b[sortCol];
    av = av ?? -1; bv = bv ?? -1;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  document.getElementById('modelCount').textContent = `${list.length} models`;

  document.getElementById('bmTbody').innerHTML = list.map(m => {
    const a = avg(m);
    return `<tr>
      <td><div class="model-name">${m.name}</div><div class="model-id">${m.id}</div></td>
      <td><span class="prov-badge ${provClass(m.provider)}">${m.provider}</span></td>
      <td class="num-col">${scoreBar(m.mmlu)}</td>
      <td class="num-col">${scoreBar(m.humaneval)}</td>
      <td class="num-col">${scoreBar(m.math)}</td>
      <td class="num-col">${scoreBar(m.gpqa)}</td>
      <td class="num-col">${scoreBar(m.mmmu)}</td>
      <td class="num-col avg-cell">${a !== null ? a.toFixed(1) : '—'}</td>
    </tr>`;
  }).join('');
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); activeProv = btn.dataset.prov; render();
  });
});
document.querySelectorAll('th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (sortCol === col) sortDir = sortDir === 'desc' ? 'asc' : 'desc';
    else { sortCol = col; sortDir = 'desc'; }
    document.querySelectorAll('th.sortable').forEach(t=>t.classList.remove('sorted-asc','sorted-desc'));
    th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    render();
  });
});

// Set initial sort indicator
document.querySelector('th[data-col="mmlu"]').classList.add('sorted-desc');
render();
