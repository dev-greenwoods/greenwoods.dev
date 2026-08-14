let currentColor = null; // { r, g, b }

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return null;
  const n = parseInt(hex, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d === 0) { h = 0; }
  else {
    switch (max) {
      case r: h = ((g - b) / d % 6); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s: Math.round(s * 100), v: Math.round(v * 100) };
}

function rgbToCmyk(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round((1 - r - k) / (1 - k) * 100),
    m: Math.round((1 - g - k) / (1 - k) * 100),
    y: Math.round((1 - b - k) / (1 - k) * 100),
    k: Math.round(k * 100)
  };
}

function parseAnyColor(input) {
  input = input.trim().toLowerCase();
  // HEX
  if (/^#?[0-9a-f]{3,8}$/.test(input)) {
    return hexToRgb(input.startsWith('#') ? input : '#' + input);
  }
  // RGB
  const rgbMatch = input.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (rgbMatch) {
    return { r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]) };
  }
  // HSL
  const hslMatch = input.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?/);
  if (hslMatch) {
    return hslToRgb(parseFloat(hslMatch[1]), parseFloat(hslMatch[2]), parseFloat(hslMatch[3]));
  }
  return null;
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

function clamp(n) { return Math.max(0, Math.min(255, Math.round(n))); }

function updateUI(rgb) {
  if (!rgb) return;
  const { r, g, b } = { r: clamp(rgb.r), g: clamp(rgb.g), b: clamp(rgb.b) };
  currentColor = { r, g, b };

  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  const hsv = rgbToHsv(r, g, b);
  const cmyk = rgbToCmyk(r, g, b);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  // Nav swatch
  document.getElementById('colorSwatch').style.background = hex;

  // Preview
  document.getElementById('swatchLarge').style.background = hex;
  document.getElementById('swatchHex').textContent = hex.toUpperCase();
  document.getElementById('swatchHex').style.color = luminance > 0.5 ? '#222' : '#e0e0f0';
  document.getElementById('colorPreview').classList.remove('hidden');

  // Update picker
  document.getElementById('colorPicker').value = hex;
  document.getElementById('colorInput').value = hex;

  // Conversions
  const convs = [
    ['HEX', hex.toUpperCase()],
    ['RGB', `rgb(${r}, ${g}, ${b})`],
    ['RGBA', `rgba(${r}, ${g}, ${b}, 1)`],
    ['HSL', `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`],
    ['HSLA', `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 1)`],
    ['HSV', `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`],
    ['CMYK', `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`],
    ['CSS var', `--color: ${hex.toUpperCase()};`],
    ['Luminance', luminance.toFixed(4)],
  ];

  document.getElementById('convOutput').innerHTML = convs.map(([k, v]) =>
    `<div class="conv-row">
      <span class="conv-key">${k}</span>
      <span class="conv-val" onclick="copyText('${v.replace(/'/g, "\\'")}')">${v}</span>
      <button class="copy-btn" onclick="copyText('${v.replace(/'/g, "\\'")}')">copy</button>
    </div>`
  ).join('');

  // Palette
  buildPalette(hsl.h, hsl.s);
}

function buildPalette(h, s) {
  const lightnesses = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95];
  const palette = document.getElementById('palette');
  palette.innerHTML = lightnesses.map(l => {
    const rgb = hslToRgb(h, s, l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    return `<div class="palette-swatch" style="background:${hex}" onclick="copyText('${hex.toUpperCase()}')" title="${hex.toUpperCase()}">
      <span class="palette-swatch-label" style="color:${l < 50 ? '#fff' : '#000'}">${hex.toUpperCase()}</span>
    </div>`;
  }).join('');
  document.getElementById('paletteSection').classList.remove('hidden');
}

function fromPicker() {
  const hex = document.getElementById('colorPicker').value;
  document.getElementById('colorInput').value = hex;
  document.getElementById('parseError').classList.add('hidden');
  updateUI(hexToRgb(hex));
}

function parseInput() {
  const raw = document.getElementById('colorInput').value.trim();
  const err = document.getElementById('parseError');
  if (!raw) {
    err.classList.add('hidden');
    return;
  }
  const rgb = parseAnyColor(raw);
  if (!rgb) {
    err.textContent = 'Could not parse color — try #hex, rgb(), or hsl()';
    err.classList.remove('hidden');
    return;
  }
  err.classList.add('hidden');
  updateUI(rgb);
}

function pickRandom() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  updateUI({ r, g, b });
}

function clearAll() {
  document.getElementById('colorInput').value = '';
  document.getElementById('parseError').classList.add('hidden');
  document.getElementById('colorPreview').classList.add('hidden');
  document.getElementById('paletteSection').classList.add('hidden');
  document.getElementById('convOutput').innerHTML = `<div class="empty-state"><div class="empty-icon">🎨</div><div>Enter a color to see conversions</div></div>`;
  document.getElementById('colorSwatch').style.background = '';
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    if (event && event.target) {
      const el = event.target;
      const orig = el.textContent;
      el.textContent = 'copied!';
      setTimeout(() => { el.textContent = orig; }, 1400);
    }
  });
}

// Init with the default green
window.addEventListener('DOMContentLoaded', () => {
  updateUI(hexToRgb('#00ff9f'));
});
