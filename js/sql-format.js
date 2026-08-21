'use strict';

// ── Keyword sets ──────────────────────────────────────────────────────────────
const KW_MAJOR = new Set([
  'SELECT','FROM','WHERE','JOIN','LEFT JOIN','RIGHT JOIN','INNER JOIN',
  'FULL JOIN','FULL OUTER JOIN','CROSS JOIN','ON','GROUP BY','ORDER BY',
  'HAVING','LIMIT','OFFSET','UNION','UNION ALL','INTERSECT','EXCEPT',
  'INSERT INTO','INSERT','VALUES','UPDATE','SET','DELETE FROM','DELETE',
  'CREATE TABLE','CREATE INDEX','CREATE VIEW','CREATE OR REPLACE VIEW',
  'ALTER TABLE','DROP TABLE','DROP INDEX','TRUNCATE','TRUNCATE TABLE',
  'WITH','RETURNING',
]);

const KW_MINOR = new Set([
  'AND','OR','NOT','IN','NOT IN','EXISTS','NOT EXISTS','LIKE','NOT LIKE',
  'ILIKE','BETWEEN','IS NULL','IS NOT NULL','AS','DISTINCT','ALL','ANY',
  'SOME','CASE','WHEN','THEN','ELSE','END','OVER','PARTITION BY',
  'ASC','DESC','NULLS FIRST','NULLS LAST','USING','NATURAL',
]);

const KW_FUNC = new Set([
  'COUNT','SUM','AVG','MIN','MAX','COALESCE','NULLIF','CAST','CONVERT',
  'NOW','CURRENT_TIMESTAMP','CURRENT_DATE','DATE','DATEADD','DATEDIFF',
  'SUBSTR','SUBSTRING','LENGTH','UPPER','LOWER','TRIM','LTRIM','RTRIM',
  'REPLACE','CONCAT','CONCAT_WS','CHAR_LENGTH','POSITION','EXTRACT',
  'TO_CHAR','TO_DATE','TO_NUMBER','ROUND','FLOOR','CEIL','ABS','MOD',
  'ROW_NUMBER','RANK','DENSE_RANK','LAG','LEAD','FIRST_VALUE','LAST_VALUE',
  'NTH_VALUE','NTILE','PERCENT_RANK','CUME_DIST','GENERATE_SERIES',
  'ARRAY_AGG','STRING_AGG','JSON_AGG','JSONB_AGG','JSON_BUILD_OBJECT',
]);

// ── Tokeniser ─────────────────────────────────────────────────────────────────
function tokenize(sql) {
  const tokens = [];
  let i = 0;
  while (i < sql.length) {
    // Whitespace
    if (/\s/.test(sql[i])) { i++; continue; }

    // Line comment --
    if (sql[i] === '-' && sql[i+1] === '-') {
      let j = i;
      while (j < sql.length && sql[j] !== '\n') j++;
      tokens.push({ type: 'comment', val: sql.slice(i, j) });
      i = j; continue;
    }

    // Block comment /* */
    if (sql[i] === '/' && sql[i+1] === '*') {
      let j = i + 2;
      while (j < sql.length && !(sql[j] === '*' && sql[j+1] === '/')) j++;
      tokens.push({ type: 'comment', val: sql.slice(i, j + 2) });
      i = j + 2; continue;
    }

    // String literals ' or "
    if (sql[i] === "'" || sql[i] === '"') {
      const q = sql[i]; let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === q && sql[j-1] !== '\\') { j++; break; }
        j++;
      }
      tokens.push({ type: 'string', val: sql.slice(i, j) });
      i = j; continue;
    }

    // Backtick identifier
    if (sql[i] === '`') {
      let j = i + 1;
      while (j < sql.length && sql[j] !== '`') j++;
      tokens.push({ type: 'identifier', val: sql.slice(i, j + 1) });
      i = j + 1; continue;
    }

    // Numbers
    if (/\d/.test(sql[i]) || (sql[i] === '.' && /\d/.test(sql[i+1]))) {
      let j = i;
      while (j < sql.length && /[\d.eE+\-]/.test(sql[j])) j++;
      tokens.push({ type: 'number', val: sql.slice(i, j) });
      i = j; continue;
    }

    // Punctuation
    if (/[(),;*]/.test(sql[i])) {
      tokens.push({ type: 'punct', val: sql[i] });
      i++; continue;
    }

    // Operators
    if (/[=<>!+\-|&~^%]/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /[=<>!+\-|&~^%]/.test(sql[j])) j++;
      tokens.push({ type: 'op', val: sql.slice(i, j) });
      i = j; continue;
    }

    // Word (keyword or identifier)
    if (/[a-zA-Z_$@#]/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /[\w$#@]/.test(sql[j])) j++;
      tokens.push({ type: 'word', val: sql.slice(i, j) });
      i = j; continue;
    }

    // Dot
    if (sql[i] === '.') { tokens.push({ type: 'op', val: '.' }); i++; continue; }

    // Fallback
    tokens.push({ type: 'other', val: sql[i] });
    i++;
  }
  return tokens;
}

