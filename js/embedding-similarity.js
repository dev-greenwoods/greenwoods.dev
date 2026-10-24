(() => {
  const input = document.getElementById('vectors');
  const summary = document.getElementById('summary');
  const matrix = document.getElementById('matrix');
  const plot = document.getElementById('plot');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const cosine = (left, right) => {
    const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
    const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
    const rightNorm = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
    return dot / (leftNorm * rightNorm);
  };

  function run() {
    try {
      const parsed = JSON.parse(input.value);
      const vectors = Array.isArray(parsed) ? parsed : parsed.vectors;
      if (!Array.isArray(vectors) || vectors.length < 2 || vectors.length > 20) throw new Error('Provide an array of 2–20 labeled vectors.');
      const dimension = vectors[0]?.vector?.length;
      if (!Number.isInteger(dimension) || dimension < 1) throw new Error('Each vector needs a non-empty numeric vector field.');
      for (const item of vectors) {
        if (!Array.isArray(item.vector) || item.vector.length !== dimension || !item.vector.every(Number.isFinite)) throw new Error('All vectors must have the same dimension and finite numeric values.');
        if (Math.hypot(...item.vector) === 0) throw new Error('Zero vectors do not have a defined cosine similarity.');
      }
      const labels = vectors.map((item, index) => String(item.label || `Vector ${index + 1}`));
      const values = vectors.map(left => vectors.map(right => cosine(left.vector, right.vector)));
      summary.innerHTML = `<div class="result-head pass">${vectors.length} vectors · ${dimension} dimensions · cosine similarity from −1 to 1</div>`;
      matrix.innerHTML = `<table class="similarity-table"><thead><tr><th></th>${labels.map(label => `<th>${escape(label)}</th>`).join('')}</tr></thead><tbody>${values.map((row, index) => `<tr><th>${escape(labels[index])}</th>${row.map(value => `<td title="${value.toFixed(4)}">${value.toFixed(2)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      const xValues = values.map(row => row[0]);
      const yValues = values.map(row => row[1]);
      const scale = value => `${8 + ((value + 1) / 2) * 84}%`;
      plot.innerHTML = `<div class="similarity-plot" role="img" aria-label="Two-anchor cosine similarity projection">${vectors.map((item, index) => `<span class="similarity-point" style="left:${scale(xValues[index])};top:${100 - parseFloat(scale(yValues[index]))}%" title="${escape(labels[index])}">${escape(labels[index])}</span>`).join('')}</div>`;
    } catch (error) {
      summary.innerHTML = `<div class="error-msg">${escape(error.message)}</div>`;
      matrix.innerHTML = '';
      plot.innerHTML = '';
    }
  }

  input.addEventListener('input', run);
  document.getElementById('sample').addEventListener('click', () => {
    input.value = JSON.stringify([
      { label: 'cat', vector: [1, 0, 0.1] },
      { label: 'kitten', vector: [0.9, 0.1, 0] },
      { label: 'car', vector: [0, 1, 0.2] },
      { label: 'truck', vector: [0.1, 0.9, 0.1] }
    ], null, 2);
    run();
  });
  run();
})();
