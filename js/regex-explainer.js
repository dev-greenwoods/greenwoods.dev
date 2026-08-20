'use strict';

// ── Colour classes per token type ─────────────────────────────────────────────
const COLOR = {
  anchor:      'c-anchor',
  dot:         'c-dot',
  escape:      'c-escape',
  class:       'c-class',
  group:       'c-group',
  literal:     'c-literal',
  alternation: 'c-alt',
};

// ── Quantifier helpers ────────────────────────────────────────────────────────
function readQuantifier(src, i) {
  if (i >= src.length) return { raw: '', q: null, len: 0 };
  const ch = src[i];
  let raw = '', lazy = false;

  if (ch === '*' || ch === '+' || ch === '?') {
    raw = ch; i++;
  } else if (ch === '{') {
    let j = i;
    while (j < src.length && src[j] !== '}') j++;
    raw = src.slice(i, j + 1); i = j + 1;
  } else {
    return { raw: '', q: null, len: 0 };
  }

  if (i < src.length && src[i] === '?') { raw += '?'; lazy = true; i++; }
  return { raw, q: raw, len: raw.length };
}

function explainQ(q) {
  if (!q) return null;
  const lazy  = q.endsWith('?') && q !== '?';
  const base  = lazy ? q.slice(0, -1) : q;
  const tag   = lazy ? ' <em>(lazy)</em>' : '';
  if (base === '*') return `zero or more times${tag}`;
  if (base === '+') return `one or more times${tag}`;
  if (base === '?') return 'optionally (zero or one time)';
  const m = base.match(/^\{(\d+)(?:,(\d*))?\}$/);
  if (m) {
    if (m[2] === undefined) return `exactly ${m[1]} time${m[1] !== '1' ? 's' : ''}`;
    if (m[2] === '')        return `at least ${m[1]} times${tag}`;
    return `between ${m[1]} and ${m[2]} times${tag}`;
  }
  return q;
}

// ── Character-class contents explainer ───────────────────────────────────────
function explainClassContents(inner) {
  if (!inner) return '(empty)';
  const parts = [];
  let i = 0;
  const escMap = { d:'digit [0-9]', D:'non-digit', w:'word char', W:'non-word char',
                   s:'whitespace', S:'non-whitespace', n:'newline', t:'tab', r:'carriage return' };
  while (i < inner.length) {
    if (inner[i] === '\\' && i + 1 < inner.length) {
      const nx = inner[i + 1];
      parts.push(escMap[nx] ? `<em>${escMap[nx]}</em>` : `"${nx}"`);
      i += 2; continue;
    }
    if (i + 2 < inner.length && inner[i + 1] === '-') {
      parts.push(`"${inner[i]}"–"${inner[i + 2]}"`);
      i += 3; continue;
    }
    parts.push(`"${inner[i]}"`);
    i++;
  }
  return parts.join(', ');
}

