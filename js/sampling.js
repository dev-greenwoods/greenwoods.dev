// ── Scenarios (raw logits before softmax) ────────────────────────
const SCENARIOS = [
  {
    label: 'completing "The weather today is…"',
    tokens: ['sunny','cloudy','rainy','cold','hot','perfect','terrible','unpredictable','foggy','windy'],
    logits: [3.8, 3.2, 2.9, 2.4, 2.1, 1.8, 1.3, 0.9, 0.7, 0.4],
  },
  {
    label: 'next word after "def fibonacci("',
    tokens: ['n', 'num', 'n:', 'number', 'x', 'limit', 'count', 'size', 'max_n', 'value'],
    logits: [4.5, 3.1, 2.8, 2.2, 1.9, 1.4, 1.1, 0.8, 0.5, 0.2],
  },
  {
    label: 'sentiment: "This movie was…"',
    tokens: ['amazing','terrible','good','awful','okay','boring','fantastic','mediocre','great','disappointing'],
    logits: [2.9, 2.7, 2.3, 2.2, 2.0, 1.8, 1.6, 1.5, 1.4, 1.3],
  },
  {
    label: 'SQL query: "SELECT * FROM users WHERE…"',
    tokens: ['id=?', 'email=?', 'name=?', 'age>', 'status=', 'created>', 'role=', 'active=', 'country=', 'plan='],
    logits: [3.5, 3.3, 2.8, 2.4, 2.2, 1.9, 1.7, 1.5, 1.2, 0.9],
  },
];

let scenIdx = 0;
let temperature = 1.0;
let topP = 1.0;
let topK = 0;

