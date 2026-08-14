function expandRange(part, min, max, names) {
  if (part === '*') return null; // means "all"
  const values = new Set();

  part.split(',').forEach(seg => {
    let step = 1;
    if (seg.includes('/')) {
      const [range, s] = seg.split('/');
      step = parseInt(s);
      seg = range;
    }
    let lo = min, hi = max;
    if (seg !== '*') {
      const dash = seg.indexOf('-');
      if (dash > 0) {
        lo = parsePart(seg.slice(0, dash), names, min);
        hi = parsePart(seg.slice(dash + 1), names, min);
      } else {
        lo = hi = parsePart(seg, names, min);
      }
    }
    for (let i = lo; i <= hi; i += step) values.add(i);
  });
  return [...values].sort((a, b) => a - b);
}

function parsePart(s, names, offset) {
  if (names) {
    const idx = names.findIndex(n => n.toLowerCase() === s.toLowerCase());
    if (idx >= 0) return idx + offset;
  }
  return parseInt(s);
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseCronExpr(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) throw new Error('Expected 5 or 6 fields');

  const [min, hr, dom, mon, dow] = parts;
  return {
    minute:  expandRange(min, 0, 59),
    hour:    expandRange(hr,  0, 23),
    dom:     expandRange(dom, 1, 31),
    month:   expandRange(mon, 1, 12, MONTHS),
    dow:     expandRange(dow, 0,  7, DAYS),
  };
}

function nextRuns(expr, count = 10) {
  const fields = parseCronExpr(expr);
  const results = [];
  let d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);

  const matches = (val, set) => !set || set.includes(val);

  for (let iter = 0; results.length < count && iter < 500000; iter++) {
    const mo = d.getMonth() + 1;
    const dom = d.getDate();
    const dow = d.getDay();
    const hr  = d.getHours();
    const min = d.getMinutes();

    if (!matches(mo, fields.month)) {
      d.setMonth(d.getMonth() + 1);
      d.setDate(1); d.setHours(0); d.setMinutes(0);
      continue;
    }

    // dow matching: 7 = Sunday alias
    const dowOk = !fields.dow || fields.dow.some(v => v === dow || (v === 7 && dow === 0));
    if (!matches(dom, fields.dom) || !dowOk) {
      d.setDate(d.getDate() + 1); d.setHours(0); d.setMinutes(0);
      continue;
    }

    if (!matches(hr, fields.hour)) {
      d.setHours(d.getHours() + 1); d.setMinutes(0);
      continue;
    }

    if (!matches(min, fields.minute)) {
      d.setMinutes(d.getMinutes() + 1);
      continue;
    }

    results.push(new Date(d));
    d.setMinutes(d.getMinutes() + 1);
  }
  return results;
}

function toHuman(expr) {
  const parts = expr.trim().split(/\s+/);
  const [min, hr, dom, mon, dow] = parts;

  if (expr === '* * * * *') return 'Every minute';
  if (expr === '0 * * * *') return 'Every hour, on the hour';
  if (expr === '0 0 * * *') return 'Every day at midnight (00:00)';
  if (expr === '0 0 * * 0') return 'Every Sunday at midnight';
  if (expr === '0 0 1 * *') return 'First day of every month at midnight';
  if (expr === '0 0 1 1 *') return 'January 1st at midnight (yearly)';

  let desc = 'Runs ';

  // Minute
  if (min.startsWith('*/')) desc += `every ${min.slice(2)} minute${min.slice(2) !== '1' ? 's' : ''}`;
  else if (min === '*') desc += 'every minute';
  else desc += `at minute ${min}`;

  // Hour
  if (hr === '*') { /* every hour, already covered */ }
  else if (hr.startsWith('*/')) desc += `, every ${hr.slice(2)} hours`;
  else desc += `, hour ${hr}`;

  // DOM
  if (dom !== '*') {
    if (dom.startsWith('*/')) desc += `, every ${dom.slice(2)} days`;
    else desc += `, on day ${dom} of the month`;
  }

  // Month
  if (mon !== '*') {
    const mNames = mon.split(',').map(m => MONTHS[(parseInt(m) || 1) - 1] || m);
    desc += `, in ${mNames.join(' and ')}`;
  }

  // DOW
  if (dow !== '*') {
    const dNames = dow.split(',').map(d => {
      const n = parseInt(d);
      return isNaN(n) ? d : (DAYS[n % 7] || d);
    });
    if (dow === '1-5') desc += ', on weekdays (Mon–Fri)';
    else if (dow === '6,0' || dow === '0,6') desc += ', on weekends';
    else desc += `, on ${dNames.join(' and ')}`;
  }

  return desc;
}

function relativeTime(d) {
  const diff = d - Date.now();
  const s = Math.round(diff / 1000);
  if (s < 60) return 'in ' + s + 's';
  if (s < 3600) return 'in ' + Math.round(s / 60) + 'm';
  if (s < 86400) return 'in ' + Math.round(s / 3600) + 'h';
  return 'in ' + Math.round(s / 86400) + 'd';
}

function parseCron() {
  const expr = document.getElementById('cronInput').value.trim();
  const errEl = document.getElementById('cronError');
  const human = document.getElementById('humanReadable');
  const runs   = document.getElementById('nextRuns');

  errEl.classList.add('hidden');
  human.classList.add('hidden');

  if (!expr) {
    runs.innerHTML = `<div class="empty-state"><div class="empty-icon">⏰</div><div>Enter a cron expression</div></div>`;
    return;
  }

  try {
    const next = nextRuns(expr);
    human.textContent = toHuman(expr);
    human.classList.remove('hidden');

    runs.innerHTML = next.map((d, i) =>
      `<div class="run-item">
        <span class="run-num">#${i + 1}</span>
        <span class="run-ts">${d.toLocaleString()}</span>
        <span class="run-rel">${relativeTime(d)}</span>
      </div>`
    ).join('');
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
    runs.innerHTML = `<div class="empty-state"><div class="empty-icon">⏰</div><div>Fix the expression above</div></div>`;
  }
}

function setPreset(expr) {
  document.getElementById('cronInput').value = expr;
  parseCron();
}

function clearAll() {
  document.getElementById('cronInput').value = '';
  document.getElementById('cronError').classList.add('hidden');
  document.getElementById('humanReadable').classList.add('hidden');
  document.getElementById('nextRuns').innerHTML = `<div class="empty-state"><div class="empty-icon">⏰</div><div>Enter a cron expression</div></div>`;
}
