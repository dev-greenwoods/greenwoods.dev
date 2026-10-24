(() => {
  const response = document.getElementById('response');
  const schemaInput = document.getElementById('schema');
  const result = document.getElementById('result');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function run() {
    try {
      const data = JSON.parse(response.value);
      const schema = JSON.parse(schemaInput.value);
      const errors = window.GreenwoodsSchema.validate(data, schema);
      result.innerHTML = errors.length
        ? `<div class="result-head fail">FAIL · ${errors.length} issue${errors.length === 1 ? '' : 's'}</div>${errors.map(error => `<div class="finding fail">✕ ${escape(error)}</div>`).join('')}`
        : '<div class="result-head pass">PASS · response matches the schema</div>';
    } catch (error) {
      result.innerHTML = `<div class="error-msg">${escape(error.message)}</div>`;
    }
  }

  document.getElementById('validate').addEventListener('click', run);
  const runWhenReady = () => {
    if (response.value.trim() && schemaInput.value.trim()) run();
  };
  response.addEventListener('input', runWhenReady);
  schemaInput.addEventListener('input', runWhenReady);
  document.getElementById('sample').addEventListener('click', () => {
    response.value = '{"name":"Ada","score":"42"}';
    schemaInput.value = '{"type":"object","required":["name","score"],"properties":{"name":{"type":"string"},"score":{"type":"number","minimum":0}}}';
    run();
  });
  document.getElementById('clear').addEventListener('click', () => {
    response.value = '';
    schemaInput.value = '';
    result.innerHTML = '<div class="empty-state"><div class="empty-icon">✓</div><div>Provide a response and JSON Schema</div></div>';
  });
})();
