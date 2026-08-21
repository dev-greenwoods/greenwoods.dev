'use strict';

// ── Tokenise input into words ─────────────────────────────────────────────────
function tokenize(input) {
  if (!input) return [];
  return input
    // Split on camelCase / PascalCase boundaries
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // Split on separators
    .split(/[\s\-_./\\|:]+/)
    .map(w => w.trim())
    .filter(Boolean);
}

// ── Converters ────────────────────────────────────────────────────────────────
const converters = {
  camel:    words => words.map((w, i) => i === 0 ? w.toLowerCase() : cap(w)).join(''),
  pascal:   words => words.map(cap).join(''),
  snake:    words => words.map(w => w.toLowerCase()).join('_'),
  screaming:words => words.map(w => w.toUpperCase()).join('_'),
  kebab:    words => words.map(w => w.toLowerCase()).join('-'),
  train:    words => words.map(cap).join('-'),
  dot:      words => words.map(w => w.toLowerCase()).join('.'),
  path:     words => words.map(w => w.toLowerCase()).join('/'),
  lower:    words => words.map(w => w.toLowerCase()).join(' '),
  upper:    words => words.map(w => w.toUpperCase()).join(' '),
  title:    words => words.map(titleWord).join(' '),
  sentence: words => {
    const joined = words.map(w => w.toLowerCase()).join(' ');
    return joined.charAt(0).toUpperCase() + joined.slice(1);
  },
  swap:     (_words, original) => [...original].map(c =>
    c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()
  ).join(''),
  alternate:(_words, original) => [...original].map((c, i) =>
    i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
  ).join(''),
};

function cap(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Title-case: skip small words unless first
const SMALL = new Set(['a','an','the','and','but','or','for','nor','on','at','to','by','in','of','up','as','is','it']);
function titleWord(word, i) {
  const lower = word.toLowerCase();
  return (i === 0 || !SMALL.has(lower)) ? cap(word) : lower;
}

// ── Output formats ────────────────────────────────────────────────────────────
const FORMATS = [
  { id: 'camel',     label: 'camelCase',            example: 'myVariableName' },
  { id: 'pascal',    label: 'PascalCase',            example: 'MyVariableName' },
  { id: 'snake',     label: 'snake_case',            example: 'my_variable_name' },
  { id: 'screaming', label: 'SCREAMING_SNAKE',       example: 'MY_VARIABLE_NAME' },
  { id: 'kebab',     label: 'kebab-case',            example: 'my-variable-name' },
  { id: 'train',     label: 'Train-Case',            example: 'My-Variable-Name' },
  { id: 'dot',       label: 'dot.case',              example: 'my.variable.name' },
  { id: 'path',      label: 'path/case',             example: 'my/variable/name' },
  { id: 'lower',     label: 'lowercase',             example: 'my variable name' },
  { id: 'upper',     label: 'UPPERCASE',             example: 'MY VARIABLE NAME' },
  { id: 'title',     label: 'Title Case',            example: 'My Variable Name' },
  { id: 'sentence',  label: 'Sentence case',         example: 'My variable name' },
  { id: 'swap',      label: 'sWAP cASE',             example: 'mY vARIABLE nAME' },
  { id: 'alternate', label: 'aLtErNaTe',             example: 'mY vArIaBlE nAmE' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
function convert() {
  const input  = document.getElementById('inputText').value;
  const status = document.getElementById('statusText');
  const cards  = document.getElementById('outputCards');

  if (!input.trim()) {
    cards.innerHTML = FORMATS.map(f => renderCard(f, f.example, true)).join('');
    status.textContent = 'Type or paste text above to convert.';
    return;
  }

  const words = tokenize(input);
  cards.innerHTML = FORMATS.map(f => {
    const result = converters[f.id](words, input);
    return renderCard(f, result, false);
  }).join('');

  status.textContent = `${words.length} word${words.length !== 1 ? 's' : ''} detected · ${FORMATS.length} formats`;
}

function renderCard(f, value, isExample) {
  return `
    <div class="case-card" onclick="copyCard(this, '${escAttr(value)}')">
      <div class="case-label">${escHtml(f.label)}</div>
      <div class="case-value ${isExample ? 'is-example' : ''}">${escHtml(value)}</div>
      <button class="case-copy" tabindex="-1">copy</button>
    </div>`;
}

function copyCard(card, value) {
  navigator.clipboard.writeText(value).then(() => {
    const btn = card.querySelector('.case-copy');
    btn.textContent = 'copied!';
    btn.classList.add('active');
    setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('active'); }, 1500);
  });
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;'); }

function clearAll() {
  document.getElementById('inputText').value = '';
  convert();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('inputText').addEventListener('input', convert);
  convert(); // render examples
});
