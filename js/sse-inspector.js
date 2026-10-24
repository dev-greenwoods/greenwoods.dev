(() => {
  const source = document.getElementById('source');
  const summary = document.getElementById('summary');
  const finalOutput = document.getElementById('final');
  const events = document.getElementById('events');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function getTimestamp(event, payload) {
    const raw = event.timestamp || payload?.timestamp || payload?.created_at || payload?.received_at;
    if (typeof raw === 'number') return raw < 1e12 ? raw * 1000 : raw;
    if (typeof raw === 'string') {
      const parsed = Date.parse(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  function extractText(payload) {
    const pieces = [];
    const choice = payload?.choices?.[0];
    if (typeof choice?.delta?.content === 'string') pieces.push(choice.delta.content);
    if (typeof payload?.delta?.text === 'string') pieces.push(payload.delta.text);
    if (payload?.type === 'content_block_delta' && typeof payload.delta?.text === 'string') pieces.push(payload.delta.text);
    for (const part of payload?.candidates?.[0]?.content?.parts || []) {
      if (typeof part.text === 'string') pieces.push(part.text);
    }
    return pieces.join('');
  }

  function parse() {
    const parsed = [];
    let event = { data: [], comments: [] };
    const flush = () => {
      if (!event.data.length && !event.event && !event.id) {
        event = { data: [], comments: [] };
        return;
      }
      const raw = event.data.join('\n');
      let payload = null;
      let error = '';
      if (raw && raw !== '[DONE]') {
        try { payload = JSON.parse(raw); }
        catch (exception) { error = `Invalid event JSON: ${exception.message}`; }
      }
      const timestamp = getTimestamp(event, payload);
      parsed.push({ ...event, raw, payload, error, timestamp });
      event = { data: [], comments: [] };
    };

    source.value.split(/\r?\n/).forEach((line, index) => {
      if (!line) {
        flush();
        return;
      }
      if (line.startsWith(':')) {
        const comment = line.slice(1).trim();
        event.comments.push(comment);
        const match = comment.match(/(?:time|timestamp)\s*[=:]\s*(.+)/i) || comment.match(/^(\d{4}-\d\d-\d\dT\S+|\d{10,13})$/);
        if (match) event.timestamp = match[1] || match[0];
        return;
      }
      const separator = line.indexOf(':');
      const field = separator < 0 ? line : line.slice(0, separator);
      const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '');
      if (field === 'data') event.data.push(value);
      else if (field === 'event') event.event = value;
      else if (field === 'id') event.id = value;
      else if (field === 'retry') event.retry = value;
      if (!field && index === 0) flush();
    });
    flush();

    const timestamps = parsed.map(item => item.timestamp).filter(Number.isFinite);
    const text = parsed.map(item => item.raw === '[DONE]' ? '' : extractText(item.payload)).join('');
    finalOutput.textContent = text || 'No recognized text delta found.';
    summary.innerHTML = `<div class="result-head ${parsed.some(item => item.error) ? 'fail' : 'pass'}">${parsed.length} events · ${parsed.filter(item => item.raw === '[DONE]').length} completion markers · ${timestamps.length} timestamped</div>`;
    events.innerHTML = parsed.length ? parsed.map((item, index) => {
      const previous = parsed.slice(0, index).reverse().find(candidate => Number.isFinite(candidate.timestamp));
      const gap = Number.isFinite(item.timestamp) && previous ? ` · +${Math.max(0, item.timestamp - previous.timestamp).toFixed(1)} ms` : '';
      const details = item.error || (item.raw === '[DONE]' ? 'stream complete' : item.raw || '(empty event)');
      return `<article class="finding ${item.error ? 'fail' : 'pass'}"><strong>event ${index + 1}</strong> · ${escape(item.event || 'message')}${item.id ? ` · id ${escape(item.id)}` : ''}${gap}<pre>${escape(details)}</pre></article>`;
    }).join('') : '<div class="empty-state">Paste an SSE capture to inspect events.</div>';
  }

  source.addEventListener('input', parse);
  document.getElementById('sample').addEventListener('click', () => {
    source.value = ': timestamp=2026-10-23T20:00:00.000Z\nevent: message\ndata: {"choices":[{"delta":{"content":"Hello "}}]}\n\n: timestamp=2026-10-23T20:00:00.125Z\nevent: message\ndata: {"choices":[{"delta":{"content":"world!"}}]}\n\ndata: [DONE]\n\n';
    parse();
  });
  parse();
})();
