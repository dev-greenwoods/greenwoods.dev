'use strict';

// ── Named code points ─────────────────────────────────────────────────────────
const NAMED = {
  0x0000:'NULL', 0x0001:'START OF HEADING', 0x0002:'START OF TEXT',
  0x0003:'END OF TEXT', 0x0004:'END OF TRANSMISSION', 0x0007:'BELL',
  0x0008:'BACKSPACE', 0x0009:'CHARACTER TABULATION', 0x000A:'LINE FEED',
  0x000B:'LINE TABULATION', 0x000C:'FORM FEED', 0x000D:'CARRIAGE RETURN',
  0x001B:'ESCAPE', 0x001C:'INFORMATION SEPARATOR FOUR',
  0x001D:'INFORMATION SEPARATOR THREE', 0x001E:'INFORMATION SEPARATOR TWO',
  0x001F:'INFORMATION SEPARATOR ONE', 0x0020:'SPACE',
  0x00A0:'NO-BREAK SPACE', 0x00AD:'SOFT HYPHEN',
  0x034F:'COMBINING GRAPHEME JOINER',
  0x061C:'ARABIC LETTER MARK',
  0x115F:'HANGUL CHOSEONG FILLER', 0x1160:'HANGUL JUNGSEONG FILLER',
  0x17B4:'KHMER VOWEL INHERENT AQ', 0x17B5:'KHMER VOWEL INHERENT AA',
  0x180B:'MONGOLIAN FREE VARIATION SELECTOR ONE',
  0x180E:'MONGOLIAN VOWEL SEPARATOR',
  0x200B:'ZERO WIDTH SPACE', 0x200C:'ZERO WIDTH NON-JOINER',
  0x200D:'ZERO WIDTH JOINER', 0x200E:'LEFT-TO-RIGHT MARK',
  0x200F:'RIGHT-TO-LEFT MARK', 0x2028:'LINE SEPARATOR',
  0x2029:'PARAGRAPH SEPARATOR', 0x202A:'LEFT-TO-RIGHT EMBEDDING',
  0x202B:'RIGHT-TO-LEFT EMBEDDING', 0x202C:'POP DIRECTIONAL FORMATTING',
  0x202D:'LEFT-TO-RIGHT OVERRIDE', 0x202E:'RIGHT-TO-LEFT OVERRIDE',
  0x2060:'WORD JOINER', 0x2061:'FUNCTION APPLICATION',
  0x2062:'INVISIBLE TIMES', 0x2063:'INVISIBLE SEPARATOR',
  0x2064:'INVISIBLE PLUS', 0x206A:'INHIBIT SYMMETRIC SWAPPING',
  0x206B:'ACTIVATE SYMMETRIC SWAPPING', 0x206C:'INHIBIT ARABIC FORM SHAPING',
  0x206D:'ACTIVATE ARABIC FORM SHAPING', 0x206E:'NATIONAL DIGIT SHAPES',
  0x206F:'NOMINAL DIGIT SHAPES', 0x3000:'IDEOGRAPHIC SPACE',
  0xFEFF:'ZERO WIDTH NO-BREAK SPACE (BOM)', 0xFFFD:'REPLACEMENT CHARACTER',
  0xFFFE:'BYTE ORDER MARK (UTF-16 LE)', 0xFFFF:'NONCHARACTER',
};

