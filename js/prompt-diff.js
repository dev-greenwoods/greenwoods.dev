const inputA = document.getElementById('inputA');
const inputB = document.getElementById('inputB');
const diffOutput = document.getElementById('diffOutput');
const diffStats = document.getElementById('diffStats');
const dsAdd = document.getElementById('dsAdd');
const dsRem = document.getElementById('dsRem');
const dsSim = document.getElementById('dsSim');
const statsA = document.getElementById('statsA');
const statsB = document.getElementById('statsB');

let mode = 'word';

document.querySelectorAll('.tab[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    run();
  });
});

// ── LCS diff ──────────────────────────────────────────────────────
function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, () => new Int32Array(n+1));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j], dp[i][j-1]);
  // Backtrack
  const res = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) { res.push({type:'eq', val:a[i-1]}); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { res.push({type:'add', val:b[j-1]}); j--; }
    else { res.push({type:'rem', val:a[i-1]}); i--; }
  }
  return res.reverse();
}

function tokenize(text, m) {
  if (m === 'line') return text.split('\n');
  // word mode: split preserving whitespace tokens
  return text.match(/\S+|\s+/g) || [];
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function approxTokens(text) {
  if (!text) return 0;
  return Math.round(text.length / 4);
}

function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function run() {
  const a = inputA.value, b = inputB.value;
  statsA.textContent = `~${approxTokens(a).toLocaleString()} tokens · ${wordCount(a).toLocaleString()} words`;
  statsB.textContent = `~${approxTokens(b).toLocaleString()} tokens · ${wordCount(b).toLocaleString()} words`;

  if (!a && !b) {
    diffOutput.innerHTML = `<div class="empty-state"><div class="empty-icon">⟷</div><div>Paste prompts in both panels to see the diff</div></div>`;
    diffStats.style.display = 'none';
    return;
  }

  const tokA = tokenize(a, mode);
  const tokB = tokenize(b, mode);
  const ops = lcs(tokA, tokB);

  let adds = 0, rems = 0, total = 0;
  let html = '';

  if (mode === 'line') {
    ops.forEach(op => {
      const line = escHtml(op.val);
      if (op.type === 'add') { html += `<span class="dline dline-add">+ ${line}</span>`; adds++; }
      else if (op.type === 'rem') { html += `<span class="dline dline-rem">− ${line}</span>`; rems++; }
      else { html += `<span class="dline dline-eq">  ${line}</span>`; }
      total++;
    });
  } else {
    ops.forEach(op => {
      const w = escHtml(op.val);
      if (op.type === 'add') { html += `<span class="diff-add">${w}</span>`; adds++; }
      else if (op.type === 'rem') { html += `<span class="diff-rem">${w}</span>`; rems++; }
      else { html += `<span class="diff-eq">${w}</span>`; }
      total++;
    });
  }

  diffOutput.innerHTML = html || '<span style="color:var(--faint)">Identical</span>';
  diffStats.style.display = '';
  dsAdd.textContent = `+${adds}`;
  dsRem.textContent = `−${rems}`;
  const sim = total > 0 ? Math.round(((total - adds - rems) / total) * 100) : 100;
  dsSim.textContent = `${sim}% similar`;
}

const SAMPLE_A = `You are a helpful assistant. Answer questions concisely and accurately. If you don't know something, say so.`;
const SAMPLE_B = `You are an expert assistant with deep knowledge across many domains. Answer questions concisely, accurately, and with supporting reasoning. If you are uncertain about something, clearly state your confidence level and what you do and don't know.`;

document.getElementById('btnSampleA').addEventListener('click', () => { inputA.value = SAMPLE_A; run(); });
document.getElementById('btnSampleB').addEventListener('click', () => { inputB.value = SAMPLE_B; run(); });
document.getElementById('btnClearA').addEventListener('click', () => { inputA.value = ''; run(); });
document.getElementById('btnClearB').addEventListener('click', () => { inputB.value = ''; run(); });
document.getElementById('btnCopy').addEventListener('click', function() {
  navigator.clipboard.writeText(diffOutput.innerText);
  this.textContent = 'copied!';
  setTimeout(() => this.textContent = 'copy', 1500);
});

let t;
[inputA, inputB].forEach(el => el.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 80); }));
run();
