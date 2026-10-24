(() => {
  const text = document.getElementById('text');
  const size = document.getElementById('size');
  const overlap = document.getElementById('overlap');
  const summary = document.getElementById('summary');
  const chunks = document.getElementById('chunks');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function run() {
    const source = text.value;
    if (!source) {
      summary.textContent = '';
      chunks.innerHTML = '<div class="empty-state">Paste a document to see chunk windows.</div>';
      return;
    }
    const windowSize = Math.max(40, Math.min(4000, Number(size.value) || 400));
    const overlapSize = Math.max(0, Math.min(windowSize - 1, Number(overlap.value) || 0));
    size.value = String(windowSize);
    overlap.value = String(overlapSize);
    const result = [];
    const step = windowSize - overlapSize;
    for (let start = 0; start < source.length; start += step) {
      result.push(source.slice(start, Math.min(start + windowSize, source.length)));
    }
    const repeated = Math.max(0, result.reduce((total, chunk) => total + chunk.length, 0) - source.length);
    summary.innerHTML = `<div class="result-head pass">${result.length} chunks · ${repeated.toLocaleString()} repeated characters · ~${window.GreenwoodsTokenCounter.approximateTokenCount('x'.repeat(repeated))} repeated tokens (rough estimate)</div>`;
    chunks.innerHTML = result.map((chunk, index) => `<article class="finding"><strong>Chunk ${index + 1}</strong> · ${chunk.length} chars · offsets ${index * step}–${Math.min(index * step + windowSize, source.length)}<pre>${escape(chunk)}</pre></article>`).join('');
  }
  [text, size, overlap].forEach(element => element.addEventListener('input', run));
  document.getElementById('sample').addEventListener('click', () => {
    text.value = 'Chunk size and overlap shape retrieved context. Overlap preserves phrases near boundaries, but also repeats tokens and increases storage. Try several values against a representative document before choosing a strategy.';
    size.value = '100';
    overlap.value = '24';
    run();
  });
  run();
})();
