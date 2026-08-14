let updating = false;

function convert(source) {
  if (updating) return;
  updating = true;

  const err = document.getElementById('convError');
  err.classList.add('hidden');

  let decValue;
  try {
    decValue = readSource(source);
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
    updating = false;
    renderInfo(null);
    return;
  }

  if (decValue === null) {
    ['Dec','Hex','Oct','Bin','Custom'].forEach(b => {
      if (b.toLowerCase() !== source) document.getElementById('input' + b).value = '';
    });
    renderInfo(null);
    updating = false;
    return;
  }

  if (!Number.isInteger(decValue) || decValue < 0) {
    err.textContent = 'Only non-negative integers are supported.';
    err.classList.remove('hidden');
    updating = false;
    renderInfo(null);
    return;
  }

  // Fill all fields
  if (source !== 'dec') document.getElementById('inputDec').value = decValue.toString(10);
  if (source !== 'hex') document.getElementById('inputHex').value = decValue.toString(16).toUpperCase();
  if (source !== 'oct') document.getElementById('inputOct').value = decValue.toString(8);
  if (source !== 'bin') document.getElementById('inputBin').value = decValue.toString(2);

  const customBase = parseInt(document.getElementById('customBase').value) || 16;
  if (source !== 'custom') document.getElementById('inputCustom').value = decValue.toString(customBase).toUpperCase();

  renderInfo(decValue);
  updating = false;
}

function readSource(source) {
  const inputs = {
    dec: { el: 'inputDec', base: 10 },
    hex: { el: 'inputHex', base: 16 },
    oct: { el: 'inputOct', base: 8 },
    bin: { el: 'inputBin', base: 2 },
    custom: { el: 'inputCustom', base: parseInt(document.getElementById('customBase').value) || 16 },
  };
  const { el, base } = inputs[source];
  const raw = document.getElementById(el).value.trim().replace(/\s/g, '');
  if (!raw) return null;
  const n = parseInt(raw, base);
  if (isNaN(n)) throw new Error(`"${raw}" is not a valid base-${base} number.`);
  return n;
}

function renderInfo(n) {
  const out = document.getElementById('infoOutput');
  if (n === null) {
    out.innerHTML = `<div class="empty-state"><div class="empty-icon">🔢</div><div>Enter a number in any base</div></div>`;
    return;
  }

  const bin = n.toString(2);
  const bits = bin.length;
  const bytes = Math.ceil(bits / 8);
  const isPrime = checkPrime(n);

  // Bit visualization (max 64 bits)
  const padded = bin.padStart(Math.ceil(bits / 8) * 8, '0');
  const bitCells = padded.split('').map((b, i) => {
    const sep = i > 0 && i % 8 === 0 ? '<span class="bit-sep"></span>' : '';
    return `${sep}<span class="bit ${b === '1' ? 'one' : 'zero'}">${b}</span>`;
  }).join('');

  out.innerHTML = `
    <div class="info-section">
      <div class="info-row"><span class="info-key">Decimal</span><span class="info-val accent2">${n.toLocaleString()}</span></div>
      <div class="info-row"><span class="info-key">Hex</span><span class="info-val accent">0x${n.toString(16).toUpperCase()}</span></div>
      <div class="info-row"><span class="info-key">Octal</span><span class="info-val warn">0o${n.toString(8)}</span></div>
      <div class="info-row"><span class="info-key">Binary</span><span class="info-val" style="word-break:break-all">${bin}</span></div>
    </div>
    <div class="info-section">
      <div class="info-row"><span class="info-key">Bit length</span><span class="info-val">${bits} bit${bits !== 1 ? 's' : ''}</span></div>
      <div class="info-row"><span class="info-key">Byte size</span><span class="info-val">${bytes} byte${bytes !== 1 ? 's' : ''}</span></div>
      <div class="info-row"><span class="info-key">Is prime?</span><span class="info-val ${isPrime ? 'accent' : ''}">${isPrime ? 'Yes' : 'No'}</span></div>
      <div class="info-row"><span class="info-key">Signed 32-bit</span><span class="info-val">${n | 0}</span></div>
    </div>
    ${bits <= 64 ? `<div class="info-section"><div class="bit-grid">${bitCells}</div></div>` : ''}
  `;
}

function checkPrime(n) {
  if (n < 2 || n > 10000000) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) if (n % i === 0) return false;
  return true;
}

function clearAll() {
  ['Dec','Hex','Oct','Bin','Custom'].forEach(b => {
    document.getElementById('input' + b).value = '';
  });
  document.getElementById('convError').classList.add('hidden');
  renderInfo(null);
}
