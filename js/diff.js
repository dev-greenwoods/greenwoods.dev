// ── Myers diff (line-level) ────────────────────────────────────────
function myersDiff(a, b) {
  const n = a.length, m = b.length;
  const max = n + m;
  const v = new Array(2 * max + 1).fill(0);
  const vs = [];

  for (let d = 0; d <= max; d++) {
    vs.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x;
      const ki = k + max;
      if (k === -d || (k !== d && v[ki - 1] < v[ki + 1])) {
        x = v[ki + 1];
      } else {
        x = v[ki - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v[ki] = x;
      if (x >= n && y >= m) {
        return backtrack(vs, a, b, max);
      }
    }
  }
  return [];
}

function backtrack(vs, a, b, max) {
  const edits = [];
  let x = a.length, y = b.length;
  for (let d = vs.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
    const v = vs[d];
    const k = x - y;
    const ki = k + max;
    let prevK;
    if (k === -d || (k !== d && v[ki - 1] < v[ki + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = v[prevK + max];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { edits.push({ type: 'eq', a: x-1, b: y-1 }); x--; y--; }
    if (d > 0) {
      if (x === prevX) { edits.push({ type: 'ins', b: y-1 }); y--; }
      else             { edits.push({ type: 'del', a: x-1 }); x--; }
    }
  }
  return edits.reverse();
}

// ── Char-level diff for changed pairs ─────────────────────────────
function charDiff(oldLine, newLine) {
  const a = [...oldLine], b = [...newLine];
  const edits = myersDiff(a, b);
  let oldHtml = '', newHtml = '';
  for (const e of edits) {
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (e.type === 'eq')  { const c = esc(a[e.a]); oldHtml += c; newHtml += c; }
    if (e.type === 'del') { oldHtml += `<span class="char-del">${esc(a[e.a])}</span>`; }
    if (e.type === 'ins') { newHtml += `<span class="char-add">${esc(b[e.b])}</span>`; }
  }
  return { oldHtml, newHtml };
}

// ── Render ─────────────────────────────────────────────────────────
let currentView = 'unified';
let lastEdits = [], lastA = [], lastB = [];

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function render() {
  const rawA = document.getElementById('textA').value;
  const rawB = document.getElementById('textB').value;

  const a = rawA === '' ? [] : rawA.split('\n');
  const b = rawB === '' ? [] : rawB.split('\n');

  document.getElementById('statsA').textContent = a.length ? `${a.length} lines · ${rawA.length} chars` : '';
  document.getElementById('statsB').textContent = b.length ? `${b.length} lines · ${rawB.length} chars` : '';

  const out = document.getElementById('diffOutput');
  const summaryBar = document.getElementById('summaryBar');

  if (!rawA && !rawB) {
    out.innerHTML = `<div class="empty-state"><div class="empty-icon">⟷</div><div>Paste text in both panels to see the diff</div></div>`;
    summaryBar.style.display = 'none';
    return;
  }

  const edits = myersDiff(a, b);
  lastEdits = edits; lastA = a; lastB = b;

  let added = 0, removed = 0, same = 0;
  edits.forEach(e => { if (e.type==='ins') added++; else if (e.type==='del') removed++; else same++; });

  summaryBar.style.display = 'flex';
  summaryBar.innerHTML = `
    <span class="sum-added">+${added} added</span>
    <span class="sum-removed">-${removed} removed</span>
    <span class="sum-same">${same} unchanged</span>
    <span class="sum-changed">${Math.round(100*(added+removed)/(a.length+b.length||1))}% changed</span>`;

  // Group into del/ins pairs for char-diff
  const merged = [];
  let i = 0;
  while (i < edits.length) {
    if (edits[i].type === 'del' && i+1 < edits.length && edits[i+1].type === 'ins') {
      merged.push({ type: 'chg', a: edits[i].a, b: edits[i+1].b });
      i += 2;
    } else {
      merged.push(edits[i]); i++;
    }
  }

  let html = '';
  let lineA = 1, lineB = 1;
  const CONTEXT = 3;
  let lastShown = -1;

  // Build flat list for context collapsing
  const lines = [];
  for (const e of merged) {
    if (e.type === 'eq')  lines.push({ kind: 'eq',  a: e.a, b: e.b,  textA: a[e.a], textB: b[e.b] });
    if (e.type === 'del') lines.push({ kind: 'del', a: e.a,            textA: a[e.a] });
    if (e.type === 'ins') lines.push({ kind: 'ins',           b: e.b,              textB: b[e.b] });
    if (e.type === 'chg') lines.push({ kind: 'chg', a: e.a, b: e.b,  textA: a[e.a], textB: b[e.b] });
  }

  // Which eq lines are near a change?
  const changed = new Set();
  lines.forEach((l,i) => { if (l.kind !== 'eq') { for (let j=Math.max(0,i-CONTEXT); j<=Math.min(lines.length-1,i+CONTEXT); j++) changed.add(j); }});

  let laA = 1, laB = 1;
  let skipCount = 0;
  const flushSkip = () => {
    if (skipCount > 0) {
      html += `<div class="diff-hunk-sep">@@ ··· ${skipCount} unchanged line${skipCount>1?'s':''} ···</div>`;
      skipCount = 0;
    }
  };

  lines.forEach((l, idx) => {
    if (l.kind === 'eq' && !changed.has(idx)) { skipCount++; laA++; laB++; return; }
    flushSkip();

    if (l.kind === 'eq') {
      html += `<div class="diff-line diff-line--eq">
        <span class="diff-gutter">${laA}</span><span class="diff-sign"> </span>
        <span class="diff-text">${esc(l.textA)}</span></div>`;
      laA++; laB++;
    } else if (l.kind === 'del') {
      html += `<div class="diff-line diff-line--del">
        <span class="diff-gutter">${laA}</span><span class="diff-sign">−</span>
        <span class="diff-text">${esc(l.textA)}</span></div>`;
      laA++;
    } else if (l.kind === 'ins') {
      html += `<div class="diff-line diff-line--add">
        <span class="diff-gutter">${laB}</span><span class="diff-sign">+</span>
        <span class="diff-text">${esc(l.textB)}</span></div>`;
      laB++;
    } else if (l.kind === 'chg') {
      const { oldHtml, newHtml } = charDiff(l.textA, l.textB);
      html += `<div class="diff-line diff-line--del">
        <span class="diff-gutter">${laA}</span><span class="diff-sign">−</span>
        <span class="diff-text">${oldHtml}</span></div>`;
      html += `<div class="diff-line diff-line--add">
        <span class="diff-gutter">${laB}</span><span class="diff-sign">+</span>
        <span class="diff-text">${newHtml}</span></div>`;
      laA++; laB++;
    }
  });
  flushSkip();

  out.innerHTML = html || `<div class="empty-state"><div class="empty-icon">✓</div><div>Files are identical</div></div>`;
}

// ── Events ─────────────────────────────────────────────────────────
document.getElementById('textA').addEventListener('input', render);
document.getElementById('textB').addEventListener('input', render);

document.getElementById('clearA').addEventListener('click', () => { document.getElementById('textA').value=''; render(); });
document.getElementById('clearB').addEventListener('click', () => { document.getElementById('textB').value=''; render(); });

document.querySelectorAll('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    currentView = btn.dataset.view;
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b===btn));
    render();
  });
});

document.getElementById('btnCopyDiff').addEventListener('click', function() {
  const lines = document.querySelectorAll('.diff-line');
  const text = [...lines].map(l => {
    const sign = l.querySelector('.diff-sign')?.textContent.trim();
    const txt  = l.querySelector('.diff-text')?.textContent;
    return `${sign === '−' ? '-' : sign === '+' ? '+' : ' '} ${txt}`;
  }).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    this.textContent = 'copied!';
    setTimeout(() => this.textContent = 'copy', 1500);
  });
});
