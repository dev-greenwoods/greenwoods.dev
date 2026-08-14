let delim = ',';
let outputFmt = 'array';
let currentJSON = '';

function setDelim(d) {
  delim = d;
  const map = { ',': 'delimComma', '\t': 'delimTab', ';': 'delimSemi', '|': 'delimPipe' };
  Object.values(map).forEach(id => document.getElementById(id).classList.remove('active'));
  if (map[d]) document.getElementById(map[d]).classList.add('active');
  parse();
}

function setOutputFmt(f) {
  outputFmt = f;
  document.getElementById('fmtArray').classList.toggle('active', f === 'array');
  document.getElementById('fmtKeyed').classList.toggle('active', f === 'keyed');
  parse();
}

function parseCSVLine(line, sep) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === sep && !inQuote) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function autoType(val, trim, numbers, nulls) {
  if (trim) val = val.trim();
  if (nulls && val === '') return null;
  if (numbers && val !== '' && !isNaN(val) && val.trim() !== '') return Number(val);
  return val;
}

function parse() {
  const raw = document.getElementById('csvInput').value;
  const hasHeader = document.getElementById('chkHeader').checked;
  const trim = document.getElementById('chkTrim').checked;
  const numbers = document.getElementById('chkNumbers').checked;
  const nulls = document.getElementById('chkNulls').checked;

  if (!raw.trim()) {
    currentJSON = '';
    document.getElementById('jsonOutput').innerHTML = `<div class="empty-state"><div class="empty-icon">{ }</div><div>JSON output will appear here</div></div>`;
    document.getElementById('statusText').textContent = 'Paste CSV to convert.';
    document.getElementById('statBadge').textContent = '0 rows';
    return;
  }

  const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return;

  let headers, dataLines;
  if (hasHeader) {
    headers = parseCSVLine(lines[0], delim).map(h => trim ? h.trim() : h);
    dataLines = lines.slice(1);
  } else {
    const first = parseCSVLine(lines[0], delim);
    headers = first.map((_, i) => `col${i + 1}`);
    dataLines = lines;
  }

  const rows = dataLines.map(line => {
    const cells = parseCSVLine(line, delim);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = autoType(cells[i] ?? '', trim, numbers, nulls);
    });
    return obj;
  });

  let output;
  if (outputFmt === 'keyed') {
    output = {};
    headers.forEach(h => { output[h] = rows.map(r => r[h]); });
  } else {
    output = rows;
  }

  currentJSON = JSON.stringify(output, null, 2);
  document.getElementById('jsonOutput').innerHTML = `<pre>${escapeHtml(currentJSON)}</pre>`;
  document.getElementById('statusText').textContent = `${rows.length} row${rows.length !== 1 ? 's' : ''} · ${headers.length} column${headers.length !== 1 ? 's' : ''}`;
  document.getElementById('statBadge').textContent = `${rows.length} rows`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function copyOutput() {
  if (!currentJSON) return;
  navigator.clipboard.writeText(currentJSON).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = 'copy'; }, 1400);
  });
}

function downloadJSON() {
  if (!currentJSON) return;
  const blob = new Blob([currentJSON], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'data.json';
  a.click();
}

function clearAll() {
  document.getElementById('csvInput').value = '';
  currentJSON = '';
  document.getElementById('jsonOutput').innerHTML = `<div class="empty-state"><div class="empty-icon">{ }</div><div>JSON output will appear here</div></div>`;
  document.getElementById('statBadge').textContent = '0 rows';
}

function loadSample() {
  document.getElementById('csvInput').value = `name,age,email,city,score
Alice,28,alice@example.com,New York,94.5
Bob,34,bob@example.com,London,87
Carol,22,carol@example.com,Tokyo,99.1
Dave,41,dave@example.com,Paris,72.3
Eve,30,eve@example.com,Berlin,88`;
  parse();
}
