const inputArea = document.getElementById('inputArea');
const heatPanel = document.getElementById('heatPanel');
const parseErr  = document.getElementById('parseErr');

function logprobToProb(lp) { return Math.exp(lp); }

function probToColor(prob) {
  // prob 0..1 → green (high) / amber (mid) / red (low)
  if (prob >= 0.8) return `rgba(5,150,105,${0.25 + prob * 0.5})`;
  if (prob >= 0.4) return `rgba(245,158,11,${0.2 + prob * 0.5})`;
  return `rgba(220,38,38,${0.2 + (1 - prob) * 0.4})`;
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function extractTokens(obj) {
  // Full response object
  if (obj.choices?.[0]?.logprobs?.content) return obj.choices[0].logprobs.content;
  // Logprobs object directly
  if (obj.content && Array.isArray(obj.content)) return obj.content;
  // logprobs.content
  if (obj.logprobs?.content) return obj.logprobs.content;
  return null;
}

function render() {
  const raw = inputArea.value.trim();
  parseErr.style.display = 'none';

  if (!raw) {
    heatPanel.innerHTML = `<div class="empty-state"><div class="empty-icon">🌡</div><div>Paste logprobs JSON to see token confidence</div><div style="font-size:.65rem;color:var(--faint)">Green = high confidence · Red = uncertain</div></div>`;
    return;
  }

  let obj;
  try { obj = JSON.parse(raw); } catch (e) {
    parseErr.textContent = 'JSON parse error: ' + e.message;
    parseErr.style.display = '';
    heatPanel.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠</div><div>Fix JSON to render heatmap</div></div>`;
    return;
  }

  const tokens = extractTokens(obj);
  if (!tokens || !tokens.length) {
    parseErr.textContent = 'Could not find logprobs token array. Expected choices[0].logprobs.content or a logprobs.content array.';
    parseErr.style.display = '';
    return;
  }

  // Compute stats
  const probs = tokens.map(t => logprobToProb(t.logprob));
  const avgProb = probs.reduce((a,b)=>a+b,0) / probs.length;
  const minProb = Math.min(...probs);
  const uncertain = tokens.filter(t => logprobToProb(t.logprob) < 0.5).length;

  heatPanel.innerHTML = '';

  // Stats bar
  const stats = document.createElement('div');
  stats.className = 'lp-stats';
  stats.innerHTML = `
    <div class="lp-stat"><span class="lp-stat-val">${tokens.length}</span><span class="lp-stat-lbl">tokens</span></div>
    <div class="lp-stat"><span class="lp-stat-val">${(avgProb*100).toFixed(1)}%</span><span class="lp-stat-lbl">avg confidence</span></div>
    <div class="lp-stat"><span class="lp-stat-val" style="color:${uncertain>0?'#dc2626':'#059669'}">${uncertain}</span><span class="lp-stat-lbl">uncertain (&lt;50%)</span></div>
    <div class="lp-stat"><span class="lp-stat-val">${(minProb*100).toFixed(1)}%</span><span class="lp-stat-lbl">min confidence</span></div>`;
  heatPanel.appendChild(stats);

  // Heatmap text
  const textDiv = document.createElement('div');
  textDiv.className = 'lp-text output-block';

  const html = tokens.map(tok => {
    const prob = logprobToProb(tok.logprob);
    const color = probToColor(prob);
    const pct = (prob * 100).toFixed(2);
    const displayTok = tok.token.replace(/\n/g,'↵\n').replace(/\t/g,'→');

    // Build alternatives list
    let altHtml = '';
    if (tok.top_logprobs && tok.top_logprobs.length > 1) {
      const alts = tok.top_logprobs.slice(0, 5).map(a => {
        const ap = (logprobToProb(a.logprob)*100).toFixed(1);
        const at = escHtml(a.token.replace(/\n/g,'↵').replace(/\t/g,'→'));
        const isSel = a.token === tok.token;
        return `<div class="lp-alt"><span class="lp-alt-tok" style="${isSel?'font-weight:600;color:#fff':''}">${at}</span><span class="lp-alt-prob">${ap}%</span></div>`;
      }).join('');
      altHtml = `<div class="lp-altlist">${alts}</div>`;
    }

    return `<span class="lp-tok" style="background:${color}"><!--
      -->${escHtml(displayTok)}<div class="lp-tooltip"><b>${escHtml(tok.token.replace(/\n/g,'↵'))}</b> — ${pct}% confidence${altHtml}</div></span>`;
  }).join('');

  textDiv.innerHTML = html;
  heatPanel.appendChild(textDiv);
}

const SAMPLE = JSON.stringify({
  content: [
    { token: "The", logprob: -0.0023, top_logprobs: [{ token: "The", logprob: -0.0023 }, { token: "A", logprob: -1.23 }, { token: "This", logprob: -2.1 }] },
    { token: " quick", logprob: -0.89, top_logprobs: [{ token: " quick", logprob: -0.89 }, { token: " fast", logprob: -1.1 }, { token: " slow", logprob: -2.3 }] },
    { token: " brown", logprob: -0.012, top_logprobs: [{ token: " brown", logprob: -0.012 }, { token: " red", logprob: -1.5 }] },
    { token: " fox", logprob: -0.004, top_logprobs: [{ token: " fox", logprob: -0.004 }, { token: " dog", logprob: -3.2 }] },
    { token: " jumps", logprob: -1.82, top_logprobs: [{ token: " jumps", logprob: -1.82 }, { token: " leaps", logprob: -1.9 }, { token: " runs", logprob: -2.1 }] },
    { token: " over", logprob: -0.008, top_logprobs: [{ token: " over", logprob: -0.008 }] },
    { token: " the", logprob: -0.003, top_logprobs: [{ token: " the", logprob: -0.003 }] },
    { token: " lazy", logprob: -2.94, top_logprobs: [{ token: " lazy", logprob: -2.94 }, { token: " sleeping", logprob: -2.96 }, { token: " old", logprob: -3.1 }, { token: " tired", logprob: -3.4 }] },
    { token: " dog", logprob: -0.001, top_logprobs: [{ token: " dog", logprob: -0.001 }] },
    { token: ".", logprob: -0.002, top_logprobs: [{ token: ".", logprob: -0.002 }] },
  ]
}, null, 2);

document.getElementById('btnSample').addEventListener('click', () => { inputArea.value = SAMPLE; render(); });
document.getElementById('btnClear').addEventListener('click', () => { inputArea.value = ''; render(); });
let t; inputArea.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 150); });
