(() => {
  const input = document.getElementById('text');
  const counts = document.getElementById('counts');
  const output = document.getElementById('diff');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function run() {
    const text = input.value;
    if (!text) {
      counts.innerHTML = '<div class="empty-state">Paste text to compare local estimates.</div>';
      output.textContent = '';
      return;
    }
    const pieces = text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || [];
    const wordEstimate = pieces.reduce((sum, part) => {
      if (/^\s+$/.test(part)) return sum;
      return sum + (/\p{L}/u.test(part) ? Math.ceil(part.length / 4) : Math.max(1, Math.ceil(part.length / 3)));
    }, 0);
    const charEstimate = Math.ceil(text.length / 4);
    counts.innerHTML = `<div class="result-head pass">Word/subword heuristic: ~${wordEstimate} · 4-character heuristic: ~${charEstimate} · delta: ${Math.abs(wordEstimate - charEstimate)}</div>`;
    const marked = pieces.map(part => {
      if (/^\s+$/.test(part)) return escape(part);
      return `<mark>${escape(part)}</mark>`;
    }).join('');
    output.innerHTML = `<pre class="output-block">${marked}</pre>`;
  }
  input.addEventListener('input', run);
  document.getElementById('sample').addEventListener('click', () => {
    input.value = 'Embeddings and tokenizers split technical language differently: context_window = 128000.';
    run();
  });
  run();
})();
