// ── State ──────────────────────────────────────────────────────────
let mode  = 'escape';
let lang  = 'js';
let quote = 'double';

// ── Language definitions ───────────────────────────────────────────
const DEFS = {
  js: {
    label: 'JavaScript',
    cheatsheet: [
      { raw:'\\', esc:'\\\\', desc:'backslash' },
      { raw:'"',  esc:'\\"',  desc:'double quote' },
      { raw:"'",  esc:"\\'",  desc:'single quote' },
      { raw:'`',  esc:'\\`',  desc:'backtick' },
      { raw:'\n', esc:'\\n',  desc:'newline' },
      { raw:'\r', esc:'\\r',  desc:'carriage return' },
      { raw:'\t', esc:'\\t',  desc:'tab' },
      { raw:'\0', esc:'\\0',  desc:'null' },
      { raw:'\b', esc:'\\b',  desc:'backspace' },
      { raw:'\f', esc:'\\f',  desc:'form feed' },
      { raw:'$',  esc:'\\$',  desc:'template literal $' },
    ],
    escape(s) {
      let out = s
        .replace(/\\/g, '\\\\')
        .replace(/\0/g, '\\0')
        .replace(/\b/g, '\\b')
        .replace(/\f/g, '\\f')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n');
      if (quote === 'double')   out = out.replace(/"/g, '\\"');
      if (quote === 'single')   out = out.replace(/'/g, "\\'");
      if (quote === 'backtick') out = out.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
      return out;
    },
    unescape(s) {
      return s
        .replace(/\\0/g, '\0')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\`/g, '`')
        .replace(/\\\\/g, '\\')
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
    }
  },

  json: {
    label: 'JSON',
    cheatsheet: [
      { raw:'\\', esc:'\\\\', desc:'backslash' },
      { raw:'"',  esc:'\\"',  desc:'double quote' },
      { raw:'\n', esc:'\\n',  desc:'newline' },
      { raw:'\r', esc:'\\r',  desc:'carriage return' },
      { raw:'\t', esc:'\\t',  desc:'tab' },
      { raw:'\b', esc:'\\b',  desc:'backspace' },
      { raw:'\f', esc:'\\f',  desc:'form feed' },
    ],
    escape(s) {
      return JSON.stringify(s).slice(1, -1); // strip surrounding quotes
    },
    unescape(s) {
      try { return JSON.parse(`"${s}"`); } catch { return s; }
    }
  },

  python: {
    label: 'Python',
    cheatsheet: [
      { raw:'\\', esc:'\\\\', desc:'backslash' },
      { raw:"'",  esc:"\\'",  desc:'single quote' },
      { raw:'"',  esc:'\\"',  desc:'double quote' },
      { raw:'\n', esc:'\\n',  desc:'newline' },
      { raw:'\r', esc:'\\r',  desc:'carriage return' },
      { raw:'\t', esc:'\\t',  desc:'tab' },
      { raw:'\0', esc:'\\0',  desc:'null' },
      { raw:'\b', esc:'\\b',  desc:'backspace' },
      { raw:'\f', esc:'\\f',  desc:'form feed' },
    ],
    escape(s) {
      return s
        .replace(/\\/g, '\\\\')
        .replace(/\0/g, '\\0')
        .replace(/\b/g, '\\b')
        .replace(/\f/g, '\\f')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');
    },
    unescape(s) {
      return s
        .replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
        .replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\')
        .replace(/\\0/g, '\0').replace(/\\b/g, '\b').replace(/\\f/g, '\f');
    }
  },

  sql: {
    label: 'SQL',
    cheatsheet: [
      { raw:"'",  esc:"''",   desc:"single quote" },
      { raw:'%',  esc:'\\%',  desc:'LIKE wildcard %' },
      { raw:'_',  esc:'\\_',  desc:'LIKE wildcard _' },
      { raw:'\\', esc:'\\\\', desc:'backslash' },
    ],
    escape(s) {
      return s.replace(/'/g, "''").replace(/\\/g, '\\\\');
    },
    unescape(s) {
      return s.replace(/''/g, "'").replace(/\\\\/g, '\\');
    }
  },

  shell: {
    label: 'Shell',
    cheatsheet: [
      { raw:'$',  esc:'\\$',  desc:'variable expansion' },
      { raw:'`',  esc:'\\`',  desc:'command sub' },
      { raw:'"',  esc:'\\"',  desc:'double quote' },
      { raw:'\\', esc:'\\\\', desc:'backslash' },
      { raw:'!',  esc:'\\!',  desc:'history expansion' },
      { raw:'\n', esc:'\\n',  desc:'newline (in $\'…\')' },
    ],
    escape(s) {
      // ANSI-C quoting style: $'...'
      return s
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\0/g, '\\0');
    },
    unescape(s) {
      return s
        .replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
        .replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/\\0/g, '\0');
    }
  },

  regex: {
    label: 'Regex',
    cheatsheet: [
      { raw:'.', esc:'\\.', desc:'any char' },
      { raw:'*', esc:'\\*', desc:'zero or more' },
      { raw:'+', esc:'\\+', desc:'one or more' },
      { raw:'?', esc:'\\?', desc:'optional' },
      { raw:'^', esc:'\\^', desc:'start anchor' },
      { raw:'$', esc:'\\$', desc:'end anchor' },
      { raw:'(', esc:'\\(', desc:'group open' },
      { raw:')', esc:'\\)', desc:'group close' },
      { raw:'[', esc:'\\[', desc:'class open' },
      { raw:']', esc:'\\]', desc:'class close' },
      { raw:'{', esc:'\\{', desc:'quantifier open' },
      { raw:'}', esc:'\\}', desc:'quantifier close' },
      { raw:'|', esc:'\\|', desc:'alternation' },
      { raw:'\\',esc:'\\\\',desc:'backslash' },
      { raw:'/', esc:'\\/', desc:'delimiter' },
    ],
    escape(s) {
      return s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
    },
    unescape(s) {
      return s.replace(/\\([.*+?^${}()|[\]\\\/])/g, '$1');
    }
  },

  html: {
    label: 'HTML',
    cheatsheet: [
      { raw:'&',  esc:'&amp;',  desc:'ampersand' },
      { raw:'<',  esc:'&lt;',   desc:'less than' },
      { raw:'>',  esc:'&gt;',   desc:'greater than' },
      { raw:'"',  esc:'&quot;', desc:'double quote' },
      { raw:"'",  esc:'&#39;',  desc:'single quote' },
    ],
    escape(s) {
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    unescape(s) {
      return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
    }
  },

  xml: {
    label: 'XML',
    cheatsheet: [
      { raw:'&',  esc:'&amp;',  desc:'ampersand' },
      { raw:'<',  esc:'&lt;',   desc:'less than' },
      { raw:'>',  esc:'&gt;',   desc:'greater than' },
      { raw:'"',  esc:'&quot;', desc:'double quote' },
      { raw:"'",  esc:'&apos;', desc:'single quote' },
    ],
    escape(s) {
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    },
    unescape(s) {
      return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
    }
  }
};

// ── Samples ────────────────────────────────────────────────────────
const SAMPLES = {
  js:     `Hello "World"\nIt's a tab:\there\nPath: C:\\Users\\dev\nNull: \0 End`,
  json:   `She said "hello"\nLine 2\tTabbed`,
  python: `print("it's a 'test'")\n\\path\\to\\file`,
  sql:    `O'Brien's cafe\nWhere name LIKE '100%'`,
  shell:  `echo "Hello $USER"\n$(date)\n/path/to/file`,
  regex:  `Match (groups) and [classes] and 2+2=4. End.$`,
  html:   `<b>Bold</b> & "quoted" 'text' > end`,
  xml:    `<root attr="val">Tom & Jerry's show</root>`,
};

// ── Helpers ────────────────────────────────────────────────────────
function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function highlightTokens(raw, escaped) {
  // Show escaped sequences in accent color
  return esc(escaped).replace(
    /(\\[\\nrtbf0'"` $]|\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}|&amp;|&lt;|&gt;|&quot;|&#?\w+;|'')/g,
    m => `<span class="esc-token">${m}</span>`
  );
}

// ── Render ─────────────────────────────────────────────────────────
function process() {
  const input = document.getElementById('inputArea').value;
  const def = DEFS[lang];
  const outputArea = document.getElementById('outputArea');
  const statsBar   = document.getElementById('statsBar');

  if (!input) {
    outputArea.innerHTML = `<div class="empty-state"><div class="empty-icon">✂</div><div>Start typing to see ${mode}d output</div></div>`;
    statsBar.style.display = 'none';
    return;
  }

  let result;
  try {
    result = mode === 'escape' ? def.escape(input) : def.unescape(input);
  } catch(e) {
    result = `Error: ${e.message}`;
  }

  outputArea.innerHTML = `<pre>${mode === 'escape' ? highlightTokens(input, result) : esc(result)}</pre>`;

  // Stats
  const inLen  = input.length;
  const outLen = result.length;
  const delta  = outLen - inLen;
  document.getElementById('statCharsIn').textContent  = `${inLen} chars in`;
  document.getElementById('statCharsOut').textContent = `${outLen} chars out`;
  const deltaEl = document.getElementById('statDelta');
  deltaEl.textContent = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '=';
  deltaEl.className = 'stat-delta ' + (delta > 0 ? 'grow' : delta < 0 ? 'shrink' : 'same');
  statsBar.style.display = 'flex';

  // Label
  document.getElementById('outputLabel').textContent = mode === 'escape' ? 'escaped output' : 'unescaped output';
}

function renderCheatsheet() {
  const def = DEFS[lang];
  const cs = document.getElementById('cheatsheet');
  if (!def.cheatsheet?.length) { cs.innerHTML = ''; return; }
  cs.innerHTML = `
    <div class="cs-title">${def.label} escape sequences</div>
    <div class="cs-grid">
      ${def.cheatsheet.map(row => `
        <div class="cs-row">
          <span class="cs-raw">${esc(JSON.stringify(row.raw).slice(1,-1))}</span>
          <span style="color:var(--muted)">→</span>
          <span class="cs-esc">${esc(row.esc)}</span>
          <span class="cs-desc">${row.desc}</span>
        </div>`).join('')}
    </div>`;
}

// ── JS options visibility ──────────────────────────────────────────
function updateJsOpts() {
  document.getElementById('jsOpts').style.display = lang === 'js' ? 'flex' : 'none';
}

// ── Events ─────────────────────────────────────────────────────────
document.getElementById('inputArea').addEventListener('input', process);

document.querySelectorAll('[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b === btn));
    process();
  });
});

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    lang = btn.dataset.lang;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b === btn));
    updateJsOpts();
    renderCheatsheet();
    process();
  });
});

document.querySelectorAll('[data-quote]').forEach(btn => {
  btn.addEventListener('click', () => {
    quote = btn.dataset.quote;
    document.querySelectorAll('[data-quote]').forEach(b => b.classList.toggle('active', b === btn));
    process();
  });
});

document.getElementById('btnClear').addEventListener('click', () => {
  document.getElementById('inputArea').value = '';
  process();
});

document.getElementById('btnSample').addEventListener('click', () => {
  document.getElementById('inputArea').value = SAMPLES[lang] || SAMPLES.js;
  process();
});

document.getElementById('btnCopy').addEventListener('click', function() {
  const pre = document.querySelector('#outputArea pre');
  if (!pre) return;
  navigator.clipboard.writeText(pre.textContent).then(() => {
    this.textContent = 'copied!';
    setTimeout(() => this.textContent = 'copy', 1500);
  });
});

document.getElementById('btnSwap').addEventListener('click', () => {
  const pre = document.querySelector('#outputArea pre');
  if (!pre) return;
  document.getElementById('inputArea').value = pre.textContent;
  // Flip mode
  mode = mode === 'escape' ? 'unescape' : 'escape';
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  process();
});

// ── Init ───────────────────────────────────────────────────────────
updateJsOpts();
renderCheatsheet();