// ── Main tokenizer ────────────────────────────────────────────────────────────
function tokenize(src) {
  const tokens = [];
  let i = 0;
  let captureIdx = 0;

  while (i < src.length) {
    const ch = src[i];

    // Anchor: ^
    if (ch === '^') {
      tokens.push({ type:'anchor', raw:'^', color:COLOR.anchor,
        explain:'Start of string (or start of line with the <code>m</code> flag)' });
      i++; continue;
    }

    // Anchor: $
    if (ch === '$') {
      tokens.push({ type:'anchor', raw:'$', color:COLOR.anchor,
        explain:'End of string (or end of line with the <code>m</code> flag)' });
      i++; continue;
    }

    // Alternation
    if (ch === '|') {
      tokens.push({ type:'alternation', raw:'|', color:COLOR.alternation,
        explain:'<strong>OR</strong> — matches either the expression to the left or to the right' });
      i++; continue;
    }

    // Dot
    if (ch === '.') {
      i++;
      const { raw: qr, q } = readQuantifier(src, i);
      if (q) i += qr.length;
      tokens.push({ type:'dot', raw:'.', color:COLOR.dot, quantifier:q, quantifierRaw:qr,
        explain:'Any single character <em>except</em> newline (use <code>s</code> flag to include newline)' });
      continue;
    }

    // Escape sequences
    if (ch === '\\' && i + 1 < src.length) {
      const nx = src[i + 1];

      // Unicode / hex — consume more chars
      if ((nx === 'u' || nx === 'x') && i + 2 < src.length) {
        const len   = nx === 'u' ? 4 : 2;
        const hex   = src.slice(i + 2, i + 2 + len);
        const cp    = parseInt(hex, 16);
        const chr   = isNaN(cp) ? '?' : String.fromCodePoint(cp);
        const raw   = src.slice(i, i + 2 + len);
        i += 2 + len;
        const { raw: qr, q } = readQuantifier(src, i);
        if (q) i += qr.length;
        tokens.push({ type:'escape', raw, color:COLOR.escape, quantifier:q, quantifierRaw:qr,
          explain:`Unicode / hex character U+${hex.toUpperCase()} → <strong>${escHtml(chr)}</strong>` });
        continue;
      }

      let explain = '', color = COLOR.escape;
      switch (nx) {
        case 'd': explain = 'Any digit — shorthand for <code>[0-9]</code>'; break;
        case 'D': explain = 'Any <em>non</em>-digit — shorthand for <code>[^0-9]</code>'; break;
        case 'w': explain = 'Any word character — shorthand for <code>[a-zA-Z0-9_]</code>'; break;
        case 'W': explain = 'Any <em>non</em>-word character'; break;
        case 's': explain = 'Any whitespace character (space, tab, newline, etc.)'; break;
        case 'S': explain = 'Any <em>non</em>-whitespace character'; break;
        case 'b': explain = 'Word boundary — zero-width position between a word char and a non-word char'; color = COLOR.anchor; break;
        case 'B': explain = 'Non-word boundary'; color = COLOR.anchor; break;
        case 'n': explain = 'Newline character (LF)'; break;
        case 't': explain = 'Tab character'; break;
        case 'r': explain = 'Carriage return (CR)'; break;
        case '0': explain = 'Null character (NUL)'; break;
        case 'f': explain = 'Form feed character'; break;
        case 'v': explain = 'Vertical tab character'; break;
        default:
          if (/[1-9]/.test(nx)) {
            explain = `Backreference — re-matches what capture group #${nx} matched`;
            color = COLOR.group;
          } else {
            explain = `Literal <strong>"${escHtml(nx)}"</strong> (escaped to avoid special meaning)`;
            color = COLOR.literal;
          }
      }

      const raw = '\\' + nx;
      i += 2;
      const { raw: qr, q } = readQuantifier(src, i);
      if (q) i += qr.length;
      tokens.push({ type:'escape', raw, color, quantifier:q, quantifierRaw:qr, explain });
      continue;
    }

    // Character class [...]
    if (ch === '[') {
      let j = i + 1;
      const negated = j < src.length && src[j] === '^';
      if (negated) j++;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === ']')  break;
        j++;
      }
      const raw   = src.slice(i, j + 1);
      const inner = negated ? raw.slice(2, -1) : raw.slice(1, -1);
      i = j + 1;
      const { raw: qr, q } = readQuantifier(src, i);
      if (q) i += qr.length;
      const verb  = negated ? 'Any character <em>not</em> in:' : 'Any one character in:';
      tokens.push({ type:'class', raw, color:COLOR.class, quantifier:q, quantifierRaw:qr,
        explain:`${verb} ${explainClassContents(inner)}` });
      continue;
    }

    // Groups (...)
    if (ch === '(') {
      // Find the matching closing paren, respecting nesting + escapes
      let depth = 1, j = i + 1;
      while (j < src.length && depth > 0) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '(') depth++;
        if (src[j] === ')') depth--;
        j++;
      }
      const raw = src.slice(i, j);
      i = j;
      const { raw: qr, q } = readQuantifier(src, i);
      if (q) i += qr.length;

      let explain = '', gtype = '';
      if      (raw.startsWith('(?:'))  { gtype = 'non-capture';    explain = 'Non-capturing group — groups the expression without saving the match'; }
      else if (raw.startsWith('(?='))  { gtype = 'lookahead';      explain = 'Positive lookahead — asserts the pattern ahead exists (not consumed)'; }
      else if (raw.startsWith('(?!'))  { gtype = 'neg-lookahead';  explain = 'Negative lookahead — asserts the pattern ahead does <em>not</em> exist'; }
      else if (raw.startsWith('(?<=')) { gtype = 'lookbehind';     explain = 'Positive lookbehind — asserts the pattern behind exists'; }
      else if (raw.startsWith('(?<!')) { gtype = 'neg-lookbehind'; explain = 'Negative lookbehind — asserts the pattern behind does <em>not</em> exist'; }
      else if (raw.startsWith('(?<')) {
        const nm = raw.match(/^\(\?<([^>]+)>/);
        captureIdx++;
        gtype   = 'named';
        explain = `Named capture group <strong>"${nm ? nm[1] : '?'}"</strong> — saves as group #${captureIdx}`;
      } else {
        captureIdx++;
        gtype   = 'capture';
        explain = `Capture group <strong>#${captureIdx}</strong> — saves the matched text for backreference or extraction`;
      }

      tokens.push({ type:'group', raw, color:COLOR.group, quantifier:q, quantifierRaw:qr, explain, gtype });
      continue;
    }

    // Literal character
    const lit = ch;
    i++;
    const { raw: qr, q } = readQuantifier(src, i);
    if (q) i += qr.length;
    tokens.push({ type:'literal', raw:lit, color:COLOR.literal, quantifier:q, quantifierRaw:qr,
      explain:`Literal character <strong>"${escHtml(lit)}"</strong>` });
  }

  return tokens;
}

