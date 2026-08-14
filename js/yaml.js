let mode = 'yaml-json';
let currentOutput = '';

function setMode(m) {
  mode = m;
  document.getElementById('tabYJ').classList.toggle('active', m === 'yaml-json');
  document.getElementById('tabJY').classList.toggle('active', m === 'json-yaml');
  document.getElementById('inputTitle').textContent  = m === 'yaml-json' ? 'yaml input'  : 'json input';
  document.getElementById('outputTitle').textContent = m === 'yaml-json' ? 'json output' : 'yaml output';
  document.getElementById('yamlInput').placeholder   = m === 'yaml-json' ? 'Paste YAML here...' : 'Paste JSON here...';
  document.getElementById('modeBadge').textContent   = m === 'yaml-json' ? 'yaml → json' : 'json → yaml';
  convert();
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function convert() {
  const raw = document.getElementById('yamlInput').value;
  const out = document.getElementById('yamlOutput');
  const err = document.getElementById('inputError');

  err.classList.add('hidden');
  currentOutput = '';

  if (!raw.trim()) {
    out.innerHTML = `<div class="empty-state"><div class="empty-icon">⇄</div><div>Output will appear here</div></div>`;
    document.getElementById('statusText').textContent = mode === 'yaml-json' ? 'Paste YAML or JSON to convert.' : 'Paste JSON to convert.';
    return;
  }

  try {
    if (mode === 'yaml-json') {
      const parsed = jsyaml.load(raw);
      currentOutput = JSON.stringify(parsed, null, 2);
      out.innerHTML = `<pre>${escapeHtml(currentOutput)}</pre>`;
      document.getElementById('statusText').textContent = `Converted · ${raw.split('\n').length} lines YAML → ${currentOutput.split('\n').length} lines JSON`;
    } else {
      const parsed = JSON.parse(raw);
      currentOutput = jsyaml.dump(parsed, { indent: 2, lineWidth: -1 });
      out.innerHTML = `<pre>${escapeHtml(currentOutput)}</pre>`;
      document.getElementById('statusText').textContent = `Converted · ${raw.split('\n').length} lines JSON → ${currentOutput.split('\n').length} lines YAML`;
    }
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
    out.innerHTML = `<div class="empty-state"><div class="empty-icon">⇄</div><div>Fix the error above</div></div>`;
  }
}

function swapPanels() {
  const newMode = mode === 'yaml-json' ? 'json-yaml' : 'yaml-json';
  if (currentOutput) document.getElementById('yamlInput').value = currentOutput;
  setMode(newMode);
}

function copyOutput() {
  if (!currentOutput) return;
  navigator.clipboard.writeText(currentOutput).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = 'copy'; }, 1400);
  });
}

function clearAll() {
  document.getElementById('yamlInput').value = '';
  currentOutput = '';
  document.getElementById('inputError').classList.add('hidden');
  document.getElementById('yamlOutput').innerHTML = `<div class="empty-state"><div class="empty-icon">⇄</div><div>Output will appear here</div></div>`;
}

function loadSample() {
  if (mode === 'yaml-json') {
    document.getElementById('yamlInput').value = `# Server configuration
server:
  host: localhost
  port: 8080
  ssl: true

database:
  host: db.example.com
  port: 5432
  name: myapp
  credentials:
    user: admin
    password: secret

features:
  - name: auth
    enabled: true
  - name: analytics
    enabled: false

limits:
  maxConnections: 100
  timeout: 30s
`;
  } else {
    document.getElementById('yamlInput').value = JSON.stringify({
      server: { host: 'localhost', port: 8080, ssl: true },
      database: { host: 'db.example.com', port: 5432, name: 'myapp' },
      features: [{ name: 'auth', enabled: true }, { name: 'analytics', enabled: false }],
    }, null, 2);
  }
  convert();
}
