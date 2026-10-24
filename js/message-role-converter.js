(() => {
  const source = document.getElementById('source');
  const output = document.getElementById('output');
  const report = document.getElementById('report');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  let outputText = '';

  function convert() {
    try {
      const data = JSON.parse(source.value);
      const from = document.getElementById('from').value;
      const to = document.getElementById('to').value;
      const losses = [];
      let system = '';
      let messages = [];
      if (from === 'openai') {
        const input = Array.isArray(data) ? data : data.messages;
        if (!Array.isArray(input)) throw new Error('OpenAI input must be an array or an object with messages.');
        messages = input.map((item, index) => {
          if (typeof item.content !== 'string') losses.push(`Message ${index + 1}: non-string or structured content was omitted.`);
          const role = item.role === 'system' || item.role === 'user' || item.role === 'assistant' ? item.role : 'unsupported';
          if (role === 'unsupported') losses.push(`Message ${index + 1}: role "${item.role || 'missing'}" is unsupported.`);
          return { role, text: typeof item.content === 'string' ? item.content : '' };
        });
      } else if (from === 'anthropic') {
        if (!data || !Array.isArray(data.messages)) throw new Error('Anthropic input must contain a messages array.');
        if (typeof data.system === 'string') system = data.system;
        messages = data.messages.map((item, index) => {
          const blocks = Array.isArray(item.content) ? item.content : [];
          const text = blocks.filter(block => block && block.type === 'text' && typeof block.text === 'string').map(block => block.text).join('\n');
          if (blocks.some(block => !block || block.type !== 'text')) losses.push(`Message ${index + 1}: non-text Anthropic content block omitted.`);
          return { role: item.role === 'user' || item.role === 'assistant' ? item.role : 'unsupported', text };
        });
      } else {
        const contents = data?.contents;
        if (!Array.isArray(contents)) throw new Error('Gemini input must contain a contents array.');
        const systemParts = data.systemInstruction?.parts;
        if (Array.isArray(systemParts)) system = systemParts.filter(part => typeof part.text === 'string').map(part => part.text).join('\n');
        messages = contents.map((item, index) => {
          const parts = Array.isArray(item.parts) ? item.parts : [];
          const text = parts.filter(part => typeof part.text === 'string').map(part => part.text).join('\n');
          if (parts.some(part => typeof part.text !== 'string')) losses.push(`Message ${index + 1}: non-text Gemini part omitted.`);
          const role = item.role === 'model' ? 'assistant' : item.role === 'user' ? 'user' : 'unsupported';
          if (role === 'unsupported') losses.push(`Message ${index + 1}: role "${item.role || 'missing'}" is unsupported.`);
          return { role, text };
        });
      }
      if (messages.some(item => item.role === 'unsupported')) throw new Error('Unsupported roles were found. See the report; no converted output was produced.');
      if (to === 'anthropic') {
        const userAssistant = messages.filter(item => {
          if (item.role === 'system') {
            if (item.text) system = [system, item.text].filter(Boolean).join('\n\n');
            return false;
          }
          return true;
        });
        if (userAssistant.length !== messages.length) losses.push('System messages moved to the top-level system field.');
        outputText = JSON.stringify({ ...(system ? { system } : {}), messages: userAssistant.map(item => ({ role: item.role, content: item.text })) }, null, 2);
      } else if (to === 'gemini') {
        const systemTexts = messages.filter(item => item.role === 'system').map(item => item.text);
        if (systemTexts.length) losses.push('System messages moved to systemInstruction.');
        outputText = JSON.stringify({
          ...(system || systemTexts.length ? { systemInstruction: { parts: [{ text: [system, ...systemTexts].filter(Boolean).join('\n\n') }] } } : {}),
          contents: messages.filter(item => item.role !== 'system').map(item => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.text }] }))
        }, null, 2);
      } else {
        const openAiMessages = system ? [{ role: 'system', content: system }, ...messages.map(item => ({ role: item.role, content: item.text }))] : messages.map(item => ({ role: item.role, content: item.text }));
        outputText = JSON.stringify({ messages: openAiMessages }, null, 2);
      }
      output.textContent = outputText;
      report.innerHTML = `<div class="result-head ${losses.length ? 'fail' : 'pass'}">${from} → ${to} · ${losses.length} conversion note${losses.length === 1 ? '' : 's'}</div>${losses.map(loss => `<div class="finding">${escape(loss)}</div>`).join('') || '<div class="finding">Text messages converted without detected loss.</div>'}`;
    } catch (error) {
      output.textContent = '';
      outputText = '';
      report.innerHTML = `<div class="error-msg">${escape(error.message)}</div>`;
    }
  }
  document.getElementById('convert').addEventListener('click', convert);
  document.getElementById('from').addEventListener('change', convert);
  document.getElementById('to').addEventListener('change', convert);
  source.addEventListener('input', () => { if (source.value.trim()) convert(); else { output.textContent = ''; report.innerHTML = ''; } });
  document.getElementById('sample').addEventListener('click', () => {
    document.getElementById('from').value = 'openai';
    document.getElementById('to').value = 'anthropic';
    source.value = JSON.stringify({ messages: [{ role: 'system', content: 'Be concise.' }, { role: 'user', content: 'Hi.' }, { role: 'assistant', content: 'Hello.' }] }, null, 2);
    convert();
  });
  document.getElementById('copy').addEventListener('click', async () => {
    if (!outputText) return;
    try { await navigator.clipboard.writeText(outputText); report.dataset.copy = 'Copied converted JSON.'; }
    catch (error) { report.innerHTML += `<div class="error-msg">Could not copy: ${escape(error.message)}</div>`; }
  });
})();