// ── Merge multi-word keywords ─────────────────────────────────────────────────
function mergeKeywords(tokens) {
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].type === 'word') {
      // Try longest match first (up to 4 words)
      let matched = false;
      for (let len = 4; len >= 2; len--) {
        const words = tokens.slice(i, i + len);
        if (words.length < len) continue;
        const phrase = words.map(t => t.val.toUpperCase()).join(' ');
        if (KW_MAJOR.has(phrase) || KW_MINOR.has(phrase)) {
          out.push({ type: 'keyword', val: phrase, major: KW_MAJOR.has(phrase) });
          i += len; matched = true; break;
        }
      }
      if (!matched) {
        const up = tokens[i].val.toUpperCase();
        if (KW_MAJOR.has(up)) {
          out.push({ type: 'keyword', val: up, major: true });
        } else if (KW_MINOR.has(up)) {
          out.push({ type: 'keyword', val: up, major: false });
        } else if (KW_FUNC.has(up)) {
          out.push({ type: 'func', val: up });
        } else {
          out.push(tokens[i]);
        }
        i++;
      }
    } else {
      out.push(tokens[i]);
      i++;
    }
  }
  return out;
}

// ── Formatter ─────────────────────────────────────────────────────────────────
function format(sql, opts = {}) {
  const { indent = 2, upper = true, newlineCommas = false } = opts;
  const pad = ' '.repeat(indent);
  const tokens = mergeKeywords(tokenize(sql));

  let out   = '';
  let depth = 0;   // parenthesis depth
  let col   = 0;   // rough column tracker

  const nl = (d = depth) => { out += '\n' + pad.repeat(d); col = pad.length * d; };
  const add = (s) => { out += s; col += s.length; };

  const needsSpaceBefore = (prev, cur) => {
    if (!prev) return false;
    if (prev.type === 'punct' && prev.val === '(') return false;
    if (cur.type === 'punct' && (cur.val === ',' || cur.val === ')' || cur.val === ';')) return false;
    if (cur.type === 'op' && cur.val === '.') return false;
    if (prev.type === 'op' && prev.val === '.') return false;
    if (cur.type === 'func') return true;
    if (cur.type === 'punct' && cur.val === '(') return false;
    return true;
  };

  let prev = null;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const next = tokens[i + 1] || null;

    if (tok.type === 'comment') {
      if (out.length) nl();
      add(tok.val);
      nl();
      prev = tok;
      continue;
    }

    if (tok.type === 'keyword' && tok.major) {
      if (out.trim().length) nl(depth);
      if (depth > 0) add(pad);
      add(upper ? tok.val : tok.val.toLowerCase());
      add(' ');
      col += tok.val.length + 1;
      prev = tok;
      continue;
    }

    if (tok.type === 'keyword') {
      if (tok.val === 'AND' || tok.val === 'OR') {
        nl(depth + 1);
        add((upper ? tok.val : tok.val.toLowerCase()) + ' ');
        prev = tok;
        continue;
      }
      if (needsSpaceBefore(prev, tok)) add(' ');
      add(upper ? tok.val : tok.val.toLowerCase());
      prev = tok;
      continue;
    }

    if (tok.type === 'punct') {
      if (tok.val === '(') {
        add('(');
        depth++;
        prev = tok;
        continue;
      }
      if (tok.val === ')') {
        depth = Math.max(0, depth - 1);
        add(')');
        prev = tok;
        continue;
      }
      if (tok.val === ',') {
        if (newlineCommas && depth <= 1) {
          add(',');
          nl(depth + 1);
        } else {
          add(', ');
        }
        prev = tok;
        continue;
      }
      if (tok.val === ';') {
        add(';');
        if (next) { out += '\n\n'; col = 0; }
        prev = tok;
        continue;
      }
    }

    if (needsSpaceBefore(prev, tok)) add(' ');

    const display = tok.type === 'func'
      ? (upper ? tok.val : tok.val.toLowerCase())
      : tok.val;
    add(display);
    prev = tok;
  }

  return out.trim();
}