// Confusable — Cyrillic/Greek look-alikes for Latin
const CONFUSABLE = {
  0x0430:'→ Latin "a"', 0x0435:'→ Latin "e"', 0x043E:'→ Latin "o"',
  0x0440:'→ Latin "r"', 0x0441:'→ Latin "c"', 0x0443:'→ Latin "y"',
  0x0445:'→ Latin "x"', 0x0456:'→ Latin "i"',
  0x0410:'→ Latin "A"', 0x0412:'→ Latin "B"', 0x0415:'→ Latin "E"',
  0x041A:'→ Latin "K"', 0x041C:'→ Latin "M"', 0x041D:'→ Latin "H"',
  0x041E:'→ Latin "O"', 0x0420:'→ Latin "P"', 0x0421:'→ Latin "C"',
  0x0422:'→ Latin "T"', 0x0425:'→ Latin "X"',
  0x0391:'→ Latin "A"', 0x0392:'→ Latin "B"', 0x0395:'→ Latin "E"',
  0x0396:'→ Latin "Z"', 0x0397:'→ Latin "H"', 0x0399:'→ Latin "I"',
  0x039A:'→ Latin "K"', 0x039C:'→ Latin "M"', 0x039D:'→ Latin "N"',
  0x039F:'→ Latin "O"', 0x03A1:'→ Latin "P"', 0x03A4:'→ Latin "T"',
  0x03A5:'→ Latin "Y"', 0x03A7:'→ Latin "X"',
  0x03B1:'→ Latin "a"', 0x03B5:'→ Latin "e"', 0x03BF:'→ Latin "o"',
  0x2126:'→ Latin "Ω" (use U+03A9)', 0x0307:'→ looks like dot above',
  // Full-width digits/letters
  0xFF10:'Full-width digit 0 (looks like "0")',
  0xFF21:'Full-width letter A', 0xFF41:'Full-width letter a',
};

// Zero-width / invisible set
const ZERO_WIDTH = new Set([
  0x00AD,0x034F,0x061C,0x115F,0x1160,0x17B4,0x17B5,0x180E,
  0x200B,0x200C,0x200D,0x200E,0x200F,0x2028,0x2029,
  0x202A,0x202B,0x202C,0x202D,0x202E,
  0x2060,0x2061,0x2062,0x2063,0x2064,
  0x206A,0x206B,0x206C,0x206D,0x206E,0x206F,
  0xFEFF,0xFFFF,0xFFFE,
]);

// ── Category from code point ──────────────────────────────────────────────────
function category(cp) {
  if (ZERO_WIDTH.has(cp))                          return 'Zero-Width';
  if (cp < 0x20 || (cp >= 0x7F && cp <= 0x9F))    return 'Control';
  if (cp === 0x20)                                  return 'Space';
  if (cp >= 0x09 && cp <= 0x0D)                    return 'Whitespace';
  if (cp >= 0x21 && cp <= 0x7E)                    return 'ASCII';
  if (cp >= 0x0080 && cp <= 0x00FF)                return 'Latin-1 Supplement';
  if (cp >= 0x0100 && cp <= 0x024F)                return 'Latin Extended';
  if (cp >= 0x0250 && cp <= 0x02AF)                return 'IPA Extensions';
  if (cp >= 0x02B0 && cp <= 0x036F)                return 'Combining / Modifier';
  if (cp >= 0x0370 && cp <= 0x03FF)                return 'Greek / Coptic';
  if (cp >= 0x0400 && cp <= 0x04FF)                return 'Cyrillic';
  if (cp >= 0x0500 && cp <= 0x052F)                return 'Cyrillic Supplement';
  if (cp >= 0x0590 && cp <= 0x05FF)                return 'Hebrew';
  if (cp >= 0x0600 && cp <= 0x06FF)                return 'Arabic';
  if (cp >= 0x0900 && cp <= 0x097F)                return 'Devanagari';
  if (cp >= 0x0980 && cp <= 0x09FF)                return 'Bengali';
  if (cp >= 0x0E00 && cp <= 0x0E7F)                return 'Thai';
  if (cp >= 0x1000 && cp <= 0x109F)                return 'Myanmar';
  if (cp >= 0x10A0 && cp <= 0x10FF)                return 'Georgian';
  if (cp >= 0x1100 && cp <= 0x11FF)                return 'Hangul Jamo';
  if (cp >= 0x2000 && cp <= 0x206F)                return 'General Punctuation';
  if (cp >= 0x2070 && cp <= 0x209F)                return 'Superscripts / Subscripts';
  if (cp >= 0x20A0 && cp <= 0x20CF)                return 'Currency Symbols';
  if (cp >= 0x2100 && cp <= 0x214F)                return 'Letterlike Symbols';
  if (cp >= 0x2150 && cp <= 0x218F)                return 'Number Forms';
  if (cp >= 0x2190 && cp <= 0x21FF)                return 'Arrows';
  if (cp >= 0x2200 && cp <= 0x22FF)                return 'Mathematical Operators';
  if (cp >= 0x2300 && cp <= 0x23FF)                return 'Technical Symbols';
  if (cp >= 0x2500 && cp <= 0x257F)                return 'Box Drawing';
  if (cp >= 0x2580 && cp <= 0x259F)                return 'Block Elements';
  if (cp >= 0x25A0 && cp <= 0x25FF)                return 'Geometric Shapes';
  if (cp >= 0x2600 && cp <= 0x26FF)                return 'Misc Symbols';
  if (cp >= 0x2700 && cp <= 0x27BF)                return 'Dingbats';
  if (cp >= 0x3000 && cp <= 0x303F)                return 'CJK Symbols / Punctuation';
  if (cp >= 0x3040 && cp <= 0x309F)                return 'Hiragana';
  if (cp >= 0x30A0 && cp <= 0x30FF)                return 'Katakana';
  if (cp >= 0x3100 && cp <= 0x312F)                return 'Bopomofo';
  if (cp >= 0x3400 && cp <= 0x4DBF)                return 'CJK Extension A';
  if (cp >= 0x4E00 && cp <= 0x9FFF)                return 'CJK Unified';
  if (cp >= 0xAC00 && cp <= 0xD7AF)                return 'Hangul Syllables';
  if (cp >= 0xD800 && cp <= 0xDFFF)                return 'Surrogate';
  if (cp >= 0xE000 && cp <= 0xF8FF)                return 'Private Use';
  if (cp >= 0xF900 && cp <= 0xFAFF)                return 'CJK Compatibility';
  if (cp >= 0xFB00 && cp <= 0xFDFF)                return 'Alphabetic Presentation';
  if (cp >= 0xFE00 && cp <= 0xFE0F)                return 'Variation Selectors';
  if (cp >= 0xFF00 && cp <= 0xFFEF)                return 'Halfwidth / Fullwidth';
  if (cp >= 0x1D400 && cp <= 0x1D7FF)              return 'Math Alphanumeric';
  if (cp >= 0x1F300 && cp <= 0x1F5FF)              return 'Misc Symbols / Pictographs';
  if (cp >= 0x1F600 && cp <= 0x1F64F)              return 'Emoticons';
  if (cp >= 0x1F650 && cp <= 0x1F6FF)              return 'Transport / Map';
  if (cp >= 0x1F900 && cp <= 0x1F9FF)              return 'Supplemental Symbols';
  if (cp >= 0x1FA00 && cp <= 0x1FAFF)              return 'Chess / Other Symbols';
  return 'Other';
}