// ── Rendering helpers ─────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderVisual(tokens) {
  return tokens.map((tok, idx) => {
    const qSpan = tok.quantifier
      ? `<span class="tok-q">${escHtml(tok.quantifierRaw)}</span>`
      : '';
    return `<span class="tok ${tok.color}" data-idx="${idx}" title="${tok.explain.replace(/<[^>]*>/g,'')}">${escHtml(tok.raw)}${qSpan}</span>`;
  }).join('');
}

function renderExplanations(tokens) {
  if (!tokens.length) return '';
  return tokens.map((tok, idx) => {
    const qText = tok.quantifier ? ` — repeated <span class="exp-q">${explainQ(tok.quantifier)}</span>` : '';
    return `
      <div class="exp-row" data-idx="${idx}">
        <span class="exp-num">${idx + 1}</span>
        <span class="tok-pill ${tok.color}">${escHtml(tok.raw)}</span>
        <span class="exp-text">${tok.explain}${qText}</span>
      </div>`;
  }).join('');
}

function renderFlags(flags) {
  const map = {
    g: ['g', 'Global — find all matches, not just the first'],
    i: ['i', 'Case-insensitive'],
    m: ['m', 'Multiline — ^ and $ match line boundaries'],
    s: ['s', 'Dot-all — . also matches newline'],
    u: ['u', 'Unicode — enables full Unicode support'],
    y: ['y', 'Sticky — match only from lastIndex position'],
  };
  if (!flags) return '';
  return [...flags].map(f => {
    const info = map[f] || [f, 'Unknown flag'];
    return `<div class="flag-row"><span class="flag-badge">${info[0]}</span><span class="flag-desc">${info[1]}</span></div>`;
  }).join('');
}

// ── Live test ─────────────────────────────────────────────────────────────────
function runTest(pattern, flags, testText) {
  if (!pattern || !testText) return { html: escHtml(testText), count: 0 };
  let re;
  try {
    re = new RegExp(pattern, (flags || '').replace('g','') + 'g');
  } catch (e) {
    return { html: escHtml(testText), count: 0, err: e.message };
  }

  let count = 0;
  const result = testText.replace(re, m => {
    count++;
    return `<mark class="match">${escHtml(m)}</mark>`;
  });
  return { html: result, count };
}

