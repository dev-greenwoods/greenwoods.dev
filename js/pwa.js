if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(registration => {
        const urls = new Set([location.pathname]);
        performance.getEntriesByType('resource').forEach(resource => {
          const url = new URL(resource.name, location.href);
          if (url.origin === location.origin && !url.search) urls.add(url.pathname);
        });
        registration.active?.postMessage({type: 'CACHE_URLS', urls: [...urls]});
      })
      .catch(error => console.error('Greenwoods offline support could not be registered.', error));
  });
}
