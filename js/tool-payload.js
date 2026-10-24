(() => {
  const payloadInput = document.getElementById('payload');
  const schemaInput = document.getElementById('schema');
  const result = document.getElementById('result');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function extract(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { name: 'arguments', args: value };
    if (value.functionCall && typeof value.functionCall === 'object') return { name: value.functionCall.name || 'unnamed', args: value.functionCall.args };
    if (value.type === 'tool_use') return { name: value.name || 'unnamed', args: value.input };
    if (value.function && typeof value.function === 'object') return { name: value.function.name || 'unnamed', args: value.function.arguments };
    if (value.function_call && typeof value.function_call === 'object') return { name: value.function_call.name || 'unnamed', args: value.function_call.arguments };
    if (Array.isArray(value.tool_calls) && value.tool_calls[0]) return extract(value.tool_calls[0]);
    if (value.name && Object.prototype.hasOwnProperty.call(value, 'arguments')) return { name: value.name, args: value.arguments };
    return { name: 'arguments', args: value };
  }

  function run() {
    try {
      const payload = JSON.parse(payloadInput.value);
      const schema = JSON.parse(schemaInput.value);
      const call = extract(payload);
      if (call.args === undefined) throw new Error('No arguments found in this tool-call payload.');
      const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
      const errors = window.GreenwoodsSchema.validate(args, schema);
      result.innerHTML = `<div class="result-head ${errors.length ? 'fail' : 'pass'}">${errors.length ? `FAIL · ${errors.length} argument issue${errors.length === 1 ? '' : 's'}` : 'PASS · arguments match the schema'}</div><div class="finding">Parsed call: <strong>${escape(call.name)}</strong></div><pre>${escape(JSON.stringify(args, null, 2))}</pre>${errors.map(error => `<div class="finding fail">✕ ${escape(error)}</div>`).join('')}`;
    } catch (error) {
      result.innerHTML = `<div class="error-msg">${escape(error.message)}</div>`;
    }
  }

  document.getElementById('validate').addEventListener('click', run);
  const runWhenReady = () => {
    if (payloadInput.value.trim() && schemaInput.value.trim()) run();
  };
  payloadInput.addEventListener('input', runWhenReady);
  schemaInput.addEventListener('input', runWhenReady);
  document.getElementById('sample').addEventListener('click', () => {
    payloadInput.value = JSON.stringify({ tool_calls: [{ type: 'function', function: { name: 'get_weather', arguments: '{"city":"Paris","unit":"c"}' } }] }, null, 2);
    schemaInput.value = JSON.stringify({ type: 'object', required: ['city'], properties: { city: { type: 'string' }, unit: { enum: ['c', 'f'] } }, additionalProperties: false }, null, 2);
    run();
  });
  document.getElementById('clear').addEventListener('click', () => {
    payloadInput.value = '';
    schemaInput.value = '';
    result.innerHTML = '';
  });
})();
