// ── Tokenizer ─────────────────────────────────────────────────────
let encodeFunc = null;
let decodeFunc = null;

import('https://esm.sh/gpt-tokenizer@2.1.2')
  .then(mod => { encodeFunc = mod.encode; decodeFunc = mod.decode; run(); })
  .catch(() => run());

function countTokens(text) {
  if (!text) return 0;
  if (encodeFunc) {
    try { return encodeFunc(text).length; } catch { /* fall through */ }
  }
  // Approx fallback
  const chunks = text.match(/\s*[a-zA-Z]+|\s*\d+|\s*[^\s\w]/g) || [];
  let c = 0;
  for (const ch of chunks) {
    const w = ch.trim();
    if (/^[a-zA-Z]+$/.test(w)) c += Math.ceil(w.length / 4.2);
    else if (/^\d+$/.test(w)) c += Math.ceil(w.length / 2);
    else c += 1;
  }
  return Math.max(1, c);
}

// ── State ─────────────────────────────────────────────────────────
let strategy = 'tokens';
let chunkSize = 512;
let overlap = 50;
let sentCount = 5;

// ── DOM ───────────────────────────────────────────────────────────
const inputArea    = document.getElementById('inputArea');
const chunksPanel  = document.getElementById('chunksPanel');
const dsTotalToks  = document.getElementById('dsTotalToks');
const dsTotalChars = document.getElementById('dsTotalChars');
const dsChunkCount = document.getElementById('dsChunkCount');
const chunkHint    = document.getElementById('chunkHint');

// Strategy buttons
document.querySelectorAll('.seg[data-strat]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.seg[data-strat]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    strategy = btn.dataset.strat;
    const tokenSettings = document.getElementById('tokenSettings');
    const sentSettings  = document.getElementById('sentSettings');
    if (strategy === 'sentences') {
      tokenSettings.style.display = 'none';
      sentSettings.style.display = '';
    } else if (strategy === 'paragraphs') {
      tokenSettings.style.display = 'none';
      sentSettings.style.display = 'none';
    } else {
      tokenSettings.style.display = '';
      sentSettings.style.display = 'none';
    }
    run();
  });
});

// Sliders
function syncSlider(sliderId, numId, onValue) {
  const sl = document.getElementById(sliderId);
  const nm = document.getElementById(numId);
  sl.addEventListener('input', () => { nm.value = sl.value; onValue(parseInt(sl.value)); });
  nm.addEventListener('input', () => {
    const v = Math.max(parseInt(nm.min), Math.min(parseInt(nm.max), parseInt(nm.value)||0));
    sl.value = v; nm.value = v; onValue(v);
  });
}

syncSlider('chunkSize', 'chunkSizeNum', v => { chunkSize = v; run(); });
syncSlider('overlap',   'overlapNum',   v => { overlap = v; run(); });
syncSlider('sentCount', 'sentCountNum', v => { sentCount = v; run(); });

// ── Chunking algorithms ───────────────────────────────────────────
function chunkByTokens(text, size, ovlp) {
  if (!encodeFunc) return chunkByTokensApprox(text, size, ovlp);
  try {
    const ids = encodeFunc(text);
    if (!ids.length) return [];
    const chunks = [];
    let start = 0;
    while (start < ids.length) {
      const end = Math.min(start + size, ids.length);
      // decode the slice — we'll store as substring indices
      const chunkIds = ids.slice(start, end);
      // Simple: just re-decode each segment into original text ranges
      // We reconstruct text by walking char positions
      chunks.push({ ids: chunkIds, start, end });
      start += size - ovlp;
      if (start >= ids.length) break;
    }
    return chunks.map(c => ({
      text: decodeTokenSlice(c.ids),
      tokens: c.ids.length,
    }));
  } catch {
    return chunkByTokensApprox(text, size, ovlp);
  }
}

function decodeTokenSlice(ids) {
  // Decode token IDs back to the original text using the tokenizer's decoder.
  // If decoding is unavailable this throws, and chunkByTokens falls back to
  // the word-based approximation — it must never emit placeholder text.
  if (decodeFunc) return decodeFunc(ids);
  throw new Error('Tokenizer decode unavailable');
}

function chunkByTokensApprox(text, size, ovlp) {
  // Split on whitespace, group by approximate token budget
  const words = text.split(/(\s+)/);
  const chunks = [];
  let buf = '';
  let bufToks = 0;
  for (const w of words) {
    const wToks = countTokens(w);
    if (bufToks + wToks > size && buf) {
      chunks.push({ text: buf.trim(), tokens: bufToks });
      // Overlap: keep last ovlp tokens worth of words
      if (ovlp > 0) {
        const bufWords = buf.split(/\s+/);
        let oBuf = ''; let oToks = 0;
        for (let i = bufWords.length - 1; i >= 0 && oToks < ovlp; i--) {
          oToks += countTokens(bufWords[i]);
          oBuf = bufWords[i] + (oBuf ? ' ' + oBuf : '');
        }
        buf = oBuf + ' ' + w;
        bufToks = countTokens(buf);
      } else {
        buf = w;
        bufToks = wToks;
      }
    } else {
      buf += w;
      bufToks += wToks;
    }
  }
  if (buf.trim()) chunks.push({ text: buf.trim(), tokens: bufToks });
  return chunks;
}

