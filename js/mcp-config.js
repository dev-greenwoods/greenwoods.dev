(() => {
  const input = document.getElementById('config');
  const result = document.getElementById('result');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const schema = {
    type: 'object',
    type: 'object',
    required: ['mcpServers'],
    properties: {
      mcpServers: {
        type: 'object',
        minProperties: 1,
        additionalProperties: {
          type: 'object',
          properties: {
            command: { type: 'string', minLength: 1 },
            args: { type: 'array', items: { type: 'string' } },
            env: { type: 'object', additionalProperties: { type: 'string' } },
            url: { type: 'string', minLength: 1 },
            headers: { type: 'object', additionalProperties: { type: 'string' } },
            disabled: { type: 'boolean' },
            alwaysAllow: { type: 'array', items: { type: 'string' } }
          },
          oneOf: [{ required: ['command'] }, { required: ['url'] }]
        }
      }
    }
  };

  function validate() {
    try {
      const config = JSON.parse(input.value);
      const errors = window.GreenwoodsSchema.validate(config, schema);
      const servers = config && config.mcpServers;
      if (servers && typeof servers === 'object' && !Array.isArray(servers)) {
        for (const [name, server] of Object.entries(servers)) {
          if (!server || typeof server !== 'object' || Array.isArray(server)) continue;
          if (server.url) {
            try {
              const url = new URL(server.url);
              if (!['http:', 'https:'].includes(url.protocol)) errors.push(`$.mcpServers.${name}.url: use an http or https URL`);
            } catch { errors.push(`$.mcpServers.${name}.url: must be a valid absolute URL`); }
          }
          const env = server.env && typeof server.env === 'object' ? server.env : {};
          const commandAndArgs = [server.command, ...(Array.isArray(server.args) ? server.args : [])].filter(value => typeof value === 'string').join('\n');
          for (const match of commandAndArgs.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g)) {
            const variable = match[1] || match[2];
            if (!Object.prototype.hasOwnProperty.call(env, variable)) errors.push(`$.mcpServers.${name}: ${variable} is referenced but not provided in this server's env config`);
          }
        }
      }
      result.innerHTML = errors.length
        ? `<div class="result-head fail">FAIL · ${errors.length} issue${errors.length === 1 ? '' : 's'}</div>${errors.map(error => `<div class="finding fail">✕ ${escape(error)}</div>`).join('')}`
        : '<div class="result-head pass">PASS · static MCP configuration checks passed</div><div class="finding">No command was executed and no server was contacted.</div>';
    } catch (error) {
      result.innerHTML = `<div class="error-msg">${escape(error.message)}</div>`;
    }
  }

  document.getElementById('validate').addEventListener('click', validate);
  input.addEventListener('input', () => {
    if (input.value.trim()) validate();
    else result.innerHTML = '';
  });
  document.getElementById('sample').addEventListener('click', () => {
    input.value = JSON.stringify({ mcpServers: { example: { command: 'node', args: ['server.js'], env: { API_TOKEN: '${API_TOKEN}' } } } }, null, 2);
    validate();
  });
})();
