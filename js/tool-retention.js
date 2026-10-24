(() => {
  const KEY = 'greenwoods.tool-retention.v1';
  const limit = 8;
  const status = document.querySelector('#retention-status') || (() => {
    const node = document.createElement('p');
    node.className = 'retention-status';
    node.setAttribute('role', 'status');
    node.hidden = true;
    document.body.append(node);
    return node;
  })();

  function report(message) {
    status.textContent = message;
    status.hidden = false;
  }

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || '{"favorites":[],"recent":[]}');
      if (!value || !Array.isArray(value.favorites) || !Array.isArray(value.recent)) {
        throw new Error('Stored tool data has an unexpected format.');
      }
      return {
        favorites: value.favorites.filter(item => typeof item === 'string'),
        recent: value.recent.filter(item => item && typeof item.path === 'string' && typeof item.title === 'string' && Number.isFinite(item.time))
      };
    } catch (error) {
      report(`Browser-local favorites and history are unavailable: ${error.message}`);
      return { favorites: [], recent: [] };
    }
  }

  let data = read();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      status.textContent = '';
      status.hidden = true;
      return true;
    } catch (error) {
      report(`Could not save browser-local tool data: ${error.message}`);
      return false;
    }
  }

  function pathOf(url) {
    return new URL(url, location.href).pathname.replace(/\/+$/, '') || '/';
  }

  function getTitle(anchor) {
    return anchor.dataset.toolName || anchor.querySelector('strong')?.textContent?.trim()
      || anchor.querySelector('.tl-name')?.textContent?.trim()
      || anchor.getAttribute('aria-label') || anchor.textContent.trim();
  }

  function renderCollection(selector, items) {
    const container = document.querySelector(selector);
    if (!container) return;
    container.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('span');
      empty.className = 'retention-empty';
      empty.textContent = selector === '#favorite-tools' ? 'Star a tool card to save it here.' : 'Your recently opened tools will appear here.';
      container.append(empty);
      return;
    }
    for (const item of items) {
      const link = document.createElement('a');
      link.href = item.path;
      link.textContent = item.title;
      container.append(link);
    }
  }

  function render() {
    const cards = [...document.querySelectorAll('a.tl-card, a.hub-card, a.featured-card')];
    const unique = new Map();
    cards.forEach(card => {
      const path = pathOf(card.href);
      if (!unique.has(path)) unique.set(path, { path, title: getTitle(card) });
      if (card.dataset.retentionReady) return;
      card.dataset.retentionReady = 'true';
      const wrapper = document.createElement('div');
      wrapper.className = 'retention-card';
      card.before(wrapper);
      wrapper.append(card);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'retention-star';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const favorite = data.favorites.includes(path);
        const next = favorite ? data.favorites.filter(item => item !== path) : [...data.favorites, path];
        const previous = data.favorites;
        data.favorites = next;
        if (!save()) {
          data.favorites = previous;
          return;
        }
        updateStars();
        renderFavorites(unique);
      });
      wrapper.append(button);
    });
    updateStars();
    renderFavorites(unique);
  }

  function updateStars() {
    document.querySelectorAll('a.tl-card[data-retention-ready], a.hub-card[data-retention-ready], a.featured-card[data-retention-ready]').forEach(card => {
      const path = pathOf(card.href);
      const button = card.parentElement.querySelector('.retention-star');
      const favorite = data.favorites.includes(path);
      button.textContent = favorite ? '★' : '☆';
      button.setAttribute('aria-pressed', String(favorite));
      button.setAttribute('aria-label', `${favorite ? 'Remove from' : 'Add to'} favorites: ${getTitle(card)}`);
      button.title = favorite ? 'Remove from favorites' : 'Add to favorites';
    });
  }

  function renderFavorites(unique = new Map()) {
    const favorites = data.favorites.map(path => unique.get(path) || { path, title: path.split('/').filter(Boolean).at(-1) || 'Home' });
    renderCollection('#favorite-tools', favorites);
  }

  const heading = document.querySelector('h1.page-title');
  if (heading) {
    const current = { path: pathOf(location.href), title: heading.textContent.trim(), time: Date.now() };
    data.recent = [current, ...data.recent.filter(item => item.path !== current.path)].slice(0, limit);
    save();
  }

  renderCollection('#recent-tools', data.recent);
  if (document.querySelector('#favorite-tools') || document.querySelector('a.tl-card, a.hub-card, a.featured-card')) render();
})();