function name(cp) {
  if (NAMED[cp]) return NAMED[cp];
  if (cp >= 0x4E00 && cp <= 0x9FFF) return `CJK UNIFIED IDEOGRAPH-${cp.toString(16).toUpperCase()}`;
  if (cp >= 0xAC00 && cp <= 0xD7AF) return `HANGUL SYLLABLE`;
  if (cp >= 0x1F600 && cp <= 0x1F64F) return `EMOJI`;
  if (cp >= 0x1F300 && cp <= 0x1FAFF) return `SYMBOL`;
  if (cp < 0x20) return `CONTROL CHARACTER`;
  return '';
}

// ── Char analysis ─────────────────────────────────────────────────────────────
function analyzeChar(char) {
  const cp    = char.codePointAt(0);
  const hex   = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
  const dec   = cp;
  const cat   = category(cp);
  const nm    = name(cp);
  const isZW  = ZERO_WIDTH.has(cp);
  const isCtrl= cp < 0x20 || (cp >= 0x7F && cp <= 0x9F);
  const conf  = CONFUSABLE[cp] || null;
  const isSurrPair = char.length === 2 && cp > 0xFFFF;

  let warnings = [];
  if (isZW)   warnings.push('invisible');
  if (isCtrl && cp !== 0x09 && cp !== 0x0A && cp !== 0x0D) warnings.push('control');
  if (conf)   warnings.push('confusable');
  if (cp >= 0x202A && cp <= 0x202E) warnings.push('bidi-override');
  if (cp === 0xFEFF) warnings.push('bom');

  return { char, cp, hex, dec, cat, nm, warnings, conf, isZW, isCtrl, isSurrPair };
}