function chunkBySentences(text, perChunk) {
  const sentences = text.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [text];
  const chunks = [];
  for (let i = 0; i < sentences.length; i += perChunk) {
    const slice = sentences.slice(i, i + perChunk).join('').trim();
    if (slice) chunks.push({ text: slice, tokens: countTokens(slice) });
  }
  return chunks;
}

function chunkByParagraphs(text) {
  return text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    .map(p => ({ text: p, tokens: countTokens(p) }));
}

// ── Main ──────────────────────────────────────────────────────────
let debounceTimer;
function run() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(_run, 100);
}

function _run() {
  const text = inputArea.value;
  if (!text.trim()) {
    chunksPanel.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🧩</div>
      <div>Paste text to see your chunks</div>
      <div style="font-size:0.65rem;color:var(--faint)">Each chunk shows token count and overlap with the next</div>
    </div>`;
    dsTotalToks.textContent = '0 tokens';
    dsTotalChars.textContent = '0 chars';
    dsChunkCount.textContent = '0 chunks';
    chunkHint.textContent = '';
    return;
  }

  let chunks;
  if (strategy === 'tokens') chunks = chunkByTokens(text, chunkSize, overlap);
  else if (strategy === 'sentences') chunks = chunkBySentences(text, sentCount);
  else chunks = chunkByParagraphs(text);

  const totalToks = countTokens(text);
  dsTotalToks.textContent = totalToks.toLocaleString() + ' tokens';
  dsTotalChars.textContent = text.length.toLocaleString() + ' chars';
  dsChunkCount.textContent = chunks.length + ` chunk${chunks.length !== 1 ? 's' : ''}`;
  chunkHint.textContent = chunks.length ? `avg ${Math.round(chunks.reduce((a,c)=>a+c.tokens,0)/chunks.length)} tok/chunk` : '';

  if (!chunks.length) {
    chunksPanel.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><div>No chunks generated</div></div>`;
    return;
  }

  chunksPanel.innerHTML = '';
  chunks.forEach((chunk, i) => {
    const card = document.createElement('div');
    card.className = 'chunk-card';

    const hasOverlap = strategy === 'tokens' && overlap > 0 && i < chunks.length - 1;
    const overlapHtml = hasOverlap ? `
      <div class="overlap-indicator">
        <div class="overlap-dot"></div>
        ~${overlap} token overlap with next chunk
      </div>` : '';

    const bodyText = escHtml(chunk.text);
    const needsExpand = chunk.text.length > 300;

    card.innerHTML = `
      <div class="chunk-hd">
        <span class="chunk-num">chunk ${i + 1}</span>
        <div class="chunk-meta">
          <span class="tok-count">${chunk.tokens} tok</span>
          <span>${chunk.text.length} chars</span>
          <button class="chunk-copy" data-idx="${i}">copy</button>
        </div>
      </div>
      <div class="chunk-body" id="cb-${i}">${bodyText}</div>
      ${needsExpand ? `<button class="chunk-expand" data-expand="${i}">show more ↓</button>` : ''}
      ${overlapHtml}
    `;
    chunksPanel.appendChild(card);

    card.querySelector(`[data-idx="${i}"]`)?.addEventListener('click', function() {
      navigator.clipboard.writeText(chunk.text);
      this.textContent = 'copied!';
      setTimeout(() => this.textContent = 'copy', 1500);
    });

    const expandBtn = card.querySelector(`[data-expand="${i}"]`);
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        const body = document.getElementById(`cb-${i}`);
        body.classList.toggle('expanded');
        expandBtn.textContent = body.classList.contains('expanded') ? 'show less ↑' : 'show more ↓';
      });
    }
  });
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

document.getElementById('btnSample').addEventListener('click', () => {
  inputArea.value = `Retrieval-Augmented Generation (RAG) is a technique that combines large language models with external knowledge retrieval. Instead of relying solely on the model's parametric knowledge, RAG systems retrieve relevant documents from a knowledge base and include them in the model's context.

The retrieval step typically uses dense vector embeddings computed by an encoder model. Documents are chunked into segments, embedded, and stored in a vector database. At query time, the query is embedded and the nearest neighbors are retrieved using approximate nearest neighbor search.

Chunking strategy significantly impacts retrieval quality. Chunks that are too small may lack sufficient context, while chunks that are too large may dilute the relevance signal. Common strategies include fixed-size token windows with overlap, sentence-based chunking, and semantic chunking based on embedding similarity.

Overlap between chunks ensures that information at chunk boundaries is not lost. A typical overlap of 10–20% of the chunk size is a good starting point, though the optimal value depends on the specific domain and retrieval system.

After retrieval, the top-k chunks are included in the prompt as context. The language model then generates a response grounded in the retrieved information, reducing hallucination and enabling the system to answer questions about documents not seen during training.`;
  run();
});

document.getElementById('btnClear').addEventListener('click', () => { inputArea.value = ''; run(); });

document.getElementById('btnCopyAll').addEventListener('click', function() {
  const text = inputArea.value;
  if (!text.trim()) return;
  let chunks;
  if (strategy === 'tokens') chunks = chunkByTokens(text, chunkSize, overlap);
  else if (strategy === 'sentences') chunks = chunkBySentences(text, sentCount);
  else chunks = chunkByParagraphs(text);
  navigator.clipboard.writeText(JSON.stringify(chunks.map((c,i) => ({
    index: i, tokens: c.tokens, chars: c.text.length, text: c.text
  })), null, 2));
  this.textContent = 'copied!';
  setTimeout(() => this.textContent = 'copy JSON', 1500);
});

inputArea.addEventListener('input', run);
run();
