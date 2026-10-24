(() => {
  const scenarios = {
    weather: { tokens: ['sunny', 'cloudy', 'rainy', 'cold', 'warm', 'windy'], logits: [3.8, 3.2, 2.9, 2.4, 2.1, 1.4] },
    code: { tokens: ['value', 'input', 'number', 'null', 'result', 'error'], logits: [3.4, 3.1, 2.8, 2.3, 1.8, 1.2] },
    sentiment: { tokens: ['great', 'good', 'fine', 'poor', 'bad', 'awful'], logits: [3.2, 2.9, 2.5, 2.1, 1.8, 1.4] }
  };
  const fields = ['temperature', 'top-p', 'presence', 'frequency', 'seen'];
  const input = Object.fromEntries(fields.map(id => [id, document.getElementById(id)]));
  const distribution = document.getElementById('distribution');
  const summary = document.getElementById('summary');

  function run() {
    const scenario = scenarios[document.getElementById('scenario').value];
    const seen = input.seen.value.split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
    const adjusted = scenario.logits.map((logit, index) => {
      const count = seen.filter(token => token === scenario.tokens[index].toLowerCase()).length;
      return logit - Number(input.presence.value) * (count ? 1 : 0) - Number(input.frequency.value) * count;
    });
    const temperature = Math.max(0.01, Number(input.temperature.value));
    const max = Math.max(...adjusted.map(value => value / temperature));
    const exps = adjusted.map(value => Math.exp(value / temperature - max));
    const total = exps.reduce((sum, value) => sum + value, 0);
    const raw = exps.map(value => value / total);
    const sorted = raw.map((probability, index) => ({ probability, index })).sort((a, b) => b.probability - a.probability);
    let cumulative = 0;
    const allowed = new Set();
    for (const item of sorted) {
      allowed.add(item.index);
      cumulative += item.probability;
      if (cumulative >= Number(input['top-p'].value)) break;
    }
    const filteredTotal = raw.reduce((sum, probability, index) => sum + (allowed.has(index) ? probability : 0), 0);
    const probs = raw.map((probability, index) => allowed.has(index) ? probability / filteredTotal : 0);
    document.getElementById('temperature-value').textContent = temperature.toFixed(2);
    document.getElementById('top-p-value').textContent = Number(input['top-p'].value).toFixed(2);
    document.getElementById('presence-value').textContent = Number(input.presence.value).toFixed(2);
    document.getElementById('frequency-value').textContent = Number(input.frequency.value).toFixed(2);
    summary.innerHTML = `<div class="result-head pass">${allowed.size}/${scenario.tokens.length} tokens retained · top: ${scenario.tokens[sorted[0].index]} (${(probs[sorted[0].index] * 100).toFixed(1)}%)</div>`;
    distribution.innerHTML = scenario.tokens.map((token, index) => `<div class="sampling-row"><strong>${token}</strong><div class="sampling-track"><span style="width:${Math.max(0, probs[index] * 100)}%"></span></div><span>${(probs[index] * 100).toFixed(1)}%</span>${allowed.has(index) ? '' : '<small>filtered</small>'}</div>`).join('');
  }
  fields.forEach(id => input[id].addEventListener('input', run));
  document.getElementById('scenario').addEventListener('change', run);
  run();
})();
