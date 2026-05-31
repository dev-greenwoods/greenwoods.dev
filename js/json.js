let currentMode = 'format';
let currentFormatted = '';
let currentLeft = '';
let currentRight = '';

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setMode(mode) {
  currentMode = mode;
  document.getElementById('tabFormat').classList.toggle('active', mode === 'format');
  document.getElementById('tabDiff').classList.toggle('active', mode === 'diff');
  document.getElementById('formatPane').classList.toggle('hidden', mode !== 'format');
  document.getElementById('diffPane').classList.toggle('hidden', mode !== 'diff');
  document.getElementById('statusText').textContent = mode === 'format'
    ? 'Paste JSON to validate and format it.'
    : 'Paste two JSON documents to compare them line by line.';
  handleInput();
}

function parseJSON(value) {
  return JSON.parse(value);
}

function formatJSON(value) {
  return JSON.stringify(value, null, 2);
}

function handleInput() {
  const outputBlock = document.getElementById('outputBlock');
  const statusText = document.getElementById('statusText');
  outputBlock.innerHTML = '';

  if (currentMode === 'format') {
    const raw = document.getElementById('jsonInput').value.trim();
    currentLeft = raw;
    if (!raw) {
      showEmpty();
      return;
    }

    try {
      const parsed = parseJSON(raw);
      currentFormatted = formatJSON(parsed);
      currentRight = currentFormatted;
      outputBlock.innerHTML = `<pre>${escapeHtml(currentFormatted)}</pre>`;
      statusText.textContent = 'Valid JSON — formatted output ready.';
    } catch (err) {
      currentFormatted = '';
      outputBlock.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
      statusText.textContent = 'Invalid JSON — fix the input to format it.';
    }
    return;
  }

  const rawA = document.getElementById('jsonInputA').value.trim();
  const rawB = document.getElementById('jsonInputB').value.trim();
  currentLeft = rawA;
  currentRight = rawB;

  if (!rawA && !rawB) {
    showEmpty();
    return;
  }

  let parsedA = null;
  let parsedB = null;
  let leftValid = true;
  let rightValid = true;
  let leftError = '';
  let rightError = '';

  if (rawA) {
    try { parsedA = parseJSON(rawA); }
    catch (err) { leftValid = false; leftError = err.message; }
  }
  if (rawB) {
    try { parsedB = parseJSON(rawB); }
    catch (err) { rightValid = false; rightError = err.message; }
  }

  if (!leftValid || !rightValid) {
    const messages = [];
    if (!leftValid) messages.push(`Left JSON invalid: ${leftError}`);
    if (!rightValid) messages.push(`Right JSON invalid: ${rightError}`);
    outputBlock.innerHTML = `<div class="error">${escapeHtml(messages.join(' \n'))}</div>`;
    statusText.textContent = 'Invalid JSON in diff mode — fix both sides to compare.';
    return;
  }

  if (!rawA || !rawB) {
    outputBlock.innerHTML = `<div class="error">Both sides are required to compare JSON documents.</div>`;
    statusText.textContent = 'Diff mode requires two JSON inputs.';
    return;
  }

  const formattedA = formatJSON(parsedA).split('\n');
  const formattedB = formatJSON(parsedB).split('\n');
  outputBlock.innerHTML = renderDiff(formattedA, formattedB);
  statusText.textContent = 'Diff ready — additions and removals are highlighted.';
}

function showEmpty() {
  const outputBlock = document.getElementById('outputBlock');
  const statusText = document.getElementById('statusText');
  outputBlock.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">{ }</div>
      <div>Start by pasting JSON on the left.</div>
      <div style="font-size:0.7rem;margin-top:6px;color:var(--muted);">Supports JSON validation, pretty-printing, and diff mode.</div>
    </div>`;
  statusText.textContent = currentMode === 'format'
    ? 'Paste JSON to validate and format it.'
    : 'Paste two JSON documents to compare them line by line.';
}

function renderDiff(linesA, linesB) {
  const ops = diffLines(linesA, linesB);
  let leftRows = '';
  let rightRows = '';
  let leftNumber = 1;
  let rightNumber = 1;

  ops.forEach(op => {
    if (op.type === 'equal') {
      leftRows += lineRow(leftNumber++, op.line, 'same');
      rightRows += lineRow(rightNumber++, op.line, 'same');
    } else if (op.type === 'removed') {
      leftRows += lineRow(leftNumber++, op.line, 'removed');
      rightRows += lineRow('', '', 'removed');
    } else if (op.type === 'added') {
      leftRows += lineRow('', '', 'added');
      rightRows += lineRow(rightNumber++, op.line, 'added');
    }
  });

  return `
    <div class="diff-grid">
      <div class="diff-column">
        <div class="diff-header">Original</div>
        <div class="diff-lines">${leftRows}</div>
      </div>
      <div class="diff-column">
        <div class="diff-header">Changed</div>
        <div class="diff-lines">${rightRows}</div>
      </div>
    </div>`;
}

function lineRow(number, content, status) {
  return `
    <div class="diff-line ${status}">
      <div class="line-num">${number !== '' ? number : ''}</div>
      <div class="line-content">${escapeHtml(content)}</div>
    </div>`;
}

function diffLines(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;

  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      ops.push({ type: 'equal', line: a[i] });
      i++; j++;
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
      ops.push({ type: 'added', line: b[j] });
      j++;
    } else if (i < n) {
      ops.push({ type: 'removed', line: a[i] });
      i++;
    }
  }

  return ops;
}

function copyOutput() {
  if (currentMode === 'format') {
    if (!currentFormatted) return;
    navigator.clipboard.writeText(currentFormatted).then(() => {
      document.getElementById('copyButton').textContent = 'copied!';
      setTimeout(() => { document.getElementById('copyButton').textContent = 'copy'; }, 1400);
    });
    return;
  }

  const leftText = document.getElementById('jsonInputA').value.trim();
  const rightText = document.getElementById('jsonInputB').value.trim();
  const combined = `Left JSON:\n${leftText}\n\nRight JSON:\n${rightText}`;
  if (!leftText && !rightText) return;

  navigator.clipboard.writeText(combined).then(() => {
    document.getElementById('copyButton').textContent = 'copied!';
    setTimeout(() => { document.getElementById('copyButton').textContent = 'copy'; }, 1400);
  });
}

function clearAll() {
  document.getElementById('jsonInput').value = '';
  document.getElementById('jsonInputA').value = '';
  document.getElementById('jsonInputB').value = '';
  currentFormatted = '';
  currentLeft = '';
  currentRight = '';
  showEmpty();
}

function loadSample() {
  const sampleA = `{
  "name": "Greenwoods",
  "type": "toolset",
  "features": [
    "JWT decoder",
    "JSON formatter",
    "URL encoder"
  ],
  "release": {
    "phase": "alpha",
    "year": 2026
  }
}`;
  const sampleB = `{
  "name": "Greenwoods",
  "type": "toolset",
  "features": [
    "JWT decoder",
    "JSON formatter",
    "URL encoder",
    "regex tester"
  ],
  "release": {
    "phase": "beta",
    "year": 2026
  },
  "notes": "New tool added"
}`;

  if (currentMode === 'format') {
    document.getElementById('jsonInput').value = sampleA;
  } else {
    document.getElementById('jsonInputA').value = sampleA;
    document.getElementById('jsonInputB').value = sampleB;
  }
  handleInput();
}

window.addEventListener('DOMContentLoaded', () => {
  setMode('format');
});
