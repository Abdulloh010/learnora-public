/**
 * Learnora JS Unit Tests
 * Zero-dependency; runs in browser via tests/runner.html or in Node.js.
 *
 * Each test calls assert(description, actual, expected).
 * Results are returned as an array for the runner to display.
 */

/* ── Inline copies of the functions under test ──────────────── */
/* (Avoids needing a module bundler — these are verbatim copies
   kept in sync with learnora-app.js.) */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseUtc(str) {
  if (!str) return new Date();
  const iso = str.replace(' ', 'T');
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z');
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + (dateStr.includes('Z') ? '' : 'Z');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return dateStr;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return sameYear
    ? (d.getMonth()+1) + '/' + d.getDate()
    : (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
}

function msgTime(dateStr) {
  if (!dateStr) return '';
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + (dateStr.includes('Z') ? '' : 'Z');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  if (d.toDateString() === today.toDateString()) return hh + ':' + mm;
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday ' + hh + ':' + mm;
  return (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear() + ' ' + hh + ':' + mm;
}

function normalizePost(p) {
  return {
    id: parseInt(p.id),
    _real: true,
    author: {
      id: parseInt(p.user_id),
      name: ((p.first_name || '') + ' ' + (p.last_name || '')).trim() || p.username,
      username: p.username,
      grade: p.user_grade,
      subject: p.subject,
      xp: parseInt(p.xp) || 0,
      avatar_url: p.avatar_url || null,
    },
    subject: p.subject || '',
    post_type: p.post_type || 'general',
    grade_range: p.grade_range || '',
    title: p.title || '',
    body: p.content || '',
    votes: (parseInt(p.upvotes) || 0) - (parseInt(p.downvotes) || 0),
    userVote: p.voted === 'up' ? 1 : p.voted === 'down' ? -1 : null,
    comments: parseInt(p.comment_count) || 0,
    created_at: p.created_at || '',
    time: timeAgo(p.created_at),
    saved: !!p.saved,
    fileUrl:  p.file_url  || null,
    fileMime: p.file_mime || null,
    fileName: p.file_name || null,
  };
}

const POST_MAX_CHARS = 5000;

/* ── Test runner helpers ────────────────────────────────────── */
const results = [];
let _suite = '';

function suite(name) { _suite = name; }

function assert(desc, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ suite: _suite, desc, pass, actual, expected });
}

function assertTruthy(desc, actual) {
  const pass = !!actual;
  results.push({ suite: _suite, desc, pass, actual, expected: '(truthy)' });
}

function assertContains(desc, haystack, needle) {
  const pass = typeof haystack === 'string' && haystack.includes(needle);
  results.push({ suite: _suite, desc, pass, actual: haystack, expected: `contains "${needle}"` });
}

/* ── Tests: esc() ───────────────────────────────────────────── */
suite('esc()');

assert('escapes < and >',                esc('<script>'),        '&lt;script&gt;');
assert('escapes ampersand',              esc('a & b'),           'a &amp; b');
assert('escapes double quotes',          esc('"hello"'),         '&quot;hello&quot;');
assert('escapes single quotes',          esc("it's"),            'it&#39;s');
assert('null becomes empty string',      esc(null),              '');
assert('undefined becomes empty string', esc(undefined),         '');
assert('numbers pass through as string', esc(42),                '42');
assert('plain text unchanged',           esc('Hello World'),     'Hello World');
assert('nested tags escaped',            esc('<b>bold</b>'),     '&lt;b&gt;bold&lt;/b&gt;');
assert('XSS payload escaped',
  esc('<img src=x onerror=alert(1)>'),
  '&lt;img src=x onerror=alert(1)&gt;');

/* ── Tests: parseUtc() ──────────────────────────────────────── */
suite('parseUtc()');

assert('parses MySQL datetime string as UTC',
  parseUtc('2024-01-15 10:30:00').toISOString(),
  '2024-01-15T10:30:00.000Z');
assert('parses already-ISO string',
  parseUtc('2024-01-15T10:30:00Z').toISOString(),
  '2024-01-15T10:30:00.000Z');
assertTruthy('returns a Date for null input', parseUtc(null) instanceof Date);
assertTruthy('returns a Date for empty string', parseUtc('') instanceof Date);

/* ── Tests: timeAgo() ───────────────────────────────────────── */
suite('timeAgo()');

assert('returns empty string for empty input', timeAgo(''), '');
assert('returns original string for invalid date', timeAgo('not-a-date'), 'not-a-date');

