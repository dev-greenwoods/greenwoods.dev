let mode = 'encode';
let currentOutput = '';

const NAMED = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  '\u00a0': '&nbsp;', '©': '&copy;', '®': '&reg;', '™': '&trade;',
  '€': '&euro;', '£': '&pound;', '¥': '&yen;', '→': '&rarr;',
  '←': '&larr;', '↑': '&uarr;', '↓': '&darr;', '·': '&middot;',
  '°': '&deg;', '±': '&plusmn;', '×': '&times;', '÷': '&divide;',
  'á': '&aacute;', 'é': '&eacute;', 'í': '&iacute;', 'ó': '&oacute;', 'ú': '&uacute;',
  'à': '&agrave;', 'è': '&egrave;', 'ì': '&igrave;', 'ò': '&ograve;', 'ù': '&ugrave;',
  'ä': '&auml;', 'ë': '&euml;', 'ï': '&iuml;', 'ö': '&ouml;', 'ü': '&uuml;',
  'ñ': '&ntilde;', 'ç': '&ccedil;', 'ß': '&szlig;', 'æ': '&aelig;', 'œ': '&oelig;',
};

const NAMED_REV = Object.fromEntries(Object.entries(NAMED).map(([k, v]) => [v, k]));

function setMode(m) {
  mode = m;
  document.getElementById('tabEncode').classList.toggle('active', m === 'encode');
  document.getElementById('tabDecode').classList.toggle('active', m === 'decode');
  document.getElementById('encodeOpts').style.display = m === 'encode' ? '' : 'none';
  document.getElementById('modeBadge').textContent = 'mode: ' + m;
  run();
}

function encode(str) {
  const useNamed = document.getElementById('chkNamed').checked;
  const encodeAll = document.getElementById('chkAll').checked;
  return str.split('').map(ch => {
    if (useNamed && NAMED[ch]) return NAMED[ch];
    const code = ch.charCodeAt(0);
    if (encodeAll && code > 127) return `&#${code};`;
    if (!encodeAll && (ch === '&' || ch === '<' || ch === '>' || ch === '"' || ch === "'"))
      return `&#${code};`;
    return ch;
  }).join('');
}

function decode(str) {
  // Named entities
  let out = str.replace(/&([a-zA-Z]+);/g, (m, name) => {
    const entity = '&' + name + ';';
    if (NAMED_REV[entity]) return NAMED_REV[entity];
    // Use DOM for the rest
    const el = document.createElement('textarea');
    el.innerHTML = m;
    return el.value;
  });
  // Numeric decimal
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
  // Numeric hex
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return out;
}

function run() {
  const raw = document.getElementById('entityInput').value;
  const out = document.getElementById('entityOutput');

  if (!raw) {
    currentOutput = '';
    out.innerHTML = `<div class="empty-state"><div class="empty-icon">&amp;</div><div>Output will appear here</div></div>`;
    document.getElementById('statusText').textContent = 'Paste text to encode or decode HTML entities.';
    return;
  }

  try {
    currentOutput = mode === 'encode' ? encode(raw) : decode(raw);
    out.innerHTML = `<pre>${currentOutput.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;
    const diff = currentOutput.length - raw.length;
    document.getElementById('statusText').textContent =
      `${mode === 'encode' ? 'Encoded' : 'Decoded'} · ${raw.length} → ${currentOutput.length} chars (${diff >= 0 ? '+' : ''}${diff})`;
  } catch(e) {
    out.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function insertEntity(char) {
  const ta = document.getElementById('entityInput');
  const start = ta.selectionStart, end = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + char + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + char.length;
  ta.focus();
  run();
}

function copyOutput() {
  if (!currentOutput) return;
  navigator.clipboard.writeText(currentOutput).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = 'copy'; }, 1400);
  });
}

function clearAll() {
  document.getElementById('entityInput').value = '';
  currentOutput = '';
  document.getElementById('entityOutput').innerHTML = `<div class="empty-state"><div class="empty-icon">&amp;</div><div>Output will appear here</div></div>`;
}
