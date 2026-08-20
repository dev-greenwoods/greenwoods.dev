'use strict';

// ── IP ↔ number ───────────────────────────────────────────────────────────────
function ipToNum(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}
function numToIp(n) {
  return [24,16,8,0].map(s => (n >>> s) & 0xFF).join('.');
}
function numToBin(n) {
  return (n >>> 0).toString(2).padStart(32, '0');
}
function binGroups(bin) {
  return [0,8,16,24].map(i => bin.slice(i, i + 8)).join('.');
}

// ── Parse CIDR ────────────────────────────────────────────────────────────────
function parseCIDR(cidr) {
  const m = cidr.trim().match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?:\/(\d{1,2}))?$/);
  if (!m) return null;
  const ip = m[1];
  const prefix = m[2] !== undefined ? parseInt(m[2], 10) : 32;
  if (prefix < 0 || prefix > 32) return null;
  const octs = ip.split('.').map(Number);
  if (octs.some(o => o < 0 || o > 255)) return null;
  return { ip, prefix };
}

// ── Subnet class ──────────────────────────────────────────────────────────────
function classify(prefix) {
  if (prefix <= 8)  return 'Class A';
  if (prefix <= 16) return 'Class B';
  if (prefix <= 24) return 'Class C';
  return 'Host / VLSM';
}

function ipClass(ip) {
  const first = parseInt(ip.split('.')[0], 10);
  if (first < 128) return 'A';
  if (first < 192) return 'B';
  if (first < 224) return 'C';
  if (first < 240) return 'D (Multicast)';
  return 'E (Reserved)';
}

function isPrivate(ipNum) {
  const ranges = [
    [ipToNum('10.0.0.0'),     ipToNum('10.255.255.255')],
    [ipToNum('172.16.0.0'),   ipToNum('172.31.255.255')],
    [ipToNum('192.168.0.0'),  ipToNum('192.168.255.255')],
    [ipToNum('127.0.0.0'),    ipToNum('127.255.255.255')],
    [ipToNum('169.254.0.0'),  ipToNum('169.254.255.255')],
  ];
  return ranges.some(([lo, hi]) => ipNum >= lo && ipNum <= hi);
}

// ── Main calculate ────────────────────────────────────────────────────────────
function calculate() {
  const raw   = document.getElementById('cidrInput').value.trim();
  const errEl = document.getElementById('inputError');
  const out   = document.getElementById('output');
  const status= document.getElementById('statusText');

  errEl.classList.add('hidden');
  if (!raw) {
    out.innerHTML = emptyState();
    status.textContent = 'Enter an IP or CIDR address above.';
    return;
  }

  const parsed = parseCIDR(raw);
  if (!parsed) {
    errEl.textContent = 'Invalid IP or CIDR — expected format: 192.168.1.0/24';
    errEl.classList.remove('hidden');
    out.innerHTML = emptyState();
    status.textContent = 'Check the format and try again.';
    return;
  }

  const { ip, prefix } = parsed;
  const ipNum     = ipToNum(ip);
  const maskNum   = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  const wildNum   = (~maskNum) >>> 0;
  const netNum    = (ipNum & maskNum) >>> 0;
  const bcastNum  = (netNum | wildNum) >>> 0;
  const firstHost = prefix < 31 ? netNum + 1 : netNum;
  const lastHost  = prefix < 31 ? bcastNum - 1 : bcastNum;
  const totalHosts= prefix >= 32 ? 1 : prefix === 31 ? 2 : Math.pow(2, 32 - prefix) - 2;
  const usable    = Math.max(0, totalHosts);

  const netBin    = numToBin(netNum);
  const maskBin   = numToBin(maskNum);
  const ipBin     = numToBin(ipNum);

  const priv = isPrivate(netNum);

  out.innerHTML = `
    <div class="result-grid">

      <div class="res-section">
        <div class="res-label">addresses</div>
        <div class="res-table">
          ${row('IP Address',        ip,               ipBin)}
          ${row('Network Address',   numToIp(netNum),  numToBin(netNum),  'accent')}
          ${row('Broadcast',         numToIp(bcastNum),numToBin(bcastNum),'muted')}
          ${row('First Usable Host', numToIp(firstHost))}
          ${row('Last Usable Host',  numToIp(lastHost))}
          ${row('Subnet Mask',       numToIp(maskNum), maskBin)}
          ${row('Wildcard Mask',     numToIp(wildNum))}
        </div>
      </div>

      <div class="res-section">
        <div class="res-label">capacity</div>
        <div class="res-table">
          ${row('Prefix Length',    '/' + prefix)}
          ${row('Total IPs',        (Math.pow(2, 32 - prefix)).toLocaleString())}
          ${row('Usable Hosts',     usable.toLocaleString(),      null, 'accent')}
          ${row('IP Class',         ipClass(ip))}
          ${row('Subnet Class',     classify(prefix))}
          ${row('Scope',            priv ? 'Private (RFC1918)' : 'Public', null, priv ? 'muted' : '')}
        </div>
      </div>

    </div>

    <div class="binary-section">
      <div class="res-label">binary breakdown</div>
      <div class="binary-grid">
        ${binRow('IP Address',   ipBin,   prefix)}
        ${binRow('Subnet Mask',  maskBin, prefix, true)}
        ${binRow('Network',      numToBin(netNum),  prefix)}
      </div>
    </div>

    ${renderSubnetList(netNum, prefix)}
  `;

  status.textContent = `${numToIp(netNum)}/${prefix} · ${usable.toLocaleString()} usable hosts · ${priv ? 'private' : 'public'} range`;
}

