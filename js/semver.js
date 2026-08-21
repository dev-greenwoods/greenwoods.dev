'use strict';

// ── Parse semver ──────────────────────────────────────────────────────────────
function parseSemver(s) {
  s = s.trim().replace(/^v/, '');
  const m = s.match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.\-]+))?(?:\+([\w.\-]+))?$/);
  if (!m) return null;
  return {
    major: parseInt(m[1], 10),
    minor: parseInt(m[2], 10),
    patch: parseInt(m[3], 10),
    pre:   m[4] || '',
    build: m[5] || '',
    raw:   s,
  };
}

function semverStr(v, showBuild = true) {
  let s = `${v.major}.${v.minor}.${v.patch}`;
  if (v.pre)   s += `-${v.pre}`;
  if (showBuild && v.build) s += `+${v.build}`;
  return s;
}

// ── Compare ───────────────────────────────────────────────────────────────────
function compareSemver(a, b) {
  if (a.major !== b.major) return a.major > b.major ? 1 : -1;
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;
  // Pre-release: no pre > has pre (1.0.0 > 1.0.0-alpha)
  if (!a.pre && b.pre)  return 1;
  if (a.pre && !b.pre)  return -1;
  if (a.pre !== b.pre)  return a.pre > b.pre ? 1 : -1;
  return 0;
}

// ── Bump ──────────────────────────────────────────────────────────────────────
function bump(v, type, pre = '', build = '') {
  let { major, minor, patch } = v;
  switch (type) {
    case 'major': major++; minor = 0; patch = 0; break;
    case 'minor': minor++; patch = 0; break;
    case 'patch': patch++; break;
    case 'premajor': major++; minor = 0; patch = 0; break;
    case 'preminor': minor++; patch = 0; break;
    case 'prepatch': patch++; break;
    case 'prerelease':
      if (v.pre) {
        // Increment pre-release number if ends in .N
        const m = v.pre.match(/^(.*?)\.?(\d+)$/);
        if (m) { return { major, minor, patch, pre: m[2] ? `${m[1]}.${parseInt(m[2])+1}` : `${v.pre}.1`, build }; }
      }
      patch++;
      break;
    case 'release': break; // strip pre
  }
  return { major, minor, patch, pre, build };
}

// ── Range matching ────────────────────────────────────────────────────────────
function matchesRange(version, range) {
  const v = parseSemver(version);
  if (!v) return false;

  const parts = range.trim().split(/\s*\|\|\s*/);
  return parts.some(part => matchesComparator(v, part.trim()));
}

function matchesComparator(v, comp) {
  const parts = comp.split(/\s+/);
  return parts.every(p => matchesSingle(v, p.trim()));
}

function matchesSingle(v, comp) {
  if (!comp) return true;
  if (comp === '*' || comp === '') return true;

  // Tilde: ~1.2.3 = >=1.2.3 <1.3.0
  if (comp.startsWith('~')) {
    const base = parseSemver(comp.slice(1));
    if (!base) return false;
    const lo = compareSemver(v, base) >= 0;
    const hi = v.major === base.major && v.minor === base.minor;
    return lo && hi;
  }

  // Caret: ^1.2.3 = >=1.2.3 <2.0.0
  if (comp.startsWith('^')) {
    const base = parseSemver(comp.slice(1));
    if (!base) return false;
    const lo = compareSemver(v, base) >= 0;
    let hi;
    if (base.major > 0) hi = v.major === base.major;
    else if (base.minor > 0) hi = v.major === 0 && v.minor === base.minor;
    else hi = v.major === 0 && v.minor === 0 && v.patch === base.patch;
    return lo && hi;
  }

  // Hyphen range: 1.2.3 - 2.0.0
  const hyphen = comp.match(/^(.+?)\s+-\s+(.+)$/);
  if (hyphen) {
    const lo = parseSemver(hyphen[1]);
    const hi = parseSemver(hyphen[2]);
    if (!lo || !hi) return false;
    return compareSemver(v, lo) >= 0 && compareSemver(v, hi) <= 0;
  }

  // Comparators: >=, <=, >, <, =
  const m = comp.match(/^(>=|<=|>|<|=|!=|==)(.+)$/);
  if (m) {
    const op  = m[1];
    const ref = parseSemver(m[2]);
    if (!ref) return false;
    const cmp = compareSemver(v, ref);
    switch(op) {
      case '>=': return cmp >= 0;
      case '<=': return cmp <= 0;
      case '>':  return cmp > 0;
      case '<':  return cmp < 0;
      case '=':
      case '==': return cmp === 0;
      case '!=': return cmp !== 0;
    }
  }

  // Bare version
  const ref = parseSemver(comp);
  if (ref) return compareSemver(v, ref) === 0;
  return false;
}

