let tsUnit = 's';
let dateTz = 'utc';

// Live clock
function updateClock() {
  const now = new Date();
  document.getElementById('liveClock').textContent =
    'now: ' + Math.floor(now.getTime() / 1000);
}
setInterval(updateClock, 1000);
updateClock();

function setTsUnit(unit) {
  tsUnit = unit;
  document.getElementById('tabSeconds').classList.toggle('active', unit === 's');
  document.getElementById('tabMs').classList.toggle('active', unit === 'ms');
  convertTs();
}

function setDateTz(tz) {
  dateTz = tz;
  document.getElementById('tabUtcDate').classList.toggle('active', tz === 'utc');
  document.getElementById('tabLocalDate').classList.toggle('active', tz === 'local');
  convertDate();
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function relativeTime(ms) {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const future = diff > 0;
  if (abs < 5000) return 'just now';
  if (abs < 60000) return `${Math.round(abs / 1000)}s ${future ? 'from now' : 'ago'}`;
  if (abs < 3600000) return `${Math.round(abs / 60000)}m ${future ? 'from now' : 'ago'}`;
  if (abs < 86400000) return `${Math.round(abs / 3600000)}h ${future ? 'from now' : 'ago'}`;
  if (abs < 2592000000) return `${Math.round(abs / 86400000)}d ${future ? 'from now' : 'ago'}`;
  if (abs < 31536000000) return `${Math.round(abs / 2592000000)}mo ${future ? 'from now' : 'ago'}`;
  return `${Math.round(abs / 31536000000)}yr ${future ? 'from now' : 'ago'}`;
}

function convertTs() {
  const raw = document.getElementById('tsInput').value.trim();
  const out = document.getElementById('tsOutput');
  const err = document.getElementById('tsError');

  out.classList.add('hidden');
  err.classList.add('hidden');

  if (!raw) return;

  const num = parseFloat(raw);
  if (isNaN(num)) {
    err.textContent = 'Not a valid number.';
    err.classList.remove('hidden');
    return;
  }

  const ms = tsUnit === 's' ? num * 1000 : num;
  const d = new Date(ms);

  if (isNaN(d.getTime())) {
    err.textContent = 'Timestamp out of valid range.';
    err.classList.remove('hidden');
    return;
  }

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  document.getElementById('outUtc').textContent = d.toUTCString();
  document.getElementById('outLocal').textContent = d.toLocaleString();
  document.getElementById('outIso').textContent = d.toISOString();
  document.getElementById('outRfc').textContent = d.toUTCString();
  document.getElementById('outRelative').textContent = relativeTime(ms);
  document.getElementById('outDay').textContent = days[d.getUTCDay()];
  document.getElementById('outWeek').textContent = getWeekNumber(d) + ' of ' + d.getUTCFullYear();

  out.classList.remove('hidden');
}

function convertDate() {
  const raw = document.getElementById('dateInput').value;
  const out = document.getElementById('dateOutput');
  const err = document.getElementById('dateError');

  out.classList.add('hidden');
  err.classList.add('hidden');

  if (!raw) return;

  let d;
  if (dateTz === 'utc') {
    d = new Date(raw + ':00Z');
  } else {
    d = new Date(raw);
  }

  if (isNaN(d.getTime())) {
    err.textContent = 'Could not parse that date.';
    err.classList.remove('hidden');
    return;
  }

  const s = Math.floor(d.getTime() / 1000);
  document.getElementById('outDateS').textContent = s;
  document.getElementById('outDateMs').textContent = d.getTime();
  document.getElementById('outDateIso').textContent = d.toISOString();
  document.getElementById('outDateUtc').textContent = d.toUTCString();

  out.classList.remove('hidden');
}

function quickParse() {
  const raw = document.getElementById('quickInput').value.trim();
  const out = document.getElementById('quickOutput');

  out.classList.add('hidden');
  if (!raw) return;

  const d = new Date(raw);
  if (isNaN(d.getTime())) return;

  document.getElementById('outQuickTs').textContent = Math.floor(d.getTime() / 1000);
  document.getElementById('outQuickUtc').textContent = d.toUTCString();
  out.classList.remove('hidden');
}

function useNowTs() {
  const now = tsUnit === 's'
    ? Math.floor(Date.now() / 1000).toString()
    : Date.now().toString();
  document.getElementById('tsInput').value = now;
  convertTs();
}

function useNowDate() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const local = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  document.getElementById('dateInput').value = local;
  convertDate();
}

function clearTs() {
  document.getElementById('tsInput').value = '';
  document.getElementById('tsOutput').classList.add('hidden');
  document.getElementById('tsError').classList.add('hidden');
}

function clearDate() {
  document.getElementById('dateInput').value = '';
  document.getElementById('dateOutput').classList.add('hidden');
  document.getElementById('dateError').classList.add('hidden');
  document.getElementById('quickInput').value = '';
  document.getElementById('quickOutput').classList.add('hidden');
}

function copyVal(id) {
  const text = document.getElementById(id).textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'copied!';
    setTimeout(() => { btn.textContent = 'copy'; }, 1400);
  });
}