// ── Syntax highlight ──────────────────────────────────────────────────────────
function highlight(sql) {
  const tokens = mergeKeywords(tokenize(sql));
  return tokens.map(t => {
    const v = escHtml(t.val);
    switch(t.type) {
      case 'keyword': return t.major
        ? `<span class="sql-major">${v}</span>`
        : `<span class="sql-minor">${v}</span>`;
      case 'func':    return `<span class="sql-func">${v}</span>`;
      case 'string':  return `<span class="sql-str">${v}</span>`;
      case 'number':  return `<span class="sql-num">${v}</span>`;
      case 'comment': return `<span class="sql-comment">${v}</span>`;
      case 'op':      return `<span class="sql-op">${v}</span>`;
      default:        return v;
    }
  }).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Main ──────────────────────────────────────────────────────────────────────
function run() {
  const raw    = document.getElementById('sqlInput').value;
  const output = document.getElementById('sqlOutput');
  const status = document.getElementById('statusText');

  if (!raw.trim()) {
    output.innerHTML = `<div class="empty-state"><div class="empty-icon" style="opacity:.2;font-size:1rem">SQL</div><div>Paste SQL above to format</div></div>`;
    status.textContent = 'Paste SQL to format and highlight.';
    currentFormatted = '';
    return;
  }

  const indent = parseInt(document.getElementById('indentSize').value) || 2;
  const upper  = document.getElementById('chkUpper').checked;
  const commas = document.getElementById('chkCommas').checked;

  let formatted;
  try {
    formatted = format(raw, { indent, upper, newlineCommas: commas });
  } catch(e) {
    formatted = raw; // fallback: show original
  }

  currentFormatted = formatted;
  output.innerHTML = `<pre class="sql-pre">${highlight(formatted)}</pre>`;

  const stmts = (formatted.match(/;/g) || []).length || 1;
  const lines  = formatted.split('\n').length;
  status.textContent = `${stmts} statement${stmts !== 1 ? 's' : ''} · ${lines} lines`;
}

let currentFormatted = '';

function copyOutput() {
  if (!currentFormatted) return;
  const btn = document.getElementById('copyBtn');
  navigator.clipboard.writeText(currentFormatted).then(() => {
    btn.textContent = 'copied!'; btn.classList.add('active');
    setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('active'); }, 1500);
  });
}

// ── Samples ───────────────────────────────────────────────────────────────────
const SAMPLES = [
`select u.id, u.name, u.email, count(o.id) as order_count, sum(o.total) as total_spent from users u left join orders o on u.id = o.user_id where u.created_at > '2024-01-01' and u.active = true group by u.id, u.name, u.email having count(o.id) > 0 order by total_spent desc limit 50;`,

`WITH ranked AS (SELECT product_id, category_id, price, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC) AS rn FROM products WHERE active = true) SELECT p.name, p.price, c.name AS category FROM ranked r JOIN products p ON r.product_id = p.id JOIN categories c ON r.category_id = c.id WHERE r.rn <= 3 ORDER BY c.name, r.rn;`,

`INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at) SELECT id, 'price_update', 'product', product_id, old_price::text, new_price::text, NOW() FROM price_changes WHERE applied = false AND scheduled_at <= NOW();`,
];

let sIdx = 0;
function loadSample() {
  document.getElementById('sqlInput').value = SAMPLES[sIdx++ % SAMPLES.length];
  run();
}

function clearAll() {
  document.getElementById('sqlInput').value = '';
  currentFormatted = '';
  run();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sqlInput').addEventListener('input', run);
  document.getElementById('indentSize').addEventListener('change', run);
  document.getElementById('chkUpper').addEventListener('change', run);
  document.getElementById('chkCommas').addEventListener('change', run);
});
