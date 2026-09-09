const inputArea    = document.getElementById('inputArea');
const analysisPanel = document.getElementById('analysisPanel');

function approxTokens(s) { return Math.max(1, Math.round(s.length / 4)); }

function analyze(text) {
  const lines = text.split('\n');
  const words = text.trim() ? text.trim().split(/\s+/) : [];
  const tokens = approxTokens(text);
  const chars = text.length;
  const sentences = (text.match(/[^.!?]+[.!?]+/g) || []).length;

  // Structure detection
  const struct = [];
  const hasRole    = /\b(you are|act as|your role|you're|you will be|behave as)\b/i.test(text);
  const hasContext = /\b(context|background|about|overview)\b/i.test(text);
  const hasTask    = /\b(your task|your job|your goal|you (should|must|will|need to)|please)\b/i.test(text);
  const hasFormat  = /\b(format|respond with|output|provide|return|structure)\b/i.test(text);
  const hasRules   = /\b(never|always|do not|don't|must not|avoid|important|rule|policy|guideline)\b/i.test(text);
  const hasExamples= /\b(example|for instance|e\.g\.|such as|like:|input:|output:)\b/i.test(text);
  const hasTone    = /\b(tone|style|formal|informal|concise|verbose|friendly|professional|casual)\b/i.test(text);
  const hasXML     = /<[a-z_]+>[\s\S]*?<\/[a-z_]+>/i.test(text);
  const hasMD      = /#{1,4} .+/.test(text);
  const hasBullets = /^[\s]*[-*•]\s/m.test(text);

  if (hasRole)     struct.push({ name:'Role definition', dot:'#7c3aed', count: null });
  if (hasContext)  struct.push({ name:'Context/background', dot:'#3b82f6', count: null });
  if (hasTask)     struct.push({ name:'Task instruction', dot:'#10b981', count: null });
  if (hasRules)    struct.push({ name:'Constraints/rules', dot:'#f59e0b', count: null });
  if (hasFormat)   struct.push({ name:'Output format', dot:'#06b6d4', count: null });
  if (hasTone)     struct.push({ name:'Tone/style', dot:'#8b5cf6', count: null });
  if (hasExamples) struct.push({ name:'Examples', dot:'#ec4899', count: null });
  if (hasXML)      struct.push({ name:'XML tags', dot:'#f97316', count: null });
  if (hasMD)       struct.push({ name:'Markdown headers', dot:'#84cc16', count: (text.match(/#{1,4} .+/g)||[]).length });
  if (hasBullets)  struct.push({ name:'Bullet lists', dot:'#a78bfa', count: null });

  // Issues
  const issues = [];
  if (tokens < 20) issues.push({ type:'warn', icon:'⚠', text:'<strong>Very short</strong> — most effective system prompts are 50–500 tokens.' });
  if (tokens > 2000) issues.push({ type:'warn', icon:'⚠', text:'<strong>Long prompt</strong> — prompts over 2k tokens consume significant context and may dilute instruction following.' });
  if (!hasRole) issues.push({ type:'info', icon:'ℹ', text:'<strong>No role defined</strong> — consider starting with "You are a [role]…" to set clear AI identity.' });
  if (!hasTask) issues.push({ type:'info', icon:'ℹ', text:'<strong>Task not explicit</strong> — explicitly stating what the AI should do improves consistency.' });
  if (!hasRules && tokens > 100) issues.push({ type:'info', icon:'ℹ', text:'<strong>No constraints</strong> — adding "never" / "always" rules helps prevent unwanted outputs.' });
  if (text.includes('  ') && !hasMD) issues.push({ type:'info', icon:'ℹ', text:'<strong>Double spaces detected</strong> — these waste tokens without adding meaning.' });
  const repetitions = findRepetitions(words);
  if (repetitions.length) issues.push({ type:'warn', icon:'⚠', text:`<strong>Repeated words</strong>: ${repetitions.slice(0,4).map(w=>`"${w}"`).join(', ')} — consider consolidating.` });
  if (hasRole && hasTask && hasFormat && hasRules) issues.push({ type:'ok', icon:'✓', text:'<strong>Well-structured</strong> — prompt covers role, task, format, and constraints.' });
  if (tokens >= 50 && tokens <= 800) issues.push({ type:'ok', icon:'✓', text:'<strong>Good length</strong> — within the effective 50–800 token range.' });
  if (issues.length === 0) issues.push({ type:'ok', icon:'✓', text:'No major issues detected.' });

  // Score (0-100)
  let score = 40;
  if (hasRole) score += 15;
  if (hasTask) score += 15;
  if (hasFormat) score += 10;
  if (hasRules) score += 10;
  if (hasTone) score += 5;
  if (hasExamples) score += 5;
  if (tokens >= 50 && tokens <= 800) score += 5;
  if (tokens < 20 || tokens > 3000) score -= 15;
  score = Math.max(0, Math.min(100, score));

  // Suggestions
  const suggestions = [];
  if (!hasRole) suggestions.push('<strong>Add a role:</strong> Start with "You are a [specific role]" — it anchors the model\'s persona and improves consistency.');
  if (!hasExamples && tokens < 500) suggestions.push('<strong>Add examples:</strong> Even 1–2 input/output examples (few-shot) significantly improve output quality for structured tasks.');
  if (!hasFormat) suggestions.push('<strong>Specify output format:</strong> Tell the model exactly how to structure its response — JSON, bullet list, markdown headers, etc.');
  if (tokens > 1500 && !hasXML) suggestions.push('<strong>Use XML tags:</strong> For long prompts, wrap sections in XML tags like <code>&lt;context&gt;</code>, <code>&lt;rules&gt;</code> to help the model parse structure.');
  if (!suggestions.length) suggestions.push('<strong>Looking good!</strong> Your prompt covers the key elements. Consider testing with edge-case inputs to validate behavior.');

  return { tokens, chars, words: words.length, sentences, struct, issues, score, suggestions };
}

function findRepetitions(words) {
  const freq = {};
  const stop = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','is','are','you','your','that','this','it','as','be','will','can','should']);
  words.forEach(w => { const lw = w.toLowerCase().replace(/[^a-z]/g,''); if (lw.length > 4 && !stop.has(lw)) freq[lw] = (freq[lw]||0)+1; });
  return Object.entries(freq).filter(([,c]) => c >= 3).sort(([,a],[,b])=>b-a).map(([w])=>w);
}

function scoreColor(s) { if (s >= 75) return '#10b981'; if (s >= 50) return '#f59e0b'; return '#ef4444'; }
function scoreLabel(s) { if (s >= 85) return 'Excellent'; if (s >= 70) return 'Good'; if (s >= 50) return 'Fair'; return 'Needs work'; }

function render() {
  const text = inputArea.value;
  if (!text.trim()) {
    analysisPanel.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div>Paste a system prompt to analyze it</div></div>`;
    return;
  }

  const A = analyze(text);
  analysisPanel.innerHTML = '';

  // Stat tiles
  const grid = document.createElement('div');
  grid.className = 'stat-grid';
  grid.innerHTML = `
    <div class="stat-tile"><span class="stat-tile-val">${A.tokens.toLocaleString()}</span><span class="stat-tile-lbl">~tokens</span></div>
    <div class="stat-tile"><span class="stat-tile-val">${A.words.toLocaleString()}</span><span class="stat-tile-lbl">words</span></div>
    <div class="stat-tile"><span class="stat-tile-val">${A.chars.toLocaleString()}</span><span class="stat-tile-lbl">chars</span></div>
    <div class="stat-tile"><span class="stat-tile-val">${A.sentences}</span><span class="stat-tile-lbl">sentences</span></div>`;
  analysisPanel.appendChild(grid);

  // Quality score
  const scoreDiv = document.createElement('div');
  scoreDiv.className = 'an-section';
  scoreDiv.innerHTML = `
    <div class="an-section-hd">✦ Quality score</div>
    <div class="an-section-body">
      <div class="score-label"><span>${scoreLabel(A.score)}</span><span>${A.score}/100</span></div>
      <div class="score-bar-wrap"><div class="score-bar" style="width:${A.score}%;background:${scoreColor(A.score)}"></div></div>
    </div>`;
  analysisPanel.appendChild(scoreDiv);

  // Structure
  const structDiv = document.createElement('div');
  structDiv.className = 'an-section';
  structDiv.innerHTML = `<div class="an-section-hd">⊞ Detected structure</div>
    <div class="an-section-body">
      ${A.struct.length
        ? A.struct.map(s=>`<div class="struct-item"><div class="struct-dot" style="background:${s.dot}"></div><span class="struct-name">${s.name}</span>${s.count?`<span class="struct-count">${s.count}</span>`:''}</div>`).join('')
        : '<span style="font-size:.68rem;color:var(--faint)">No clear structure detected.</span>'}
    </div>`;
  analysisPanel.appendChild(structDiv);

  // Issues
  const issueDiv = document.createElement('div');
  issueDiv.className = 'an-section';
  issueDiv.innerHTML = `<div class="an-section-hd">⚑ Issues &amp; checks</div>
    <div class="an-section-body">
      ${A.issues.map(i=>`<div class="issue-item issue-${i.type}"><span class="issue-icon">${i.icon}</span><span class="issue-text">${i.text}</span></div>`).join('')}
    </div>`;
  analysisPanel.appendChild(issueDiv);

  // Suggestions
  const sugDiv = document.createElement('div');
  sugDiv.className = 'an-section';
  sugDiv.innerHTML = `<div class="an-section-hd">💡 Suggestions</div>
    <div class="an-section-body">
      ${A.suggestions.map(s=>`<div class="suggestion">${s}</div>`).join('')}
    </div>`;
  analysisPanel.appendChild(sugDiv);
}

const SAMPLE = `You are an expert SQL database administrator with 15 years of experience in query optimization and schema design.

Your task is to review SQL queries provided by the user and:
1. Identify performance issues (missing indexes, N+1 queries, full table scans)
2. Suggest optimized rewrites with explanations
3. Flag potential security issues like SQL injection vulnerabilities

Rules:
- Never modify the user's query without explaining why
- Always provide the optimized version alongside the original
- If the query is already optimal, say so explicitly
- Do not make assumptions about database size — ask if it matters

Output format:
- Start with a brief diagnosis (1-2 sentences)
- Then list issues as a numbered list
- End with the optimized query in a code block

Tone: Technical and direct. Skip pleasantries.`;

document.getElementById('btnSample').addEventListener('click', () => { inputArea.value = SAMPLE; render(); });
document.getElementById('btnClear').addEventListener('click', () => { inputArea.value = ''; render(); });
let t; inputArea.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 120); });
