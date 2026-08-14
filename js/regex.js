let allMatches = [];

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toggleFlag(f) {
  const input = document.getElementById('flagsInput');
  if (input.value.includes(f)) {
    input.value = input.value.replace(f, '');
  } else {
    input.value += f;
  }
  runRegex();
}

function runRegex() {
  const pattern = document.getElementById('patternInput').value;
  const flags = document.getElementById('flagsInput').value;
  const test = document.getElementById('testInput').value;
  const errEl = document.getElementById('regexError');
  const highlight = document.getElementById('highlightBlock');
  const matchList = document.getElementById('matchList');
  const matchCount = document.getElementById('matchCount');

  errEl.classList.add('hidden');
  allMatches = [];

  if (!pattern) {
    highlight.innerHTML = `<div class="empty-state"><div class="empty-icon">📐</div><div>Matches will be highlighted here</div></div>`;
    matchList.classList.add('hidden');
    matchCount.textContent = '0 matches';
    document.getElementById('statusText').textContent = 'Enter a pattern and test string.';
    return;
  }

  let regex;
  try {
    regex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
  } catch (e) {
    errEl.textContent = 'Invalid regex: ' + e.message;
    errEl.classList.remove('hidden');
    matchCount.textContent = 'error';
    return;
  }

  if (!test) {
    highlight.innerHTML = `<div class="empty-state"><div class="empty-icon">📐</div><div>Enter a test string below</div></div>`;
    matchList.classList.add('hidden');
    matchCount.textContent = '0 matches';
    return;
  }

  // Find all matches
  let m;
  const safeFlags = flags.includes('g') ? flags : flags + 'g';
  const safeRegex = new RegExp(pattern, safeFlags);

  while ((m = safeRegex.exec(test)) !== null) {
    allMatches.push({
      value: m[0],
      index: m.index,
      end: m.index + m[0].length,
      groups: m.slice(1),
      namedGroups: m.groups || {}
    });
    if (m[0].length === 0) safeRegex.lastIndex++;
    if (allMatches.length > 1000) break;
  }

  matchCount.textContent = `${allMatches.length} match${allMatches.length !== 1 ? 'es' : ''}`;

  // Build highlighted text
  let result = '';
  let lastIndex = 0;
  for (const match of allMatches) {
    result += escapeHtml(test.slice(lastIndex, match.index));
    result += `<mark class="match-highlight">${escapeHtml(match.value || '​')}</mark>`;
    lastIndex = match.end;
  }
  result += escapeHtml(test.slice(lastIndex));

  highlight.innerHTML = `<pre>${result}</pre>`;

  // Build match list
  if (allMatches.length > 0) {
    matchList.innerHTML = allMatches.slice(0, 100).map((m, i) => {
      const groups = m.groups.length > 0
        ? `<div class="match-groups">${m.groups.map((g, gi) => `<div class="match-group">group ${gi + 1}: <span>${escapeHtml(g ?? 'undefined')}</span></div>`).join('')}</div>`
        : '';
      const named = Object.keys(m.namedGroups).length > 0
        ? `<div class="match-groups">${Object.entries(m.namedGroups).map(([k, v]) => `<div class="match-group">${escapeHtml(k)}: <span>${escapeHtml(v ?? 'undefined')}</span></div>`).join('')}</div>`
        : '';
      return `<div class="match-item">
        <span class="match-num">#${i + 1}</span>
        <span class="match-pos">${m.index}–${m.end}</span>
        <span class="match-val">${escapeHtml(m.value)}</span>
        ${groups}${named}
      </div>`;
    }).join('');
    if (allMatches.length > 100) {
      matchList.innerHTML += `<div class="match-item"><span class="match-num" style="grid-column:1/4;color:var(--muted)">... ${allMatches.length - 100} more matches</span></div>`;
    }
    matchList.classList.remove('hidden');
  } else {
    matchList.classList.add('hidden');
  }

  const statusFlags = flags ? ` · flags: /${flags}` : '';
  document.getElementById('statusText').textContent =
    `${allMatches.length} match${allMatches.length !== 1 ? 'es' : ''}${statusFlags} · ${test.length} chars tested`;
}

function copyMatches() {
  if (!allMatches.length) return;
  const text = allMatches.map(m => m.value).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = 'copy all'; }, 1400);
  });
}

function loadSample() {
  document.getElementById('patternInput').value = '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b';
  document.getElementById('flagsInput').value = 'gi';
  document.getElementById('testInput').value = `Contact us at hello@greenwoods.dev or support@example.com
Invalid: notanemail, @domain.com, user@
Also valid: user.name+tag@sub.domain.co.uk`;
  runRegex();
}

function clearAll() {
  document.getElementById('patternInput').value = '';
  document.getElementById('testInput').value = '';
  document.getElementById('regexError').classList.add('hidden');
  allMatches = [];
  document.getElementById('highlightBlock').innerHTML = `<div class="empty-state"><div class="empty-icon">📐</div><div>Matches will be highlighted here</div></div>`;
  document.getElementById('matchList').classList.add('hidden');
  document.getElementById('matchCount').textContent = '0 matches';
}
