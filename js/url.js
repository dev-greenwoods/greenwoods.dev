let urlMode = 'encode';
let currentOutput = '';

function setMode(mode) {
  urlMode = mode;
  document.getElementById('tabEncode').classList.toggle('active', mode === 'encode');
  document.getElementById('tabDecode').classList.toggle('active', mode === 'decode');
  document.getElementById('tabQuery').classList.toggle('active', mode === 'query');
  document.getElementById('statusText').textContent = mode === 'query'
    ? 'Paste a query string or JSON object to convert between formats.'
    : mode === 'decode'
      ? 'Paste URL-encoded text to decode it.'
      : 'Paste raw text to URL-encode it.';
  document.getElementById('urlInput').placeholder = mode === 'encode'
    ? 'Paste text to encode...'
    : mode === 'decode'
      ? 'Paste URL-encoded text to decode...'
      : 'Paste query string or JSON here...';
  handleInput();
}

function handleInput() {
  const raw = document.getElementById('urlInput').value;
  const outputBlock = document.getElementById('outputBlock');
  outputBlock.innerHTML = '';

  if (!raw.trim()) {
    showEmpty();
    currentOutput = '';
    return;
  }

  try {
    if (urlMode === 'encode') {
      currentOutput = encodeURIComponent(raw);
      outputBlock.innerHTML = `<pre>${escapeHtml(currentOutput)}</pre>`;
      setStatus('Encoded text ready.');
    } else if (urlMode === 'decode') {
      currentOutput = decodeURIComponent(raw);
      outputBlock.innerHTML = `<pre>${escapeHtml(currentOutput)}</pre>`;
      setStatus('Decoded text ready.');
    } else {
      if (looksLikeJSON(raw)) {
        const parsed = JSON.parse(raw);
        currentOutput = new URLSearchParams(flattenObject(parsed)).toString();
        outputBlock.innerHTML = `<pre>${escapeHtml(currentOutput)}</pre>`;
        setStatus('Converted JSON to query string.');
      } else {
        currentOutput = JSON.stringify(Object.fromEntries(new URLSearchParams(raw)), null, 2);
        outputBlock.innerHTML = `<pre>${escapeHtml(currentOutput)}</pre>`;
        setStatus('Parsed query string to JSON.');
      }
    }
  } catch (err) {
    currentOutput = '';
    outputBlock.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
    setStatus('Error parsing input — fix the text and try again.');
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setStatus(text) {
  document.getElementById('statusText').textContent = text;
}

function looksLikeJSON(value) {
  const trimmed = value.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function flattenObject(obj, prefix = '') {
  const entries = [];

  if (Array.isArray(obj)) {
    obj.forEach((value, index) => {
      entries.push(...flattenObject(value, `${prefix}${index}`));
    });
    return entries;
  }

  if (obj !== null && typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      const nextKey = prefix ? `${prefix}[${key}]` : key;
      entries.push(...flattenObject(value, nextKey));
    });
    return entries;
  }

  return [[prefix, String(obj)]];
}

function copyOutput() {
  if (!currentOutput) return;
  navigator.clipboard.writeText(currentOutput).then(() => {
    const btn = document.getElementById('copyButton');
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = 'copy'; }, 1400);
  });
}

function clearAll() {
  document.getElementById('urlInput').value = '';
  currentOutput = '';
  showEmpty();
}

function loadSample() {
  if (urlMode === 'encode') {
    document.getElementById('urlInput').value = 'https://example.com/search?query=greenwoods dev&sort=recent';
  } else if (urlMode === 'decode') {
    document.getElementById('urlInput').value = 'https%3A%2F%2Fexample.com%2Fsearch%3Fquery%3Dgreenwoods%2520dev%26sort%3Drecent';
  } else {
    document.getElementById('urlInput').value = 'foo=bar&count=10&page=2';
  }
  handleInput();
}

function showEmpty() {
  document.getElementById('outputBlock').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🔗</div>
      <div>Paste text to see the encoded or decoded result.</div>
      <div style="font-size:0.7rem;margin-top:6px;color:var(--muted);">Query mode parses query strings and converts JSON to query format.</div>
    </div>`;
  setStatus(urlMode === 'query'
    ? 'Paste a query string or JSON object to convert between formats.'
    : urlMode === 'decode'
      ? 'Paste URL-encoded text to decode it.'
      : 'Paste raw text to URL-encode it.');
}

window.addEventListener('DOMContentLoaded', () => {
  setMode('encode');
});
