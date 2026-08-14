let qrInstance = null;
let qrSize = 256;
let ecLevel = 'L';
let wifiType = 'WPA';
let currentType = 'text';
let timer = null;
let currentText = '';

function setType(t) {
  currentType = t;
  document.querySelectorAll('.type-row .tab').forEach((btn, i) => {
    btn.classList.toggle('active', ['text','email','tel','wifi','vcard'][i] === t);
  });
  ['Text','Email','Tel','Wifi','Vcard'].forEach(p =>
    document.getElementById('pane' + p).classList.toggle('hidden', p.toLowerCase() !== t));
  if (t === 'text') scheduleGenerate();
}

function setSize(s) {
  qrSize = s;
  document.querySelectorAll('.field-group:nth-of-type(5) .tab').forEach(btn =>
    btn.classList.toggle('active', btn.textContent === String(s)));
  generate(currentText);
}

function setEC(ec) {
  ecLevel = ec;
  document.querySelectorAll('.field-group:nth-of-type(6) .tab').forEach(btn =>
    btn.classList.toggle('active', btn.textContent.startsWith(ec)));
  generate(currentText);
}

function setWifiType(t) {
  wifiType = t;
  document.getElementById('wifiWpa').classList.toggle('active', t === 'WPA');
  document.getElementById('wifiWep').classList.toggle('active', t === 'WEP');
  document.getElementById('wifiNone').classList.toggle('active', t === 'nopass');
  buildWifi();
}

function scheduleGenerate(override) {
  clearTimeout(timer);
  const text = override !== undefined ? override : document.getElementById('qrInput').value.trim();
  timer = setTimeout(() => generate(text), 200);
}

function buildEmail() {
  const to = document.getElementById('emailTo').value.trim();
  const sub = document.getElementById('emailSubject').value.trim();
  const body = document.getElementById('emailBody').value.trim();
  const parts = [`mailto:${to}`];
  const qs = [];
  if (sub) qs.push('subject=' + encodeURIComponent(sub));
  if (body) qs.push('body=' + encodeURIComponent(body));
  generate(parts[0] + (qs.length ? '?' + qs.join('&') : ''));
}

function buildWifi() {
  const ssid = document.getElementById('wifiSsid').value;
  const pass = document.getElementById('wifiPass').value;
  const type = wifiType;
  generate(`WIFI:T:${type};S:${ssid};P:${pass};;`);
}

function buildVcard() {
  const name  = document.getElementById('vcName').value;
  const phone = document.getElementById('vcPhone').value;
  const email = document.getElementById('vcEmail').value;
  const org   = document.getElementById('vcOrg').value;
  const url   = document.getElementById('vcUrl').value;
  const vcard = [`BEGIN:VCARD`, `VERSION:3.0`, `FN:${name}`];
  if (phone) vcard.push(`TEL:${phone}`);
  if (email) vcard.push(`EMAIL:${email}`);
  if (org)   vcard.push(`ORG:${org}`);
  if (url)   vcard.push(`URL:${url}`);
  vcard.push(`END:VCARD`);
  generate(vcard.join('\n'));
}

function generate(text) {
  currentText = text || '';
  const wrap = document.getElementById('qrWrap');
  const dataEl = document.getElementById('qrData');

  if (!currentText) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">▦</div><div>Enter text to generate QR code</div></div>`;
    dataEl.classList.add('hidden');
    return;
  }

  wrap.innerHTML = '';
  dataEl.classList.remove('hidden');
  dataEl.textContent = currentText.length > 80 ? currentText.slice(0, 80) + '…' : currentText;

  try {
    qrInstance = new QRCode(wrap, {
      text: currentText,
      width: qrSize,
      height: qrSize,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel[ecLevel],
    });
  } catch(e) {
    wrap.innerHTML = `<div style="color:#ff4d6d;font-size:.75rem;text-align:center;padding:20px">QR generation failed.<br>Text may be too long.</div>`;
  }
}

function downloadQR(fmt) {
  const canvas = document.querySelector('#qrWrap canvas');
  if (!canvas) return;
  const a = document.createElement('a');
  if (fmt === 'png') {
    a.href = canvas.toDataURL('image/png');
    a.download = 'qrcode.png';
  } else {
    // SVG fallback: export canvas as PNG anyway
    a.href = canvas.toDataURL('image/png');
    a.download = 'qrcode.png';
  }
  a.click();
}

function clearAll() {
  document.getElementById('qrInput').value = '';
  generate('');
}
