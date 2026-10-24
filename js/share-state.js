(() => {
  const heading = document.querySelector('h1.page-title');
  if (!heading) return;

  const controls = [...document.querySelectorAll('input[id], textarea[id], select[id]')]
    .filter(control => !['button', 'submit', 'reset', 'file', 'password'].includes(control.type));
  if (!controls.length) return;

  const section = document.createElement('section');
  section.className = 'share-state';
  section.setAttribute('aria-label', 'Share this tool state');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-sm';
  button.textContent = 'Copy link with current state';
  const status = document.createElement('span');
  status.className = 'share-state-status';
  status.setAttribute('role', 'status');
  const note = document.createElement('p');
  note.textContent = 'State is added only when you click. The URL fragment stays in your link and is not sent to the server.';
  section.append(button, status, note);
  heading.insertAdjacentElement('afterend', section);

  function read(control) {
    if (control.type === 'checkbox') return control.checked;
    if (control.type === 'radio') return control.checked ? control.value : undefined;
    return control.value;
  }

  function restore() {
    if (!location.hash.startsWith('#state=')) return;
    try {
      const state = JSON.parse(decodeURIComponent(location.hash.slice(7)));
      if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('State must be an object');
      for (const control of controls) {
        if (!Object.prototype.hasOwnProperty.call(state, control.id)) continue;
        if (control.type === 'checkbox') control.checked = Boolean(state[control.id]);
        else if (control.type === 'radio') control.checked = control.value === state[control.id];
        else control.value = String(state[control.id]);
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
      }
      status.textContent = 'Shared state loaded from this link.';
    } catch {
      status.textContent = 'This shared state link is invalid and was not applied.';
    }
  }

  button.addEventListener('click', async () => {
    const state = {};
    for (const control of controls) {
      const value = read(control);
      if (value !== undefined) state[control.id] = value;
    }
    const url = new URL(location.href);
    url.hash = `state=${encodeURIComponent(JSON.stringify(state))}`;
    if (url.href.length > 2000) {
      status.textContent = `This state makes a ${url.href.length}-character link. Shorten the input before sharing; nothing was copied.`;
      return;
    }
    try {
      await navigator.clipboard.writeText(url.href);
      status.textContent = 'Link copied. Anyone with it can view the state in its URL fragment.';
    } catch (error) {
      status.textContent = `Could not copy the link: ${error.message}`;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore, { once: true });
  } else {
    restore();
  }
})();
