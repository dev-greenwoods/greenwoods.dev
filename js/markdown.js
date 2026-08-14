let renderedHtml = '';

marked.setOptions({
  breaks: true,
  gfm: true,
});

function render() {
  const raw = document.getElementById('mdInput').value;
  const preview = document.getElementById('preview');

  if (!raw.trim()) {
    preview.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><div>Preview will appear here</div></div>`;
    renderedHtml = '';
    document.getElementById('statusText').textContent = '0 chars · 0 lines';
    document.getElementById('statBadge').textContent = '0 words';
    return;
  }

  renderedHtml = marked.parse(raw);
  preview.innerHTML = renderedHtml;

  const words = raw.trim().split(/\s+/).filter(Boolean).length;
  const lines = raw.split('\n').length;
  document.getElementById('statusText').textContent = `${raw.length} chars · ${lines} lines`;
  document.getElementById('statBadge').textContent = `${words} words`;
}

function copyHtml() {
  if (!renderedHtml) return;
  navigator.clipboard.writeText(renderedHtml).then(() => {
    const btn = event.target;
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = 'copy html'; }, 1400);
  });
}

function copyMd() {
  const raw = document.getElementById('mdInput').value;
  if (!raw) return;
  navigator.clipboard.writeText(raw).then(() => {
    const btn = event.target;
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = 'copy md'; }, 1400);
  });
}

function clearAll() {
  document.getElementById('mdInput').value = '';
  render();
}

function loadSample() {
  document.getElementById('mdInput').value = `# Markdown Previewer

A fast, in-browser **Markdown** previewer with live rendering.

## Features

- Live preview as you type
- Full [GitHub Flavored Markdown](https://github.github.com/gfm/) support
- Tables, task lists, fenced code blocks
- Copy rendered HTML or raw Markdown

## Code Example

\`\`\`javascript
const greet = (name) => {
  console.log(\`Hello, \${name}!\`);
};
greet('world');
\`\`\`

## Table

| Tool        | Category  | Status |
|-------------|-----------|--------|
| JWT Decoder | Auth      | ✅ Live |
| JSON Format | Data      | ✅ Live |
| Base64      | Encoding  | ✅ Live |
| Regex       | Text      | ✅ Live |

## Task List

- [x] Build the base tools
- [x] Add color converter
- [x] Add markdown previewer
- [ ] Add more tools

> **Tip:** All processing happens in your browser — nothing is sent to a server.
`;
  render();
}

window.addEventListener('DOMContentLoaded', () => { loadSample(); });
