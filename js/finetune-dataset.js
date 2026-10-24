(() => {
  const source = document.getElementById('source');
  const report = document.getElementById('report');
  const output = document.getElementById('output');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  let valid = [];

  function normalize(record, line) {
    if (!record || typeof record !== 'object' || Array.isArray(record) || !Array.isArray(record.messages)) {
      return { error: `line ${line}: expected an object containing a messages array` };
    }
    const aliases = { human: 'user', prompt: 'user', gpt: 'assistant', bot: 'assistant', model: 'assistant' };
    const messages = [];
    for (const [index, message] of record.messages.entries()) {
      if (!message || typeof message !== 'object' || typeof message.content !== 'string' || !message.content.trim()) {
        return { error: `line ${line}, message ${index + 1}: content must be a non-empty string` };
      }
      let role = typeof message.role === 'string' ? message.role.toLowerCase().trim() : '';
      role = aliases[role] || role;
      if (!['system', 'user', 'assistant'].includes(role)) {
        return { error: `line ${line}, message ${index + 1}: unsupported role "${role || 'missing'}"` };
      }
      messages.push({ role, content: message.content });
    }
    if (!messages.some(message => message.role === 'user') || !messages.some(message => message.role === 'assistant')) {
      return { error: `line ${line}: include at least one user and one assistant message` };
    }
    return { record: { messages } };
  }

  function parseTranscript(lines) {
    const candidates = [];
    let messages = [];
    let startLine = 1;
    function flush() {
      if (messages.length) candidates.push({ record: { messages }, line: startLine });
      messages = [];
    }
    for (const [index, line] of lines.entries()) {
      if (!line.trim()) {
        flush();
        startLine = index + 2;
        continue;
      }
      const match = line.match(/^\s*(system|user|human|prompt|question|q|assistant|gpt|bot|model|answer|a)\s*:\s*(.*)$/i);
      if (!match) {
        candidates.push({ error: `line ${index + 1}: expected a role prefix such as "User:" or "Assistant:"` });
        flush();
        startLine = index + 2;
        continue;
      }
      const role = { question: 'user', q: 'user', answer: 'assistant', a: 'assistant' }[match[1].toLowerCase()] || match[1].toLowerCase();
      messages.push({ role, content: match[2] });
    }
    flush();
    return candidates.length ? candidates : [{ error: 'No role-prefixed chat messages found.' }];
  }

  function format() {
    valid = [];
    const errors = [];
    const duplicates = [];
    const rawLines = source.value.split(/\r?\n/);
    const nonBlank = rawLines.filter(line => line.trim());
    if (!nonBlank.length) {
      report.innerHTML = '<div class="error-msg">Add chat text or JSONL to format.</div>';
      output.textContent = '';
      return;
    }
    const isJsonl = nonBlank.every(line => line.trimStart().startsWith('{'));
    const candidates = isJsonl
      ? rawLines.map((line, index) => ({ line, number: index + 1 })).filter(item => item.line.trim()).map(item => {
        try { return { record: JSON.parse(item.line), line: item.number }; }
        catch (error) { return { error: `line ${item.number}: invalid JSON (${error.message})` }; }
      })
      : parseTranscript(rawLines);
    const seen = new Set();
    for (const candidate of candidates) {
      if (candidate.error) {
        errors.push(candidate.error);
        continue;
      }
      const normalized = normalize(candidate.record, candidate.line);
      if (normalized.error) {
        errors.push(normalized.error);
        continue;
      }
      const key = JSON.stringify(normalized.record.messages);
      if (seen.has(key)) {
        duplicates.push(candidate.line);
        continue;
      }
      seen.add(key);
      valid.push(normalized.record);
    }
    output.textContent = valid.map(record => JSON.stringify(record)).join('\n');
    report.innerHTML = `<div class="result-head ${errors.length ? 'fail' : 'pass'}">${valid.length} valid · ${duplicates.length} duplicate${duplicates.length === 1 ? '' : 's'} removed · ${errors.length} issue${errors.length === 1 ? '' : 's'}</div>`
      + errors.map(error => `<div class="finding fail">✕ ${escape(error)}</div>`).join('')
      + (duplicates.length ? `<div class="finding">Duplicate input lines removed: ${duplicates.join(', ')}</div>` : '');
  }

  document.getElementById('format').addEventListener('click', format);
  source.addEventListener('input', () => {
    if (source.value.trim()) format();
    else {
      valid = [];
      report.innerHTML = '';
      output.textContent = '';
    }
  });
  document.getElementById('sample').addEventListener('click', () => {
    source.value = 'Q: How do I validate training data?\nA: Check every record for valid roles and content.\n\nQ: How do I validate training data?\nA: Check every record for valid roles and content.';
    format();
  });
  document.getElementById('file').addEventListener('change', event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      source.value = String(reader.result || '');
      format();
    });
    reader.addEventListener('error', () => {
      report.innerHTML = '<div class="error-msg">Could not read this local file.</div>';
    });
    reader.readAsText(file);
  });
  document.getElementById('download').addEventListener('click', () => {
    if (!valid.length) {
      report.innerHTML = '<div class="error-msg">There are no valid records to download.</div>';
      return;
    }
    const blob = new Blob([valid.map(record => JSON.stringify(record)).join('\n') + '\n'], { type: 'application/x-ndjson' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'formatted-training-data.jsonl';
    link.click();
    URL.revokeObjectURL(link.href);
  });
})();
