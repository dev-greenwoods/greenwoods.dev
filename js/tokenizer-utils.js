(() => {
  function approximateTokenCount(text) {
    if (!text) return 0;
    const chunks = text.match(/\s*[a-zA-Z]+|\s*\d+|\s*[^\s\w]/g) || [];
    let count = 0;
    for (const chunk of chunks) {
      const word = chunk.trim();
      if (!word) continue;
      if (/^[a-zA-Z]+$/.test(word)) count += Math.ceil(word.length / 4.2);
      else if (/^\d+$/.test(word)) count += Math.ceil(word.length / 2);
      else count += 1;
    }
    return Math.max(1, count);
  }

  window.GreenwoodsTokenCounter = { approximateTokenCount };
})();