// ── Main driver ───────────────────────────────────────────────────────────────
function explain() {
  const raw     = document.getElementById('patternInput').value;
  const flags   = [...document.querySelectorAll('.flag-toggle.on')].map(b => b.dataset.flag).join('');
  const testTxt = document.getElementById('testInput').value;
  const errEl   = document.getElementById('patternError');
  const status  = document.getElementById('statusText');

  errEl.classList.add('hidden');

  if (!raw.trim()) {
    document.getElementById('visual').innerHTML  = `<div class="empty-visual">Enter a regex pattern above</div>`;
    document.getElementById('expList').innerHTML = '';
    document.getElementById('testOutput').innerHTML = escHtml(testTxt);
    document.getElementById('flagsPanel').innerHTML = '';
    status.textContent = 'Enter a pattern to begin.';
    return;
  }

  // Validate regex
  try { new RegExp(raw, flags); } catch (e) {
    errEl.textContent = `Invalid regex: ${e.message}`;
    errEl.classList.remove('hidden');
    status.textContent = 'Fix the pattern to continue.';
    return;
  }

  const tokens = tokenize(raw);

  document.getElementById('visual').innerHTML  = renderVisual(tokens) || `<span class="c-literal">(empty)</span>`;
  document.getElementById('expList').innerHTML = renderExplanations(tokens);
  document.getElementById('flagsPanel').innerHTML = flags ? renderFlags(flags) : '';

  // Test
  const { html, count, err } = runTest(raw, flags, testTxt);
  document.getElementById('testOutput').innerHTML = html || '&nbsp;';
  if (err) {
    document.getElementById('testOutput').textContent = testTxt;
  }

  // Hover sync between visual tokens and explanation rows
  document.querySelectorAll('.tok[data-idx]').forEach(el => {
    el.addEventListener('mouseenter', () => highlight(el.dataset.idx, true));
    el.addEventListener('mouseleave', () => highlight(el.dataset.idx, false));
  });
  document.querySelectorAll('.exp-row[data-idx]').forEach(el => {
    el.addEventListener('mouseenter', () => highlight(el.dataset.idx, true));
    el.addEventListener('mouseleave', () => highlight(el.dataset.idx, false));
  });

  const typeCount = new Set(tokens.map(t => t.type)).size;
  status.textContent = `${tokens.length} token${tokens.length !== 1 ? 's' : ''} · ${count} match${count !== 1 ? 'es' : ''} in test input`;
}

function highlight(idx, on) {
  document.querySelectorAll(`[data-idx="${idx}"]`).forEach(el => el.classList.toggle('hl', on));
}

// ── Sample patterns ───────────────────────────────────────────────────────────
const SAMPLES = [
  { label: 'Email',     pattern: '^[\\w.+-]+@[\\w-]+\\.[a-z]{2,}$',           flags: 'i', test: 'user@example.com\nbad@\nhello@world.io' },
  { label: 'URL',       pattern: 'https?:\\/\\/([\\w-]+\\.)+[\\w]{2,}(\\/\\S*)?', flags: 'gi', test: 'Visit https://greenwoods.dev or http://example.com/path?q=1' },
  { label: 'Date',      pattern: '(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])', flags: 'g', test: '2024-01-15 and 2024-13-99 and 1999-12-31' },
  { label: 'Hex Color', pattern: '#([0-9a-f]{3}|[0-9a-f]{6})\\b',              flags: 'gi', test: '#fff #00ff9f #AABBCC #gg nope' },
  { label: 'IPv4',      pattern: '\\b(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)(\\.(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)){3}\\b', flags: 'g', test: '192.168.1.1 and 999.0.0.1 and 10.0.0.255' },
];

let sampleIdx = 0;
function loadSample() {
  const s = SAMPLES[sampleIdx % SAMPLES.length];
  sampleIdx++;
  document.getElementById('patternInput').value = s.pattern;
  document.getElementById('testInput').value    = s.test;
  // Set flags
  document.querySelectorAll('.flag-toggle').forEach(b => {
    b.classList.toggle('on', s.flags.includes(b.dataset.flag));
  });
  explain();
}

function clearAll() {
  document.getElementById('patternInput').value = '';
  document.getElementById('testInput').value    = '';
  document.querySelectorAll('.flag-toggle').forEach(b => b.classList.remove('on'));
  explain();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('patternInput').addEventListener('input', explain);
  document.getElementById('testInput').addEventListener('input', explain);
  document.querySelectorAll('.flag-toggle').forEach(b => {
    b.addEventListener('click', () => { b.classList.toggle('on'); explain(); });
  });
});