(function() {
  const justNow = new Date(Date.now() - 30 * 1000).toISOString().replace('T', ' ').replace('Z', '');
  assert('< 1 min returns "just now"', timeAgo(justNow), 'just now');

  const fiveMin = new Date(Date.now() - 5 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '');
  assert('5 min ago returns "5m ago"', timeAgo(fiveMin), '5m ago');

  const twoHours = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '');
  assert('2 hours ago returns "2h ago"', timeAgo(twoHours), '2h ago');

  // More than 1 day — result should look like "M/D" or "M/D/YYYY"
  const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
  const ysStr = yesterday.toISOString().replace('T', ' ').replace('Z', '');
  assertTruthy('> 24h returns a date string', /^\d+\/\d+/.test(timeAgo(ysStr)));
})();

/* ── Tests: msgTime() ───────────────────────────────────────── */
suite('msgTime()');

assert('returns empty string for null', msgTime(null), '');
assert('returns empty string for invalid date', msgTime('bad'), '');

(function() {
  const now = new Date();
  // Build a UTC string that is "today" in local time
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 5, 0);
  const utcStr = local.toISOString().replace('T', ' ').replace('Z', '');
  const result = msgTime(utcStr);
  // Should be HH:MM format
  assertTruthy('today returns HH:MM', /^\d{2}:\d{2}$/.test(result));
})();

(function() {
  // Date far in the past should include year
  const old = '2022-03-15 08:00:00';
  const result = msgTime(old);
  assertTruthy('old date includes year', result.includes('2022'));
})();

/* ── Tests: normalizePost() ─────────────────────────────────── */
suite('normalizePost()');

(function() {
  const raw = {
    id: '7', user_id: '3', first_name: 'Ali', last_name: 'Yusupov',
    username: 'ali_y', user_grade: '10', xp: '450', avatar_url: 'https://cdn.test/av.jpg',
    subject: 'Math', post_type: 'notes', grade_range: '9-12',
    title: 'Calculus notes', content: 'Here are my notes',
    upvotes: '5', downvotes: '2', comment_count: '3',
    created_at: '2024-06-01 12:00:00', voted: 'up', saved: true,
    file_url: null, file_mime: null, file_name: null,
  };
  const p = normalizePost(raw);

  assert('id is parsed as integer',          p.id,                      7);
  assert('_real is true',                    p._real,                   true);
  assert('author.id is integer',             p.author.id,               3);
  assert('author.name from first+last',      p.author.name,             'Ali Yusupov');
  assert('author.username',                  p.author.username,         'ali_y');
  assert('author.xp is integer',             p.author.xp,               450);
  assert('author.avatar_url',                p.author.avatar_url,       'https://cdn.test/av.jpg');
  assert('subject',                          p.subject,                 'Math');
  assert('post_type',                        p.post_type,               'notes');
  assert('title',                            p.title,                   'Calculus notes');
  assert('body from content field',          p.body,                    'Here are my notes');
  assert('votes = upvotes - downvotes',      p.votes,                   3);
  assert('userVote "up" maps to 1',          p.userVote,                1);
  assert('comments count',                   p.comments,                3);
  assert('saved is boolean true',            p.saved,                   true);
  assert('fileUrl is null',                  p.fileUrl,                 null);
})();

(function() {
  const raw = {
    id: '1', user_id: '1', username: 'bob', first_name: '', last_name: '',
    content: 'Test', post_type: '', voted: 'down', saved: 0, upvotes: '0', downvotes: '0',
  };
  const p = normalizePost(raw);
  assert('author.name falls back to username when no first/last', p.author.name, 'bob');
  assert('post_type defaults to "general"',  p.post_type,   'general');
  assert('userVote "down" maps to -1',       p.userVote,    -1);
  assert('saved falsy → false',              p.saved,       false);
  assert('votes with no upvotes/downvotes',  p.votes,       0);
})();

(function() {
  const raw = { id: '2', user_id: '2', content: 'Hi', voted: null, upvotes: '3', downvotes: '5' };
  const p = normalizePost(raw);
  assert('userVote null when not voted',     p.userVote,    null);
  assert('votes can be negative',            p.votes,       -2);
  assert('avatar_url null when missing',     p.author.avatar_url, null);
})();

/* ── Tests: POST_MAX_CHARS constant ────────────────────────── */
suite('POST_MAX_CHARS');

assert('limit is 5000', POST_MAX_CHARS, 5000);
assert('content under limit is valid', 'a'.repeat(4999).length <= POST_MAX_CHARS, true);
assert('content at limit is valid',    'a'.repeat(5000).length <= POST_MAX_CHARS, true);
assert('content over limit is invalid','a'.repeat(5001).length <= POST_MAX_CHARS, false);

/* ── Export results ─────────────────────────────────────────── */
if (typeof module !== 'undefined') module.exports = results;
