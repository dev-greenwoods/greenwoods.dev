(() => {
  const source = document.getElementById('source');
  const summary = document.getElementById('summary');
  const modelsOutput = document.getElementById('models');
  const outliers = document.getElementById('outliers');
  const rates = {
    'gpt-4o': [5, 20], 'gpt-4o mini': [0.15, 0.6], o3: [10, 40], 'o3-mini': [1.1, 4.4], 'o4-mini': [1.1, 4.4],
    'claude opus 4': [15, 75], 'claude sonnet 4': [3, 15], 'claude haiku 4.5': [0.8, 4],
    'gemini 2.5 pro': [1.25, 10], 'gemini 2.5 flash': [0.15, 0.6], 'gemini 2.0 flash': [0.1, 0.4],
    'llama 3.3 70b': [0.59, 0.79], 'deepseek r1': [0.55, 2.19], 'mixtral 8x7b': [0.27, 0.27],
    'mistral large': [2, 6], 'mistral small': [0.1, 0.3]
  };
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  function csvRows(text) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const split = line => {
      const cells = [];
      let cell = '', quoted = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"' && quoted && line[i + 1] === '"') { cell += '"'; i++; }
        else if (line[i] === '"') quoted = !quoted;
        else if (line[i] === ',' && !quoted) { cells.push(cell); cell = ''; }
        else cell += line[i];
      }
      cells.push(cell);
      if (quoted) throw new Error('CSV contains an unterminated quoted field.');
      return cells;
    };
    const headers = split(lines.shift()).map(value => value.trim().toLowerCase());
    return lines.map((line, index) => {
      const cells = split(line);
      if (cells.length !== headers.length) throw new Error(`CSV line ${index + 2} has ${cells.length} cells; expected ${headers.length}.`);
      return Object.fromEntries(headers.map((key, cellIndex) => [key, cells[cellIndex]]));
    });
  }
  function parseLog(text) {
    if (!text.trim()) return [];
    if (text.trimStart().startsWith('[') || text.trimStart().startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.records)) return parsed.records;
        if (parsed && Array.isArray(parsed.data)) return parsed.data;
      } catch {
        return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
          try { return JSON.parse(line); }
          catch (error) { throw new Error(`JSONL line ${index + 1}: ${error.message}`); }
        });
      }
    }
    return csvRows(text);
  }
  function analyze() {
    try {
      const entries = parseLog(source.value).map((item, index) => {
        const model = String(item.model || item.model_name || 'unknown').trim();
        const input = Number(item.input_tokens ?? item.prompt_tokens ?? item.usage?.input_tokens);
        const output = Number(item.output_tokens ?? item.completion_tokens ?? item.usage?.output_tokens);
        const latency = Number(item.latency_ms ?? item.duration_ms ?? item.latency);
        if (!model || !Number.isFinite(input) || input < 0 || !Number.isFinite(output) || output < 0 || !Number.isFinite(latency) || latency < 0) {
          throw new Error(`Record ${index + 1} needs a model and non-negative input_tokens, output_tokens, and latency_ms values.`);
        }
        const rate = rates[model.toLowerCase()];
        return { model, input, output, latency, cost: rate ? (input * rate[0] + output * rate[1]) / 1_000_000 : null, index: index + 1 };
      });
      if (!entries.length) throw new Error('No usage records found.');
      const sorted = entries.map(item => item.latency).sort((a, b) => a - b);
      const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
      const average = entries.reduce((sum, item) => sum + item.latency, 0) / entries.length;
      const groups = new Map();
      for (const entry of entries) {
        const group = groups.get(entry.model) || { calls: 0, input: 0, output: 0, cost: 0, unknown: false };
        group.calls++;
        group.input += entry.input;
        group.output += entry.output;
        if (entry.cost === null) group.unknown = true;
        else group.cost += entry.cost;
        groups.set(entry.model, group);
      }
      summary.innerHTML = `<div class="result-head pass">${entries.length} calls · ${(entries.reduce((sum, item) => sum + item.input, 0)).toLocaleString()} input tokens · ${(entries.reduce((sum, item) => sum + item.output, 0)).toLocaleString()} output tokens · avg ${average.toFixed(0)} ms · p95 ${p95.toFixed(0)} ms</div>`;
      modelsOutput.innerHTML = `<h2>Totals by model</h2>${[...groups].map(([model, group]) => `<div class="finding"><strong>${escape(model)}</strong> · ${group.calls} calls · ${group.input.toLocaleString()} in / ${group.output.toLocaleString()} out · ${group.unknown ? 'partial/unknown rate' : `$${group.cost.toFixed(6)}`}</div>`).join('')}`;
      outliers.innerHTML = `<h2>Slowest calls</h2>${entries.slice().sort((a, b) => b.latency - a.latency).slice(0, 5).map(item => `<div class="finding ${item.latency >= p95 ? 'fail' : ''}">Record ${item.index} · ${escape(item.model)} · ${item.latency.toFixed(0)} ms</div>`).join('')}`;
    } catch (error) {
      summary.innerHTML = `<div class="error-msg">${escape(error.message)}</div>`;
      modelsOutput.innerHTML = '';
      outliers.innerHTML = '';
    }
  }
  document.getElementById('analyze').addEventListener('click', analyze);
  source.addEventListener('input', () => { if (source.value.trim()) analyze(); else { summary.innerHTML = ''; modelsOutput.innerHTML = ''; outliers.innerHTML = ''; } });
  document.getElementById('sample').addEventListener('click', () => {
    source.value = 'model,input_tokens,output_tokens,latency_ms\nGPT-4o,1200,350,842\nGPT-4o,2000,700,1840\nClaude Sonnet 4,900,450,610\nUnknown Model,100,100,520';
    analyze();
  });
  document.getElementById('file').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => { source.value = String(reader.result || ''); analyze(); });
    reader.addEventListener('error', () => { summary.innerHTML = '<div class="error-msg">Could not read the selected local file.</div>'; });
    reader.readAsText(file);
  });
})();
