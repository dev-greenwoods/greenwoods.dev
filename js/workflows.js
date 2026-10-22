const byId = id => document.getElementById(id);
let tokenizer = null;
let promptCompacted = false;
let ragTextCleaned = false;
let ragChunksCreated = false;
if (byId('compact') || byId('clean-text')) {
  import('https://esm.sh/gpt-tokenizer@2.1.2')
    .then(module => {
      if (typeof module.encode !== 'function' || typeof module.decode !== 'function') return;
      tokenizer = module;
      if (promptCompacted) byId('compact').click();
      if (ragTextCleaned && ragChunksCreated) byId('make-chunks').click();
    })
    .catch(() => {});
}
const estimateTokens = text => tokenizer
  ? tokenizer.encode(text).length
  : Math.ceil((text.match(/\S+/g) || []).join(' ').length / 4);

if (byId('compact')) {
  const source = byId('conversation');
  const result = byId('compact-result');
  const tokenCount = byId('token-count');
  const outputTokens = byId('workflow-output-tokens');
  const model = byId('workflow-model');
  const cost = byId('estimated-cost');
  let compacted = '';

  function updateCost() {
    const [inputPrice, outputPrice] = model.value.split(',').map(Number);
    const total = estimateTokens(compacted) * inputPrice / 1e6 + Math.max(0, Number(outputTokens.value) || 0) * outputPrice / 1e6;
    cost.textContent = `$${total.toFixed(6)}`;
  }

  byId('compact').addEventListener('click', () => {
    promptCompacted = true;
    compacted = source.value.split(/\r?\n/).map(line => line.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(-80).join('\n');
    result.textContent = compacted || 'Paste a conversation to create a compact prompt.';
    tokenCount.textContent = estimateTokens(compacted).toLocaleString();
    updateCost();
  });
  [model, outputTokens].forEach(input => input.addEventListener('input', updateCost));
}

if (byId('clean-text')) {
  let cleaned = '';
  let chunks = [];
  byId('clean-text').addEventListener('click', () => {
    ragTextCleaned = true;
    ragChunksCreated = false;
    cleaned = byId('rag-source').value
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    byId('clean-result').textContent = cleaned || 'Paste source text to clean it.';
    chunks = [];
    byId('chunk-results').textContent = 'Create chunks from the cleaned text.';
    byId('rag-token-count').textContent = '0';
    byId('rag-chunk-count').textContent = '0';
  });
  byId('make-chunks').addEventListener('click', () => {
    if (!cleaned) {
      byId('chunk-results').textContent = 'Clean source text before chunking.';
      return;
    }
    const tokenLimit = Math.max(32, Math.min(4096, Number(byId('chunk-size').value) || 512));
    ragChunksCreated = true;
    chunks = [];
    if (tokenizer) {
      const tokens = tokenizer.encode(cleaned);
      for (let offset = 0; offset < tokens.length; offset += tokenLimit) {
        chunks.push(tokenizer.decode(tokens.slice(offset, offset + tokenLimit)));
      }
    } else {
      const charLimit = tokenLimit * 4;
      let chunk = '';
      for (const paragraph of cleaned.split(/\n\n+/)) {
        const next = chunk ? `${chunk}\n\n${paragraph}` : paragraph;
        if (next.length > charLimit && chunk) {
          chunks.push(chunk);
          chunk = '';
        }
        if (paragraph.length <= charLimit) {
          chunk = chunk ? `${chunk}\n\n${paragraph}` : paragraph;
          continue;
        }
        for (let start = 0; start < paragraph.length; start += charLimit) {
          if (chunk) chunks.push(chunk);
          chunk = paragraph.slice(start, start + charLimit);
        }
      }
      if (chunk) chunks.push(chunk);
    }
    const container = byId('chunk-results');
    container.replaceChildren();
    chunks.forEach((text, index) => {
      const card = document.createElement('article');
      const title = document.createElement('strong');
      title.textContent = `Chunk ${index + 1} · ~${estimateTokens(text)} tokens`;
      const preview = document.createElement('span');
      preview.textContent = text;
      card.append(title, preview);
      container.append(card);
    });
    byId('rag-token-count').textContent = estimateTokens(cleaned).toLocaleString();
    byId('rag-chunk-count').textContent = String(chunks.length);
  });
}

if (byId('load-trace')) {
  let events = [];
  byId('load-trace').addEventListener('click', () => {
    const raw = byId('trace-input').value.trim();
    try {
      events = raw ? raw.split(/\r?\n/).filter(Boolean).map((line, index) => {
        try { return JSON.parse(line); }
        catch { throw new Error(`Invalid JSON on line ${index + 1}.`); }
      }) : [];
      byId('event-count').textContent = String(events.length);
    } catch (error) {
      events = [];
      byId('event-count').textContent = error.message;
    }
  });
  byId('detect-loops').addEventListener('click', () => {
    if (!events.length) {
      byId('loop-results').textContent = 'Load valid JSONL events first.';
      return;
    }
    const calls = events.map(event => ({
      name: event.name || event.tool || event.function?.name || 'unknown',
      args: JSON.stringify(event.arguments ?? event.args ?? event.function?.arguments ?? {})
    }));
    const issues = [];
    for (let index = 1; index < calls.length; index++) {
      if (calls[index].name === calls[index - 1].name && calls[index].args === calls[index - 1].args) {
        issues.push(`Repeated identical call at events ${index} and ${index + 1}: ${calls[index].name}`);
      }
      if (index > 1 && calls[index].name === calls[index - 2].name && calls[index].name !== calls[index - 1].name) {
        issues.push(`Alternating cycle at events ${index - 1}–${index + 1}: ${calls[index - 2].name} ↔ ${calls[index - 1].name}`);
      }
    }
    byId('loop-results').textContent = issues.length ? issues.join('\n') : `No repeated calls or alternating cycles found in ${events.length} events.`;
  });
  byId('diff-prompts').addEventListener('click', () => {
    const before = byId('prompt-before').value.split(/\r?\n/);
    const after = byId('prompt-after').value.split(/\r?\n/);
    const changed = [];
    const count = Math.max(before.length, after.length);
    for (let index = 0; index < count; index++) {
      if (before[index] === after[index]) continue;
      if (before[index] !== undefined) changed.push(`- ${before[index]}`);
      if (after[index] !== undefined) changed.push(`+ ${after[index]}`);
    }
    byId('prompt-diff-result').textContent = changed.length ? changed.join('\n') : 'Prompts are identical.';
  });
}
