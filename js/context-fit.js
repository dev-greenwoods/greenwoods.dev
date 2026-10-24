(() => {
  const messagesInput = document.getElementById('messages');
  const limitInput = document.getElementById('limit');
  const summary = document.getElementById('summary');
  const breakdown = document.getElementById('breakdown');
  const preview = document.getElementById('preview');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  let previewMessages = [];

  function check() {
    try {
      const parsed = JSON.parse(messagesInput.value);
      const messages = Array.isArray(parsed) ? parsed : parsed && parsed.messages;
      if (!Array.isArray(messages) || !messages.every(item => item && typeof item === 'object' && typeof item.role === 'string' && typeof item.content === 'string')) {
        throw new Error('Expected an array of messages with string role and content fields.');
      }
      const limit = Number(limitInput.value);
      if (!Number.isFinite(limit) || limit < 1) throw new Error('Context limit must be a positive number.');
      const estimates = messages.map((message, index) => ({
        message,
        index,
        tokens: window.GreenwoodsTokenCounter.approximateTokenCount(message.content)
      }));
      const total = estimates.reduce((sum, item) => sum + item.tokens, 0);
      const selected = new Set();
      let remaining = Math.floor(limit);
      const system = estimates.find(item => item.message.role === 'system');
      if (system && system.tokens <= remaining) {
        selected.add(system.index);
        remaining -= system.tokens;
      }
      for (const item of estimates.slice().reverse()) {
        if (selected.has(item.index)) continue;
        if (item.tokens <= remaining) {
          selected.add(item.index);
          remaining -= item.tokens;
        }
      }
      previewMessages = estimates.filter(item => selected.has(item.index)).map(item => item.message);
      const fit = total <= limit;
      summary.innerHTML = `<div class="result-head ${fit ? 'pass' : 'fail'}">${fit ? 'FITS' : 'OVER LIMIT'} · about ${total.toLocaleString()} / ${Math.floor(limit).toLocaleString()} tokens · ${messages.length - previewMessages.length} messages omitted</div>`;
      breakdown.innerHTML = estimates.map(item => {
        const share = total ? (item.tokens / total * 100).toFixed(1) : '0.0';
        return `<div class="finding ${selected.has(item.index) ? 'pass' : 'fail'}">${escape(item.message.role)} #${item.index + 1}: ~${item.tokens} tokens (${share}%)${selected.has(item.index) ? '' : ' · omitted'}</div>`;
      }).join('');
      preview.textContent = JSON.stringify(previewMessages, null, 2);
    } catch (error) {
      summary.innerHTML = `<div class="error-msg">${escape(error.message)}</div>`;
      breakdown.innerHTML = '';
      preview.textContent = '';
      previewMessages = [];
    }
  }

  document.getElementById('check').addEventListener('click', check);
  messagesInput.addEventListener('input', check);
  limitInput.addEventListener('input', check);
  document.getElementById('sample').addEventListener('click', () => {
    messagesInput.value = JSON.stringify([
      { role: 'system', content: 'Answer clearly and accurately.' },
      { role: 'user', content: 'Summarize the project context and recent decisions.' },
      { role: 'assistant', content: 'The project is a browser-only toolkit. Recent work added privacy-focused context tools.' }
    ], null, 2);
    limitInput.value = '24';
    check();
  });
  document.getElementById('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(previewMessages, null, 2)); }
    catch (error) { summary.innerHTML = `<div class="error-msg">Could not copy preview: ${escape(error.message)}</div>`; }
  });
  // Process the prefilled default on load so the first Check click (and the
  // initial view) reflects the input the user already sees.
  check();
})();