// ── Softmax ───────────────────────────────────────────────────────
function softmax(logits, temp) {
  const scaled = logits.map(l => l / Math.max(temp, 0.001));
  const maxL = Math.max(...scaled);
  const exps = scaled.map(l => Math.exp(l - maxL));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

function applyFilters(probs, tk, tp) {
  const indexed = probs.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
  const inSet = new Set();

  // top-k filter
  const kLimit = tk > 0 ? tk : indexed.length;
  indexed.slice(0, kLimit).forEach(({ i }) => inSet.add(i));

  // top-p filter
  let cumSum = 0;
  const pFiltered = new Set();
  for (const { p, i } of indexed) {
    if (!inSet.has(i)) continue;
    cumSum += p;
    pFiltered.add(i);
    if (cumSum >= tp) break;
  }

  // Renormalize
  const finalProbs = probs.map((p, i) => pFiltered.has(i) ? p : 0);
  const total = finalProbs.reduce((a, b) => a + b, 0);
  return { filtered: finalProbs.map(p => p / (total || 1)), active: pFiltered };
}

// ── Canvas drawing ────────────────────────────────────────────────
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

function isDark() { return document.documentElement.dataset.theme === 'dark'; }

function getColors() {
  const dark = isDark();
  return {
    text:    dark ? '#e8eaf0' : '#111827',
    muted:   dark ? '#7880a0' : '#6b7280',
    faint:   dark ? '#555878' : '#9ca3af',
    border:  dark ? '#252836' : '#e2e6f0',
    surface: dark ? '#161820' : '#ffffff',
    barAct:  dark ? 'rgba(52,211,153,.75)' : 'rgba(5,150,105,.65)',
    barFilt: dark ? 'rgba(85,88,120,.35)'  : 'rgba(209,213,219,.6)',
    ai:      '#7c3aed',
  };
}

function draw() {
  const sc = SCENARIOS[scenIdx];
  const probs = softmax(sc.logits, temperature);
  const { filtered, active } = applyFilters(probs, topK, topP);

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.offsetWidth;
  const H = Math.max(canvas.parentElement.offsetHeight - 60, 200);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  const C = getColors();
  ctx.clearRect(0, 0, W, H);

  const n = sc.tokens.length;
  const padL = 20, padR = 20, padT = 16, padB = 52;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = Math.floor((chartW / n) * 0.68);
  const gap   = Math.floor(chartW / n);

  const maxProb = Math.max(...filtered.map((p,i) => Math.max(p, probs[i])));

  for (let i = 0; i < n; i++) {
    const x = padL + i * gap + (gap - barW) / 2;
    const rawH = (probs[i] / (maxProb || 1)) * chartH;
    const filtH = (filtered[i] / (maxProb || 1)) * chartH;
    const isActive = active.has(i);

    // Raw prob (ghost)
    ctx.fillStyle = C.barFilt;
    ctx.beginPath();
    ctx.roundRect(x, padT + chartH - rawH, barW, rawH, [3, 3, 0, 0]);
    ctx.fill();

    // Filtered / active prob
    if (isActive && filtH > 0) {
      ctx.fillStyle = C.barAct;
      ctx.beginPath();
      ctx.roundRect(x, padT + chartH - filtH, barW, filtH, [3, 3, 0, 0]);
      ctx.fill();
    }

    // Probability label
    ctx.fillStyle = isActive ? C.text : C.faint;
    ctx.font = `${dpr > 1 ? 10 : 9}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    const pct = (filtered[i] * 100).toFixed(1);
    ctx.fillText(pct + '%', x + barW / 2, padT + chartH - rawH - 5);

    // Token label
    ctx.fillStyle = isActive ? C.muted : C.faint;
    ctx.font = `bold ${dpr > 1 ? 11 : 10}px JetBrains Mono, monospace`;
    ctx.fillText(sc.tokens[i], x + barW / 2, padT + chartH + 18);
  }

  // Baseline
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, padT + chartH); ctx.lineTo(W - padR, padT + chartH);
  ctx.stroke();

  // Update footer
  const activeTokens = sc.tokens.filter((_, i) => active.has(i));
  const entropy = -filtered.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
  document.getElementById('chartFooter').textContent =
    `${activeTokens.length} of ${n} tokens in sampling pool · entropy: ${entropy.toFixed(2)} bits · top token: "${sc.tokens[0]}" (${(filtered[0]*100).toFixed(1)}%)`;
}

// ── Explanation ───────────────────────────────────────────────────
function explain() {
  const parts = [];
  if (temperature < 0.3) parts.push(`<b>Temperature ${temperature.toFixed(2)}</b>: Very low — model is nearly deterministic, always picking the top token. Good for factual recall, bad for creativity.`);
  else if (temperature < 0.8) parts.push(`<b>Temperature ${temperature.toFixed(2)}</b>: Low — concentrated distribution, model favors high-probability tokens. Predictable and coherent.`);
  else if (temperature < 1.3) parts.push(`<b>Temperature ${temperature.toFixed(2)}</b>: Default range — balanced creativity and coherence.`);
  else parts.push(`<b>Temperature ${temperature.toFixed(2)}</b>: High — distribution is flattened, more random and creative outputs. May become incoherent at very high values.`);

  if (topP < 1) parts.push(`<b>Top-p ${topP}</b>: Nucleus sampling keeps tokens until their cumulative probability reaches ${(topP*100).toFixed(0)}%. Tokens outside this nucleus are excluded.`);
  else parts.push(`<b>Top-p 1.0</b>: No nucleus filtering — all tokens remain eligible.`);

  if (topK > 0) parts.push(`<b>Top-k ${topK}</b>: Only the top ${topK} most probable tokens are kept before sampling.`);
  else parts.push(`<b>Top-k off</b>: No k-filtering applied.`);

  document.getElementById('explainBox').innerHTML = parts.join('<br><br>');
}

// ── Wiring ────────────────────────────────────────────────────────
const tempSlider = document.getElementById('tempSlider');
const topPSlider = document.getElementById('topPSlider');
const topKSlider = document.getElementById('topKSlider');
const tempValEl  = document.getElementById('tempVal');
const topPValEl  = document.getElementById('topPVal');
const topKValEl  = document.getElementById('topKVal');

tempSlider.addEventListener('input', () => {
  temperature = parseFloat(tempSlider.value);
  tempValEl.textContent = temperature.toFixed(2);
  document.querySelectorAll('.preset-btn[data-t]').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.t) === temperature));
  draw(); explain();
});

topPSlider.addEventListener('input', () => {
  topP = parseFloat(topPSlider.value);
  topPValEl.textContent = topP.toFixed(2);
  document.querySelectorAll('.preset-btn[data-p]').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.p) === topP));
  draw(); explain();
});

topKSlider.addEventListener('input', () => {
  topK = parseInt(topKSlider.value);
  topKValEl.textContent = topK === 0 ? 'off' : String(topK);
  draw(); explain();
});

document.querySelectorAll('.preset-btn[data-t]').forEach(btn => {
  btn.addEventListener('click', () => {
    temperature = parseFloat(btn.dataset.t);
    tempSlider.value = temperature;
    tempValEl.textContent = temperature.toFixed(2);
    document.querySelectorAll('.preset-btn[data-t]').forEach(b => b.classList.toggle('active', b === btn));
    draw(); explain();
  });
});

document.querySelectorAll('.preset-btn[data-p]').forEach(btn => {
  btn.addEventListener('click', () => {
    topP = parseFloat(btn.dataset.p);
    topPSlider.value = topP;
    topPValEl.textContent = topP.toFixed(2);
    document.querySelectorAll('.preset-btn[data-p]').forEach(b => b.classList.toggle('active', b === btn));
    draw(); explain();
  });
});

document.getElementById('btnScenario').addEventListener('click', () => {
  scenIdx = (scenIdx + 1) % SCENARIOS.length;
  document.getElementById('scenarioLabel').textContent = 'Scenario: ' + SCENARIOS[scenIdx].label;
  draw(); explain();
});

window.addEventListener('resize', draw);

// Re-draw on theme change
const observer = new MutationObserver(draw);
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

draw(); explain();