// ── Diff label ────────────────────────────────────────────────────────────────
function diffLabel(a, b) {
  if (!a || !b) return '';
  const cmp = compareSemver(a, b);
  if (cmp === 0) return 'identical';
  const [lo, hi] = cmp < 0 ? [a, b] : [b, a];
  if (hi.major > lo.major) return 'major bump';
  if (hi.minor > lo.minor) return 'minor bump';
  if (hi.patch > lo.patch) return 'patch bump';
  if (hi.pre !== lo.pre)   return 'pre-release change';
  return 'different';
}

// ── UI ────────────────────────────────────────────────────────────────────────
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function run() {
  const rawA   = document.getElementById('versionA').value.trim();
  const rawB   = document.getElementById('versionB').value.trim();
  const range  = document.getElementById('rangeInput').value.trim();
  const testV  = document.getElementById('testVersion').value.trim();
  const preVal = document.getElementById('preInput').value.trim();

  const vA = rawA ? parseSemver(rawA) : null;
  const vB = rawB ? parseSemver(rawB) : null;

  // --- Bump section ---
  const bumpOut = document.getElementById('bumpOutput');
  if (vA) {
    document.getElementById('versionError').classList.add('hidden');
    const bumps = [
      { type:'major',      label:'major',       desc:`breaking change → ${semverStr(bump(vA,'major'))}` },
      { type:'minor',      label:'minor',       desc:`new feature → ${semverStr(bump(vA,'minor'))}` },
      { type:'patch',      label:'patch',       desc:`bug fix → ${semverStr(bump(vA,'patch'))}` },
      { type:'prerelease', label:'prerelease',  desc:`pre-release → ${semverStr(bump(vA,'prerelease',preVal||'alpha'))}` },
      { type:'release',    label:'release',     desc:`strip pre → ${semverStr({...vA,pre:'',build:''})}` },
    ];
    bumpOut.innerHTML = bumps.map(b => `
      <div class="bump-row" onclick="applyBump('${b.type}')">
        <span class="bump-type">${b.label}</span>
        <span class="bump-result">${escHtml(b.desc)}</span>
      </div>`).join('');
  } else if (rawA) {
    document.getElementById('versionError').textContent = 'Invalid semver — expected: 1.2.3 or v1.2.3-alpha.1';
    document.getElementById('versionError').classList.remove('hidden');
    bumpOut.innerHTML = '';
  } else {
    document.getElementById('versionError').classList.add('hidden');
    bumpOut.innerHTML = `<div class="empty-bump">Enter a version above</div>`;
  }

  // --- Compare section ---
  const cmpOut = document.getElementById('compareOutput');
  if (vA && vB) {
    const cmp = compareSemver(vA, vB);
    const label = cmp > 0 ? '>' : cmp < 0 ? '<' : '=';
    const diff  = diffLabel(vA, vB);
    cmpOut.innerHTML = `
      <div class="cmp-row">
        <span class="cmp-v">${escHtml(semverStr(vA))}</span>
        <span class="cmp-op ${cmp===0?'eq':cmp>0?'gt':'lt'}">${label}</span>
        <span class="cmp-v">${escHtml(semverStr(vB))}</span>
      </div>
      <div class="cmp-diff">${diff}</div>`;
  } else {
    cmpOut.innerHTML = `<div class="empty-bump">Enter both versions to compare</div>`;
  }

  // --- Range test ---
  const rangeOut = document.getElementById('rangeOutput');
  if (range && testV) {
    const tv = parseSemver(testV);
    if (!tv) {
      rangeOut.innerHTML = `<span class="range-invalid">Invalid test version</span>`;
    } else {
      let match;
      try { match = matchesRange(testV, range); } catch(e) { match = null; }
      if (match === null) {
        rangeOut.innerHTML = `<span class="range-invalid">Invalid range expression</span>`;
      } else {
        rangeOut.innerHTML = match
          ? `<span class="range-yes">✓ ${escHtml(testV)} satisfies ${escHtml(range)}</span>`
          : `<span class="range-no">✕ ${escHtml(testV)} does not satisfy ${escHtml(range)}</span>`;
      }
    }
  } else {
    rangeOut.innerHTML = `<span class="range-hint">Enter a range (^1.2.3, ~1.2, >=2.0.0, etc.) and a version to test</span>`;
  }
}

function applyBump(type) {
  const raw = document.getElementById('versionA').value.trim();
  const v   = parseSemver(raw);
  if (!v) return;
  const pre = document.getElementById('preInput').value.trim() || 'alpha';
  const next = bump(v, type, type.startsWith('pre') ? pre : '');
  document.getElementById('versionA').value = semverStr(next);
  run();
}

document.addEventListener('DOMContentLoaded', () => {
  ['versionA','versionB','rangeInput','testVersion','preInput'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', run);
  });
  run();
});