// ── Render helpers ────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderGlyph(info) {
  if (info.isZW || (info.isCtrl && info.cp !== 0x09 && info.cp !== 0x0A && info.cp !== 0x0D)) {
    return `<span class="glyph-ctrl" title="${info.nm || info.hex}">␦</span>`;
  }
  if (info.cp === 0x0A) return `<span class="glyph-ctrl">↵</span>`;
  if (info.cp === 0x0D) return `<span class="glyph-ctrl">↵</span>`;
  if (info.cp === 0x09) return `<span class="glyph-ctrl">⇥</span>`;
  if (info.cp === 0x20) return `<span class="glyph-ctrl">·</span>`;
  return `<span class="glyph">${escHtml(info.char)}</span>`;
}

function warningBadges(info) {
  return info.warnings.map(w => {
    const labels = { invisible:'zero-width', control:'control', confusable:'confusable', 'bidi-override':'bidi override', bom:'BOM' };
    return `<span class="warn-badge warn-${w}">${labels[w] || w}</span>`;
  }).join(' ');
}

function renderRows(chars, showAll) {
  let html = '';
  chars.forEach((info, i) => {
    const hasWarn = info.warnings.length > 0;
    const rowCls  = hasWarn ? 'row-warn' : '';
    const confNote = info.conf ? `<span class="conf-note">${info.conf}</span>` : '';
    html += `
    <tr class="${rowCls}" title="${escHtml(info.nm || info.hex)}">
      <td class="col-idx">${i + 1}</td>
      <td class="col-glyph">${renderGlyph(info)}</td>
      <td class="col-cp">${info.hex}</td>
      <td class="col-dec">${info.dec}</td>
      <td class="col-name">${escHtml(info.nm)}${confNote}</td>
      <td class="col-cat"><span class="cat-badge">${info.cat}</span></td>
      <td class="col-warn">${warningBadges(info)}</td>
    </tr>`;
  });
  return html;
}

// ── Main ──────────────────────────────────────────────────────────────────────
function inspect() {
  const raw    = document.getElementById('textInput').value;
  const status = document.getElementById('statusText');
  const tbody  = document.getElementById('charTable');
  const statsEl= document.getElementById('stats');

  if (!raw) {
    tbody.innerHTML  = `<tr><td colspan="7" class="empty-cell">Paste text above to inspect characters</td></tr>`;
    statsEl.innerHTML = '';
    status.textContent = 'Paste any text to inspect its characters.';
    return;
  }

  // Split by full Unicode code points (handles emoji, surrogate pairs)
  const chars = [...raw].map(analyzeChar);

  const invisible  = chars.filter(c => c.isZW || (c.isCtrl && c.cp !== 0x09 && c.cp !== 0x0A && c.cp !== 0x0D)).length;
  const confusable = chars.filter(c => c.conf).length;
  const unique     = new Set(chars.map(c => c.cp)).size;
  const bidi       = chars.filter(c => c.warnings.includes('bidi-override')).length;

  tbody.innerHTML = renderRows(chars);

  // Stats bar
  let statHtml = `
    <span class="stat"><strong>${chars.length}</strong> chars</span>
    <span class="stat"><strong>${unique}</strong> unique</span>
    <span class="stat"><strong>${raw.length}</strong> code units</span>`;
  if (invisible)  statHtml += `<span class="stat stat-warn"><strong>${invisible}</strong> invisible ⚠</span>`;
  if (confusable) statHtml += `<span class="stat stat-conf"><strong>${confusable}</strong> confusable ⚠</span>`;
  if (bidi)       statHtml += `<span class="stat stat-bidi"><strong>${bidi}</strong> bidi override ⚠</span>`;
  statsEl.innerHTML = statHtml;

  const warningCount = invisible + confusable + bidi;
  status.textContent = warningCount
    ? `⚠ ${warningCount} suspicious character${warningCount !== 1 ? 's' : ''} found — check highlighted rows`
    : `${chars.length} characters · no suspicious characters detected`;
}

const SAMPLE = `Hello\u200B\u200D world — invisible chars above!
Cyrillic а е о (look like Latin a e o)
\u202Ebidi override\u202C ← dangerous
Normal text: the quick brown fox.`;

function loadSample() {
  document.getElementById('textInput').value = SAMPLE;
  inspect();
}

function clearAll() {
  document.getElementById('textInput').value = '';
  inspect();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('textInput').addEventListener('input', inspect);
});
