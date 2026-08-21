'use strict';

const STATUSES = [
  // 1xx
  { code:100, name:'Continue',                       cat:'1xx', desc:'Server received request headers, client should proceed to send body.' },
  { code:101, name:'Switching Protocols',            cat:'1xx', desc:'Server agrees to switch protocols as requested by the client (e.g. WebSocket upgrade).' },
  { code:102, name:'Processing',                     cat:'1xx', desc:'Server has received and is processing the request, but no response is available yet (WebDAV).' },
  { code:103, name:'Early Hints',                    cat:'1xx', desc:'Allows preloading resources while the server prepares a final response. Used with Link headers.' },
  // 2xx
  { code:200, name:'OK',                             cat:'2xx', desc:'Request succeeded. Response body contains the requested resource.' },
  { code:201, name:'Created',                        cat:'2xx', desc:'Request succeeded and a new resource was created. Location header often points to it.' },
  { code:202, name:'Accepted',                       cat:'2xx', desc:'Request accepted for processing, but processing is not complete. Common for async tasks.' },
  { code:203, name:'Non-Authoritative Information',  cat:'2xx', desc:'Response returned by a proxy that has modified the origin server\'s 200 response.' },
  { code:204, name:'No Content',                     cat:'2xx', desc:'Request succeeded but there is no content to return. Common for DELETE and PATCH.' },
  { code:205, name:'Reset Content',                  cat:'2xx', desc:'Server fulfilled the request and asks the client to reset the document view.' },
  { code:206, name:'Partial Content',                cat:'2xx', desc:'Server is delivering part of the resource (range request). Used by byte-range downloads.' },
  { code:207, name:'Multi-Status',                   cat:'2xx', desc:'Multiple status codes for different operations in a single response body (WebDAV).' },
  { code:208, name:'Already Reported',               cat:'2xx', desc:'Members of a DAV binding already enumerated in a 207 response (WebDAV).' },
  { code:226, name:'IM Used',                        cat:'2xx', desc:'Server fulfilled a GET request for the resource with instance manipulations applied.' },
  // 3xx
  { code:300, name:'Multiple Choices',               cat:'3xx', desc:'Multiple possible responses; user or agent should choose one.' },
  { code:301, name:'Moved Permanently',              cat:'3xx', desc:'Resource has been permanently moved. Browsers cache this indefinitely. Use for SEO redirects.' },
  { code:302, name:'Found',                          cat:'3xx', desc:'Resource temporarily at a different URI. Clients should continue using the original URI.' },
  { code:303, name:'See Other',                      cat:'3xx', desc:'Response found at another URI using GET. Common after form POST to prevent re-submission.' },
  { code:304, name:'Not Modified',                   cat:'3xx', desc:'Resource not modified since the version specified in If-Modified-Since or If-None-Match.' },
  { code:305, name:'Use Proxy',                      cat:'3xx', desc:'Deprecated. Was used to indicate the resource must be accessed through a proxy.' },
  { code:307, name:'Temporary Redirect',             cat:'3xx', desc:'Temporary redirect that preserves the HTTP method (unlike 302). Do not cache.' },
  { code:308, name:'Permanent Redirect',             cat:'3xx', desc:'Permanent redirect that preserves the HTTP method (unlike 301). Use over 301 for non-GET.' },
  // 4xx
  { code:400, name:'Bad Request',                    cat:'4xx', desc:'Server cannot process request due to invalid syntax, missing fields, or malformed data.' },
  { code:401, name:'Unauthorized',                   cat:'4xx', desc:'Authentication is required. Misleadingly named — actually means "unauthenticated".' },
  { code:402, name:'Payment Required',               cat:'4xx', desc:'Reserved for future use. Sometimes used by APIs to indicate a paid plan is needed.' },
  { code:403, name:'Forbidden',                      cat:'4xx', desc:'Server understood the request but refuses it. Authentication won\'t help here.' },
  { code:404, name:'Not Found',                      cat:'4xx', desc:'Resource not found. May also be used to hide a 403 to prevent resource enumeration.' },
  { code:405, name:'Method Not Allowed',             cat:'4xx', desc:'HTTP method is not allowed for this endpoint. Allow header lists permitted methods.' },
  { code:406, name:'Not Acceptable',                 cat:'4xx', desc:'Server cannot produce a response matching Accept headers sent by the client.' },
  { code:407, name:'Proxy Authentication Required',  cat:'4xx', desc:'Authentication with the proxy is required before forwarding the request.' },
  { code:408, name:'Request Timeout',                cat:'4xx', desc:'Server timed out waiting for the request. Client may retry.' },
  { code:409, name:'Conflict',                       cat:'4xx', desc:'Request conflicts with the current state of the resource (e.g. edit conflict, duplicate).' },
  { code:410, name:'Gone',                           cat:'4xx', desc:'Resource permanently deleted. Stronger signal than 404 — do not retry.' },
  { code:411, name:'Length Required',                cat:'4xx', desc:'Content-Length header is required but was not provided.' },
  { code:412, name:'Precondition Failed',            cat:'4xx', desc:'Condition in If-Match or If-Unmodified-Since headers evaluated to false.' },
  { code:413, name:'Content Too Large',              cat:'4xx', desc:'Request body exceeds server limits. Retry-After may indicate when to retry.' },
  { code:414, name:'URI Too Long',                   cat:'4xx', desc:'URI is longer than the server is able to process.' },
  { code:415, name:'Unsupported Media Type',         cat:'4xx', desc:'Payload format is not supported. Check Content-Type header.' },
  { code:416, name:'Range Not Satisfiable',          cat:'4xx', desc:'Range specified by Range header cannot be fulfilled.' },
  { code:417, name:'Expectation Failed',             cat:'4xx', desc:'Expectation in Expect header could not be met by the server.' },
  { code:418, name:"I'm a Teapot",                  cat:'4xx', desc:'April Fools RFC 2324. A teapot refuses to brew coffee. Occasionally used as a novelty.' },
  { code:421, name:'Misdirected Request',            cat:'4xx', desc:'Request directed at a server unable to produce a response (wrong server for SNI).' },
  { code:422, name:'Unprocessable Content',          cat:'4xx', desc:'Well-formed request but semantic errors prevent processing. Common in REST validation.' },
  { code:423, name:'Locked',                         cat:'4xx', desc:'Resource is locked (WebDAV).' },
  { code:424, name:'Failed Dependency',              cat:'4xx', desc:'Request failed because a previous request it depended on failed (WebDAV).' },
  { code:425, name:'Too Early',                      cat:'4xx', desc:'Server unwilling to risk processing a request that might be replayed.' },
  { code:426, name:'Upgrade Required',               cat:'4xx', desc:'Client should switch to a different protocol (e.g. TLS/1.0 → TLS/1.3).' },
  { code:428, name:'Precondition Required',          cat:'4xx', desc:'Origin server requires conditional requests (to prevent lost-update problem).' },
  { code:429, name:'Too Many Requests',              cat:'4xx', desc:'Rate limit exceeded. Retry-After header may indicate when to retry.' },
  { code:431, name:'Request Header Fields Too Large',cat:'4xx', desc:'Headers are too large. May apply to the entire header set or one specific header.' },
  { code:451, name:'Unavailable For Legal Reasons',  cat:'4xx', desc:'Resource restricted due to legal reasons (censorship, GDPR takedowns, etc.).' },
  // 5xx
  { code:500, name:'Internal Server Error',          cat:'5xx', desc:'Generic server error. Check server logs for the root cause.' },
  { code:501, name:'Not Implemented',                cat:'5xx', desc:'Server does not recognise or support the request method.' },
  { code:502, name:'Bad Gateway',                    cat:'5xx', desc:'Upstream server returned an invalid response. Common with proxies and load balancers.' },
  { code:503, name:'Service Unavailable',            cat:'5xx', desc:'Server is temporarily down (overloaded or maintenance). Retry-After may be included.' },
  { code:504, name:'Gateway Timeout',                cat:'5xx', desc:'Upstream server failed to respond in time. Common behind proxies/API gateways.' },
  { code:505, name:'HTTP Version Not Supported',     cat:'5xx', desc:'HTTP version used in the request is not supported.' },
  { code:506, name:'Variant Also Negotiates',        cat:'5xx', desc:'Server has a configuration error in content negotiation (circular reference).' },
  { code:507, name:'Insufficient Storage',           cat:'5xx', desc:'Server cannot store the representation needed to complete the request (WebDAV).' },
  { code:508, name:'Loop Detected',                  cat:'5xx', desc:'Infinite loop detected while processing the request (WebDAV).' },
  { code:510, name:'Not Extended',                   cat:'5xx', desc:'Further extensions to the request are required for the server to fulfil it.' },
  { code:511, name:'Network Authentication Required',cat:'5xx', desc:'Client needs to authenticate to gain network access (e.g. captive portal / Wi-Fi login).' },
];

