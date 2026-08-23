// Prices per 1M tokens (input, output) in USD
const MODELS = [
  { group:'OpenAI',         name:'GPT-4o',            input:5.00,   output:20.00  },
  { group:'OpenAI',         name:'GPT-4o mini',       input:0.15,   output:0.60   },
  { group:'OpenAI',         name:'o3',                input:10.00,  output:40.00  },
  { group:'OpenAI',         name:'o3-mini',           input:1.10,   output:4.40   },
  { group:'OpenAI',         name:'o4-mini',           input:1.10,   output:4.40   },
  { group:'Anthropic',      name:'Claude Opus 4',     input:15.00,  output:75.00  },
  { group:'Anthropic',      name:'Claude Sonnet 4',   input:3.00,   output:15.00  },
  { group:'Anthropic',      name:'Claude Haiku 4.5',  input:0.80,   output:4.00   },
  { group:'Google',         name:'Gemini 2.5 Pro',    input:1.25,   output:10.00  },
  { group:'Google',         name:'Gemini 2.5 Flash',  input:0.15,   output:0.60   },
  { group:'Google',         name:'Gemini 2.0 Flash',  input:0.10,   output:0.40   },
  { group:'Groq / Open',    name:'Llama 3.3 70B',     input:0.59,   output:0.79   },
  { group:'Groq / Open',    name:'DeepSeek R1',       input:0.55,   output:2.19   },
  { group:'Groq / Open',    name:'Mixtral 8x7B',      input:0.27,   output:0.27   },
  { group:'Mistral',        name:'Mistral Large',     input:2.00,   output:6.00   },
  { group:'Mistral',        name:'Mistral Small',     input:0.10,   output:0.30   },
];

// ── Format helpers ─────────────────────────────────────────────────
function fmtUSD(n) {
  if (n === 0) return '$0.00';
  if (n < 0.001)   return '<$0.001';
  if (n < 0.01)    return '$' + n.toFixed(4);
  if (n < 1)       return '$' + n.toFixed(3);
  if (n < 100)     return '$' + n.toFixed(2);
  if (n < 10_000)  return '$' + n.toFixed(0);
  return '$' + (n / 1000).toFixed(1) + 'k';
}

function fmtPrice(p) { return '$' + p.toFixed(2); }

// ── Render ─────────────────────────────────────────────────────────
const inEl    = document.getElementById('inputTokens');
const outEl   = document.getElementById('outputTokens');
const callsEl = document.getElementById('numCalls');
const rows    = document.getElementById('costRows');

function calculate() {
  const inputTok  = Math.max(0, Number(inEl.value)    || 0);
  const outputTok = Math.max(0, Number(outEl.value)   || 0);
  const calls     = Math.max(1, Number(callsEl.value)  || 1);

  // Compute totals for all models to find max (for bar)
  const costs = MODELS.map(m => {
    const perCall = (inputTok / 1_000_000) * m.input + (outputTok / 1_000_000) * m.output;
    const total   = perCall * calls;
    return { ...m, perCall, total };
  });

  const maxTotal = Math.max(...costs.map(c => c.total), 0.000001);

  let html = '';
  let lastGroup = '';

  for (const c of costs) {
    if (c.group !== lastGroup) {
      html += `<div class="cost-row-group">${c.group}</div>`;
      lastGroup = c.group;
    }

    const pct = (c.total / maxTotal) * 100;
    const totalClass = c.total > 100 ? 'very-expensive' : c.total > 10 ? 'expensive' : '';

    html += `
      <div class="cost-row">
        <div><div class="cr-name">${c.name}</div></div>
        <div class="cr-price">${fmtPrice(c.input)}</div>
        <div class="cr-price">${fmtPrice(c.output)}</div>
        <div></div>
        <div class="cr-per-call">${fmtUSD(c.perCall)}</div>
        <div class="cr-total ${totalClass}">${fmtUSD(c.total)}</div>
      </div>`;
  }

  rows.innerHTML = html;
}

// ── Events ─────────────────────────────────────────────────────────
[inEl, outEl, callsEl].forEach(el => el.addEventListener('input', calculate));

document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const field = btn.dataset.field;
    const val   = btn.dataset.val;
    if (field === 'input')  inEl.value    = val;
    if (field === 'output') outEl.value   = val;
    if (field === 'calls')  callsEl.value = val;
    calculate();
  });
});

calculate();