function row(label, value, bin, colorClass) {
  const valCls = colorClass === 'accent' ? 'val-accent' : colorClass === 'muted' ? 'val-muted' : '';
  const binHtml = bin ? `<span class="row-bin">${escHtml(bin)}</span>` : '';
  return `<div class="res-row">
    <span class="res-key">${label}</span>
    <span class="res-val ${valCls}">${escHtml(String(value))}${binHtml}</span>
  </div>`;
}

function binRow(label, bin, prefix, isMask) {
  const net  = bin.slice(0, prefix);
  const host = bin.slice(prefix);
  const grouped = (str, cls) => str ? `<span class="${cls}">${str.split('').join('')}</span>` : '';

  let display;
  if (isMask) {
    display = `<span class="bin-net">${'1'.repeat(prefix)}</span><span class="bin-host">${'0'.repeat(32 - prefix)}</span>`;
  } else {
    display = `<span class="bin-net">${net}</span><span class="bin-host">${host}</span>`;
  }

  // Dot-separated
  const full = isMask
    ? binGroups(bin)
    : binGroups(bin);

  return `<div class="bin-row">
    <span class="bin-label">${label}</span>
    <div class="bin-display">${display}</div>
    <span class="bin-legend"><span class="bin-net-leg">■ network</span> <span class="bin-host-leg">■ host</span></span>
  </div>`;
}

function renderSubnetList(netNum, prefix) {
  if (prefix > 28 || prefix < 8) return '';
  // Show up to 8 subnets when split by /+1
  const subPrefix = prefix + 1;
  const subSize   = Math.pow(2, 32 - subPrefix);
  const count     = Math.min(8, Math.pow(2, subPrefix - prefix));

  let rows = '';
  for (let i = 0; i < count; i++) {
    const sNet   = (netNum + i * subSize) >>> 0;
    const sBcast = (sNet + subSize - 1) >>> 0;
    rows += `<div class="sub-row">
      <span class="sub-net">${numToIp(sNet)}/${subPrefix}</span>
      <span class="sub-range">${numToIp(sNet + 1)} – ${numToIp(sBcast - 1)}</span>
      <span class="sub-hosts">${(subSize - 2).toLocaleString()} hosts</span>
    </div>`;
  }

  return `<div class="res-section subnet-section">
    <div class="res-label">subnets if split into /${subPrefix}${count < Math.pow(2, 1) ? '' : ` (showing ${count})`}</div>
    <div class="subnet-list">${rows}</div>
  </div>`;
}

function emptyState() {
  return `<div class="empty-state"><div class="empty-icon" style="font-size:2rem;opacity:0.2">⧸</div><div>Enter a CIDR address to calculate</div></div>`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Samples ───────────────────────────────────────────────────────────────────
const SAMPLES = ['192.168.1.0/24','10.0.0.0/8','172.16.0.0/12','192.168.100.128/25','10.10.10.0/30'];
let sIdx = 0;
function loadSample() {
  document.getElementById('cidrInput').value = SAMPLES[sIdx++ % SAMPLES.length];
  calculate();
}

function clearAll() {
  document.getElementById('cidrInput').value = '';
  document.getElementById('inputError').classList.add('hidden');
  document.getElementById('output').innerHTML = emptyState();
  document.getElementById('statusText').textContent = 'Enter an IP or CIDR address above.';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cidrInput').addEventListener('input', calculate);
  document.getElementById('cidrInput').addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });
});