const CAT_META = {
  '1xx': { label:'1xx Informational', color:'var(--muted)' },
  '2xx': { label:'2xx Success',       color:'var(--accent)' },
  '3xx': { label:'3xx Redirection',   color:'#ffd166' },
  '4xx': { label:'4xx Client Error',  color:'#ff6b8a' },
  '5xx': { label:'5xx Server Error',  color:'#c792ea' },
};

let activeCat = 'all';

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function catColor(cat) { return CAT_META[cat]?.color || 'var(--text)'; }

function render() {
  const q   = document.getElementById('searchInput').value.trim().toLowerCase();
  const out = document.getElementById('statusList');

  let list = STATUSES.filter(s => {
    if (activeCat !== 'all' && s.cat !== activeCat) return false;
    if (!q) return true;
    return String(s.code).includes(q) ||
           s.name.toLowerCase().includes(q) ||
           s.desc.toLowerCase().includes(q);
  });

  if (!list.length) {
    out.innerHTML = `<div class="empty-state" style="padding:40px">No matches for "${escHtml(q)}"</div>`;
    document.getElementById('statusText').textContent = '0 results';
    return;
  }

  // Group by cat
  const groups = {};
  list.forEach(s => { (groups[s.cat] = groups[s.cat] || []).push(s); });

  out.innerHTML = Object.entries(groups).map(([cat, items]) => `
    <div class="cat-group">
      <div class="cat-header" style="color:${catColor(cat)}">${CAT_META[cat].label}</div>
      ${items.map(s => `
        <div class="status-row" onclick="showDetail(${s.code})">
          <span class="status-code" style="color:${catColor(s.cat)}">${s.code}</span>
          <span class="status-name">${highlight(escHtml(s.name), q)}</span>
          <span class="status-desc">${highlight(escHtml(s.desc), q)}</span>
        </div>`).join('')}
    </div>`).join('');

  document.getElementById('statusText').textContent = `${list.length} of ${STATUSES.length} status codes`;
}

function highlight(html, q) {
  if (!q) return html;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
  return html.replace(re, '<mark>$1</mark>');
}

function showDetail(code) {
  const s = STATUSES.find(x => x.code === code);
  if (!s) return;
  const detail = document.getElementById('detail');
  detail.innerHTML = `
    <div class="detail-code" style="color:${catColor(s.cat)}">${s.code}</div>
    <div class="detail-name">${escHtml(s.name)}</div>
    <div class="detail-cat" style="color:${catColor(s.cat)}">${s.cat} — ${CAT_META[s.cat].label}</div>
    <div class="detail-desc">${escHtml(s.desc)}</div>
    <div class="detail-snippet">
      <div class="snip-label">curl example</div>
      <div class="snip-code">curl -sI https://httpstat.us/${s.code}</div>
    </div>
    <div class="detail-snippet">
      <div class="snip-label">fetch / check</div>
      <div class="snip-code">if (res.status === ${s.code}) { ... }</div>
    </div>
  `;
}

function setFilter(cat) {
  activeCat = cat;
  document.querySelectorAll('.cat-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.cat === cat));
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchInput').addEventListener('input', render);
  render();
  // pre-select 200
  showDetail(200);
});
