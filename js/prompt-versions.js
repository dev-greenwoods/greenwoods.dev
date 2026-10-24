(() => {
  const STORAGE_KEY = 'greenwoods.prompt-versions.v1';
  const nameInput = document.getElementById('name');
  const promptInput = document.getElementById('prompt');
  const status = document.getElementById('status');
  const list = document.getElementById('versions');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function readVersions() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const versions = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(versions)) throw new Error('Saved prompt data has an invalid format.');
    return versions;
  }

  function writeVersions(versions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  }

  function render() {
    try {
      const versions = readVersions().sort((a, b) => b.savedAt - a.savedAt);
      list.innerHTML = versions.length ? versions.map(item => `<label class="version-entry"><input type="checkbox" value="${escape(item.id)}"><span><strong>${escape(item.name)}</strong><small>${new Date(item.savedAt).toLocaleString()} · ${item.prompt.length} chars</small><span>${escape(item.prompt.slice(0, 100))}${item.prompt.length > 100 ? '…' : ''}</span></span><button type="button" data-load="${escape(item.id)}">load</button><button type="button" data-delete="${escape(item.id)}">delete</button></label>`).join('') : '<div class="empty-state">No saved versions in this browser yet.</div>';
      list.querySelectorAll('[data-load]').forEach(button => button.addEventListener('click', () => {
        const selected = versions.find(item => item.id === button.dataset.load);
        if (selected) {
          nameInput.value = selected.name;
          promptInput.value = selected.prompt;
          status.textContent = `Loaded "${selected.name}" into the editor.`;
        }
      }));
      list.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => {
        try {
          writeVersions(versions.filter(item => item.id !== button.dataset.delete));
          status.textContent = 'Saved version deleted from this browser.';
          render();
        } catch (error) { status.textContent = `Could not update local storage: ${error.message}`; }
      }));
      status.textContent = 'Prompt versions are stored only in this browser.';
    } catch (error) {
      status.textContent = `Could not read local storage: ${error.message}`;
      list.innerHTML = '';
    }
  }

  document.getElementById('save').addEventListener('click', () => {
    const name = nameInput.value.trim();
    const prompt = promptInput.value;
    if (!name || !prompt.trim()) {
      status.textContent = 'Enter a version name and non-empty prompt text.';
      return;
    }
    try {
      const versions = readVersions();
      versions.push({ id: crypto.randomUUID(), name, prompt, savedAt: Date.now() });
      writeVersions(versions);
      status.textContent = 'Prompt version saved in this browser.';
      render();
    } catch (error) { status.textContent = `Could not save to local storage: ${error.message}`; }
  });

  document.getElementById('compare').addEventListener('click', () => {
    const selected = [...list.querySelectorAll('input[type="checkbox"]:checked')];
    if (selected.length !== 2) {
      status.textContent = 'Select exactly two saved versions to compare.';
      return;
    }
    try {
      const versions = readVersions();
      const first = versions.find(item => item.id === selected[0].value);
      const second = versions.find(item => item.id === selected[1].value);
      if (!first || !second) throw new Error('A selected version is no longer available.');
      const url = new URL('/prompt-diff', location.origin);
      url.hash = `state=${encodeURIComponent(JSON.stringify({ inputA: first.prompt, inputB: second.prompt }))}`;
      if (url.href.length > 2000) {
        status.textContent = `The comparison link is ${url.href.length} characters. Shorten both prompts before sharing.`;
        return;
      }
      location.href = url.href;
    } catch (error) { status.textContent = `Could not create comparison: ${error.message}`; }
  });

  render();
})();
