let mode = 'encode';
let currentOutput = '';
let fileDataUrl = null;

function setMode(m) {
  mode = m;
  document.getElementById('tabEncode').classList.toggle('active', m === 'encode');
  document.getElementById('tabDecode').classList.toggle('active', m === 'decode');
  document.getElementById('tabFile').classList.toggle('active', m === 'file');
  document.getElementById('textPane').classList.toggle('hidden', m === 'file');
  document.getElementById('filePane').classList.toggle('hidden', m !== 'file');
  document.getElementById('modeDisplay').textContent = 'mode: ' + m;
  document.getElementById('imagePreview').classList.add('hidden');
  if (m !== 'file') handleInput();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function handleInput() {
  const raw = document.getElementById('b64Input').value;
  const urlSafe = document.getElementById('urlSafe').checked;
  const wrap = document.getElementById('wrapLines').checked;
  const outputBlock = document.getElementById('outputBlock');

  if (!raw.trim()) {
    currentOutput = '';
    setStatus('Paste text to encode or decode.');
    showEmpty();
    return;
  }

  try {
    if (mode === 'encode') {
      let encoded = btoa(unescape(encodeURIComponent(raw)));
      if (urlSafe) encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      if (wrap) encoded = encoded.match(/.{1,76}/g).join('\n');
      currentOutput = encoded;
      outputBlock.innerHTML = `<pre>${escapeHtml(encoded)}</pre>`;
      setStatus(`Encoded · ${encoded.replace(/\n/g, '').length} chars`);
    } else {
      let input = raw.trim();
      if (urlSafe) input = input.replace(/-/g, '+').replace(/_/g, '/');
      while (input.length % 4) input += '=';
      const decoded = decodeURIComponent(escape(atob(input)));
      currentOutput = decoded;
      outputBlock.innerHTML = `<pre>${escapeHtml(decoded)}</pre>`;
      setStatus(`Decoded · ${decoded.length} chars`);
    }
  } catch (e) {
    currentOutput = '';
    const friendly = mode === 'decode'
      ? 'That is not valid Base64 — check for missing padding or invalid characters.'
      : 'Could not encode that input — check for unsupported characters.';
    outputBlock.innerHTML = `<div class="error-msg">${friendly}</div>`;
    setStatus('Error — check input format.');
  }
}

function onDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.add('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function onFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    fileDataUrl = e.target.result;
    const base64 = fileDataUrl.split(',')[1];
    currentOutput = base64;

    const info = document.getElementById('fileInfo');
    info.innerHTML = `<span>📄 ${escapeHtml(file.name)}</span><span>${(file.size / 1024).toFixed(1)} KB · ${file.type || 'unknown type'}</span>`;
    info.classList.remove('hidden');

    const outputBlock = document.getElementById('outputBlock');
    outputBlock.innerHTML = `<pre>${escapeHtml(base64.slice(0, 2000))}${base64.length > 2000 ? '\n\n... (truncated, use copy to get full output)' : ''}</pre>`;
    setStatus(`Encoded · ${base64.length} chars · ${file.name}`);

    // Image preview
    if (file.type.startsWith('image/')) {
      document.getElementById('previewImg').src = fileDataUrl;
      document.getElementById('imagePreview').classList.remove('hidden');
    } else {
      document.getElementById('imagePreview').classList.add('hidden');
    }

    document.getElementById('downloadBtn').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function showEmpty() {
  document.getElementById('outputBlock').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📦</div>
      <div>Output will appear here</div>
    </div>`;
}

function setStatus(text) {
  document.getElementById('statusText').textContent = text;
}

function copyOutput() {
  if (!currentOutput) return;
  navigator.clipboard.writeText(currentOutput).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = 'copy'; }, 1400);
  });
}

function downloadOutput() {
  if (!fileDataUrl) return;
  const a = document.createElement('a');
  a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(currentOutput)}`;
  a.download = 'encoded.txt';
  a.click();
}

function clearAll() {
  document.getElementById('b64Input').value = '';
  document.getElementById('fileInfo').classList.add('hidden');
  document.getElementById('imagePreview').classList.add('hidden');
  currentOutput = '';
  fileDataUrl = null;
  showEmpty();
  setStatus('Paste text to encode or decode.');
}
