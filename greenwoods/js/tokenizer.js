// ── Tokenizer setup ──────────────────────────────────────────────
let encodeFunc = null;
let decodeFunc = null;

const tokStatus = document.getElementById('tokStatus');

import('https://esm.sh/gpt-tokenizer@2.1.2')
  .then(mod => {
    encodeFunc = mod.encode;
    decodeFunc = mod.decode;
    tokStatus.textContent = 'cl100k_base tokenizer loaded (GPT-4 / Claude compatible)';
    tokStatus.className = 'tokenizer-status ready';
    run();
  })
  .catch(() => {
    tokStatus.textContent = 'Using approximation — install gpt-tokenizer for exact results';
    tokStatus.className = 'tokenizer-status approx';
    run();
  });

// ── Fallback approximation ────────────────────────────────────────
function approxTokens(text) {
  if (!text) return [];
  // Very rough word-level split for visualization fallback
  const parts = [];
  const re = /(\s+|[^\s]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const w = m[0];
    if (/^\s+$/.test(w)) {
      parts.push({ text: w, id: Math.floor(Math.random() * 9000) + 1000 });
    } else if (w.length <= 5) {
      parts.push({ text: w, id: Math.floor(Math.random() * 9000) + 1000 });
    } else {
      // Split longer words into ~4-char chunks
      let i = 0;
      while (i < w.length) {
        const chunk = w.slice(i, i + 4);
        parts.push({ text: chunk, id: Math.floor(Math.random() * 9000) + 1000 });
        i += 4;
      }
    }
  }
  return parts;
}

// ── DOM refs ──────────────────────────────────────────────────────
const inputArea   = document.getElementById('inputArea');
const statTokens  = document.getElementById('statTokens');
const statChars   = document.getElementById('statChars');
const statWords   = document.getElementById('statWords');
const statRatio   = document.getElementById('statRatio');
const emptyState  = document.getElementById('emptyState');
const vizTokens   = document.getElementById('vizTokens');
const vizIds      = document.getElementById('vizIds');
const legendRow   = document.getElementById('legendRow');

let mode = 'viz'; // 'viz' | 'ids'

document.querySelectorAll('.tab[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    renderMode();
  });
});

function renderMode() {
  const hasText = inputArea.value.trim().length > 0;
  if (!hasText) return;
  if (mode === 'viz') {
    vizTokens.style.display = '';
    vizIds.style.display = 'none';
  } else {
    vizTokens.style.display = 'none';
    vizIds.style.display = '';
  }
}

// ── Core ──────────────────────────────────────────────────────────
let lastTokens = [];

function run() {
  const text = inputArea.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  if (!chars) {
    // reset
    statTokens.textContent = '0';
    statChars.textContent = '0';
    statWords.textContent = '0';
    statRatio.textContent = '—';
    emptyState.style.display = '';
    vizTokens.style.display = 'none';
    vizIds.style.display = 'none';
    legendRow.style.display = 'none';
    lastTokens = [];
    return;
  }

  // Get tokens
  let tokens = [];
  if (encodeFunc && decodeFunc) {
    try {
      const ids = encodeFunc(text);
      const decoder = new TextDecoder();
      // Reconstruct token texts by re-decoding each ID individually
      tokens = ids.map((id, i) => ({
        id,
        text: (() => {
          try {
            return decoder.decode(decodeFunc([id]));
          } catch {
            return `<${id}>`;
          }
        })()
      }));
    } catch {
      tokens = approxTokens(text);
    }
  } else {
    tokens = approxTokens(text);
  }

  lastTokens = tokens;
  const count = tokens.length;

  // Update stats
  statTokens.textContent = count.toLocaleString();
  statChars.textContent = chars.toLocaleString();
  statWords.textContent = words.toLocaleString();
  statRatio.textContent = count > 0 ? (chars / count).toFixed(1) : '—';

  // Show panels
  emptyState.style.display = 'none';
  legendRow.style.display = 'none'; // hide legend (colors are index-based, not type-based)
  renderViz(tokens);
  renderIdChips(tokens);
  renderMode();
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderViz(tokens) {
  const html = tokens.map((tok, i) => {
    const cls = `tok-c${i % 8}`;
    const display = escHtml(tok.text.replace(/ /g, '·').replace(/\n/g, '↵\n').replace(/\t/g, '→'));
    return `<span class="tok-span ${cls}" data-id="${tok.id}" title="id: ${tok.id}">${display}</span>`;
  }).join('');
  vizTokens.innerHTML = html;
}

function renderIdChips(tokens) {
  const html = tokens.map((tok, i) => {
    const cls = `tok-c${i % 8}`;
    const display = escHtml(tok.text.replace(/\n/g,'↵').replace(/\t/g,'→').trim() || '·');
    return `<div class="tok-id-chip ${cls}">
      <span class="chip-id">${tok.id}</span>
      <span class="chip-txt" title="${escHtml(tok.text)}">${display}</span>
    </div>`;
  }).join('');
  vizIds.innerHTML = html;
}

// ── Events ────────────────────────────────────────────────────────
let debounceTimer;
inputArea.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(run, 80);
});

const SAMPLE = `The attention mechanism allows the model to focus on different parts of the input sequence when producing each output token.

def attention(Q, K, V):
    scores = Q @ K.T / math.sqrt(d_k)
    weights = softmax(scores)
    return weights @ V

Temperature controls the randomness of predictions by scaling the logits before applying softmax.`;

document.getElementById('btnSample').addEventListener('click', () => {
  inputArea.value = SAMPLE;
  run();
});

document.getElementById('btnClear').addEventListener('click', () => {
  inputArea.value = '';
  run();
});
