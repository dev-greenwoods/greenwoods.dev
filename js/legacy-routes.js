const legacyCategoryRoutes = new Map([
  ['all', '/#browse-tools'],
  ['all-tools', '/#browse-tools'],
  ['encoding', '/encoding-tools'],
  ['data', '/data-tools'],
  ['time', '/time-tools'],
  ['text', '/text-tools'],
  ['ai', '/llm-tools'],
  ['llm', '/llm-tools']
]);

const legacyCategory = decodeURIComponent(location.hash.slice(1)).toLowerCase();
const destination = legacyCategoryRoutes.get(legacyCategory);

if (destination) location.replace(destination);
