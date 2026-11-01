/* ============================================================
   Learnora SPA — learnora-app.js
   Vanilla JS, no framework, shared-hosting compatible
   ============================================================ */

const API = './api';
const JAAS_APP_ID = 'vpaas-magic-cookie-3cdcfa271b3c4f2bbc5403de58bf40b2';

/* ── Timezone list & helpers ─────────────────────────────────── */
const TIMEZONES = [
  ['Pacific/Honolulu',              'Hawaii (UTC−10)'],
  ['America/Anchorage',             'Alaska (UTC−9)'],
  ['America/Los_Angeles',           'Pacific Time — US (UTC−8/−7)'],
  ['America/Denver',                'Mountain Time — US (UTC−7/−6)'],
  ['America/Chicago',               'Central Time — US (UTC−6/−5)'],
  ['America/New_York',              'Eastern Time — US (UTC−5/−4)'],
  ['America/Halifax',               'Atlantic — Canada (UTC−4/−3)'],
  ['America/Sao_Paulo',             'Brazil / São Paulo (UTC−3)'],
  ['America/Argentina/Buenos_Aires','Argentina (UTC−3)'],
  ['Atlantic/Azores',               'Azores (UTC−1)'],
  ['UTC',                           'UTC (UTC+0)'],
  ['Europe/London',                 'London (UTC+0/+1)'],
  ['Europe/Paris',                  'Paris / Berlin / Rome (UTC+1/+2)'],
  ['Europe/Helsinki',               'Helsinki / Kyiv / Riga (UTC+2/+3)'],
  ['Europe/Moscow',                 'Moscow (UTC+3)'],
  ['Asia/Dubai',                    'Dubai / UAE (UTC+4)'],
  ['Asia/Tbilisi',                  'Georgia (UTC+4)'],
  ['Asia/Kabul',                    'Afghanistan (UTC+4:30)'],
  ['Asia/Tashkent',                 'Uzbekistan / Tashkent (UTC+5)'],
  ['Asia/Kolkata',                  'India (UTC+5:30)'],
  ['Asia/Kathmandu',                'Nepal (UTC+5:45)'],
  ['Asia/Dhaka',                    'Bangladesh / Dhaka (UTC+6)'],
  ['Asia/Yangon',                   'Myanmar (UTC+6:30)'],
  ['Asia/Bangkok',                  'Bangkok / Jakarta (UTC+7)'],
  ['Asia/Shanghai',                 'China / Singapore (UTC+8)'],
  ['Asia/Tokyo',                    'Japan / Korea (UTC+9)'],
  ['Australia/Adelaide',            'Adelaide (UTC+9:30)'],
  ['Australia/Sydney',              'Sydney / Melbourne (UTC+10/+11)'],
  ['Pacific/Auckland',              'New Zealand (UTC+12/+13)'],
];

/** Returns <option> tags for a <select>; `selected` is IANA timezone string */
function tzOptionsHtml(selected) {
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const sel     = selected || browser || 'UTC';
  return TIMEZONES.map(([val, label]) =>
    `<option value="${val}"${val === sel ? ' selected' : ''}>${label}</option>`
  ).join('');
}

/** Full <select> element HTML for a timezone picker */
function tzSelectHtml(id, selected, cls = 'form-control') {
  return `<select id="${id}" class="${cls}">${tzOptionsHtml(selected)}</select>`;
}

/** Parse a UTC datetime string from the server into a JS Date */
function parseUtc(str) {
  if (!str) return new Date();
  // MySQL returns "YYYY-MM-DD HH:MM:SS" without timezone — append 'Z' to parse as UTC
  const iso = str.replace(' ', 'T');
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z');
}

/** Format a Date for display in user's local timezone */
function fmtDate(dt) {
  return dt.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}
function fmtTime(dt) {
  return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtDateFull(dt) {
  return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/* ── Typewriter helper ───────────────────────────────────────── */
/**
 * Types text into an element character by character.
 * For the loader logo, "Learn" is white and "ora" is cyan (wrapped in <span>).
 * @param {HTMLElement} el - target element
 * @param {string}      full - plain text to type
 * @param {number}      speed - ms per character
 * @param {Function}    [cb] - optional callback when done
 * @param {number}      [cyanStart] - index where cyan colour starts (renders a <span>)
 */
function typewriterEffect(el, full, speed, cb, cyanStart) {
  if (!el) { if (cb) cb(); return; }
  el.innerHTML = '';
  let i = 0;
  function tick() {
    i++;
    const plain   = full.slice(0, i);
    // FIX #9: was (i > cyanStart) — off-by-one caused first cyan char to render white
    if (cyanStart !== undefined && i >= cyanStart) {
      el.innerHTML = plain.slice(0, cyanStart) + '<span>' + plain.slice(cyanStart) + '</span>';
    } else {
      el.textContent = plain;
    }
    if (i < full.length) {
      setTimeout(tick, speed);
    } else {
      el.classList.add('typed-done');
      if (cb) cb();
    }
  }
  tick();
}

/* ── App Loader ─────────────────────────────────────────────── */
function hideAppLoader() {
  const el = document.getElementById('appLoader');
  if (!el || el.classList.contains('hidden')) return;
  el.classList.add('hiding');
  setTimeout(() => el.classList.add('hidden'), 420);
}

/* ── Top Progress Bar ───────────────────────────────────────── */
const progress = {
  _t: null,
  start() {
    const el = document.getElementById('nprogress');
    if (!el) return;
    el.className = '';
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('active');
    clearTimeout(this._t);
    this._t = setTimeout(() => this.done(), 2000);
  },
  done() {
    clearTimeout(this._t);
    const el = document.getElementById('nprogress');
    if (el) el.className = '';
  },
};

/* ── Offline Detection ──────────────────────────────────────── */
function updateOnlineBanner() {
  const el = document.getElementById('offlineBanner');
  if (!el) return;
  el.classList.toggle('show', !navigator.onLine);
}
window.addEventListener('offline', updateOnlineBanner);
window.addEventListener('online',  updateOnlineBanner);

/* ── Error Card Helper ──────────────────────────────────────── */
function errorCard(msg = 'Something went wrong', icon = '⚠️', retryFn = null) {
  const retryHtml = retryFn
    ? `<button class="btn btn-outline error-card-retry" onclick="(${retryFn})()">Try again</button>`
    : '';
  return `<div class="error-card">
    <div class="error-card-icon">${icon}</div>
    <p class="error-card-title">Oops!</p>
    <p class="error-card-msg">${msg}</p>
    ${retryHtml}
  </div>`;
}


/* ── Dark / Light Theme ─────────────────────────────────────── */
// Note: dark class is applied in the inline <body> script before first paint.
// This IIFE only syncs the toggle icons (class may already be on body).
(function initTheme() {
  const isDark = document.body.classList.contains('app-dark');
  const cls = isDark ? 'fas fa-sun' : 'fas fa-moon';
  const icon = document.getElementById('themeToggleIcon');
  if (icon) icon.className = cls;
  const authIcon = document.getElementById('authThemeIcon');
  if (authIcon) authIcon.className = cls;
})();

function toggleTheme() {
  const isDark = document.body.classList.toggle('app-dark');
  localStorage.setItem('learnora_theme', isDark ? 'dark' : 'light');
  const icon = document.getElementById('themeToggleIcon');
  if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  const authIcon = document.getElementById('authThemeIcon');
  if (authIcon) authIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  const authLogo = document.getElementById('authLogo');
  if (authLogo) authLogo.src = isDark ? 'logo-dr.png' : 'logo-lg.png';
  // CSS custom properties propagate instantly; no full re-render needed.
  // Only update elements that use hardcoded inline styles set by JS.
  updateSidebarUser();
}

/* ── Cover Themes ───────────────────────────────────────────── */
const COVER_THEMES = [
  { id:'navy',     gradient:'linear-gradient(135deg,#0D1B4B 0%,#1A2C6B 100%)',     label:'Navy' },
  { id:'ocean',    gradient:'linear-gradient(135deg,#0ea5e9 0%,#0D1B4B 100%)',     label:'Ocean' },
  { id:'purple',   gradient:'linear-gradient(135deg,#7c3aed 0%,#1d1b4b 100%)',     label:'Purple' },
  { id:'rose',     gradient:'linear-gradient(135deg,#e11d48 0%,#7c3aed 100%)',     label:'Rose' },
  { id:'sunset',   gradient:'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)',     label:'Sunset' },
  { id:'forest',   gradient:'linear-gradient(135deg,#065f46 0%,#10b981 100%)',     label:'Forest' },
  { id:'midnight', gradient:'linear-gradient(135deg,#1e293b 0%,#475569 100%)',     label:'Midnight' },
  { id:'aurora',   gradient:'linear-gradient(135deg,#0891b2 0%,#7c3aed 100%)',     label:'Aurora' },
  { id:'flame',    gradient:'linear-gradient(135deg,#dc2626 0%,#ea580c 100%)',     label:'Flame' },
  { id:'cyber',    gradient:'linear-gradient(135deg,#059669 0%,#29ABE2 100%)',     label:'Cyber' },
];

/* ── State ─────────────────────────────────────────────────── */
let state = {
  user: null,
  token: localStorage.getItem('learnora_token'),
  page: 'dashboard',
  posts: [],
  users: [],
  connections: [],
  conversations: [],
  activeConv: null,
  activeConvUserId: null,
  networkUsers: [],
  messages: [],
  notifications: [],
  xp: 0,
  level: 1,
  viewingPostId: null,
  viewingUserId: null,
};

// Pending file attachments (set by file-picker handlers, cleared after send)
let _pendingChatFile = null; // { file, url, name, mime }
let _pendingPostFile = null; // { file, url, name, mime }

/* ── File attachment helpers ─────────────────────────────────── */
function _isImageMime(mime) {
  return mime && mime.startsWith('image/');
}
function _fileIcon(mime) {
  if (!mime) return 'fa-file';
  if (mime === 'text/uri-list')   return 'fa-link';
  if (mime === 'application/pdf') return 'fa-file-pdf';
  if (mime.includes('word'))       return 'fa-file-word';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'fa-file-excel';
  if (mime.includes('powerpoint') || mime.includes('presentation')) return 'fa-file-powerpoint';
  if (mime === 'text/plain')       return 'fa-file-alt';
  if (mime.startsWith('image/'))   return 'fa-file-image';
  if (mime.startsWith('video/'))   return 'fa-file-video';
  return 'fa-file';
}
function _fileAttachmentHtml(url, name, mime) {
  if (_isImageMime(mime)) {
    return `<div class="msg-file-img"><a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(name)}" style="max-width:220px;max-height:200px;border-radius:8px;display:block;cursor:pointer"></a></div>`;
  }
  if (mime === 'text/uri-list') {
    return `<a href="${esc(url)}" target="_blank" rel="noopener" class="msg-file-link" style="color:var(--cyan)"><i class="fas fa-link"></i> ${esc(name || url)}</a>`;
  }
  return `<a href="${esc(url)}" target="_blank" rel="noopener" class="msg-file-link"><i class="fas ${_fileIcon(mime)}"></i> ${esc(name || 'File')}</a>`;
}

async function _uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  form.append('type', 'file');
  const res = await fetch(`${API}/upload.php`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (state.token || '') },
    body: form,
  });
  return res.json();
}

function handleChatFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  if (file.size > 5 * 1024 * 1024) {
    _pendingChatFile = null;
    const previewEl = document.getElementById('chatFilePreview');
    if (previewEl) {
      previewEl.style.display = 'block';
      previewEl.innerHTML = `
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 12px;font-size:0.82rem">
          <div style="display:flex;align-items:center;gap:6px;color:#92400e;font-weight:600;margin-bottom:6px">
            <i class="fas fa-triangle-exclamation"></i> File too large (max 5 MB)
          </div>
          <div style="color:#78350f;margin-bottom:8px">Please upload your file to <a href="https://drive.google.com" target="_blank" style="color:#0891b2;font-weight:600">Google Drive</a>, set it to <b>public / anyone with link</b>, then paste the link below.</div>
          <div style="display:flex;gap:6px;align-items:center">
            <input id="chatLinkInput" type="url" placeholder="Paste Google Drive or any public link…" style="flex:1;padding:6px 10px;border:1px solid var(--gray-200);border-radius:6px;font-size:0.82rem;min-width:0">
            <button onclick="applyChatLink()" class="btn btn-primary" style="font-size:.78rem;padding:5px 12px;white-space:nowrap">Attach Link</button>
            <button onclick="clearChatFile()" style="background:none;border:none;cursor:pointer;color:var(--gray-400);font-size:0.9rem"><i class="fas fa-xmark"></i></button>
          </div>
        </div>`;
    }
    return;
  }
  const previewEl = document.getElementById('chatFilePreview');
  _pendingChatFile = { file, name: file.name, mime: file.type, url: null };
  if (previewEl) {
    previewEl.style.display = 'block';
    previewEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--gray-600)">
        <i class="fas ${_fileIcon(file.type)}" style="color:var(--primary)"></i>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(file.name)}</span>
        <button onclick="clearChatFile()" style="background:none;border:none;cursor:pointer;color:var(--gray-400);padding:0;font-size:0.9rem"><i class="fas fa-xmark"></i></button>
      </div>`;
  }
}

function applyChatLink() {
  const input = document.getElementById('chatLinkInput');
  const url = (input?.value || '').trim();
  if (!url || !url.startsWith('http')) { toast('Please enter a valid URL', 'error'); return; }
  _pendingChatFile = { file: null, name: url, mime: 'text/uri-list', url };
  const previewEl = document.getElementById('chatFilePreview');
  if (previewEl) {
    previewEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--gray-600);background:var(--gray-50);padding:8px 12px;border-radius:8px">
        <i class="fas fa-link" style="color:var(--cyan)"></i>
        <a href="${esc(url)}" target="_blank" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--cyan)">${esc(url)}</a>
        <button onclick="clearChatFile()" style="background:none;border:none;cursor:pointer;color:var(--gray-400)"><i class="fas fa-xmark"></i></button>
      </div>`;
  }
}

function openChatLinkInput() {
  const previewEl = document.getElementById('chatFilePreview');
  if (!previewEl) return;
  _pendingChatFile = null;
  previewEl.style.display = 'block';
  previewEl.innerHTML = `
    <div style="display:flex;gap:6px;align-items:center;background:var(--gray-50);padding:8px 10px;border-radius:8px">
      <i class="fas fa-link" style="color:var(--cyan)"></i>
      <input id="chatLinkInput" type="url" placeholder="Paste a public link (Google Drive, etc.)…" style="flex:1;padding:5px 8px;border:1px solid var(--gray-200);border-radius:6px;font-size:0.82rem;min-width:0">
      <button onclick="applyChatLink()" class="btn btn-primary" style="font-size:.78rem;padding:4px 10px;white-space:nowrap">Attach</button>
      <button onclick="clearChatFile()" style="background:none;border:none;cursor:pointer;color:var(--gray-400)"><i class="fas fa-xmark"></i></button>
    </div>`;
  setTimeout(() => document.getElementById('chatLinkInput')?.focus(), 50);
}

function clearChatFile() {
  _pendingChatFile = null;
  const el = document.getElementById('chatFilePreview');
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
}

function handlePostFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  if (file.size > 5 * 1024 * 1024) {
    _pendingPostFile = null;
    const previewEl = document.getElementById('postFilePreviewArea');
    if (previewEl) {
      previewEl.style.display = 'block';
      previewEl.innerHTML = `
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 12px;font-size:0.82rem">
          <div style="display:flex;align-items:center;gap:6px;color:#92400e;font-weight:600;margin-bottom:6px">
            <i class="fas fa-triangle-exclamation"></i> File too large (max 5 MB)
          </div>
          <div style="color:#78350f;margin-bottom:8px">Please upload your file to <a href="https://drive.google.com" target="_blank" style="color:#0891b2;font-weight:600">Google Drive</a>, set it to <b>public / anyone with link</b>, then paste the link below.</div>
          <div style="display:flex;gap:6px;align-items:center">
            <input id="postLinkInput" type="url" placeholder="Paste Google Drive or any public link…" style="flex:1;padding:6px 10px;border:1px solid var(--gray-200);border-radius:6px;font-size:0.82rem;min-width:0">
            <button onclick="applyPostLink()" class="btn btn-primary" style="font-size:.78rem;padding:5px 12px;white-space:nowrap">Attach Link</button>
            <button onclick="clearPostFile()" style="background:none;border:none;cursor:pointer;color:var(--gray-400);font-size:0.9rem"><i class="fas fa-xmark"></i></button>
          </div>
        </div>`;
    }
    return;
  }
  const previewEl = document.getElementById('postFilePreviewArea');
  _pendingPostFile = { file, name: file.name, mime: file.type, url: null };
  if (previewEl) {
    previewEl.style.display = 'block';
    const isImg = _isImageMime(file.type);
    const blobUrl = isImg ? URL.createObjectURL(file) : null;
    if (blobUrl) _pendingPostFile.url = blobUrl;
    previewEl.innerHTML = isImg
      ? `<div style="position:relative;display:inline-block">
           <img src="${blobUrl}" alt="" style="max-height:160px;max-width:100%;border-radius:8px;display:block">
           <button onclick="clearPostFile()" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.55);border:none;color:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:0.75rem;display:flex;align-items:center;justify-content:center"><i class="fas fa-xmark"></i></button>
         </div>`
      : `<div style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--gray-600);background:var(--gray-50);padding:8px 12px;border-radius:8px">
           <i class="fas ${_fileIcon(file.type)}" style="color:var(--primary)"></i>
           <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(file.name)}</span>
           <button onclick="clearPostFile()" style="background:none;border:none;cursor:pointer;color:var(--gray-400)"><i class="fas fa-xmark"></i></button>
         </div>`;
  }
}

function applyPostLink() {
  const input = document.getElementById('postLinkInput');
  const url = (input?.value || '').trim();
  if (!url || !url.startsWith('http')) { toast('Please enter a valid URL', 'error'); return; }
  _pendingPostFile = { file: null, name: url, mime: 'text/uri-list', url };
  const previewEl = document.getElementById('postFilePreviewArea');
  if (previewEl) {
    previewEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--gray-600);background:var(--gray-50);padding:8px 12px;border-radius:8px">
        <i class="fas fa-link" style="color:var(--cyan)"></i>
        <a href="${esc(url)}" target="_blank" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--cyan)">${esc(url)}</a>
        <button onclick="clearPostFile()" style="background:none;border:none;cursor:pointer;color:var(--gray-400)"><i class="fas fa-xmark"></i></button>
      </div>`;
  }
}

function openPostLinkInput() {
  const previewEl = document.getElementById('postFilePreviewArea');
  if (!previewEl) return;
  _pendingPostFile = null;
  previewEl.style.display = 'block';
  previewEl.innerHTML = `
    <div style="display:flex;gap:6px;align-items:center;background:var(--gray-50);padding:8px 10px;border-radius:8px">
      <i class="fas fa-link" style="color:var(--cyan)"></i>
      <input id="postLinkInput" type="url" placeholder="Paste a public link (Google Drive, etc.)…" style="flex:1;padding:5px 8px;border:1px solid var(--gray-200);border-radius:6px;font-size:0.82rem;min-width:0">
      <button onclick="applyPostLink()" class="btn btn-primary" style="font-size:.78rem;padding:4px 10px;white-space:nowrap">Attach</button>
      <button onclick="clearPostFile()" style="background:none;border:none;cursor:pointer;color:var(--gray-400)"><i class="fas fa-xmark"></i></button>
    </div>`;
  setTimeout(() => document.getElementById('postLinkInput')?.focus(), 50);
}

function clearPostFile() {
  if (_pendingPostFile && _pendingPostFile.url && _pendingPostFile.file) URL.revokeObjectURL(_pendingPostFile.url);
  _pendingPostFile = null;
  const el = document.getElementById('postFilePreviewArea');
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
}

/* ── Levels ─────────────────────────────────────────────────── */
const LEVELS = [
  { level: 1,  label: 'Beginner',      xp: 0 },
  { level: 2,  label: 'Explorer',      xp: 100 },
  { level: 3,  label: 'Learner',       xp: 250 },
  { level: 4,  label: 'Scholar',       xp: 450 },
  { level: 5,  label: 'Thinker',       xp: 700 },
  { level: 6,  label: 'Analyst',       xp: 1000 },
  { level: 7,  label: 'Expert',        xp: 1400 },
  { level: 8,  label: 'Master',        xp: 1900 },
  { level: 9,  label: 'Champion',      xp: 2500 },
  { level: 10, label: 'Legend',        xp: 3200 },
  { level: 11, label: 'Sage',          xp: 4000 },
  { level: 12, label: 'Grandmaster',   xp: 5000 },
];

function getLevelInfo(xp) {
  let info = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.xp) info = l; }
  const idx = LEVELS.indexOf(info);
  const next = LEVELS[idx + 1];
  const pct = next ? Math.round(((xp - info.xp) / (next.xp - info.xp)) * 100) : 100;
  return { ...info, nextXP: next ? next.xp : info.xp, pct };
}

/* ── Achievements Config ────────────────────────────────────── */
const ACHIEVEMENTS = [
  { id: 3,  icon: '<i class="fas fa-star"></i>',           iconBg:'#d97706', name: 'Star Student',      desc: 'Reach level 5'                      },
  { id: 4,  icon: '<i class="fas fa-user-group"></i>',     iconBg:'#0891b2', name: 'Social Butterfly',  desc: 'Connect with 10 peers'              },
  { id: 5,  icon: '<i class="fas fa-pen-to-square"></i>',  iconBg:'#0284c7', name: 'Author',            desc: 'Post 5 study materials'             },
  { id: 6,  icon: '<i class="fas fa-comment"></i>',        iconBg:'#059669', name: 'Commenter',         desc: 'Leave 20 comments'                  },
  { id: 7,  icon: '<i class="fas fa-thumbs-up"></i>',      iconBg:'#7c3aed', name: 'Popular',           desc: 'Get 50 upvotes on your posts'       },
  { id: 8,  icon: '<i class="fas fa-trophy"></i>',         iconBg:'#b45309', name: 'Top of Class',      desc: 'Reach #1 on the leaderboard'        },
  { id: 9,  icon: '<i class="fas fa-bookmark"></i>',       iconBg:'#0369a1', name: 'Bookworm',          desc: 'Save 15 study materials'            },
  { id: 12, icon: '<i class="fas fa-gem"></i>',            iconBg:'#4f46e5', name: 'Diamond',           desc: 'Reach level 10'                     },
];

/* ── HTML escape (XSS protection for innerHTML) ─────────────── */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Utilities ──────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  // MySQL returns "YYYY-MM-DD HH:MM:SS" without timezone — treat as UTC
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + (dateStr.includes('Z') ? '' : 'Z');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return dateStr;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  // Older than 1 day → show real date
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return sameYear
    ? (d.getMonth()+1) + '/' + d.getDate()
    : (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
}

/* Returns wall-clock time HH:MM for chat messages; full date if older than today */
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
  // 2+ days ago: show M/D/YYYY HH:MM
  return (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear() + ' ' + hh + ':' + mm;
}

// FIX #1: added avatar_url so post card avatars render correctly
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

function skeletons(count, height = 80) {
  return Array(count).fill(`<div class="skeleton" style="height:${height}px;border-radius:12px;margin-bottom:12px"></div>`).join('');
}

/* ── Helpers ────────────────────────────────────────────────── */
function avatar(user, size = 40) {
  if (user && user.avatar_url) {
    return `<img src="${user.avatar_url}" alt="" width="${size}" height="${size}" style="border-radius:50%;object-fit:cover;flex-shrink:0;min-width:${size}px;min-height:${size}px;">`;
  }
  const displayName = user ? (user.name || (user.first_name ? user.first_name + ' ' + (user.last_name || '') : user.username || 'U')) : 'U';
  const initials = displayName.trim().split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const colors = ['#4f46e5','#0891b2','#059669','#dc2626','#d97706','#7c3aed','#db2777','#0284c7'];
  const color = colors[(user ? (user.id || 0) : 0) % colors.length];
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${Math.round(size*0.35)}px;flex-shrink:0;">${initials}</div>`;
}

function subjectBadge(subject) {
  const map = { Math:'math', Mathematics:'math', Physics:'physics', Chemistry:'chemistry', Biology:'biology', English:'english', History:'history', Geography:'geography' };
  const cls = map[subject] || 'math';
  return `<span class="subject-badge ${cls}">${subject}</span>`;
}

function diffBadge(d) {
  const map = { Easy: 'success', Medium: 'warning', Hard: 'danger' };
  return `<span class="badge badge-${map[d]||'secondary'}">${d}</span>`;
}

function toast(msg, type = 'success') {
  const tc = document.getElementById('toastContainer');
  if (!tc) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const s = document.createElement('span');
  s.textContent = msg;
  t.appendChild(s);
  tc.appendChild(t);
  setTimeout(() => t.classList.add('show'), 50);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

/* ── Animation helpers ──────────────────────────────────────── */
/** Animate a numeric element counting up from 0 to target value */
function animateCounter(el, target, duration = 700) {
  if (!el) return;
  const start = Date.now();
  const from  = parseInt(el.textContent) || 0;
  const end   = parseInt(target) || 0;
  if (from === end) return;
  (function tick() {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (end - from) * ease).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  })();
}

/** Trigger a CSS animation class, then remove it so it can re-trigger */
function triggerAnim(el, cls, duration = 600) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // reflow
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), duration);
}

/* ── API calls ──────────────────────────────────────────────── */
async function api(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (state.token) opts.headers['Authorization'] = 'Bearer ' + state.token;
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API + endpoint, opts);
    const data = await res.json();
    // Guests hitting a members-only action get a sign-up prompt (background reads stay silent)
    if (data && data.guest_restricted && method !== 'GET') _guestPrompt();
    return data;
  } catch {
    return { success: false, error: 'Network error' };
  }
}

/* ── Guest mode ─────────────────────────────────────────────── */
const GUEST_LOCKED_PAGES = new Set(['network','messages','profile','achievements','saved','settings','teacher','training','helpqueue','notifications','studygroups']);

function isGuest() {
  return !!(state.user && state.user.role === 'guest');
}

async function startGuest() {
  const btns = document.querySelectorAll('.btn-guest');
  btns.forEach(b => { b.disabled = true; b.dataset.label = b.innerHTML; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting…'; });
  const res = await api('/auth.php?action=guest', 'POST');
  btns.forEach(b => { b.disabled = false; if (b.dataset.label) b.innerHTML = b.dataset.label; });
  if (!res.success) { toast(res.error || 'Could not start guest mode', 'error'); return; }
  finishLogin(res.data);
}

/* Leave guest mode and open sign-up */
async function guestSignUp() {
  await handleLogout();
  showAuth('register');
}

function _guestPrompt(message) {
  if (document.getElementById('guestPrompt')) return;
  const el = document.createElement('div');
  el.id = 'guestPrompt';
  el.className = 'guest-prompt';
  el.innerHTML = `
    <div class="guest-prompt-card" role="dialog" aria-modal="true">
      <div class="guest-prompt-icon"><i class="fas fa-user-lock"></i></div>
      <h3>Create a free account</h3>
      <p>${esc(message || 'This feature needs an account. Sign up in seconds — your guest progress isn\'t saved.')}</p>
      <div class="guest-prompt-actions">
        <button class="btn btn-ghost" onclick="document.getElementById('guestPrompt').remove()">Keep exploring</button>
        <button class="btn btn-primary" onclick="document.getElementById('guestPrompt').remove();guestSignUp()"><i class="fas fa-rocket"></i> Sign up free</button>
      </div>
    </div>`;
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  document.body.appendChild(el);
}

function _renderGuestLocked(pg, page) {
  const names = { network: 'Network', messages: 'Messages', profile: 'your Profile', achievements: 'Achievements', saved: 'Saved posts',
                  settings: 'Settings', teacher: 'Teacher Hub', training: 'Teacher training', helpqueue: 'Instant Help',
                  notifications: 'Notifications', studygroups: 'Study Groups' };
  pg.innerHTML = `
    <div class="guest-locked">
      <div class="guest-prompt-icon"><i class="fas fa-user-lock"></i></div>
      <h2>Sign up to use ${esc(names[page] || 'this page')}</h2>
      <p>You're exploring as a guest. Quizzes, live games, flashcards and the Pomodoro timer are open to try — create a free account to unlock everything and keep your progress.</p>
      <div class="guest-prompt-actions">
        <button class="btn btn-ghost" onclick="navigate('quizzes')"><i class="fas fa-brain"></i> Try quizzes</button>
        <button class="btn btn-primary" onclick="guestSignUp()"><i class="fas fa-rocket"></i> Create free account</button>
      </div>
    </div>`;
}

function _updateGuestBanner() {
  let banner = document.getElementById('guestBanner');
  if (!isGuest()) { if (banner) banner.remove(); return; }
  if (banner) return;
  const main = document.querySelector('.main-content');
  if (!main) return;
  banner = document.createElement('div');
  banner.id = 'guestBanner';
  banner.className = 'guest-banner';
  banner.innerHTML = `
    <span><i class="fas fa-user-secret"></i> You're in <strong>guest mode</strong> — nothing is saved and some features are locked.</span>
    <button class="btn btn-primary btn-sm" onclick="guestSignUp()">Sign up free</button>`;
  const header = main.querySelector('.top-header');
  if (header) header.after(banner); else main.prepend(banner);
}

/* ── Auth ───────────────────────────────────────────────────── */
function showLanding() {
  hideAppLoader();
  const lw = document.getElementById('landingWrapper');
  if (lw) {
    const wasHidden = lw.style.display !== 'block';
    lw.style.display = 'block';
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      // No animations: show everything at once
      document.body.classList.add('loaded');
      lw.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('revealed'));
    } else if (wasHidden) {
      // The hero entrance ran on window load while the landing page was still hidden behind
      // the app loader, so replay it now that it's visible. Scroll reveals need nothing here:
      // their IntersectionObserver fires as soon as elements become visible on screen.
      document.body.classList.remove('loaded');
      void lw.offsetWidth; // commit the hidden state so the transition plays
      requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('loaded')));
    }
  }
  const authW = document.getElementById('authWrapper');
  const appW  = document.getElementById('appWrapper');
  if (authW) authW.style.display = 'none';
  if (appW)  appW.style.display  = 'none';
}

function showAuth(tab = 'login') {
  hideAppLoader();
  const lw = document.getElementById('landingWrapper');
  if (lw) lw.style.display = 'none';
  const aw = document.getElementById('authWrapper');
  if (aw) {
    aw.style.display = 'flex';
    // Force-reset the auth card animation so it replays correctly
    // when the wrapper is re-shown after logout (browsers restart animations
    // on display-toggle which can leave the card invisible mid-frame)
    const card = aw.querySelector('.auth-card');
    if (card) {
      card.style.animation = 'none';
      void card.offsetWidth; // force reflow
      card.style.animation = '';
    }
  }
  const appW = document.getElementById('appWrapper');
  if (appW) appW.style.display = 'none';
  showAuthTab(tab);
}

function showApp() {
  hideAppLoader();
  const lw = document.getElementById('landingWrapper');
  if (lw) lw.style.display = 'none';
  const authW = document.getElementById('authWrapper');
  const appW  = document.getElementById('appWrapper');
  if (authW) authW.style.display = 'none';
  if (appW)  appW.style.display = 'flex';
  updateSidebarUser();
  updateXPChip();
  updateNotifBadge();
  updateSidebarForRole();
  _updateGuestBanner();
  if (!isGuest()) _startBgPoll();

  // Phase 4: training role — force to training page and block other nav
  const role = state.user?.role || 'student';
  if (role === 'teacher_pending_training' && state.page !== 'training') {
    state.page = 'training';
  }

  navigate(state.page);
  // Sidebar brand typing animation — runs every time app opens, "ora" in cyan
  const sbText = document.getElementById('sidebarBrandText');
  if (sbText) {
    sbText.classList.remove('typed-done', 'typed-blinking');
    typewriterEffect(sbText, 'Learnora', 70, function() {
      sbText.classList.add('typed-blinking');
      sbText.addEventListener('animationend', function onBlink() {
        sbText.removeEventListener('animationend', onBlink);
        sbText.classList.remove('typed-blinking');
        sbText.classList.add('typed-done');
      });
    }, 5);
  }
  // Show onboarding tour for first-time users
  if (!localStorage.getItem('learnora_tour_done')) {
    setTimeout(startTour, 800);
  }
}

/* ── Onboarding Tour ─────────────────────────────────────────── */
const TOUR_STEPS = [
  {
    icon: '🎓',
    gradient: 'linear-gradient(135deg,#0D1B4B 0%,#29ABE2 100%)',
    label: 'Welcome',
    title: 'Welcome to Learnora!',
    desc: 'Your all-in-one educational social platform. Let\'s take a quick tour to show you everything you can do here.',
  },
  {
    icon: '📊',
    gradient: 'linear-gradient(135deg,#065f46 0%,#10b981 100%)',
    label: 'Dashboard',
    title: 'Your Dashboard',
    desc: 'The Dashboard shows your XP progress, streak, achievements, and posts from people you follow. It\'s your home base.',
  },
  {
    icon: '📚',
    gradient: 'linear-gradient(135deg,#7c3aed 0%,#1d1b4b 100%)',
    label: 'Learn',
    title: 'Learn & Take Quizzes',
    desc: 'Browse subjects, take quizzes, and earn XP points. Star your favourite subjects to pin them to your profile.',
  },
  {
    icon: '💬',
    gradient: 'linear-gradient(135deg,#0891b2 0%,#7c3aed 100%)',
    label: 'Community',
    title: 'Community Feed',
    desc: 'Share study notes, ask questions, and upvote helpful posts. Save posts you want to read later.',
  },
  {
    icon: '🤝',
    gradient: 'linear-gradient(135deg,#e11d48 0%,#7c3aed 100%)',
    label: 'Network',
    title: 'Connect with Students',
    desc: 'Discover and connect with other students in your grade. Send connection requests and message your connections directly.',
  },
  {
    icon: '✨',
    gradient: 'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)',
    label: 'Profile',
    title: 'Personalise Your Profile',
    desc: 'Add your skills and experiences in the About tab, choose a cover colour, favourite subjects, and track your quiz history.',
  },
];

let _tourStep = 0;

function startTour() {
  _tourStep = 0;
  if (!document.getElementById('tourModal')) return;
  openModal('tourModal');
  renderTourStep();
}

function renderTourStep() {
  const step  = TOUR_STEPS[_tourStep];
  const total = TOUR_STEPS.length;

  document.getElementById('tourGraphic').innerHTML = `
    <div class="tour-icon-wrap" style="background:${step.gradient}">
      <span class="tour-icon">${step.icon}</span>
    </div>`;
  document.getElementById('tourStepLabel').textContent = `Step ${_tourStep + 1} of ${total} · ${step.label}`;
  document.getElementById('tourTitle').textContent     = step.title;
  document.getElementById('tourDesc').textContent      = step.desc;

  const dots = document.getElementById('tourDots');
  dots.innerHTML = TOUR_STEPS.map((_,i) =>
    `<span class="tour-dot${i===_tourStep?' active':''}"></span>`
  ).join('');

  const nextBtn = document.getElementById('tourNextBtn');
  const isLast  = _tourStep === total - 1;
  nextBtn.innerHTML = isLast
    ? '<i class="fas fa-check"></i> Get Started!'
    : 'Next <i class="fas fa-arrow-right"></i>';
}

function tourNext() {
  if (_tourStep < TOUR_STEPS.length - 1) {
    _tourStep++;
    renderTourStep();
  } else {
    skipTour();
  }
}

function skipTour() {
  localStorage.setItem('learnora_tour_done', '1');
  closeModal('tourModal');
}

// All auth views: login | register | verify | forgot | reset
function showAuthView(view) {
  ['loginView','registerView','verifyView','forgotView','resetView'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Clear any stale error messages from a prior session
  ['loginError','registerError','verifyError','forgotError','resetError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const map = { login:'loginView', register:'registerView',
                verify:'verifyView', forgot:'forgotView', reset:'resetView' };
  const el = document.getElementById(map[view]);
  if (el) el.style.display = 'block';
  document.querySelectorAll('.auth-tab').forEach(t => {
    const isActive = (view === 'login' && t.textContent.trim() === 'Sign In') ||
                     (view === 'register' && t.textContent.trim() === 'Register');
    t.classList.toggle('active', isActive);
  });
}

// Keep backward-compat with existing onclick="showAuthTab('login')" calls
function showAuthTab(tab) { showAuthView(tab); }

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  if (!email || !pass) { showAuthError('loginError', 'Please fill in all fields'); return; }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Signing in…';

  const res = await api('/auth.php?action=login', 'POST', { email, password: pass });
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';

  if (res.success) {
    finishLogin(res.data);
  } else if (res.pending_verification) {
    // Unverified account — redirect to verification screen
    state._pendingVerify = { user_id: res.user_id, email: res.email };
    document.getElementById('verifyEmailDisplay').textContent = res.email;
    showAuthView('verify');
  } else {
    showAuthError('loginError', res.error || 'Invalid email or password');
  }
}

function finishLogin(data) {
  state.token = data.token;
  state.user  = data.user;
  localStorage.setItem('learnora_token', state.token);
  state.xp    = parseInt(state.user.xp) || 0;
  state.level = getLevelInfo(state.xp).level;

  // Phase 3: Admin → redirect to hidden admin panel
  const role = data.user.role || 'student';
  if (role === 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  // Phase 4: Teacher pending training → send to training page
  if (role === 'teacher_pending_training') {
    state.page = 'training';
  } else {
    state.page = 'dashboard';
  }

  toast(role === 'guest' ? 'Welcome! You\'re exploring as a guest.' : 'Welcome back, ' + (state.user.first_name || state.user.username) + '!');
  showApp();
}

/* ── Social Login ────────────────────────────────────────────── */
const SOCIAL_CONFIG = {
  googleClientId:  '111108424800-8aucnh6l06gst1m5u4gnf2immojkbcq8.apps.googleusercontent.com',
  telegramBotName: 'learnorabot',
  telegramBotId:   '8503068882',
};

function signInWithGoogle() {
  const clientId = SOCIAL_CONFIG.googleClientId;
  if (!clientId) { toast('Google sign-in is not configured yet.', 'error'); return; }

  // Always use origin root so you only need to register one URI in Google Console:
  // Authorized redirect URIs → https://yourdomain.com/
  const redirectUri = window.location.origin + '/';

  // Generate a random nonce for CSRF protection
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem('google_oauth_nonce', nonce);
  sessionStorage.setItem('google_oauth_redirect', redirectUri);

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'id_token',
    scope:         'openid email profile',
    nonce:         nonce,
    prompt:        'select_account',
  });
  window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
}

async function handleGoogleCredential(response) {
  toast('Signing in with Google…');
  const res = await api('/auth.php?action=google_oauth', 'POST', { id_token: response.credential });
  _handleSocialResponse(res, 'Google');
}

// Opens the Telegram OAuth popup directly via window.open() — called synchronously
// inside the user's click handler so browsers allow the popup without blocking.
// After the user authenticates, oauth.telegram.org sends a postMessage to this window.
function openTelegramLogin() {
  const botId = SOCIAL_CONFIG.telegramBotId;
  if (!botId) { toast('Telegram sign-in is not configured yet.', 'error'); return; }

  const origin = window.location.origin;
  const authUrl = 'https://oauth.telegram.org/auth'
    + '?bot_id='        + encodeURIComponent(botId)
    + '&origin='        + encodeURIComponent(origin)
    + '&request_access=write'
    + '&lang=en';

  const w = 550, h = 600;
  const left = Math.max(0, Math.round(screen.width  / 2 - w / 2));
  const top  = Math.max(0, Math.round(screen.height / 2 - h / 2));
  const popup = window.open(
    authUrl, 'TelegramLogin',
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if (!popup) {
    toast('Please allow popups for this site, then try again.', 'error');
    return;
  }

  // Remove any previously registered listener to avoid duplicates
  if (window._tgAuthListener) {
    window.removeEventListener('message', window._tgAuthListener);
  }

  window._tgAuthListener = function(e) {
    // Only accept messages from Telegram's OAuth origin
    if (e.origin !== 'https://oauth.telegram.org') return;

    let data;
    try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; }
    catch { return; }

    if (!data || data.event !== 'auth_result') return;

    window.removeEventListener('message', window._tgAuthListener);
    window._tgAuthListener = null;
    try { popup.close(); } catch {}

    const user = data.result;
    if (!user || !user.id) {
      toast('Telegram sign-in was cancelled.', 'info');
      return;
    }

    toast('Signing in with Telegram…');
    api('/auth.php?action=telegram_oauth', 'POST', user).then(res => {
      _handleSocialResponse(res, 'Telegram');
    }).catch(() => {
      toast('Telegram sign-in failed. Please try again.', 'error');
    });
  };

  window.addEventListener('message', window._tgAuthListener);
}

function _handleSocialResponse(res, provider) {
  clearTimeout(_loaderGuardTimer);
  if (res.success) {
    finishLogin(res.data);
  } else {
    showAuth('login');
    toast((res.error || provider + ' sign-in failed') + '', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName  = document.getElementById('regLastName').value.trim();
  const username  = document.getElementById('regUsername').value.trim();
  const email     = document.getElementById('regEmail').value.trim();
  const grade     = document.getElementById('regGrade').value;
  const pass      = document.getElementById('regPassword').value;
  const confirm   = document.getElementById('regConfirmPassword').value;

  if (!firstName || !lastName || !username || !email || !grade || !pass || !confirm) {
    showAuthError('registerError', 'Please fill in all fields'); return;
  }
  if (pass !== confirm) {
    showAuthError('registerError', 'Passwords do not match'); return;
  }
  if (pass.length < 8) {
    showAuthError('registerError', 'Password must be at least 8 characters'); return;
  }

  const btn = document.getElementById('registerBtn');
  btn.disabled = true; btn.textContent = 'Creating account…';

  const res = await api('/auth.php?action=register', 'POST', {
    first_name: firstName, last_name: lastName, username, email, grade, password: pass
  });
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';

  if (res.success && res.data.pending_verification) {
    // Store pending state and show verify screen
    state._pendingVerify = { user_id: res.data.user_id, email: res.data.email };
    document.getElementById('verifyEmailDisplay').textContent = res.data.email;
    document.getElementById('verifyCode').value = '';
    showAuthView('verify');
    toast('Check your email for the verification code!');
  } else if (res.success) {
    // Legacy: direct login (shouldn't happen with new backend but handle anyway)
    finishLogin(res.data);
  } else {
    showAuthError('registerError', res.error || 'Registration failed. Try a different username or email.');
  }
}

/* ── Email Verification ───────────────────────────────────── */
async function handleVerifyEmail() {
  const code = (document.getElementById('verifyCode')?.value || '').trim();
  if (!code || code.length !== 6) { showAuthError('verifyError', 'Please enter the 6-digit code'); return; }
  if (!state._pendingVerify) { showAuthView('register'); return; }

  const btn = document.getElementById('verifyBtn');
  btn.disabled = true; btn.textContent = 'Verifying…';

  const res = await api('/auth.php?action=verify_email', 'POST', {
    user_id: state._pendingVerify.user_id, code,
  });
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> Verify Email';

  if (res.success) {
    state._pendingVerify = null;
    toast('Email verified! Welcome to Learnora 🎉');
    finishLogin(res.data);
  } else {
    showAuthError('verifyError', res.error || 'Invalid or expired code');
  }
}

async function handleResendCode() {
  if (!state._pendingVerify) return;
  const link = document.getElementById('resendCodeLink');
  if (link) { link.textContent = 'Sending…'; link.style.pointerEvents = 'none'; }

  const res = await api('/auth.php?action=resend_code', 'POST', {
    user_id: state._pendingVerify.user_id,
  });
  if (link) { link.textContent = 'Resend code'; link.style.pointerEvents = ''; }

  if (res.success) { toast('New code sent to your email!'); }
  else { toast(res.error || 'Could not resend code', 'error'); }
}

/* ── Forgot Password ─────────────────────────────────────── */
async function handleForgotPassword() {
  const email = (document.getElementById('forgotEmail')?.value || '').trim();
  if (!email) { showAuthError('forgotError', 'Please enter your email address'); return; }

  const btn = document.getElementById('forgotBtn');
  btn.disabled = true; btn.textContent = 'Sending…';

  const res = await api('/auth.php?action=forgot_password', 'POST', { email });
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Code';

  if (res.success) {
    state._resetEmail = email;
    document.getElementById('resetEmailDisplay').textContent = email;
    document.getElementById('resetCode').value = '';
    document.getElementById('resetNewPassword').value = '';
    document.getElementById('resetConfirmPassword').value = '';
    showAuthView('reset');
    toast('Reset code sent — check your email!');
  } else {
    showAuthError('forgotError', res.error || 'Failed to send reset code');
  }
}

async function handleResendResetCode() {
  if (!state._resetEmail) { showAuthView('forgot'); return; }
  document.getElementById('forgotEmail').value = state._resetEmail;
  const res = await api('/auth.php?action=forgot_password', 'POST', { email: state._resetEmail });
  if (res.success) toast('New reset code sent!');
  else toast(res.error || 'Could not resend code', 'error');
}

async function handleResetPassword() {
  const code    = (document.getElementById('resetCode')?.value || '').trim();
  const newPass = document.getElementById('resetNewPassword')?.value || '';
  const confirm = document.getElementById('resetConfirmPassword')?.value || '';

  if (!code || code.length !== 6) { showAuthError('resetError', 'Please enter the 6-digit code'); return; }
  if (!newPass || newPass.length < 8) { showAuthError('resetError', 'New password must be at least 8 characters'); return; }
  if (newPass !== confirm) { showAuthError('resetError', 'Passwords do not match'); return; }
  if (!state._resetEmail) { showAuthView('forgot'); return; }

  const btn = document.getElementById('resetBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const res = await api('/auth.php?action=reset_password', 'POST', {
    email: state._resetEmail, code, new_password: newPass,
  });
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Set New Password';

  if (res.success) {
    state._resetEmail = null;
    toast('Password reset successfully! Please sign in.');
    showAuthView('login');
  } else {
    showAuthError('resetError', res.error || 'Failed to reset password');
  }
}

async function handleLogout() {
  if (state.token) {
    await api('/auth.php?action=logout', 'POST');
  }
  _stopBgPoll();
  state.token = null; state.user = null;
  localStorage.removeItem('learnora_token');
  _updateGuestBanner();
  showLanding();
}

// Alias for backward compat (settings page still calls doLogout)
function doLogout() { handleLogout(); }

function showAuthError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

/* ── Navigation ─────────────────────────────────────────────── */
const VALID_PAGES = new Set(['dashboard','learn','courses','quizzes','community','network','messages','leaderboard','profile','achievements','saved','settings','teacher','training','helpqueue','notifications','pomodoro','flashcards','studygroups']);

function navigateToCourse(courseId) {
  showCourseDetail(courseId);
}

function navigateToSession(sessionId) {
  navigate('learn');
  setTimeout(() => showSessionDetailById(sessionId), 400);
}

function navigate(page) {
  if (!VALID_PAGES.has(page)) {
    // 404 — show error in main area
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    let notFound = document.getElementById('page-404');
    if (!notFound) {
      notFound = document.createElement('div');
      notFound.id = 'page-404';
      notFound.className = 'page-content';
      notFound.style.cssText = 'display:flex;align-items:center;justify-content:center;height:60vh';
      document.querySelector('.main-content')?.appendChild(notFound);
    }
    notFound.style.display = '';
    notFound.innerHTML = `<div class="error-card">
      <div class="error-card-icon">🗺️</div>
      <p class="error-card-title">Page not found</p>
      <p class="error-card-msg">The page "<b>${esc(page)}</b>" doesn't exist.</p>
      <button class="btn btn-primary error-card-retry" onclick="navigate('dashboard')">Go to Dashboard</button>
    </div>`;
    return;
  }

  state.page = page;
  progress.start();
  _sgStopPoll(); // study group chat polling only runs while its chat is open

  // Hide all pages, show active
  document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
  const pg = document.getElementById('page-' + page);
  if (pg) pg.style.display = '';

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nav) nav.classList.add('active');

  // Don't override a deep-link hash if session modal is currently visible
  const curHash = window.location.hash.replace('#', '');
  const sessionModalOpen = document.getElementById('sessionDetailModal')?.style.display === 'flex';
  if (!(curHash.startsWith('session/') && sessionModalOpen)) {
    window.location.hash = page;
  }

  // Close sidebar on mobile
  if (window.innerWidth < 1024) closeSidebar();

  // Guests see a sign-up card on members-only pages
  if (isGuest() && GUEST_LOCKED_PAGES.has(page)) {
    if (pg) _renderGuestLocked(pg, page);
    progress.done();
    return;
  }

  // Load page content
  const loaders = {
    dashboard:    renderDashboard,
    learn:        renderLearn,
    quizzes:      renderQuizzes,
    community:    () => renderCommunity(true),
    network:      renderNetwork,
    messages:     renderMessages,
    leaderboard:  renderLeaderboard,
    profile:      renderProfile,
    achievements: renderAchievements,
    saved:        renderSavedPosts,
    settings:     renderSettings,
    courses:       renderCoursesPage,
    teacher:       renderTeacherHub,
    training:      renderTraining,
    helpqueue:     renderHelpQueue,
    notifications: renderNotifications,
    pomodoro:      renderPomodoro,
    flashcards:    renderFlashcards,
    studygroups:   renderStudyGroups,
  };
  if (loaders[page]) {
    Promise.resolve(loaders[page]()).finally(() => progress.done());
  } else {
    progress.done();
  }
}

/* ── Sidebar ────────────────────────────────────────────────── */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.toggle('open');
  if (ov) ov.classList.toggle('active');
}
function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('active');
}

/* ── XP / Level ─────────────────────────────────────────────── */
function updateXPChip() {
  if (!state.user) return;
  const xpEl = document.getElementById('headerXP');
  if (xpEl) xpEl.textContent = state.xp.toLocaleString() + ' XP';
}

function updateSidebarUser() {
  if (!state.user) return;
  const info = getLevelInfo(state.xp);
  const u = state.user;
  const displayName = u.first_name ? u.first_name + ' ' + (u.last_name || '') : (u.name || u.username || 'User');
  const initials = displayName.trim().split(' ').filter(Boolean).map(n => n[0]).join('').slice(0,2).toUpperCase() || '?';

  const nameEl = document.getElementById('sidebarName');
  const xpEl   = document.getElementById('sidebarXP');
  if (nameEl) nameEl.textContent = displayName.split(' ')[0] + (u.last_name ? ' ' + u.last_name[0] + '.' : '');
  if (xpEl)   xpEl.textContent  = state.xp.toLocaleString() + ' XP · Level ' + info.level;

  // Avatar helper — replaces non-dot children with img or initials span
  function syncAvatarEl(el) {
    if (!el) return;
    // Remove previous img/span content but keep .online-dot if present
    Array.from(el.childNodes).forEach(n => {
      if (n.nodeType === 1 && !n.classList.contains('online-dot')) n.remove();
      else if (n.nodeType === 3) n.remove(); // text nodes
    });
    const content = document.createElement(u.avatar_url ? 'img' : 'span');
    if (u.avatar_url) {
      content.src = u.avatar_url;
      content.alt = '';
      content.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block';
    } else {
      content.textContent = initials;
    }
    el.insertBefore(content, el.firstChild);
  }

  syncAvatarEl(document.getElementById('sidebarAvatar'));
  syncAvatarEl(document.getElementById('headerAvatar'));
  // Post composer avatars (community feed bar + modal)
  syncAvatarEl(document.getElementById('createPostAvatar'));
  syncAvatarEl(document.getElementById('createPostAvatarModal'));
  // Comment form avatar (if modal is open)
  syncAvatarEl(document.getElementById('commentAvatar'));

  // XP chip in header
  const xpChip = document.getElementById('headerXP');
  if (xpChip) xpChip.textContent = state.xp.toLocaleString() + ' XP';

  const greetEl = document.getElementById('dashGreeting');
  if (greetEl) {
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    greetEl.textContent = greet + ', ' + (u.first_name || u.username || 'there') + '!';
  }
}

/* ── Role-aware sidebar items ─────────────────────────────────── */
function updateSidebarForRole() {
  const role = state.user?.role || 'student';
  const teacherSection = document.getElementById('teacherNavSection');
  if (teacherSection) {
    teacherSection.style.display = role === 'active_teacher' ? '' : 'none';
  }
  // Show "Become a Teacher" prompt in Learn nav for students
  const learnNav = document.getElementById('nav-learn');
  if (learnNav && role === 'student') {
    learnNav.title = 'Discover sessions or apply to become a teacher';
  }
}

function awardXP(amount, reason) {
  if (amount <= 0) return; // guard against zero/negative
  state.xp += amount;
  if (state.user) state.user.xp = state.xp;
  const info = getLevelInfo(state.xp);
  const oldLevel = state.level;
  state.level = info.level;
  updateXPChip();
  updateSidebarUser(); // keep sidebar XP chip in sync
  if (reason) toast(`+${amount} XP — ${reason}`, 'success');
  if (info.level > oldLevel) {
    setTimeout(() => toast(`Level Up! You are now ${info.label} (Lv.${info.level})`, 'success'), 800);
  }
}

/* ── Notifications ──────────────────────────────────────────── */
// Throttle badge checks to at most once every 30 seconds
let _notifLastCheck = 0;

function _notifTypeIcon(type) {
  const map = {
    message:    '💬', connection: '🤝', session:    '📅',
    feedback:   '⭐', achievement:'🏆', vote:       '👍',
    comment:    '💬', help:       '🎓', course:     '📚',
  };
  return map[type] || '🔔';
}

function _notifItemHtml(n) {
  const actor = (n.first_name || '') + (n.last_name ? ' ' + n.last_name : '') || n.username || 'Someone';
  const timeAgo = _timeAgo(n.created_at);
  return `<div class="notif-item${parseInt(n.is_read) ? '' : ' unread'}" onclick="readNotifItem(${n.id},'${esc(n.type)}',${n.reference_id||0})" style="cursor:pointer">
    <div class="notif-icon">${_notifTypeIcon(n.type)}</div>
    <div class="notif-content">
      <p style="margin:0;font-size:.88rem">${esc(n.content || actor + ' sent a notification')}</p>
      <p style="font-size:.75rem;color:var(--gray-400);margin-top:2px">${timeAgo}</p>
    </div>
  </div>`;
}

function _timeAgo(dtStr) {
  if (!dtStr) return '';
  const diff = Math.floor((Date.now() - new Date(dtStr + (dtStr.includes('Z') ? '' : 'Z'))) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function updateNotifBadge(force = false) {
  const now = Date.now();
  if (!force && now - _notifLastCheck < 30000) return;
  _notifLastCheck = now;

  // Check both platform notifications and unread messages in parallel
  Promise.all([
    api('/notifications.php?action=unread_count'),
    api('/messages.php?action=unread_count'),
  ]).then(([notifRes, msgRes]) => {
    const notifCount = (notifRes.success && notifRes.data) ? parseInt(notifRes.data.count) || 0 : 0;
    const msgCount   = (msgRes.success   && msgRes.data)   ? parseInt(msgRes.data.count)   || 0 : 0;
    const total = notifCount + msgCount;
    const dot = document.getElementById('notifDot');
    if (dot) dot.style.display = total ? 'block' : 'none';
  });
}

async function loadNotifList() {
  const list = document.getElementById('notifList');
  if (!list) return;
  list.innerHTML = '<div style="padding:16px;text-align:center"><i class="fas fa-spinner fa-spin" style="color:var(--gray-400)"></i></div>';

  const [notifRes, msgRes] = await Promise.all([
    api('/notifications.php?action=list&limit=15'),
    api('/messages.php?action=unread_count'),
  ]);

  const notifications = (notifRes.success && notifRes.data?.notifications) ? notifRes.data.notifications : [];
  const msgCount = (msgRes.success && msgRes.data) ? parseInt(msgRes.data.count) || 0 : 0;

  let html = '';

  // Unread messages entry (keep existing behavior)
  if (msgCount > 0) {
    html += `<div class="notif-item unread" style="cursor:pointer" onclick="navigate('messages');document.getElementById('notifDropdown').style.display='none'">
      <div class="notif-icon">💬</div>
      <div class="notif-content"><p style="margin:0;font-size:.88rem">You have <b>${msgCount}</b> unread message${msgCount>1?'s':''}</p><p style="font-size:.75rem;color:var(--gray-400);margin-top:2px">Tap to open Messages</p></div>
    </div>`;
  }

  if (notifications.length) {
    html += notifications.map(_notifItemHtml).join('');
  }

  list.innerHTML = html || '<div style="padding:16px;text-align:center;color:var(--gray-400);font-size:0.85rem">No new notifications</div>';
}

function toggleNotifications() {
  const dd = document.getElementById('notifDropdown');
  if (!dd) return;
  const isVisible = dd.style.display !== 'none';
  const um = document.getElementById('userMenu');
  if (um) um.style.display = 'none';
  dd.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) {
    updateNotifBadge(true);
    loadNotifList();
  }
}

function toggleNotif() { toggleNotifications(); }

function readNotifItem(id, type, refId) {
  // Mark individual notification read
  api('/notifications.php?action=mark_read', 'POST', { id });
  // Navigate to relevant page based on type
  const nd = document.getElementById('notifDropdown');
  if (nd) nd.style.display = 'none';
  if (type === 'message') navigate('messages');
  else if (type === 'connection') navigate('network');
  else if (type === 'session' || type === 'course') navigate(state.user?.role === 'active_teacher' ? 'teacher' : 'courses');
  else navigate('dashboard');
}

function readNotif() {
  navigate('messages');
  const nd = document.getElementById('notifDropdown');
  if (nd) nd.style.display = 'none';
}

async function markAllRead() {
  await Promise.all([
    api('/notifications.php?action=mark_all_read', 'POST'),
    api('/messages.php?action=mark_all_read', 'POST'),
  ]);
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = 'none';
  const list = document.getElementById('notifList');
  if (list) list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--gray-400);font-size:0.85rem">No new notifications</div>';
  _notifLastCheck = 0; // force fresh count on next check
}

/* ── User Menu ──────────────────────────────────────────────── */
function toggleUserMenu() {
  const um = document.getElementById('userMenu');
  if (!um) return;
  const isVisible = um.style.display === 'block';
  const nd = document.getElementById('notifDropdown');
  if (nd) nd.style.display = 'none';
  um.style.display = isVisible ? 'none' : 'block';
}

function closeUserMenu() {
  const um = document.getElementById('userMenu');
  if (um) um.style.display = 'none';
}

/* ── Dashboard ──────────────────────────────────────────────── */
async function renderDashboard() {
  const info = getLevelInfo(state.xp);
  const u    = state.user;
  const name = u ? (u.first_name || (u.name ? u.name.split(' ')[0] : u.username) || 'Student') : 'Student';
  const conns = u && u.connections_count != null ? u.connections_count : 0;
  const posts = u && u.posts_count       != null ? u.posts_count       : 0;

  const html = `
    <div class="page-header">
      <h1>Welcome back, ${esc(name)}</h1>
      <p>Ready to learn something new today?</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(79,70,229,.15);color:#a78bfa"><i class="fas fa-star"></i></div>
        <div class="stat-info"><span class="stat-value">${state.xp}</span><span class="stat-label">Total XP</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(5,150,105,.15);color:#34d399"><i class="fas fa-user-group"></i></div>
        <div class="stat-info"><span class="stat-value" id="dash-connections">${conns}</span><span class="stat-label">Connections</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(220,38,38,.15);color:#f87171"><i class="fas fa-pen-to-square"></i></div>
        <div class="stat-info"><span class="stat-value" id="dash-posts-count">${posts}</span><span class="stat-label">Posts Shared</span></div>
      </div>
    </div>

    <div class="level-card">
      <div class="level-header">
        <div>
          <h3>Level ${info.level} — ${info.label}</h3>
          <p>${info.nextXP > info.xp ? state.xp + ' / ' + info.nextXP + ' XP to next level' : 'Max level reached! 🏆'}</p>
        </div>
        <span class="level-badge">Lv.${info.level}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${info.pct}%"></div></div>
      <p class="progress-label">${info.pct}% progress</p>
    </div>

    <div class="section-header"><h2>Quick Actions</h2></div>
    <div class="quick-actions">
      <button class="qa-btn" onclick="navigate('learn')">
        <span class="qa-icon" style="background:linear-gradient(135deg,#7c3aed,#4f46e5)"><i class="fas fa-chalkboard-teacher"></i></span>
        <span class="qa-label">Find Sessions</span>
      </button>
      <button class="qa-btn" onclick="navigate('community')">
        <span class="qa-icon" style="background:linear-gradient(135deg,#0ea5e9,#0284c7)"><i class="fas fa-newspaper"></i></span>
        <span class="qa-label">Browse Feed</span>
      </button>
      <button class="qa-btn" onclick="navigate('network')">
        <span class="qa-icon" style="background:linear-gradient(135deg,#10b981,#059669)"><i class="fas fa-user-group"></i></span>
        <span class="qa-label">Find Peers</span>
      </button>
      <button class="qa-btn" onclick="navigate('messages')">
        <span class="qa-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><i class="fas fa-message"></i></span>
        <span class="qa-label">Messages</span>
      </button>
      <button class="qa-btn" onclick="navigate('pomodoro')">
        <span class="qa-icon" style="background:linear-gradient(135deg,#ef4444,#dc2626)"><i class="fas fa-clock"></i></span>
        <span class="qa-label">Pomodoro</span>
      </button>
    </div>

    <div class="section-header"><h2>Upcoming Sessions</h2><a href="#" onclick="navigate('learn');return false;">See all</a></div>
    <div id="dash-upcoming-sessions">${skeletons(2, 72)}</div>

    <div class="section-header"><h2>Recent Community Posts</h2><a href="#" onclick="navigate('community');return false;">See all</a></div>
    <div class="post-feed" id="dash-posts-feed">${skeletons(3)}</div>

    <div class="section-header"><h2>Leaderboard</h2></div>
    <div class="leaderboard-card" id="dash-leaderboard">${skeletons(5, 48)}</div>`;

  document.getElementById('page-dashboard').innerHTML = html;

  const role = state.user?.role || 'student';
  const [postsRes, lbRes, upcomingRes] = await Promise.all([
    api('/posts.php?action=feed'),
    api('/users.php?action=leaderboard'),
    role === 'active_teacher'
      ? api('/teacher.php?action=my_sessions')
      : api('/teacher.php?action=upcoming_sessions'),
  ]);

  const feedEl = document.getElementById('dash-posts-feed');
  if (feedEl) {
    if (!postsRes.success) {
      feedEl.innerHTML = errorCard('Could not load posts', '📡');
    } else if (postsRes.data && postsRes.data.posts && postsRes.data.posts.length) {
      // FIX #4: merge dashboard posts into state.posts so openPost() works from Dashboard
      const dashPosts = postsRes.data.posts.map(normalizePost);
      dashPosts.forEach(p => { if (!state.posts.find(sp => sp.id === p.id)) state.posts.push(p); });
      feedEl.innerHTML = dashPosts.slice(0,3).map(p => renderPostCard(p)).join('');
    } else {
      feedEl.innerHTML = '<div class="empty-state"><i class="fas fa-inbox empty-icon"></i><p>No posts yet. Be the first to share!</p></div>';
    }
  }

  const lbEl = document.getElementById('dash-leaderboard');
  if (lbEl) {
    if (lbRes.success && lbRes.data && lbRes.data.length) {
      lbEl.innerHTML = lbRes.data.slice(0,5).map((lu,i)=>`
        <div class="lb-row">
          <span class="lb-rank rank-${i+1}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
          ${avatar(lu,36)}
          <div class="lb-info"><span>${((lu.first_name||'')+' '+(lu.last_name||'')).trim()||lu.username}</span><small>Grade ${lu.grade}</small></div>
          <span class="lb-xp">${lu.xp} XP</span>
        </div>`).join('');
    } else {
      lbEl.innerHTML = '<div class="empty-state" style="padding:20px;text-align:center"><i class="fas fa-trophy empty-icon"></i><p>No rankings yet</p></div>';
    }
  }

  // Upcoming sessions widget
  const upcomingEl = document.getElementById('dash-upcoming-sessions');
  if (upcomingEl) {
    const isTeacher = (state.user?.role || 'student') === 'active_teacher';
    let sessions = upcomingRes.success ? (upcomingRes.data || []) : [];
    // For teachers: filter to only upcoming status
    if (isTeacher) sessions = sessions.filter(s => s.status === 'upcoming').slice(0, 3);
    else sessions = sessions.slice(0, 3);

    if (!sessions.length) {
      upcomingEl.innerHTML = `
        <div style="background:var(--gray-100);border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px">
          <i class="fas fa-calendar-plus" style="font-size:1.5rem;color:var(--cyan)"></i>
          <div>
            <div style="font-size:.88rem;font-weight:600;color:var(--navy)">No upcoming sessions</div>
            <div style="font-size:.78rem;color:var(--gray-400);margin-top:2px">
              ${isTeacher ? '<a href="#" onclick="navigate(\'teacher\');return false" style="color:var(--cyan)">Create a session</a> to start teaching'
                           : '<a href="#" onclick="navigate(\'learn\');return false" style="color:var(--cyan)">Browse sessions</a> and register to learn from peers'}
            </div>
          </div>
        </div>`;
    } else {
      upcomingEl.innerHTML = sessions.map(s => {
        const dt = parseUtc(s.scheduled_at);
        const ds = fmtDate(dt);
        const ts = fmtTime(dt);
        const now = new Date();
        const minsUntil = Math.floor((dt - now) / 60000);
        const isLive = s.status === 'live';
        const isNow = isLive || (minsUntil >= -10 && minsUntil <= parseInt(s.duration_minutes));
        const regCount = parseInt(s.registered_count) || 0;
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--gray-100);border-radius:10px;margin-bottom:8px;border-left:3px solid ${isNow?'var(--danger)':'var(--cyan)'}">
            <div style="flex:1;min-width:0">
              <div style="font-size:.87rem;font-weight:700;color:var(--navy)">${esc(s.title)}</div>
              <div style="font-size:.76rem;color:var(--gray-400)">${esc(s.subject)} · ${ds} at ${ts}
                ${isNow?'<span style="color:var(--danger);font-weight:700"> · LIVE NOW</span>':''}
              </div>
            </div>
            ${isTeacher
              ? `<span style="font-size:.75rem;color:var(--gray-400)">${regCount} registered</span>`
              : isLive && s.jitsi_room_id
                ? `<button class="btn btn-danger" style="font-size:.75rem;padding:5px 10px" onclick="joinLiveSession(${s.id})"><i class="fas fa-video"></i> Join Now</button>`
                : s.meeting_link && isNow
                  ? `<a href="${esc(s.meeting_link)}" target="_blank" class="btn btn-danger" style="font-size:.75rem;padding:5px 10px"><i class="fas fa-video"></i> Join</a>`
                  : ''}
          </div>`;
      }).join('');
    }
  }

  // Fetch real profile stats if not already loaded
  if (u && u.id && u.connections_count == null) {
    const profileRes = await api('/users.php?action=profile&id=' + u.id);
    if (profileRes.success && profileRes.data) {
      const d = profileRes.data;
      state.user.connections_count = parseInt(d.connections_count) || 0;
      state.user.posts_count       = parseInt(d.posts_count)       || 0;
      const cEl = document.getElementById('dash-connections');
      const pEl = document.getElementById('dash-posts-count');
      animateCounter(cEl, state.user.connections_count);
      animateCounter(pEl, state.user.posts_count);
    }
  }
}

/* ── Learn ──────────────────────────────────────────────────── */

async function renderLearn() {
  return renderLearnHub();
}

/* ── Quizzes ────────────────────────────────────────────────── */
let _quizState = { view: 'home', subjectSlug: '', subjectName: '', quizId: null, questions: [], answers: {}, startTime: null, timer: null };
let _quizTab   = 'learnora'; // 'learnora' | 'community'

/* ── Quiz tab switcher ── */
async function renderQuizzes() {
  const pg = document.getElementById('page-quizzes');
  if (!pg) return;
  _quizState.view = 'home';
  if (_quizState.timer) { clearInterval(_quizState.timer); _quizState.timer = null; }
  _renderQuizTabs(pg);
}

function _renderQuizTabs(pg) {
  if (!pg) pg = document.getElementById('page-quizzes');
  if (!pg) return;
  pg.innerHTML = `
    <div class="page-header" style="flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="page-title">Quizzes</h1>
        <p class="page-sub">Test your knowledge, compete with friends, earn XP</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-ghost" style="font-size:.82rem;padding:8px 14px" onclick="showJoinGameModal()"><i class="fas fa-gamepad"></i> Join Game</button>
        <button class="quiz-create-btn" onclick="showCreateQuizModal()"><i class="fas fa-plus"></i> Create Quiz</button>
      </div>
    </div>
    <div class="quiz-main-tabs">
      <button class="quiz-main-tab ${_quizTab === 'learnora' ? 'active' : ''}" onclick="_switchQuizTab('learnora')">
        <i class="fas fa-graduation-cap"></i> Learnora Official
      </button>
      <button class="quiz-main-tab ${_quizTab === 'community' ? 'active' : ''}" onclick="_switchQuizTab('community')">
        <i class="fas fa-users"></i> Community
      </button>
      <button class="quiz-main-tab ${_quizTab === 'my' ? 'active' : ''}" onclick="_switchQuizTab('my')">
        <i class="fas fa-bookmark"></i> My Quizzes
      </button>
    </div>
    <div id="quizTabContent"></div>`;
  _loadQuizTab(_quizTab);
}

function _switchQuizTab(tab) {
  _quizTab = tab;
  document.querySelectorAll('#page-quizzes .quiz-main-tab').forEach((btn, i) => {
    const tabs = ['learnora','community','my'];
    btn.classList.toggle('active', tabs[i] === tab);
  });
  _loadQuizTab(tab);
}

async function _loadQuizTab(tab) {
  const content = document.getElementById('quizTabContent');
  if (!content) return;
  if (tab === 'learnora') {
    await _loadOfficialQuizzes(content);
  } else if (tab === 'community') {
    await _loadCommunityQuizzes(content);
  } else if (tab === 'my') {
    await _loadMyQuizzes(content);
  }
}

/* ═══════════════════════════════════════════════════
   OFFICIAL (Learnora) QUIZZES TAB
   ═══════════════════════════════════════════════════ */
async function _loadOfficialQuizzes(container) {
  container.innerHTML = _quizLoadingHTML('Loading quizzes…');
  const [subjectsRes, quizzesRes] = await Promise.all([
    api('/quiz.php?action=subjects'),
    api('/quiz.php?action=quizzes'),
  ]);
  if (!subjectsRes.success) {
    container.innerHTML = `<div class="error-card"><div class="error-card-icon">⚠️</div><p class="error-card-title">Could not load quizzes</p><button class="btn btn-primary error-card-retry" onclick="_loadQuizTab('learnora')">Retry</button></div>`;
    return;
  }
  container.innerHTML = _quizSubjectGrid(subjectsRes.data || [], quizzesRes.data || []);
}

async function toggleFavSubject(subjectId, btn) {
  if (!state.user) { toast('Please log in to save favourites', 'error'); return; }
  const res = await api('/users.php?action=toggle_fav_subject', 'POST', { subject_id: subjectId });
  if (!res.success) { toast(res.error || 'Failed to update', 'error'); return; }
  // Update local state
  state.user.fav_subjects = JSON.stringify(res.data.fav_subjects || []);
  const isFav = res.data.is_fav;
  if (btn) {
    btn.classList.toggle('active', isFav);
    btn.title = isFav ? 'Remove from favourites' : 'Add to favourites';
    const icon = btn.querySelector('i');
    if (icon) { icon.className = (isFav ? 'fas' : 'far') + ' fa-star'; }
  }
  toast(isFav ? 'Added to favourites!' : 'Removed from favourites');
}

function _iconHtml(icon, size) {
  if (!icon) return '';
  const s = size || '1.4rem';
  if (icon.startsWith('fa')) {
    return `<i class="${esc(icon)}" style="font-size:${s};line-height:1"></i>`;
  }
  if (icon.startsWith('http') || icon.startsWith('//')) {
    return `<img src="${esc(icon)}" style="width:${s};height:${s};display:block;flex-shrink:0" alt="">`;
  }
  return icon; // emoji fallback
}

function _quizLoadingHTML(msg) {
  return `<div style="display:flex;align-items:center;justify-content:center;height:40vh;flex-direction:column;gap:14px">
    <i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary)"></i>
    <p style="color:var(--gray-500);font-size:.95rem">${msg}</p>
  </div>`;
}

function _quizSubjectGrid(subjects, allQuizzes) {
  const diffLabel = { easy: 'Beginner', medium: 'Intermediate', hard: 'Advanced' };
  const diffColor = { easy: 'var(--success)', medium: 'var(--warning,#f59e0b)', hard: 'var(--danger)' };

  const _subjectIconFallback = { Biology:'fas fa-dna', Chemistry:'fas fa-flask', Physics:'fas fa-atom', Mathematics:'fas fa-square-root-variable', 'Computer Science':'fas fa-laptop-code', Economics:'fas fa-chart-line', Accounting:'fas fa-calculator', SAT:'fas fa-pen-to-square', IELTS:'fas fa-language' };
  let favIds = [];
  try { favIds = JSON.parse((state.user || {}).fav_subjects || '[]'); } catch {}

  const subjectCards = subjects.map(s => {
    const count = allQuizzes.filter(q => q.subject_name === s.name).length;
    const iconHtml = _iconHtml(s.icon) || `<i class="${_subjectIconFallback[s.name] || 'fas fa-book'}" style="font-size:1.4rem;line-height:1"></i>`;
    const isFav = favIds.includes(parseInt(s.id));
    return `
      <div class="quiz-subject-card" onclick="quizShowSubject('${esc(s.slug)}','${esc(s.name)}')">
        <div class="quiz-subject-icon" style="background:${esc(s.color)}22;color:${esc(s.color)}">${iconHtml}</div>
        <div class="quiz-subject-info">
          <div class="quiz-subject-name">${esc(s.name)}</div>
          <div class="quiz-subject-count">${count} quiz${count !== 1 ? 'zes' : ''}</div>
        </div>
        <button class="fav-star-btn${isFav ? ' active' : ''}" title="${isFav ? 'Remove from favourites' : 'Add to favourites'}"
          onclick="event.stopPropagation();toggleFavSubject(${s.id},this)">
          <i class="${isFav ? 'fas' : 'far'} fa-star"></i>
        </button>
      </div>`;
  }).join('');

  // All quizzes
  const featured = allQuizzes;
  const featuredCards = featured.map(q => `
    <div class="quiz-card" onclick="quizStart(${q.id})">
      <div class="quiz-card-header" style="background:${esc(q.color || '#4f46e5')}18">
        <span class="quiz-card-icon">${_iconHtml(q.icon,'1.5rem') || '📚'}</span>
        <span class="quiz-card-subject" style="color:${esc(q.color || '#4f46e5')}">${esc(q.subject_name)}</span>
      </div>
      <div class="quiz-card-body">
        <h3 class="quiz-card-title">${esc(q.title)}</h3>
        <p class="quiz-card-desc">${esc(q.description || '')}</p>
        <div class="quiz-card-meta">
          <span class="quiz-diff-badge" style="color:${diffColor[q.difficulty]||'var(--gray-500)'}">
            <i class="fas fa-circle" style="font-size:.45rem;vertical-align:middle"></i> ${diffLabel[q.difficulty] || q.difficulty}
          </span>
          <span><i class="fas fa-list-check" style="color:var(--gray-400)"></i> ${q.question_count} Qs</span>
          <span><i class="fas fa-star" style="color:#f59e0b"></i> ${q.xp_reward} XP</span>
        </div>
      </div>
    </div>`).join('');

  return `
    <div class="quiz-subjects-section">
      <h2 class="quiz-section-title"><i class="fas fa-layer-group"></i> Browse by Subject</h2>
      <div class="quiz-subjects-list">${subjectCards}</div>
    </div>
    <div class="quiz-featured-section">
      <h2 class="quiz-section-title"><i class="fas fa-fire"></i> All Quizzes</h2>
      <div class="quiz-cards-grid">${featuredCards || '<p style="color:var(--gray-500)">No quizzes yet.</p>'}</div>
    </div>`;
}

async function quizShowSubject(slug, name) {
  const pg = document.getElementById('page-quizzes');
  if (!pg) return;
  pg.innerHTML = _quizLoadingHTML('Loading ' + name + ' quizzes…');
  const res = await api('/quiz.php?action=quizzes&subject=' + encodeURIComponent(slug));
  const quizzes = res.success ? (res.data || []) : [];
  const diffLabel = { easy: 'Beginner', medium: 'Intermediate', hard: 'Advanced' };
  const diffColor = { easy: 'var(--success)', medium: 'var(--warning,#f59e0b)', hard: 'var(--danger)' };
  const cards = quizzes.map(q => `
    <div class="quiz-card" onclick="quizStart(${q.id})">
      <div class="quiz-card-header" style="background:${esc(q.color || '#4f46e5')}18">
        <span class="quiz-card-icon">${_iconHtml(q.icon,'1.5rem') || '📚'}</span>
        <span class="quiz-card-subject" style="color:${esc(q.color || '#4f46e5')}">${esc(q.subject_name)}</span>
      </div>
      <div class="quiz-card-body">
        <h3 class="quiz-card-title">${esc(q.title)}</h3>
        <p class="quiz-card-desc">${esc(q.description || '')}</p>
        <div class="quiz-card-meta">
          <span class="quiz-diff-badge" style="color:${diffColor[q.difficulty]||'var(--gray-500)'}">
            <i class="fas fa-circle" style="font-size:.45rem;vertical-align:middle"></i> ${diffLabel[q.difficulty] || q.difficulty}
          </span>
          <span><i class="fas fa-list-check" style="color:var(--gray-400)"></i> ${q.question_count} Qs</span>
          <span><i class="fas fa-star" style="color:#f59e0b"></i> ${q.xp_reward} XP</span>
          <span style="color:var(--gray-400);font-size:.78rem">Grade ${esc(q.grade_range)}</span>
        </div>
      </div>
    </div>`).join('');
  pg.innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <button class="btn btn-ghost" style="padding:8px 14px" onclick="renderQuizzes()"><i class="fas fa-arrow-left"></i></button>
      <div>
        <h1 class="page-title" style="margin:0">${esc(name)}</h1>
        <p class="page-sub" style="margin:0">${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''} available</p>
      </div>
    </div>
    <div class="quiz-cards-grid" style="margin-top:20px">${cards || '<div class="empty-state"><i class="fas fa-inbox empty-icon"></i><p class="empty-title">No quizzes yet for this subject</p></div>'}</div>`;
}

async function quizStart(quizId) {
  const pg = document.getElementById('page-quizzes');
  if (!pg) return;
  pg.innerHTML = _quizLoadingHTML('Loading quiz…');
  const res = await api('/quiz.php?action=questions&quiz_id=' + quizId);
  if (!res.success || !res.data) {
    pg.innerHTML = `<div class="error-card"><div class="error-card-icon">⚠️</div><p class="error-card-title">Could not load quiz</p><button class="btn btn-primary error-card-retry" onclick="renderQuizzes()">Back to Quizzes</button></div>`;
    return;
  }
  const { quiz, questions } = res.data;
  _quizState = { view: 'quiz', subjectSlug: '', quizId, questions, answers: {}, startTime: Date.now(), timer: null, currentQ: 0, quiz };
  _renderQuizQuestion(pg);
}

function _renderQuizQuestion(pg) {
  if (!pg) pg = document.getElementById('page-quizzes');
  if (!pg) return;
  const { questions, currentQ, answers, quiz } = _quizState;
  const total = questions.length;
  const q = questions[currentQ];
  const progress = Math.round(((currentQ) / total) * 100);
  const optLabels = ['a','b','c','d'];
  const optTexts  = [q.option_a, q.option_b, q.option_c, q.option_d];
  const selected  = answers[currentQ];

  pg.innerHTML = `
    <div class="quiz-runner">
      <div class="quiz-runner-header">
        <button class="btn btn-ghost" style="padding:6px 12px;font-size:.85rem" onclick="quizAbort()"><i class="fas fa-times"></i> Quit</button>
        <div style="flex:1;text-align:center">
          <div style="font-weight:700;color:var(--navy);font-size:.95rem">${esc(quiz.title)}</div>
          <div style="font-size:.78rem;color:var(--gray-400)">Question ${currentQ + 1} of ${total}</div>
        </div>
        <div id="quizTimerDisplay" class="quiz-timer"><i class="fas fa-clock"></i> <span id="quizTimerText">--:--</span></div>
      </div>
      <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${progress}%"></div></div>
      <div class="quiz-question-card">
        <p class="quiz-question-text">${esc(q.question_text)}</p>
        <div class="quiz-options">
          ${optLabels.map((lbl, i) => `
            <button class="quiz-option${selected === lbl ? ' selected' : ''}" onclick="quizSelectAnswer(${currentQ},'${lbl}',this)">
              <span class="quiz-option-label">${lbl.toUpperCase()}</span>
              <span class="quiz-option-text">${esc(optTexts[i] || '')}</span>
            </button>`).join('')}
        </div>
      </div>
      <div class="quiz-runner-footer">
        ${currentQ > 0 ? `<button class="btn btn-ghost" onclick="quizPrevQ()"><i class="fas fa-arrow-left"></i> Previous</button>` : '<div></div>'}
        ${currentQ < total - 1
          ? `<button class="btn btn-primary" onclick="quizNextQ()">Next <i class="fas fa-arrow-right"></i></button>`
          : `<button class="btn btn-primary" onclick="quizSubmit()"><i class="fas fa-paper-plane"></i> Submit Quiz</button>`}
      </div>
    </div>`;
  _quizStartTimer();
}

function _quizStartTimer() {
  if (_quizState.timer) clearInterval(_quizState.timer);
  _quizState.timer = setInterval(() => {
    const timerEl = document.getElementById('quizTimerText');
    if (!timerEl) { clearInterval(_quizState.timer); _quizState.timer = null; return; }
    const secs = Math.floor((Date.now() - _quizState.startTime) / 1000);
    const m = String(Math.floor(secs / 60)).padStart(2,'0');
    const s = String(secs % 60).padStart(2,'0');
    timerEl.textContent = m + ':' + s;
  }, 1000);
}

function quizSelectAnswer(qIdx, label, btn) {
  _quizState.answers[qIdx] = label;
  btn.closest('.quiz-options')?.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function quizNextQ() {
  if (_quizState.currentQ < _quizState.questions.length - 1) {
    _quizState.currentQ++;
    _renderQuizQuestion();
  }
}

function quizPrevQ() {
  if (_quizState.currentQ > 0) {
    _quizState.currentQ--;
    _renderQuizQuestion();
  }
}

function quizAbort() {
  if (!confirm('Quit this quiz? Your progress will be lost.')) return;
  if (_quizState.timer) clearInterval(_quizState.timer);
  renderQuizzes();
}

async function quizSubmit() {
  const { quiz, questions, answers, startTime } = _quizState;
  const answersArr = questions.map((_, i) => answers[i] || '');
  const timeSpent = Math.floor((Date.now() - startTime) / 1000);
  if (_quizState.timer) clearInterval(_quizState.timer);

  const unanswered = questions.length - Object.keys(answers).length;
  if (unanswered > 0) {
    if (!confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`)) return;
  }

  const pg = document.getElementById('page-quizzes');
  if (pg) pg.innerHTML = _quizLoadingHTML('Submitting…');
  const res = await api('/quiz.php?action=submit', 'POST', { quiz_id: quiz.id, answers: answersArr, time_spent: timeSpent });
  if (!res.success) { toast(res.error || 'Submit failed', 'error'); renderQuizzes(); return; }

  const { correct, total, xp_earned, percentage, is_retry, prev_best } = res.data;
  _renderQuizResult(pg, correct, total, xp_earned, percentage, timeSpent, questions, answers, is_retry, prev_best);
}

function _renderQuizResult(pg, correct, total, xpEarned, pct, timeSpent, questions, answers, isRetry, prevBest) {
  if (!pg) return;
  const grade = pct >= 90 ? { label: 'Excellent!', color: 'var(--success)', icon: '🏆' }
               : pct >= 70 ? { label: 'Well Done!', color: 'var(--primary)', icon: '🎯' }
               : pct >= 50 ? { label: 'Good Try!', color: 'var(--warning,#f59e0b)', icon: '💪' }
               :             { label: 'Keep Practising', color: 'var(--danger)', icon: '📚' };
  const m = String(Math.floor(timeSpent / 60)).padStart(2,'0');
  const s = String(timeSpent % 60).padStart(2,'0');
  const beatBest = isRetry && correct > (prevBest || 0);

  const reviewRows = questions.map((q, i) => {
    const userAns = answers[i] || '';
    const correct_ans = q.correct_answer;
    const isCorrect = userAns.toLowerCase() === correct_ans.toLowerCase();
    const opts = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };
    return `<div class="quiz-review-row${isCorrect ? ' correct' : ' wrong'}">
      <div class="quiz-review-q"><span class="quiz-review-num">${i + 1}</span> ${esc(q.question_text)}</div>
      <div class="quiz-review-ans">
        ${isCorrect
          ? `<span style="color:var(--success)"><i class="fas fa-check-circle"></i> ${esc(opts[correct_ans] || correct_ans.toUpperCase())}</span>`
          : `<span style="color:var(--danger)"><i class="fas fa-times-circle"></i> Your answer: ${esc(opts[userAns] || (userAns ? userAns.toUpperCase() : 'No answer'))}</span>
             <span style="color:var(--success)"><i class="fas fa-check-circle"></i> Correct: ${esc(opts[correct_ans] || correct_ans.toUpperCase())}</span>`}
      </div>
    </div>`;
  }).join('');

  pg.innerHTML = `
    <div class="quiz-result">
      <div class="quiz-result-hero">
        <div class="quiz-result-icon">${grade.icon}</div>
        <h2 class="quiz-result-label" style="color:${grade.color}">${grade.label}</h2>
        <div class="quiz-result-score">${pct}<span>%</span></div>
        <div class="quiz-result-stats">
          <div class="quiz-result-stat"><i class="fas fa-check-circle" style="color:var(--success)"></i> ${correct} correct</div>
          <div class="quiz-result-stat"><i class="fas fa-times-circle" style="color:var(--danger)"></i> ${total - correct} wrong</div>
          <div class="quiz-result-stat"><i class="fas fa-clock" style="color:var(--primary)"></i> ${m}:${s}</div>
          ${xpEarned > 0
            ? `<div class="quiz-result-stat"><i class="fas fa-star" style="color:#f59e0b"></i> +${xpEarned} XP${beatBest ? ' — new best!' : ''}</div>`
            : isRetry ? `<div class="quiz-result-stat" style="color:var(--gray-400)"><i class="fas fa-lock"></i> No XP — beat your best to earn more</div>` : ''}
        </div>
        <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-primary" onclick="quizStart(${_quizState.quizId})"><i class="fas fa-redo"></i> Try Again</button>
          <button class="btn btn-ghost" onclick="renderQuizzes()"><i class="fas fa-th-large"></i> All Quizzes</button>
        </div>
      </div>
      <div class="quiz-review-section">
        <h3 style="font-size:1rem;font-weight:700;color:var(--navy);margin-bottom:14px"><i class="fas fa-list-check"></i> Review Answers</h3>
        ${reviewRows}
      </div>
    </div>`;

  if (xpEarned > 0) {
    awardXP(xpEarned, null); // updates XP chip + sidebar + level-up toast
  }
}

/* ── Community ──────────────────────────────────────────────── */
/* Community filter state */
let _communityFilter = { type: 'all', grade: '', subject: '', page: 1 };

async function renderCommunity(forceRefresh = false) {
  const feedEl = document.getElementById('communityFeed');
  if (!feedEl) return;

  // FIX #5: removed duplicate avatar sync here — updateSidebarUser() already owns all avatar elements
  // including createPostAvatar, so setting innerHTML here would conflict with it.

  // Fetch posts if not loaded or forced refresh
  if (forceRefresh || !state.posts.length || state.posts[0]._real === undefined) {
    _communityFilter.page = 1;
    _communityFilter.subject = '';
    _communityFilter.grade = '';
    feedEl.innerHTML = skeletons(4);
    const res = await api('/posts.php?action=feed&page=1');
    if (!res.success) {
      feedEl.innerHTML = errorCard('Could not load posts. Check your connection.', '📡', '() => renderCommunity(true)');
      return;
    }
    const newPosts = (res.data && res.data.posts) ? res.data.posts.map(normalizePost) : [];
    if (forceRefresh) {
      // Full refresh: replace everything
      state.posts = newPosts;
    } else {
      // Soft load: merge without duplicates (e.g. posts already loaded from dashboard)
      newPosts.forEach(p => { if (!state.posts.find(sp => sp.id === p.id)) state.posts.push(p); });
    }
    const loadMoreEl = document.getElementById('feedLoadMore');
    if (loadMoreEl) loadMoreEl.style.display = res.data.has_more ? '' : 'none';
    _loadTrendingTags();
    _populateCommunityGrades();
  }

  _renderCommunityFeed();
}

function _renderCommunityFeed() {
  const feedEl = document.getElementById('communityFeed');
  if (!feedEl) return;
  // Map plural filter names to singular DB post_type values
  const typeMap = { questions: 'question', resources: 'resource', notes: 'notes', discussion: 'discussion' };
  let filtered = state.posts;
  if (_communityFilter.type !== 'all') {
    const dbType = typeMap[_communityFilter.type] || _communityFilter.type;
    filtered = filtered.filter(p => p.post_type === dbType);
  }
  if (_communityFilter.grade) {
    filtered = filtered.filter(p => p.author && p.author.grade === _communityFilter.grade);
  }
  if (_communityFilter.subject) {
    filtered = filtered.filter(p => p.subject === _communityFilter.subject);
  }
  feedEl.innerHTML = filtered.length
    ? filtered.map(renderPostCard).join('')
    : '<div class="empty-state"><i class="fas fa-inbox empty-icon"></i><p class="empty-title">No posts here yet</p><p class="empty-text">Be the first to share something!</p></div>';
}

function filterPosts(type, btn) {
  _communityFilter.type = type;
  _communityFilter.subject = ''; // clear subject filter when type changes
  document.querySelectorAll('#communityFilters .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  _renderCommunityFeed();
}

function filterBySubject(subject) {
  _communityFilter.subject = subject;
  _communityFilter.type = 'all';
  document.querySelectorAll('#communityFilters .filter-btn').forEach(b => b.classList.remove('active'));
  const allBtn = document.querySelector('#communityFilters .filter-btn');
  if (allBtn) allBtn.classList.add('active');
  _renderCommunityFeed();
}

function filterByGrade(val) {
  _communityFilter.grade = val;
  _renderCommunityFeed();
}

async function loadMorePosts() {
  _communityFilter.page++;
  const btn = document.querySelector('#feedLoadMore .btn');
  if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; }
  const res = await api('/posts.php?action=feed&page=' + _communityFilter.page);
  if (!res.success) {
    toast('Failed to load more posts', 'error');
    _communityFilter.page--;
  } else {
    const newPosts = (res.data && res.data.posts) ? res.data.posts.map(normalizePost) : [];
    // Deduplicate: only add posts whose IDs aren't already in state
    const existingIds = new Set(state.posts.map(p => p.id));
    const fresh = newPosts.filter(p => !existingIds.has(p.id));
    state.posts = [...state.posts, ...fresh];
    const loadMoreEl = document.getElementById('feedLoadMore');
    if (loadMoreEl) loadMoreEl.style.display = res.data.has_more ? '' : 'none';
  }
  if (btn) { btn.textContent = 'Load More'; btn.disabled = false; }
  _renderCommunityFeed();
}

async function _loadTrendingTags() {
  const el = document.getElementById('trendingTags');
  if (!el) return;
  const res = await api('/posts.php?action=trending');
  if (res.success && res.data && res.data.length) {
    el.innerHTML = res.data.map(t =>
      `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;cursor:pointer" onclick="filterBySubject('${esc(t.subject)}')">
        <span style="font-size:0.85rem;font-weight:600">${esc(t.subject)}</span>
        <span style="font-size:0.75rem;color:var(--gray-400)">${t.count} post${t.count===1?'':'s'}</span>
      </div>`).join('');
  } else {
    el.innerHTML = '<p style="color:var(--gray-400);font-size:0.85rem">No trending topics yet</p>';
  }
}

function _populateCommunityGrades() {
  const sel = document.getElementById('communityGradeFilter');
  if (!sel) return;
  // Use author's grade (always present) — grade_range is usually empty in DB
  const grades = [...new Set(state.posts.map(p => p.author && p.author.grade).filter(Boolean))].sort();
  // Clear all options except first ("All Grades")
  while (sel.options.length > 1) sel.remove(1);
  grades.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g; opt.textContent = 'Grade ' + g;
    sel.appendChild(opt);
  });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('anim-open', 'anim-close');
  el.style.display = 'flex';
  void el.offsetWidth; // reflow so animation replays
  el.classList.add('anim-open');
}

const POST_TYPE_ICONS = { notes:'📝', question:'❓', resource:'📎', discussion:'💬', general:'📌' };

function renderPostCard(post) {
  const typeIcon = POST_TYPE_ICONS[post.post_type] || '📌';
  const typeLabel = post.post_type ? post.post_type.charAt(0).toUpperCase() + post.post_type.slice(1) : 'Post';
  return `
    <div class="post-card" id="post-${post.id}" data-type="${post.post_type||'general'}">
      <div class="post-header">
        ${avatar(post.author, 38)}
        <div class="post-author-info">
          <span class="post-author-name" style="cursor:pointer" onclick="viewUserProfile(${post.author.id})">${esc(post.author.name)}</span>
          <div class="post-meta">
            <span>Gr. ${esc(post.author.grade)}</span>
            <span>·</span>
            ${subjectBadge(post.subject)}
            <span>·</span>
            <span title="${typeLabel}">${typeIcon} ${typeLabel}</span>
            <span>·</span>
            <span title="${esc(post.created_at ? new Date(post.created_at).toLocaleString() : '')}">${post.time}</span>
          </div>
        </div>
        ${state.user ? `
        <div style="position:relative;margin-left:auto">
          <button onclick="event.stopPropagation();togglePostMenu(${post.id})" style="border:none;background:none;cursor:pointer;color:var(--gray-400);padding:4px 8px;border-radius:6px;font-size:.9rem" title="Options"><i class="fas fa-ellipsis"></i></button>
          <div id="post-menu-${post.id}" style="display:none;position:absolute;right:0;top:100%;background:var(--surface);border:1px solid var(--gray-200);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:100;min-width:140px;overflow:hidden">
            ${post.author && parseInt(post.author.id) === parseInt(state.user.id) ? `
            <button onclick="event.stopPropagation();togglePostMenu(${post.id});editOwnPost(${post.id})" style="width:100%;text-align:left;border:none;background:none;cursor:pointer;padding:8px 14px;font-size:.85rem;color:var(--navy)" onmouseover="this.style.background='var(--gray-100)'" onmouseout="this.style.background='none'"><i class="fas fa-pen" style="width:16px;margin-right:6px;color:var(--cyan)"></i>Edit</button>
            <button onclick="event.stopPropagation();togglePostMenu(${post.id});deleteOwnPost(${post.id})" style="width:100%;text-align:left;border:none;background:none;cursor:pointer;padding:8px 14px;font-size:.85rem;color:var(--danger,#ef4444)" onmouseover="this.style.background='var(--gray-100)'" onmouseout="this.style.background='none'"><i class="fas fa-trash" style="width:16px;margin-right:6px"></i>Delete</button>
            ` : `
            <button onclick="event.stopPropagation();togglePostMenu(${post.id});openReportModal('post',${post.id})" style="width:100%;text-align:left;border:none;background:none;cursor:pointer;padding:8px 14px;font-size:.85rem;color:var(--danger,#ef4444)" onmouseover="this.style.background='var(--gray-100)'" onmouseout="this.style.background='none'"><i class="fas fa-flag" style="width:16px;margin-right:6px"></i>Report</button>
            `}
          </div>
        </div>` : ''}
      </div>
      <div class="post-body" onclick="openPost(${post.id})" style="cursor:pointer">
        <h3>${esc(post.title)}</h3>
        <p>${esc(post.body)}</p>
        ${post.fileUrl ? (_isImageMime(post.fileMime) || (!post.fileMime && post.fileUrl.match(/\.(jpe?g|png|gif|webp)(\?|$)/i))
          ? `<img src="${esc(post.fileUrl)}" alt="attachment" style="max-width:100%;max-height:240px;border-radius:8px;margin-top:8px;display:block" onerror="this.style.display='none'">`
          : `<a href="${esc(post.fileUrl)}" target="_blank" rel="noopener" class="msg-file-link" onclick="event.stopPropagation()"><i class="fas ${_fileIcon(post.fileMime)}"></i> ${esc(post.fileName || 'View Attachment')}</a>`) : ''}
      </div>
      <div class="post-actions">
        <button class="vote-btn${post.userVote===1?' active':''}" id="upvote-${post.id}" onclick="vote(${post.id},1)">
          <i class="fas fa-arrow-up"></i> <span id="votes-${post.id}">${post.votes}</span>
        </button>
        <button class="vote-btn${post.userVote===-1?' active down':''}" id="downvote-${post.id}" onclick="vote(${post.id},-1)">
          <i class="fas fa-arrow-down"></i>
        </button>
        <button class="comment-btn" onclick="openPost(${post.id})">
          <i class="fas fa-comment"></i> <span id="cmts-${post.id}">${post.comments}</span>
        </button>
        <button class="save-btn${post.saved?' saved':''}" id="save-${post.id}" onclick="savePost(${post.id})">
          <i class="fa${post.saved?'s':'r'} fa-bookmark"></i>
        </button>
      </div>
    </div>`;
}

async function vote(postId, dir) {
  postId = parseInt(postId);
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;
  // Snapshot previous state for rollback
  const prevVote  = post.userVote;
  const prevVotes = post.votes;
  // Optimistic update
  if (post.userVote === dir) { post.votes -= dir; post.userVote = null; }
  else { if (post.userVote) post.votes -= post.userVote; post.votes += dir; post.userVote = dir; }
  // Update DOM immediately — use querySelectorAll to catch all instances
  function _syncVoteDom() {
    document.querySelectorAll(`[id="votes-${postId}"]`).forEach(el => el.textContent = post.votes);
    document.querySelectorAll(`[id="upvote-${postId}"]`).forEach(el => {
      el.className = 'vote-btn' + (post.userVote === 1  ? ' active'      : '');
    });
    document.querySelectorAll(`[id="downvote-${postId}"]`).forEach(el => {
      el.className = 'vote-btn' + (post.userVote === -1 ? ' active down' : '');
    });
  }
  _syncVoteDom();
  const res = await api('/posts.php?action=vote', 'POST', { post_id: postId, vote_type: dir === 1 ? 'up' : 'down' });
  if (!res.success) {
    // Revert on server error
    post.userVote = prevVote;
    post.votes    = prevVotes;
    _syncVoteDom();
    toast(res.error || 'Could not record vote', 'error');
  }
}

async function savePost(postId) {
  postId = parseInt(postId);
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;
  const newSaved = !post.saved;
  const action = newSaved ? 'save_post' : 'unsave_post';
  // Optimistic update immediately — querySelectorAll catches all instances of this post
  post.saved = newSaved;
  document.querySelectorAll(`[id="save-${postId}"]`).forEach(btn => {
    btn.classList.toggle('saved', newSaved);
    btn.innerHTML = `<i class="fa${newSaved ? 's' : 'r'} fa-bookmark"></i>`;
    if (newSaved) triggerAnim(btn, 'saved', 600);
  });
  const res = await api('/posts.php?action=' + action, 'POST', { post_id: postId });
  if (!res.success) {
    // Revert on failure
    post.saved = !newSaved;
    document.querySelectorAll(`[id="save-${postId}"]`).forEach(btn => {
      btn.classList.toggle('saved', !newSaved);
      btn.innerHTML = `<i class="fa${!newSaved ? 's' : 'r'} fa-bookmark"></i>`;
    });
    toast('Failed', 'error');
  } else {
    toast(newSaved ? 'Post saved!' : 'Removed from saved');
    // Refresh saved page so unsaved posts disappear
    if (state.page === 'saved') renderSavedPosts();
  }
}

async function openPost(postId) {
  postId = parseInt(postId);
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;
  state.viewingPostId = postId;

  const modal = document.getElementById('viewPostModal');
  const contentEl = document.getElementById('viewPostContent');
  if (!modal || !contentEl) return;

  const authorName = post.author ? post.author.name : 'Unknown';
  const authorId   = post.author ? post.author.id   : 0;
  const isOwnPost = state.user && post.author && parseInt(post.author.id) === parseInt(state.user.id);
  contentEl.innerHTML = `
    <div class="modal-post-header" style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
      <span onclick="viewUserProfile(${authorId})" style="cursor:pointer">${avatar(post.author || {}, 44)}</span>
      <div style="flex:1">
        <b style="cursor:pointer" onclick="viewUserProfile(${authorId})">${esc(authorName)}</b>
        <div>${subjectBadge(post.subject)} · ${post.time}</div>
      </div>
      ${isOwnPost ? `<div style="display:flex;gap:6px">
        <button onclick="closeModal('viewPostModal');editOwnPost(${postId})" style="border:none;background:var(--gray-100);border-radius:6px;padding:5px 10px;cursor:pointer;font-size:.8rem;color:var(--navy)" title="Edit post"><i class="fas fa-pen"></i></button>
        <button onclick="deleteOwnPost(${postId})" style="border:none;background:#fef2f2;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:.8rem;color:var(--danger,#ef4444)" title="Delete post"><i class="fas fa-trash"></i></button>
      </div>` : ''}
    </div>
    <h2 style="font-size:1.25rem;font-weight:800;margin-bottom:8px">${esc(post.title)}</h2>
    <p style="color:var(--gray-600);line-height:1.6">${esc(post.body)}</p>
    ${post.fileUrl ? (_isImageMime(post.fileMime) || (!post.fileMime && post.fileUrl.match(/\.(jpe?g|png|gif|webp)(\?|$)/i))
      ? `<img src="${esc(post.fileUrl)}" alt="attachment" style="max-width:100%;border-radius:8px;margin-top:10px;display:block" onerror="this.style.display='none'">`
      : `<a href="${esc(post.fileUrl)}" target="_blank" rel="noopener" class="msg-file-link" style="margin-top:10px;display:inline-flex"><i class="fas ${_fileIcon(post.fileMime)}"></i> ${esc(post.fileName || 'View Attachment')}</a>`) : ''}`;

  const countEl   = document.getElementById('commentCount');
  const listEl    = document.getElementById('commentsList');
  const avatarEl  = document.getElementById('commentAvatar');
  if (countEl)  countEl.textContent = post.comments || 0;
  if (listEl)   listEl.innerHTML = '<div style="padding:12px;color:var(--gray-400);font-size:0.85rem">Loading comments…</div>';
  if (avatarEl) avatarEl.innerHTML = avatar(state.user || {}, 32);

  openModal('viewPostModal');

  const res = await api('/posts.php?action=comments&post_id=' + postId);
  if (listEl) {
    if (res.success && res.data && res.data.length) {
      listEl.innerHTML = res.data.map(c => {
        const isOwn = state.user && parseInt(c.user_id) === parseInt(state.user.id);
        return `
        <div class="comment-item" id="comment-${c.id}" style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px">
          <div style="flex-shrink:0">${avatar({ id: c.user_id, first_name: c.first_name, last_name: c.last_name, avatar_url: c.avatar_url }, 32)}</div>
          <div class="comment-body" style="flex:1;min-width:0">
            <div class="comment-author">${esc((c.first_name||'')+' '+(c.last_name||''))}</div>
            <div class="comment-text">${esc(c.content)}</div>
          </div>
          ${isOwn ? `<button onclick="deleteComment(${c.id})" title="Delete comment" style="border:none;background:none;cursor:pointer;color:var(--gray-400);padding:4px;font-size:.8rem;flex-shrink:0;align-self:center" onmouseover="this.style.color='var(--danger,#ef4444)'" onmouseout="this.style.color='var(--gray-400)'"><i class="fas fa-trash"></i></button>` : ''}
        </div>`;
      }).join('');
    } else {
      listEl.innerHTML = '<div style="padding:12px;color:var(--gray-400);font-size:0.85rem">No comments yet. Be the first!</div>';
    }
  }
}

function togglePostMenu(postId) {
  const menu = document.getElementById('post-menu-' + postId);
  if (!menu) return;
  const isOpen = menu.style.display !== 'none';
  // Close all other open menus
  document.querySelectorAll('[id^="post-menu-"]').forEach(m => { m.style.display = 'none'; });
  if (!isOpen) {
    menu.style.display = 'block';
    // Close on outside click
    setTimeout(() => {
      const handler = (e) => {
        if (!menu.contains(e.target)) { menu.style.display = 'none'; document.removeEventListener('click', handler); }
      };
      document.addEventListener('click', handler);
    }, 0);
  }
}

async function deleteOwnPost(postId) {
  postId = parseInt(postId);
  if (!confirm('Delete this post? This cannot be undone.')) return;
  const res = await api('/posts.php?action=delete&id=' + postId, 'POST');
  if (res.success) {
    state.posts = state.posts.filter(p => p.id !== postId);
    // Remove from DOM
    const card = document.getElementById('post-' + postId);
    if (card) card.remove();
    // Close view modal if open
    if (state.viewingPostId === postId) closeModal('viewPostModal');
    toast('Post deleted');
  } else {
    toast(res.error || 'Failed to delete post', 'error');
  }
}

function editOwnPost(postId) {
  postId = parseInt(postId);
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;
  state.editingPostId = postId;
  const titleEl   = document.getElementById('editPostTitle');
  const contentEl = document.getElementById('editPostContent');
  if (titleEl)   titleEl.value   = post.title || '';
  if (contentEl) contentEl.value = post.body  || '';
  openModal('editPostModal');
}

async function submitEditPost() {
  const postId = state.editingPostId;
  if (!postId) return;
  const title   = (document.getElementById('editPostTitle')?.value   || '').trim();
  const content = (document.getElementById('editPostContent')?.value || '').trim();
  if (!content) { toast('Content is required', 'error'); return; }
  const btn = document.querySelector('#editPostModal .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }
  const res = await api('/posts.php?action=update', 'POST', { post_id: postId, title, content });
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Changes'; }
  if (res.success) {
    const post = state.posts.find(p => p.id === postId);
    if (post) { post.title = title; post.body = content; }
    closeModal('editPostModal');
    // Refresh the view modal if open
    if (state.viewingPostId === postId) openPost(postId);
    // Refresh feed card
    const card = document.getElementById('post-' + postId);
    if (card && post) {
      const newCard = document.createElement('div');
      newCard.innerHTML = renderPostCard(post);
      card.replaceWith(newCard.firstElementChild);
    }
    toast('Post updated!');
  } else {
    toast(res.error || 'Failed to update post', 'error');
  }
}

async function submitComment() {
  const input  = document.getElementById('commentInput');
  const text   = input ? input.value.trim() : '';
  const postId = state.viewingPostId;
  if (!text || !postId) return;

  const res = await api('/posts.php?action=comment', 'POST', { post_id: postId, content: text });
  if (!res.success) { toast('Failed to add comment', 'error'); return; }

  const listEl = document.getElementById('commentsList');
  if (listEl) {
    const placeholder = listEl.querySelector('div[style]');
    if (placeholder) placeholder.remove();
    const u = state.user;
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `<div style="flex-shrink:0">${avatar(u || {}, 32)}</div><div class="comment-body"><div class="comment-author">${esc(u ? (u.first_name||'')+' '+(u.last_name||'') : 'You')}</div><div class="comment-text">${esc(text)}</div></div>`;
    listEl.appendChild(div);
  }
  const post = state.posts.find(p => p.id === postId);
  if (post) post.comments = (post.comments || 0) + 1;
  const countEl = document.getElementById('commentCount');
  if (countEl && post) countEl.textContent = post.comments;
  if (input) input.value = '';
  toast('Comment added!');
}

async function deleteComment(commentId) {
  if (!confirm('Delete this comment?')) return;
  const res = await api('/posts.php?action=delete_comment', 'POST', { comment_id: commentId });
  if (res.success) {
    const el = document.getElementById('comment-' + commentId);
    if (el) el.remove();
    // Decrement comment count
    const post = state.posts.find(p => p.id === state.viewingPostId);
    if (post) post.comments = Math.max(0, (post.comments || 1) - 1);
    const countEl = document.getElementById('commentCount');
    if (countEl && post) countEl.textContent = post.comments;
    toast('Comment deleted');
  } else {
    toast(res.error || 'Failed to delete comment', 'error');
  }
}

function openReportModal(targetType, targetId) {
  state._reportTarget = { type: targetType, id: targetId };
  const modal = document.getElementById('reportModal');
  if (!modal) {
    // Create modal on first use
    const div = document.createElement('div');
    div.innerHTML = `
      <div id="reportModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;align-items:center;justify-content:center">
        <div class="modal-box" style="background:var(--surface);border-radius:16px;padding:28px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3)">
          <h2 style="font-size:1.1rem;font-weight:800;color:var(--navy);margin-bottom:6px"><i class="fas fa-flag" style="color:var(--danger,#ef4444);margin-right:8px"></i>Report Content</h2>
          <p style="font-size:.84rem;color:var(--gray-500);margin-bottom:16px">Help us keep Learnora safe. Select a reason for reporting this content.</p>
          <select id="reportReason" style="width:100%;padding:9px 12px;border:1px solid var(--gray-200);border-radius:8px;font-size:.875rem;margin-bottom:10px;background:var(--surface);color:var(--navy)">
            <option value="spam">Spam</option>
            <option value="harassment">Harassment or bullying</option>
            <option value="inappropriate">Inappropriate content</option>
            <option value="misinformation">Misinformation</option>
            <option value="other">Other</option>
          </select>
          <textarea id="reportDetails" placeholder="Additional details (optional)" style="width:100%;padding:9px 12px;border:1px solid var(--gray-200);border-radius:8px;font-size:.875rem;min-height:72px;resize:vertical;background:var(--surface);color:var(--navy);margin-bottom:16px"></textarea>
          <div style="display:flex;gap:10px;justify-content:flex-end">
            <button onclick="closeModal('reportModal')" class="btn btn-ghost">Cancel</button>
            <button onclick="submitReport()" class="btn btn-primary" style="background:var(--danger,#ef4444)"><i class="fas fa-flag"></i> Submit Report</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
  }
  openModal('reportModal');
}

async function submitReport() {
  const target  = state._reportTarget;
  if (!target) return;
  const reason  = document.getElementById('reportReason')?.value || 'other';
  const details = document.getElementById('reportDetails')?.value?.trim() || '';
  const res = await api('/posts.php?action=report', 'POST', {
    target_type: target.type,
    target_id:   target.id,
    reason,
    details,
  });
  closeModal('reportModal');
  if (res.success) {
    toast('Report submitted. Thank you for helping keep Learnora safe.');
  } else {
    toast(res.error || 'Failed to submit report', 'error');
  }
  state._reportTarget = null;
}

function openCreatePost() {
  openModal('createPostModal');
  const u = state.user;
  if (!u) return;
  const nameEl  = document.getElementById('createPostName');
  const avModal = document.getElementById('createPostAvatarModal');
  if (nameEl)  nameEl.textContent = u.first_name ? u.first_name + ' ' + (u.last_name || '') : (u.name || u.username);
  if (avModal) avModal.innerHTML  = avatar(u, 42);
}

async function submitPost() {
  const title   = document.getElementById('postTitle').value.trim();
  const subject = document.getElementById('postSubject').value;
  const body    = document.getElementById('postContent').value.trim();
  if (!title || !body) { toast('Fill all fields', 'error'); return; }
  if (body.length > POST_MAX_CHARS) { toast(`Content must be ${POST_MAX_CHARS} characters or fewer`, 'error'); return; }

  const pubBtn = document.querySelector('#createPostModal .btn-primary');

  // Upload attachment first if one is pending
  let fileUrl = null;
  if (_pendingPostFile) {
    if (_pendingPostFile.mime === 'text/uri-list') {
      // Link attachment — no upload needed
      fileUrl = _pendingPostFile.url;
    } else {
      if (pubBtn) { pubBtn.disabled = true; pubBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…'; }
      try {
        const up = await _uploadFile(_pendingPostFile.file);
        if (up.success) { fileUrl = up.data.url; }
        else { toast(up.error || 'File upload failed', 'error'); if (pubBtn) { pubBtn.disabled = false; pubBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish'; } return; }
      } catch(e) {
        toast('File upload failed', 'error');
        if (pubBtn) { pubBtn.disabled = false; pubBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish'; }
        return;
      }
      if (pubBtn) { pubBtn.disabled = false; pubBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish'; }
    }
  }

  const postType   = document.getElementById('postType')?.value   || 'general';
  const gradeRange = document.getElementById('postGrade')?.value  || '';
  const payload = { title, content: body, subject, post_type: postType, grade_range: gradeRange };
  if (fileUrl) {
    payload.file_url  = fileUrl;
    payload.file_mime = _pendingPostFile ? _pendingPostFile.mime : '';
    payload.file_name = _pendingPostFile ? (_pendingPostFile.mime === 'text/uri-list' ? 'Shared Link' : _pendingPostFile.name) : '';
  }

  const res = await api('/posts.php?action=create', 'POST', payload);
  if (!res.success) {
    toast(res.error || 'Failed to post', 'error');
    if (pubBtn) { pubBtn.disabled = false; pubBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish'; }
    return;
  }
  state.posts.unshift(normalizePost({ ...res.data,
    first_name: state.user.first_name, last_name: state.user.last_name,
    username: state.user.username, user_grade: state.user.grade, xp: state.user.xp }));
  if (state.user) state.user.posts_count = (state.user.posts_count || 0) + 1;

  clearPostFile();
  closeModal('createPostModal');
  document.getElementById('postTitle').value = '';
  document.getElementById('postContent').value = '';
  renderCommunity();
  toast('Post shared!');
  awardXP(10, 'Sharing study material'); // matches server-side +10 in posts.php
}

/* ── Network ────────────────────────────────────────────────── */
async function renderNetwork() {
  // Use the static tab HTML — just populate the three content divs
  const discoverGrid = document.getElementById('discoverGrid');
  const requestsList = document.getElementById('requestsList');
  const connList     = document.getElementById('connectionsList');
  if (discoverGrid) discoverGrid.innerHTML = skeletons(6, 180);
  if (requestsList) requestsList.innerHTML = skeletons(3, 120);
  if (connList)     connList.innerHTML     = skeletons(4, 120);

  const [suggestRes, pendingRes, sentRes, connRes] = await Promise.all([
    api('/users.php?action=suggestions'),
    api('/users.php?action=pending_requests'),
    api('/users.php?action=sent_requests'),
    state.user ? api('/users.php?action=connections&user_id=' + state.user.id) : Promise.resolve({ success: false }),
  ]);

  state.pendingReceived = (pendingRes.success && pendingRes.data) ? pendingRes.data : [];
  state.pendingSent     = (sentRes.success    && sentRes.data)    ? sentRes.data    : [];

  // Update requests badge (only incoming)
  const badgeEl     = document.getElementById('requestsCount');
  const pendingCount = state.pendingReceived.length;
  if (badgeEl) { badgeEl.textContent = pendingCount; badgeEl.style.display = pendingCount ? '' : 'none'; }

  // Populate Requests tab with filter pills
  if (requestsList) {
    document.getElementById('reqFilterBar')?.remove();
    const total = state.pendingReceived.length + state.pendingSent.length;
    const filterHtml = `
      <div class="grade-pills" id="reqFilterBar" style="margin-bottom:16px">
        <button class="grade-pill active" onclick="filterRequests('all',this)">All (${total})</button>
        <button class="grade-pill" onclick="filterRequests('received',this)">Received (${state.pendingReceived.length})</button>
        <button class="grade-pill" onclick="filterRequests('sent',this)">Sent (${state.pendingSent.length})</button>
      </div>`;
    requestsList.insertAdjacentHTML('beforebegin', filterHtml);
    renderRequestsTab('all');
  }

  // Populate Connections tab
  if (connList) {
    if (connRes.success && connRes.data && connRes.data.length) {
      connList.innerHTML = connRes.data.map(u => {
        const name = ((u.first_name||'')+' '+(u.last_name||'')).trim() || u.username;
        const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
        return `
          <div class="person-card pc-redesign" onclick="viewUserProfile(${u.id})">
            <div class="pc-banner" style="background:${u.cover_color || cardBanner(u.id)}">
              <span class="pc-badge pc-badge--connected"><i class="fas fa-circle"></i> Connected</span>
              <div class="pc-avatar-wrap">
                <div class="pc-avatar">${u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="">` : initials}</div>
              </div>
            </div>
            <div class="pc-body">
              <div class="pc-name">${esc(name)}</div>
              <div class="pc-meta"><i class="fas fa-graduation-cap"></i> Grade ${esc(u.grade||'—')} &nbsp;·&nbsp; <i class="fas fa-star"></i> ${parseInt(u.xp)||0} XP</div>
              <div class="pc-actions">
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();msgUser(${u.id})"><i class="fas fa-comment"></i> Message</button>
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();disconnect(${u.id})"><i class="fas fa-user-minus"></i> Remove</button>
              </div>
            </div>
          </div>`;
      }).join('');
    } else {
      connList.innerHTML = '<div class="empty-state"><i class="fas fa-users empty-icon"></i><p>No connections yet. Start connecting!</p></div>';
    }
  }

  // FIX #1 (network): include avatar_url when building state.networkUsers
  state.networkUsers = (suggestRes.success && suggestRes.data)
    ? suggestRes.data.map(u => ({
        id: parseInt(u.id),
        name: ((u.first_name||'')+' '+(u.last_name||'')).trim() || u.username,
        username: u.username,
        grade: u.grade,
        xp: parseInt(u.xp) || 0,
        bio: u.bio || '',
        avatar_url: u.avatar_url || null,
        connStatus: u.conn_status || 'none',
        connRequesterId: parseInt(u.conn_requester_id) || 0,
      }))
    : [];

  // Build grade pill buttons
  const pillsWrap = document.getElementById('gradeNetPills');
  if (pillsWrap) {
    const grades = [...new Set(state.networkUsers.map(u => u.grade).filter(Boolean))].sort();
    pillsWrap.innerHTML = `<button class="grade-pill active" onclick="filterNetworkGrade('',this)">All</button>`
      + grades.map(g => `<button class="grade-pill" onclick="filterNetworkGrade('${esc(g)}',this)">Grade ${esc(g)}</button>`).join('');
  }

  // Populate Discover tab
  if (discoverGrid) {
    if (!suggestRes.success) {
      discoverGrid.innerHTML = errorCard('Could not load suggestions.', '📡', 'renderNetwork');
    } else {
      discoverGrid.innerHTML = state.networkUsers.length
        ? state.networkUsers.map(u => renderPersonCard(u)).join('')
        : '<div class="empty-state"><i class="fas fa-user-group empty-icon"></i><p>No other students yet. Invite your friends!</p></div>';
    }
  }
}

function switchNetworkTab(tab, btn) {
  document.querySelectorAll('#page-network .tabs .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('netDiscover').style.display    = tab === 'discover'     ? '' : 'none';
  document.getElementById('netRequests').style.display    = tab === 'requests'     ? '' : 'none';
  document.getElementById('netConnections').style.display = tab === 'connections'  ? '' : 'none';
}

function searchNetwork(q) {
  const lower    = q.toLowerCase();
  const filtered = (state.networkUsers || []).filter(u =>
    (u.name     || '').toLowerCase().includes(lower) ||
    (u.username || '').toLowerCase().includes(lower) ||
    (u.bio      || '').toLowerCase().includes(lower)
  );
  const grid = document.getElementById('discoverGrid');
  if (!grid) return;
  grid.innerHTML = filtered.length
    ? filtered.map(renderPersonCard).join('')
    : '<div class="empty-state"><i class="fas fa-magnifying-glass empty-icon"></i><p>No results found</p></div>';
}

function filterNetworkGrade(grade, btn) {
  if (btn) {
    document.querySelectorAll('#gradeNetPills .grade-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
  }
  const filtered = grade
    ? (state.networkUsers || []).filter(u => String(u.grade) === String(grade))
    : (state.networkUsers || []);
  const grid = document.getElementById('discoverGrid');
  if (!grid) return;
  grid.innerHTML = filtered.length
    ? filtered.map(renderPersonCard).join('')
    : '<div class="empty-state"><i class="fas fa-magnifying-glass empty-icon"></i><p>No students in that grade</p></div>';
}

// Pick a deterministic gradient banner for a user (based on their id)
const CARD_BANNERS = [
  'linear-gradient(135deg,#0ea5e9 0%,#0D1B4B 100%)',
  'linear-gradient(135deg,#7c3aed 0%,#1d1b4b 100%)',
  'linear-gradient(135deg,#065f46 0%,#10b981 100%)',
  'linear-gradient(135deg,#e11d48 0%,#7c3aed 100%)',
  'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)',
  'linear-gradient(135deg,#0891b2 0%,#7c3aed 100%)',
  'linear-gradient(135deg,#059669 0%,#29ABE2 100%)',
  'linear-gradient(135deg,#dc2626 0%,#ea580c 100%)',
];
function cardBanner(id) { return CARD_BANNERS[parseInt(id) % CARD_BANNERS.length]; }

function renderPersonCard(u) {
  let connBtn, statusBadge = '';
  if (u.connStatus === 'accepted') {
    connBtn = `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();disconnect(${u.id})"><i class="fas fa-user-check"></i> Connected</button>`;
    statusBadge = `<span class="pc-badge pc-badge--connected"><i class="fas fa-circle"></i> Connected</span>`;
  } else if (u.connStatus === 'pending') {
    connBtn = `<button class="btn btn-ghost btn-sm" disabled><i class="fas fa-clock"></i> Pending</button>`;
    statusBadge = `<span class="pc-badge pc-badge--pending"><i class="fas fa-circle"></i> Pending</span>`;
  } else {
    connBtn = `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();connect(${u.id})"><i class="fas fa-user-plus"></i> Connect</button>`;
  }
  const initials = (u.name || u.username || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  return `
    <div class="person-card pc-redesign" id="person-${u.id}" onclick="viewUserProfile(${u.id})">
      <div class="pc-banner" style="background:${u.cover_color || cardBanner(u.id)}">
        ${statusBadge}
        <div class="pc-avatar-wrap">
          <div class="pc-avatar">${u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="">` : initials}</div>
        </div>
      </div>
      <div class="pc-body">
        <div class="pc-name">${esc(u.name)}</div>
        <div class="pc-meta"><i class="fas fa-graduation-cap"></i> Grade ${esc(u.grade||'—')} &nbsp;·&nbsp; <i class="fas fa-star"></i> ${u.xp} XP</div>
        ${u.bio ? `<p class="pc-bio">${esc(u.bio)}</p>` : ''}
        <div class="pc-actions">
          ${connBtn}
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();msgUser(${u.id})"><i class="fas fa-comment"></i> Message</button>
        </div>
      </div>
    </div>`;
}

function renderPendingCard(u) {
  const name = ((u.first_name||'')+' '+(u.last_name||'')).trim() || u.username;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  return `
    <div class="person-card pc-redesign" id="pending-${u.connection_id}">
      <div class="pc-banner" style="background:${u.cover_color || cardBanner(u.id)}">
        <span class="pc-badge pc-badge--request"><i class="fas fa-user-plus"></i> Wants to connect</span>
        <div class="pc-avatar-wrap">
          <div class="pc-avatar">${u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="">` : initials}</div>
        </div>
      </div>
      <div class="pc-body">
        <div class="pc-name">${esc(name)}</div>
        <div class="pc-meta"><i class="fas fa-graduation-cap"></i> Grade ${esc(u.grade||'—')} &nbsp;·&nbsp; <i class="fas fa-star"></i> ${parseInt(u.xp)||0} XP</div>
        ${u.bio ? `<p class="pc-bio">${esc(u.bio)}</p>` : ''}
        <div class="pc-actions">
          <button class="btn btn-primary btn-sm" onclick="acceptRequest(${u.connection_id})"><i class="fas fa-check"></i> Accept</button>
          <button class="btn btn-outline btn-sm" onclick="rejectRequest(${u.connection_id})"><i class="fas fa-times"></i> Reject</button>
        </div>
      </div>
    </div>`;
}

function filterRequests(filter, btn) {
  if (btn) {
    document.querySelectorAll('#reqFilterBar .grade-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
  }
  state._reqFilter = filter;
  renderRequestsTab(filter);
}

function renderRequestsTab(filter = 'all') {
  const requestsList = document.getElementById('requestsList');
  if (!requestsList) return;
  let html = '';
  if (filter !== 'sent')     html += (state.pendingReceived || []).map(u => renderPendingCard(u)).join('');
  if (filter !== 'received') html += (state.pendingSent     || []).map(u => renderSentCard(u)).join('');
  if (!html) {
    const msg = filter === 'sent' ? 'No sent requests' : filter === 'received' ? 'No incoming requests' : 'No pending requests';
    html = `<div class="empty-state"><i class="fas fa-user-group empty-icon"></i><p>${msg}</p></div>`;
  } else {
    html = `<div class="people-grid">${html}</div>`;
  }
  requestsList.innerHTML = html;
}

function renderSentCard(u) {
  const name     = ((u.first_name||'')+' '+(u.last_name||'')).trim() || u.username;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  return `
    <div class="person-card pc-redesign" id="sent-${u.connection_id}" onclick="viewUserProfile(${u.id})">
      <div class="pc-banner" style="background:${u.cover_color || cardBanner(u.id)}">
        <span class="pc-badge pc-badge--pending"><i class="fas fa-paper-plane"></i> Request Sent</span>
        <div class="pc-avatar-wrap">
          <div class="pc-avatar">${u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="">` : initials}</div>
        </div>
      </div>
      <div class="pc-body">
        <div class="pc-name">${esc(name)}</div>
        <div class="pc-meta"><i class="fas fa-graduation-cap"></i> Grade ${esc(u.grade||'—')} &nbsp;·&nbsp; <i class="fas fa-star"></i> ${parseInt(u.xp)||0} XP</div>
        ${u.bio ? `<p class="pc-bio">${esc(u.bio)}</p>` : ''}
        <div class="pc-actions">
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();cancelRequest(${u.connection_id})"><i class="fas fa-times"></i> Cancel</button>
        </div>
      </div>
    </div>`;
}

async function cancelRequest(connId) {
  connId = parseInt(connId);
  const res = await api('/users.php?action=cancel_request', 'POST', { connection_id: connId });
  if (res.success) {
    state.pendingSent = (state.pendingSent || []).filter(u => u.connection_id !== connId);
    toast('Request cancelled');
    // Refresh the tab and update pill counts
    const bar = document.getElementById('reqFilterBar');
    if (bar) {
      const total = (state.pendingReceived||[]).length + state.pendingSent.length;
      bar.querySelectorAll('.grade-pill')[0].textContent = `All (${total})`;
      bar.querySelectorAll('.grade-pill')[2].textContent = `Sent (${state.pendingSent.length})`;
    }
    renderRequestsTab(state._reqFilter || 'all');
  } else toast(res.error || 'Failed', 'error');
}

async function acceptRequest(connId) {
  connId = parseInt(connId);
  const res = await api('/users.php?action=respond_connection', 'POST', { connection_id: connId, action: 'accept' });
  if (res.success) { toast('Connection accepted!'); await renderNetwork(); }
  else toast(res.error || 'Failed', 'error');
}

async function rejectRequest(connId) {
  connId = parseInt(connId);
  const res = await api('/users.php?action=respond_connection', 'POST', { connection_id: connId, action: 'reject' });
  if (res.success) {
    state.pendingReceived = (state.pendingReceived || []).filter(u => u.connection_id !== connId);
    const bar = document.getElementById('reqFilterBar');
    if (bar) {
      const total = (state.pendingReceived.length) + (state.pendingSent || []).length;
      bar.querySelectorAll('.grade-pill')[0].textContent = `All (${total})`;
      bar.querySelectorAll('.grade-pill')[1].textContent = `Received (${state.pendingReceived.length})`;
    }
    renderRequestsTab(state._reqFilter || 'all');
    toast('Request removed');
  } else toast(res.error || 'Failed', 'error');
}

async function connect(userId) {
  userId = parseInt(userId);
  // Optimistic UI on network card (only if user is in the discover grid)
  const u = state.networkUsers.find(x => x.id === userId);
  if (u) {
    u.connStatus = 'pending';
    const card = document.getElementById('person-' + userId);
    if (card) {
      const actionsEl = card.querySelector('.pc-actions');
      if (actionsEl) actionsEl.innerHTML = `
        <button class="btn btn-ghost btn-sm" disabled><i class="fas fa-clock"></i> Pending</button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();msgUser(${userId})"><i class="fas fa-comment"></i> Message</button>`;
    }
  }
  // Optimistic UI on profile modal connect button (works from any page)
  const modalConnBtn = document.querySelector(`#userProfileBody button[onclick="connect(${userId})"]`);
  if (modalConnBtn) modalConnBtn.outerHTML = `<button class="btn btn-ghost btn-sm" disabled><i class="fas fa-clock"></i> Pending…</button>`;

  const res = await api('/users.php?action=connect', 'POST', { user_id: userId });
  if (!res.success) {
    if (u) {
      u.connStatus = 'none';
      const card2 = document.getElementById('person-' + userId);
      if (card2) {
        const a2 = card2.querySelector('.pc-actions');
        if (a2) a2.innerHTML = `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();connect(${userId})"><i class="fas fa-user-plus"></i> Connect</button><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();msgUser(${userId})"><i class="fas fa-comment"></i> Message</button>`;
      }
    }
    // Restore profile modal button on failure
    const pendingBtn = document.querySelector('#userProfileBody button[disabled]');
    if (pendingBtn && pendingBtn.textContent.includes('Pending')) {
      pendingBtn.outerHTML = `<button class="btn btn-primary btn-sm" onclick="connect(${userId})"><i class="fas fa-user-plus"></i> Connect</button>`;
    }
    toast('Connection request failed', 'error');
    return;
  }
  toast('Connection request sent!', 'success');
}

// FIX #3: use correct disconnect endpoint instead of re-calling connect
async function disconnect(userId) {
  userId = parseInt(userId);
  const res = await api('/users.php?action=disconnect', 'POST', { user_id: userId });
  if (!res.success) { toast('Failed to remove connection', 'error'); return; }
  await renderNetwork();
  toast('Connection removed');
}

function msgUser(userId) {
  userId = parseInt(userId);
  // Close any open modal first
  document.querySelectorAll('.modal-overlay').forEach(m => {
    if (m.style.display !== 'none') closeModal(m.id);
  });
  navigate('messages');
  // Defer so navigate's sync DOM work (show page, set skeletons) finishes first
  setTimeout(() => openRealConversation(userId), 0);
}

async function viewUserProfile(userId) {
  userId = parseInt(userId);
  if (!userId) return;
  const myId = state.user ? parseInt(state.user.id) : 0;
  if (userId === myId) { navigate('profile'); return; }

  const modal = document.getElementById('userProfileModal');
  if (!modal) return;
  const body = document.getElementById('userProfileBody');
  if (body) body.innerHTML = skeletons(1, 160);
  openModal('userProfileModal');

  const res = await api('/users.php?action=profile&id=' + userId);
  if (!res.success || !body) return;
  const u = res.data;
  const name = ((u.first_name||'')+' '+(u.last_name||'')).trim() || u.username;
  const info = getLevelInfo(parseInt(u.xp)||0);
  // Use conn_status from API (returned by profile endpoint) or fall back to networkUsers cache
  const connStatus = u.conn_status || (state.networkUsers.find(x => x.id === userId) || {}).connStatus || 'none';
  const btnHtml = connStatus === 'accepted'
    ? `<button class="btn btn-outline btn-sm" onclick="disconnect(${u.id})">Connected ✓</button>`
    : connStatus === 'pending'
    ? `<button class="btn btn-ghost btn-sm" disabled>Pending…</button>`
    : `<button class="btn btn-primary btn-sm" onclick="connect(${u.id})">Connect</button>`;

  const coverGrad = u.cover_color || 'linear-gradient(135deg,#0D1B4B 0%,#1A2C6B 100%)';
  let userSkills = [], userExps = [];
  try { userSkills = JSON.parse(u.skills || '[]'); } catch {}
  try { userExps   = JSON.parse(u.experiences || '[]'); } catch {}

  body.innerHTML = `
    <div class="up-cover" style="background:${coverGrad}"></div>
    <div class="up-body">
      <div class="up-avatar">${avatar(u, 68)}</div>
      <h2 class="up-name">${esc(name)}</h2>
      <p class="up-meta">@${esc(u.username)} · Grade ${esc(u.grade)} · Level ${info.level} ${esc(info.label)}</p>
      ${u.bio ? `<p class="up-bio">${esc(u.bio)}</p>` : ''}
      ${userSkills.length ? `<div class="up-skills">${userSkills.map(s=>`<span class="skill-chip skill-chip-sm">${esc(s)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="up-stats">
      <div class="up-stat"><strong>${(parseInt(u.xp)||0).toLocaleString()}</strong><span>XP</span></div>
      <div class="up-stat"><strong>${u.connections_count||0}</strong><span>Connections</span></div>
      <div class="up-stat"><strong>${u.posts_count||0}</strong><span>Posts</span></div>
    </div>
    <div class="up-actions">
      ${btnHtml}
      ${connStatus === 'accepted' ? `<button class="btn btn-primary btn-sm" onclick="closeModal('userProfileModal');msgUser(${u.id})"><i class="fas fa-paper-plane"></i> Message</button>` : ''}
    </div>
    ${userExps.length ? `
    <div style="padding:14px 16px;border-top:1px solid var(--gray-100)">
      <div style="font-size:.78rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px"><i class="fas fa-briefcase" style="color:var(--cyan);margin-right:6px"></i>Experience</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${userExps.map(e => `
          <div style="padding:10px 12px;background:var(--gray-50);border-radius:10px;border:1px solid var(--gray-100)">
            <div style="font-weight:700;font-size:.88rem;color:var(--navy)">${esc(e.title)}${e.org ? `<span style="font-weight:400;color:var(--gray-500);margin-left:6px">@ ${esc(e.org)}</span>` : ''}</div>
            ${e.desc ? `<div style="font-size:.80rem;color:var(--gray-500);margin-top:4px;line-height:1.5">${esc(e.desc)}</div>` : ''}
          </div>`).join('')}
      </div>
    </div>` : ''}`;
}

/* ── Messages ───────────────────────────────────────────────── */
async function renderMessages() {
  // Always start in conversation list view on mobile
  const layout = document.getElementById('messagesLayout');
  if (layout) layout.classList.remove('chat-open');

  // Use static HTML structure — just populate conversationList
  const listEl = document.getElementById('conversationList');
  if (listEl) listEl.innerHTML = skeletons(3, 56);

  const res = await api('/messages.php?action=conversations');
  if (!listEl) return;
  if (res.success && res.data && res.data.length) {
    state.conversations = res.data.map(c => ({
      userId: parseInt(c.id),
      user: { id: parseInt(c.id), name: ((c.first_name||'')+' '+(c.last_name||'')).trim()||c.username, username: c.username, avatar_url: c.avatar_url || null },
      lastMsg: c.last_message || '',
      time: msgTime(c.last_time),
      unread: parseInt(c.unread) || 0,
    }));
    listEl.innerHTML = state.conversations.map(renderConvItem).join('');
  } else {
    listEl.innerHTML = '<div class="empty-state" style="padding:24px;text-align:center"><i class="fas fa-comments empty-icon"></i><p>No messages yet. Start a conversation!</p></div>';
  }
}

function renderConvItem(c) {
  const isActive = state.activeConvUserId === c.userId;
  return `
    <div class="conv-item${isActive?' active':''}" onclick="openRealConversation(${c.userId})">
      ${avatar(c.user, 44)}
      <div class="conv-info">
        <span class="conv-name">${esc(c.user.name)}</span>
        <span class="conv-last">${esc(c.lastMsg)}</span>
      </div>
      <div class="conv-meta">
        <span class="conv-time">${c.time}</span>
        ${c.unread ? `<span class="conv-unread">${c.unread}</span>` : ''}
      </div>
    </div>`;
}

function searchConversations(q) {
  if (!state.conversations) return;
  const lower = q.toLowerCase();
  const filtered = state.conversations.filter(c =>
    (c.user.name || '').toLowerCase().includes(lower) ||
    (c.user.username || '').toLowerCase().includes(lower)
  );
  const listEl = document.getElementById('conversationList');
  if (!listEl) return;
  listEl.innerHTML = filtered.length
    ? filtered.map(renderConvItem).join('')
    : '<div style="padding:24px 16px;text-align:center;color:var(--gray-400);font-size:.85rem"><i class="fas fa-magnifying-glass" style="display:block;font-size:1.4rem;margin-bottom:8px;opacity:.5"></i>No conversations found</div>';
}

function closeChatOnMobile() {
  const layout = document.getElementById('messagesLayout');
  if (layout) layout.classList.remove('chat-open');
}

async function openRealConversation(userId) {
  userId = parseInt(userId);
  if (!userId) return;
  state.activeConvUserId = userId;
  const conv = (state.conversations || []).find(c => c.userId === userId);

  // Clear unread count on this conversation and re-render list
  if (conv && conv.unread) {
    conv.unread = 0;
    const listEl = document.getElementById('conversationList');
    if (listEl && state.conversations) listEl.innerHTML = state.conversations.map(renderConvItem).join('');
  }

  // Update conv list active state
  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.querySelector(`.conv-item[onclick="openRealConversation(${userId})"]`);
  if (activeItem) activeItem.classList.add('active');

  // Show chat interface, hide empty state
  const emptyEl = document.getElementById('chatEmpty');
  const iface   = document.getElementById('chatInterface');
  if (emptyEl) emptyEl.style.display = 'none';
  if (iface)   iface.style.display = 'flex';

  // On mobile: switch to chat panel view (Telegram-style)
  const layout = document.getElementById('messagesLayout');
  if (layout && window.innerWidth <= 768) layout.classList.add('chat-open');

  // Set header (use conv data if loaded, otherwise fetch)
  const avatarEl  = document.getElementById('chatAvatar');
  const nameEl    = document.getElementById('chatUserName');
  if (avatarEl) avatarEl.innerHTML = avatar(conv ? conv.user : { id: userId }, 36);
  if (nameEl)   nameEl.textContent = conv ? conv.user.name : 'Loading…';

  // Load messages
  const msgsEl = document.getElementById('chatMessages');
  if (msgsEl) msgsEl.innerHTML = skeletons(3, 60);

  const res  = await api('/messages.php?action=thread&user_id=' + userId);
  if (msgsEl) {
    const myId = state.user ? parseInt(state.user.id) : 0;
    if (res.success && res.data && res.data.length) {
      // If name was loading, try to populate from thread data
      if (nameEl && nameEl.textContent === 'Loading…') {
        const other = res.data.find(m => parseInt(m.sender_id) !== myId);
        if (other) nameEl.textContent = ((other.first_name||'')+' '+(other.last_name||'')).trim() || 'User';
        else nameEl.textContent = 'User';
      }
      msgsEl.innerHTML = res.data.map(m => _msgBubbleHtml(m, myId)).join('');
    } else {
      msgsEl.innerHTML = '<div class="empty-state" style="padding:24px;text-align:center"><i class="fas fa-hand-wave empty-icon"></i><p>Say hello!</p></div>';
    }
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
}

async function sendMessage() {
  const input    = document.getElementById('chatInput');
  const text     = input ? input.value.trim() : '';
  const pending  = _pendingChatFile;
  if (!text && !pending) return;

  const userId = state.activeConvUserId;
  if (!userId) return;

  // Clear input immediately for good UX
  if (input) { input.value = ''; input.style.height = 'auto'; }
  clearChatFile();

  // Upload file first if attached
  let fileUrl = null, fileName = null, fileMime = null;
  if (pending) {
    if (pending.mime === 'text/uri-list') {
      // Link attachment — no upload needed
      fileUrl = pending.url; fileName = 'Shared Link'; fileMime = 'text/uri-list';
    } else {
      const sendBtn = document.querySelector('.chat-send-btn');
      if (sendBtn) sendBtn.disabled = true;
      try {
        const up = await _uploadFile(pending.file);
        if (up.success) { fileUrl = up.data.url; fileName = up.data.name; fileMime = up.data.mime; }
        else { toast(up.error || 'File upload failed', 'error'); if (sendBtn) sendBtn.disabled = false; return; }
      } catch(e) { toast('File upload failed', 'error'); if (sendBtn) sendBtn.disabled = false; return; }
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  const payload = { receiver_id: userId, content: text };
  if (fileUrl) { payload.file_url = fileUrl; payload.file_name = fileName; payload.file_mime = fileMime; }

  const res = await api('/messages.php?action=send', 'POST', payload);
  if (res.success) {
    const msgsEl = document.getElementById('chatMessages');
    if (msgsEl) {
      const empty = msgsEl.querySelector('.empty-state');
      if (empty) empty.remove();
      const newMsg = res.data || {};
      const msgId  = newMsg.id || 0;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = _msgBubbleHtml(newMsg, state.user ? parseInt(state.user.id) : 0);
      const newBubble = tempDiv.firstElementChild;
      if (newBubble) {
        msgsEl.appendChild(newBubble);
      } else {
        const fb = document.createElement('div');
        fb.className = 'chat-msg sent';
        if (msgId) fb.dataset.msgId = msgId;
        const fileHtml = fileUrl ? _fileAttachmentHtml(fileUrl, fileName || 'File', fileMime || '') : '';
        const textHtml = text    ? `<div class="msg-bubble">${esc(text)}</div>` : '';
        fb.innerHTML = `${textHtml}${fileHtml}<span class="msg-time">just now</span>`;
        msgsEl.appendChild(fb);
      }
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }
    const displayText = text || (fileName ? `📎 ${fileName}` : 'File');
    const conv = state.conversations ? state.conversations.find(c => c.userId === userId) : null;
    if (conv) {
      conv.lastMsg = displayText; conv.time = 'just now'; conv.unread = 0;
      state.conversations = [conv, ...state.conversations.filter(c => c.userId !== userId)];
    } else {
      // FIX #2: use partner.name (pre-joined) instead of non-existent first_name/last_name fields
      const partner = state.networkUsers ? state.networkUsers.find(x => x.id === userId) : null;
      const partnerName = partner ? (partner.name || partner.username || 'User') : 'User';
      const newConv = {
        userId,
        user: {
          id: userId,
          name: partnerName,
          username: partner ? partner.username : '',
          avatar_url: partner ? (partner.avatar_url || null) : null,
        },
        lastMsg: displayText, time: 'just now', unread: 0,
      };
      state.conversations = [newConv, ...(state.conversations || [])];
    }
    const listEl = document.getElementById('conversationList');
    if (listEl && state.conversations.length) listEl.innerHTML = state.conversations.map(renderConvItem).join('');
  } else {
    toast('Failed to send message', 'error');
    if (input && text) input.value = text;
  }
}

/* ── Message bubble helper ───────────────────────────────────── */
function _msgBubbleHtml(m, myId) {
  const isSent   = parseInt(m.sender_id) === myId;
  const fileHtml = m.file_url ? _fileAttachmentHtml(m.file_url, m.file_name || 'File', m.file_mime || '') : '';
  const textHtml = m.content  ? `<div class="msg-bubble">${esc(m.content)}${parseInt(m.edited) ? '<span style="font-size:.68rem;opacity:.6;margin-left:4px">(edited)</span>' : ''}</div>` : '';
  const time     = m.created_at ? msgTime(m.created_at) : 'just now';
  const actionsHtml = isSent && m.id ? `
    <div class="msg-actions" style="display:none;gap:4px;align-items:center">
      ${m.content ? `<button title="Edit" onclick="editOwnMessage(${m.id})" style="border:none;background:none;cursor:pointer;color:var(--gray-400);font-size:.75rem;padding:2px 4px" onmouseover="this.style.color='var(--cyan)'" onmouseout="this.style.color='var(--gray-400)'"><i class="fas fa-pen"></i></button>` : ''}
      <button title="Delete" onclick="deleteOwnMessage(${m.id})" style="border:none;background:none;cursor:pointer;color:var(--gray-400);font-size:.75rem;padding:2px 4px" onmouseover="this.style.color='var(--danger,#ef4444)'" onmouseout="this.style.color='var(--gray-400)'"><i class="fas fa-trash"></i></button>
    </div>` : '';
  return `<div class="chat-msg${isSent ? ' sent' : ' received'}"${m.id ? ` data-msg-id="${m.id}"` : ''} onmouseenter="this.querySelector('.msg-actions')&&(this.querySelector('.msg-actions').style.display='flex')" onmouseleave="this.querySelector('.msg-actions')&&(this.querySelector('.msg-actions').style.display='none')">
    ${isSent ? `${actionsHtml}${textHtml}${fileHtml}` : `${textHtml}${fileHtml}`}
    <span class="msg-time">${time}</span>
  </div>`;
}

async function deleteOwnMessage(msgId) {
  if (!confirm('Delete this message?')) return;
  const res = await api('/messages.php?action=delete&id=' + msgId, 'POST');
  if (res.success) {
    const el = document.querySelector(`.chat-msg[data-msg-id="${msgId}"]`);
    if (el) el.remove();
    toast('Message deleted');
  } else {
    toast('Failed to delete message', 'error');
  }
}

const _msgEditCache = {}; // msgId → original innerHTML

async function editOwnMessage(msgId) {
  const el = document.querySelector(`.chat-msg[data-msg-id="${msgId}"]`);
  if (!el) return;
  const bubble = el.querySelector('.msg-bubble');
  if (!bubble) return;
  // Get current text (strip the "(edited)" span if present)
  const currentText = bubble.childNodes[0]?.textContent?.trim() || '';
  // Store original HTML for cancel
  _msgEditCache[msgId] = el.innerHTML;
  el.innerHTML = `
    <div style="display:flex;gap:6px;align-items:flex-end;width:100%">
      <textarea style="flex:1;border:1.5px solid var(--cyan);border-radius:10px;padding:8px 10px;font-size:.9rem;resize:none;font-family:inherit;min-height:60px"></textarea>
      <div style="display:flex;flex-direction:column;gap:4px">
        <button onclick="submitEditMessage(${msgId},this)" style="border:none;background:var(--cyan);color:#fff;border-radius:6px;padding:5px 8px;cursor:pointer;font-size:.75rem"><i class="fas fa-check"></i></button>
        <button onclick="cancelEditMessage(${msgId})" style="border:none;background:var(--gray-200);border-radius:6px;padding:5px 8px;cursor:pointer;font-size:.75rem"><i class="fas fa-xmark"></i></button>
      </div>
    </div>`;
  const ta = el.querySelector('textarea');
  if (ta) { ta.value = currentText; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
}

async function submitEditMessage(msgId, btn) {
  const el = document.querySelector(`.chat-msg[data-msg-id="${msgId}"]`);
  if (!el) return;
  const ta = el.querySelector('textarea');
  const newText = ta ? ta.value.trim() : '';
  if (!newText) { toast('Message cannot be empty', 'error'); return; }
  if (btn) btn.disabled = true;
  const res = await api('/messages.php?action=edit', 'POST', { message_id: msgId, content: newText });
  if (res.success) {
    const myId = state.user ? parseInt(state.user.id) : 0;
    const newHtml = _msgBubbleHtml({ id: msgId, sender_id: myId, content: newText, edited: 1 }, myId);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newHtml;
    el.replaceWith(tempDiv.firstElementChild);
    delete _msgEditCache[msgId];
    toast('Message updated');
  } else {
    toast('Failed to update message', 'error');
    if (btn) btn.disabled = false;
  }
}

function cancelEditMessage(msgId) {
  const el = document.querySelector(`.chat-msg[data-msg-id="${msgId}"]`);
  if (el && _msgEditCache[msgId]) {
    el.innerHTML = _msgEditCache[msgId];
    delete _msgEditCache[msgId];
  }
}

function openNewMessage() {
  const inp = document.getElementById('newMsgSearch');
  const res = document.getElementById('newMsgResults');
  if (inp) inp.value = '';
  if (res) res.innerHTML = '';
  openModal('newMessageModal');
}
function openNewMessageModal() { openNewMessage(); }

/* ── Profile ────────────────────────────────────────────────── */
async function renderProfile() {
  const u    = state.user || {};
  const info = getLevelInfo(state.xp);
  const displayName = ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username || 'Student';

  // Always re-fetch full profile (includes cover_color, skills, experiences, fav_subjects)
  if (u.id) {
    const r = await api('/users.php?action=profile&id=' + u.id);
    if (r.success && r.data) {
      state.user.posts_count       = parseInt(r.data.posts_count)       || 0;
      state.user.connections_count = parseInt(r.data.connections_count) || 0;
      state.user.quizzes_count     = parseInt(r.data.quizzes_count)     || 0;
      state.user.cover_color       = r.data.cover_color  || null;
      state.user.skills            = r.data.skills       || null;
      state.user.experiences       = r.data.experiences  || null;
      state.user.fav_subjects      = r.data.fav_subjects || '[]';
    }
  }

  const postsCount   = u.posts_count       || 0;
  const friendsCount = u.connections_count || 0;
  const quizCount    = u.quizzes_count     || 0;

  // Fill static HTML elements
  const nameEl = document.getElementById('profileName');
  const headEl = document.getElementById('profileHeadline');
  const locEl  = document.getElementById('profileLocation');
  const xpEl   = document.getElementById('profileXP');
  const connEl  = document.getElementById('profileConnections');
  const postEl  = document.getElementById('profilePosts');
  const quizEl  = document.getElementById('profileQuizzes');
  const avWrap  = document.getElementById('profileAvatar');

  if (nameEl) nameEl.textContent = displayName;
  if (headEl) headEl.textContent = '@' + (u.username || '') + ' · Grade ' + (u.grade || '—') + ' · Level ' + info.level + ' ' + info.label;
  if (locEl)  locEl.innerHTML = u.location ? `<i class="fas fa-location-dot" style="margin-right:4px"></i>${esc(u.location)}` : '';
  if (locEl)  locEl.style.display = u.location ? '' : 'none';
  if (xpEl)   { xpEl.textContent = '0'; animateCounter(xpEl, state.xp, 900); }
  if (connEl) animateCounter(connEl, friendsCount);
  if (postEl) animateCounter(postEl, postsCount);
  if (quizEl) animateCounter(quizEl, quizCount);
  if (avWrap) avWrap.innerHTML = avatar(u, 82);

  // Apply cover color/gradient
  const coverEl = document.getElementById('profileCover');
  if (coverEl) {
    coverEl.style.background = state.user.cover_color || '';
    if (!state.user.cover_color) coverEl.style.background = '';
  }

  // Badges sidebar
  const badgesEl = document.getElementById('profileBadges');
  if (badgesEl) {
    const earned = getAchievements().filter(a => a.earned);
    badgesEl.innerHTML = earned.length
      ? `<div class="badge-chips">${earned.map(a => `<span class="badge-chip"><span>${a.icon}</span>${esc(a.name)}</span>`).join('')}</div>`
      : '<p style="color:var(--gray-400);font-size:0.85rem">No achievements yet — keep learning!</p>';
  }

  // Connections preview sidebar
  loadConnectionsPreview();

  // Fav subjects sidebar
  loadFavSubjectsSidebar();

  // Load posts tab by default
  loadProfilePostsFeed();
}

async function loadConnectionsPreview() {
  const el = document.getElementById('profileConnectionsPreview');
  if (!el || !state.user) return;
  el.innerHTML = skeletons(2, 40);
  const res = await api('/users.php?action=connections&user_id=' + state.user.id);
  if (res.success && res.data && res.data.length) {
    el.innerHTML = res.data.slice(0, 6).map(c => {
      const name = ((c.first_name||'')+' '+(c.last_name||'')).trim() || c.username;
      return `<div class="conn-prev-item" onclick="viewUserProfile(${c.id})">
        ${avatar(c, 36)}
        <div><div class="conn-prev-name">${esc(name)}</div><div class="conn-prev-grade">Grade ${esc(c.grade)}</div></div>
      </div>`;
    }).join('');
  } else {
    el.innerHTML = '<p style="color:var(--gray-400);font-size:0.85rem;text-align:center;padding:8px 0">No connections yet</p>';
  }
}

async function loadFavSubjectsSidebar() {
  const el = document.getElementById('profileFavSubjects');
  if (!el || !state.user) return;
  el.innerHTML = skeletons(1, 28);
  const subRes = await api('/quiz.php?action=subjects');
  const subjects = (subRes.success && subRes.data) ? subRes.data : [];
  let favIds = [];
  try { favIds = JSON.parse(state.user.fav_subjects || '[]'); } catch {}
  const favSubjects = subjects.filter(s => favIds.includes(parseInt(s.id)));
  if (!favSubjects.length) {
    el.innerHTML = '<p style="color:var(--gray-400);font-size:0.85rem;text-align:center;padding:4px 0">No favourites yet</p>';
    return;
  }
  el.innerHTML = `<div class="fav-subj-sidebar-list">${favSubjects.map(s => `
    <div class="fav-subj-sidebar-item" style="--chip-color:${s.color||'var(--cyan)'}">
      <span class="fav-subj-sidebar-icon" style="background:${s.color||'var(--cyan)'}22;color:${s.color||'var(--cyan)'}">${_iconHtml(s.icon,'1rem') || '📚'}</span>
      <span class="fav-subj-sidebar-name">${esc(s.name)}</span>
    </div>`).join('')}</div>`;
}

/* ── Cover Picker ────────────────────────────────────────────── */
function openCoverPicker() {
  const modal = document.getElementById('coverPickerModal');
  if (!modal) return;
  const grid = document.getElementById('coverThemeGrid');
  const currentColor = (state.user || {}).cover_color || '';
  // Pre-populate so Save works even if user doesn't change selection
  state._pendingCoverColor = currentColor || COVER_THEMES[0].gradient;
  if (grid) {
    grid.innerHTML = COVER_THEMES.map(t => `
      <div class="cover-theme-btn${currentColor===t.gradient?' selected':''}" style="background:${t.gradient}"
           onclick="selectCoverTheme('${t.id}',this)" title="${t.label}">
        <span class="cover-theme-label">${t.label}</span>
      </div>`).join('');
  }
  openModal('coverPickerModal');
}

function selectCoverTheme(themeId, btn) {
  document.querySelectorAll('.cover-theme-btn').forEach(b => b.classList.remove('selected'));
  if (btn) btn.classList.add('selected');
  const theme = COVER_THEMES.find(t => t.id === themeId);
  if (theme) {
    const coverEl = document.getElementById('profileCover');
    if (coverEl) coverEl.style.background = theme.gradient;
    state._pendingCoverColor = theme.gradient;
  }
}

async function saveCoverColor() {
  const color = state._pendingCoverColor;
  if (!color) { closeModal('coverPickerModal'); return; }
  const res = await api('/users.php?action=update_extras', 'POST', { cover_color: color });
  if (res.success) {
    if (state.user) state.user.cover_color = color;
    // Apply cover immediately so user sees the change right away
    const coverEl = document.getElementById('profileCover');
    if (coverEl) coverEl.style.background = color;
    toast('Cover updated!');
  } else {
    toast(res.error || 'Failed to save', 'error');
  }
  state._pendingCoverColor = null;
  closeModal('coverPickerModal');
}

/* ── About Tab: Skills & Experiences ─────────────────────────── */
function loadAboutTab() {
  const u    = state.user || {};
  const info = getLevelInfo(state.xp);
  const el   = document.getElementById('profileAboutContent');
  if (!el) return;

  let skills = [];
  let exps   = [];
  try { skills = JSON.parse(u.skills || '[]'); }      catch {}
  try { exps   = JSON.parse(u.experiences || '[]'); } catch {}

  state._editSkills = [...skills];
  state._editExps   = [...exps];

  el.innerHTML = `
    <div class="about-section">
      <div class="about-section-hd">
        <i class="fas fa-chart-line" style="color:var(--cyan)"></i> Level Progress
      </div>
      <div class="progress-bar" style="margin:8px 0 4px"><div class="progress-fill" style="width:${info.pct}%"></div></div>
      <div style="font-size:0.78rem;color:var(--gray-400)">${state.xp.toLocaleString()} / ${info.nextXP.toLocaleString()} XP · Level ${info.level} — ${info.label}</div>
    </div>

    <div class="about-section">
      <div class="about-section-hd"><i class="fas fa-bolt" style="color:var(--warning)"></i> Skills</div>
      <div class="chips-wrap" id="skillsChips">
        ${skills.map((s,i) => `<span class="skill-chip">${esc(s)}<button class="chip-remove" onclick="removeSkillChip(${i})">×</button></span>`).join('')}
        ${!skills.length ? '<span style="color:var(--gray-400);font-size:0.82rem">No skills added yet</span>' : ''}
      </div>
      <div class="skill-add-row" style="margin-top:10px">
        <input id="skillInput" class="form-control" style="font-size:0.85rem;padding:7px 12px" placeholder="Add a skill (e.g. Mathematics)…" onkeydown="if(event.key==='Enter'){addSkillChip();event.preventDefault()}">
        <button class="btn btn-sm btn-outline" onclick="addSkillChip()"><i class="fas fa-plus"></i></button>
      </div>
    </div>

    <div class="about-section">
      <div class="about-section-hd"><i class="fas fa-briefcase" style="color:var(--cyan)"></i> Experiences</div>
      <div id="expList">
        ${exps.map((e,i) => `
          <div class="exp-item">
            <div class="exp-hd">
              <div><strong class="exp-title">${esc(e.title)}</strong>${e.org?`<span class="exp-org">@ ${esc(e.org)}</span>`:''}</div>
              <button class="exp-remove-btn" onclick="removeExpItem(${i})"><i class="fas fa-xmark"></i></button>
            </div>
            ${e.desc?`<p class="exp-desc">${esc(e.desc)}</p>`:''}
          </div>`).join('')}
        ${!exps.length ? '<p style="color:var(--gray-400);font-size:0.82rem;margin-bottom:10px">No experiences added yet</p>' : ''}
      </div>
      <button class="btn btn-sm btn-ghost" id="showExpFormBtn" onclick="showAddExpForm()"><i class="fas fa-plus"></i> Add Experience</button>
      <div class="add-exp-form" id="addExpForm" style="display:none">
        <input id="expTitle" class="form-control" style="font-size:0.85rem;padding:7px 12px;margin-bottom:8px" placeholder="Title (e.g. Math Olympiad 2023)">
        <input id="expOrg"   class="form-control" style="font-size:0.85rem;padding:7px 12px;margin-bottom:8px" placeholder="Organisation / School (optional)">
        <textarea id="expDesc" class="form-control" style="font-size:0.85rem;padding:7px 12px;margin-bottom:10px;resize:vertical" placeholder="Description…" rows="2"></textarea>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-primary" onclick="addExpItem()">Add</button>
          <button class="btn btn-sm btn-ghost" onclick="document.getElementById('addExpForm').style.display='none'">Cancel</button>
        </div>
      </div>
    </div>

    ${u.bio ? `<div class="about-section"><div class="about-section-hd"><i class="fas fa-user" style="color:var(--gray-400)"></i> Bio</div><p style="font-size:0.875rem;line-height:1.6;color:var(--gray-700)">${esc(u.bio)}</p></div>` : ''}

    <div class="about-section" style="border:none;padding-bottom:0">
      <div class="about-section-hd"><i class="fas fa-calendar" style="color:var(--gray-400)"></i> Member Info</div>
      <p style="font-size:0.82rem;color:var(--gray-500)">Joined ${u.created_at ? new Date(u.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'}) : '—'}</p>
    </div>

    <button class="btn btn-primary w-full" style="margin-top:16px" onclick="saveAboutTab()"><i class="fas fa-floppy-disk"></i> Save Changes</button>
  `;
}

function addSkillChip() {
  const inp = document.getElementById('skillInput');
  const val = inp ? inp.value.trim() : '';
  if (!val) return;
  if (state._editSkills.includes(val)) { toast('Already added', 'error'); return; }
  state._editSkills.push(val);
  if (inp) inp.value = '';
  const wrap = document.getElementById('skillsChips');
  if (wrap) {
    wrap.innerHTML = state._editSkills.map((s,i) => `<span class="skill-chip">${esc(s)}<button class="chip-remove" onclick="removeSkillChip(${i})">×</button></span>`).join('');
  }
}

function removeSkillChip(idx) {
  state._editSkills.splice(idx, 1);
  const wrap = document.getElementById('skillsChips');
  if (wrap) {
    wrap.innerHTML = state._editSkills.map((s,i) => `<span class="skill-chip">${esc(s)}<button class="chip-remove" onclick="removeSkillChip(${i})">×</button></span>`).join('');
    if (!state._editSkills.length) wrap.innerHTML = '<span style="color:var(--gray-400);font-size:0.82rem">No skills added yet</span>';
  }
}

function showAddExpForm() {
  const f = document.getElementById('addExpForm');
  if (f) { f.style.display = ''; document.getElementById('expTitle').focus(); }
}

function addExpItem() {
  const title = (document.getElementById('expTitle')?.value || '').trim();
  const org   = (document.getElementById('expOrg')?.value   || '').trim();
  const desc  = (document.getElementById('expDesc')?.value  || '').trim();
  if (!title) { toast('Title is required', 'error'); return; }
  state._editExps.push({ title, org, desc });
  const expTitle = document.getElementById('expTitle');
  const expOrg   = document.getElementById('expOrg');
  const expDesc  = document.getElementById('expDesc');
  if (expTitle) expTitle.value = '';
  if (expOrg)   expOrg.value   = '';
  if (expDesc)  expDesc.value  = '';
  document.getElementById('addExpForm').style.display = 'none';
  const listEl = document.getElementById('expList');
  if (listEl) {
    listEl.innerHTML = state._editExps.map((e,i) => `
      <div class="exp-item">
        <div class="exp-hd">
          <div><strong class="exp-title">${esc(e.title)}</strong>${e.org?`<span class="exp-org">@ ${esc(e.org)}</span>`:''}</div>
          <button class="exp-remove-btn" onclick="removeExpItem(${i})"><i class="fas fa-xmark"></i></button>
        </div>
        ${e.desc?`<p class="exp-desc">${esc(e.desc)}</p>`:''}
      </div>`).join('');
  }
}

function removeExpItem(idx) {
  state._editExps.splice(idx, 1);
  const listEl = document.getElementById('expList');
  if (listEl) {
    listEl.innerHTML = state._editExps.map((e,i) => `
      <div class="exp-item">
        <div class="exp-hd">
          <div><strong class="exp-title">${esc(e.title)}</strong>${e.org?`<span class="exp-org">@ ${esc(e.org)}</span>`:''}</div>
          <button class="exp-remove-btn" onclick="removeExpItem(${i})"><i class="fas fa-xmark"></i></button>
        </div>
        ${e.desc?`<p class="exp-desc">${esc(e.desc)}</p>`:''}
      </div>`).join('');
    if (!state._editExps.length) listEl.innerHTML = '<p style="color:var(--gray-400);font-size:0.82rem;margin-bottom:10px">No experiences added yet</p>';
  }
}

async function saveAboutTab() {
  const res = await api('/users.php?action=update_extras', 'POST', {
    skills: state._editSkills || [],
    experiences: state._editExps || [],
  });
  if (res.success) {
    if (state.user) {
      state.user.skills      = JSON.stringify(state._editSkills || []);
      state.user.experiences = JSON.stringify(state._editExps   || []);
    }
    toast('Profile saved!');
  } else {
    toast('Save failed', 'error');
  }
}

async function loadProfilePostsFeed() {
  const el = document.getElementById('profilePostsFeed');
  if (!el || !state.user) return;
  el.innerHTML = skeletons(3);
  const res = await api('/posts.php?action=feed&user_id=' + state.user.id);
  if (res.success && res.data && res.data.posts) {
    const myPosts = res.data.posts.map(normalizePost);
    // Merge into state.posts so vote/save actions work everywhere
    myPosts.forEach(p => { if (!state.posts.find(sp => sp.id === p.id)) state.posts.push(p); });
    el.innerHTML = myPosts.length
      ? `<div class="post-feed">${myPosts.map(renderPostCard).join('')}</div>`
      : '<div class="empty-state"><i class="fas fa-pen-to-square empty-icon"></i><p>You haven\'t posted anything yet</p></div>';
  } else {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-pen-to-square empty-icon"></i><p>You haven\'t posted anything yet</p></div>';
  }
  loadConnectionsPreview();
}

async function loadProfileQuizzesTab() {
  const el = document.getElementById('profileQuizzesContent');
  if (!el || !state.user) return;
  el.innerHTML = skeletons(3);

  const [histRes, subRes] = await Promise.all([
    api('/quiz.php?action=history&user_id=' + state.user.id),
    api('/quiz.php?action=subjects'),
  ]);

  const history  = (histRes.success && histRes.data)  ? histRes.data  : [];
  const subjects = (subRes.success  && subRes.data)   ? subRes.data   : [];

  // Parse fav subject IDs
  let favIds = [];
  try { favIds = JSON.parse(state.user.fav_subjects || '[]'); } catch {}
  const favSubjects = subjects.filter(s => favIds.includes(parseInt(s.id)));

  // Compute stats from history
  const totalAttempts = history.length;
  const avgScore = totalAttempts
    ? Math.round(history.reduce((sum, h) => sum + Math.round((h.score / h.total_questions) * 100), 0) / totalAttempts)
    : 0;
  const totalXP = history.reduce((sum, h) => sum + parseInt(h.xp_earned || 0), 0);

  function scoreColor(pct) {
    if (pct >= 80) return 'var(--success)';
    if (pct >= 50) return 'var(--warning)';
    return 'var(--danger)';
  }
  function scoreLabel(pct) {
    if (pct >= 90) return 'Excellent';
    if (pct >= 70) return 'Good';
    if (pct >= 50) return 'Fair';
    return 'Needs Work';
  }
  function fmtTime(secs) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60), s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
  function timeAgo(dt) {
    if (!dt) return '';
    const diff = Math.floor((Date.now() - new Date(dt)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
  }

  el.innerHTML = `
    <!-- Fav Subjects -->
    <div class="about-section">
      <div class="about-section-hd"><i class="fas fa-star" style="color:var(--warning)"></i> Favourite Subjects</div>
      ${favSubjects.length
        ? `<div class="chips-wrap">${favSubjects.map(s => `
            <span class="fav-subject-chip" style="--chip-color:${s.color||'var(--cyan)'}">
              <span class="fav-subj-icon">${_iconHtml(s.icon,'0.9rem') || '📚'}</span>${esc(s.name)}
            </span>`).join('')}</div>`
        : `<p style="color:var(--gray-400);font-size:0.85rem;margin:0">
            No favourite subjects yet — star subjects on the Quizzes page!
           </p>`}
    </div>

    <!-- Quiz Stats Summary -->
    <div class="about-section">
      <div class="about-section-hd"><i class="fas fa-chart-bar" style="color:var(--cyan)"></i> Quiz Stats</div>
      <div class="quiz-stat-grid">
        <div class="quiz-stat-card">
          <div class="quiz-stat-val">${totalAttempts}</div>
          <div class="quiz-stat-lbl">Quizzes Taken</div>
        </div>
        <div class="quiz-stat-card">
          <div class="quiz-stat-val" style="color:${scoreColor(avgScore)}">${totalAttempts ? avgScore + '%' : '—'}</div>
          <div class="quiz-stat-lbl">Avg Score</div>
        </div>
        <div class="quiz-stat-card">
          <div class="quiz-stat-val" style="color:var(--warning)">${totalXP.toLocaleString()}</div>
          <div class="quiz-stat-lbl">XP Earned</div>
        </div>
      </div>
    </div>

    <!-- Quiz History -->
    <div class="about-section" style="border:none;padding-bottom:0">
      <div class="about-section-hd"><i class="fas fa-clock-rotate-left" style="color:var(--gray-400)"></i> Recent Attempts</div>
      ${history.length
        ? history.map(h => {
            const pct = Math.round((h.score / h.total_questions) * 100);
            return `
              <div class="quiz-history-item">
                <div class="qhi-left">
                  <span class="qhi-icon">${_iconHtml(h.icon,'1.4rem') || '<i class="fas fa-pen-to-square" style="font-size:1.4rem"></i>'}</span>
                  <div class="qhi-info">
                    <div class="qhi-title">${esc(h.title)}</div>
                    <div class="qhi-meta">${esc(h.subject_name)} · ${timeAgo(h.completed_at)}${h.time_taken ? ' · ' + fmtTime(parseInt(h.time_taken)) : ''}</div>
                  </div>
                </div>
                <div class="qhi-right">
                  <div class="qhi-score" style="color:${scoreColor(pct)}">${h.score}/${h.total_questions}</div>
                  <div class="qhi-badge" style="background:${scoreColor(pct)}20;color:${scoreColor(pct)}">${scoreLabel(pct)}</div>
                </div>
              </div>`;
          }).join('')
        : '<div class="empty-state" style="padding:24px 0"><i class="fas fa-graduation-cap empty-icon"></i><p>No quizzes taken yet</p></div>'
      }
    </div>
  `;
}


function switchProfileTab(tab, btn) {
  document.querySelectorAll('#page-profile .tabs .tab-btn').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const panes = ['profilePosts-tab','profileQuizzes-tab','profileAbout-tab'];
  panes.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  if (tab === 'posts') {
    const el = document.getElementById('profilePosts-tab');
    if (el) { el.style.display = 'block'; loadProfilePostsFeed(); }
  } else if (tab === 'quizzes') {
    const el = document.getElementById('profileQuizzes-tab');
    if (el) { el.style.display = 'block'; loadProfileQuizzesTab(); }
  } else if (tab === 'about') {
    const el = document.getElementById('profileAbout-tab');
    if (el) { el.style.display = 'block'; loadAboutTab(); }
  }
}

/* ── Achievements ───────────────────────────────────────────── */
function getAchievements() {
  const xp      = state.xp;
  const level   = getLevelInfo(xp).level;
  const u       = state.user || {};
  const posts   = u.posts_count       || 0;
  const friends = u.connections_count || 0;
  return ACHIEVEMENTS.map(a => {
    let earned = false;
    if (a.id === 3)  earned = level >= 5;
    if (a.id === 4)  earned = friends >= 10;
    if (a.id === 5)  earned = posts >= 5;
    if (a.id === 6)  earned = (u.comments_count || 0) >= 20;
    if (a.id === 7)  earned = (u.total_upvotes_received || 0) >= 50;
    if (a.id === 8)  earned = (u.leaderboard_rank || 999) === 1;
    if (a.id === 9)  earned = (u.saved_posts_count || 0) >= 15;
    if (a.id === 12) earned = level >= 10;
    return { ...a, earned };
  });
}

function renderAchievements() {
  const container = document.getElementById('achievementsContent');
  if (!container) return;
  const achievements = getAchievements();
  const earnedCount  = achievements.filter(a => a.earned).length;
  container.innerHTML = `
    <p style="margin-bottom:16px;color:var(--gray-500)">${earnedCount} / ${achievements.length} earned</p>
    <div class="achievements-grid">
      ${achievements.map(a=>`
        <div class="achievement-card${a.earned?'':' locked'}">
          <div class="achievement-icon" style="width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.3rem;color:#fff;background:${a.iconBg||'var(--grad-brand)'}${a.earned?'':';filter:grayscale(1);opacity:0.5'}">${a.icon}</div>
          <h3>${a.name}</h3>
          <p>${a.desc}</p>
          ${a.earned?'<span class="badge badge-success">Earned</span>':'<span class="badge badge-secondary">Locked</span>'}
        </div>`).join('')}
    </div>`;
}

/* ── Saved Posts ─────────────────────────────────────────────── */
async function renderSavedPosts() {
  const container = document.getElementById('savedPostsContent');
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner" style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--gray-400)"></i></div>';
  const res = await api('/posts.php?action=saved');
  if (!res.success) {
    container.innerHTML = `<div class="error-card"><div class="error-card-icon">⚠️</div><p class="error-card-title">Could not load saved posts</p><button class="btn btn-primary error-card-retry" onclick="renderSavedPosts()">Retry</button></div>`;
    return;
  }
  const posts = res.data?.posts || [];
  if (!posts.length) {
    container.innerHTML = `<div class="empty-state" style="text-align:center;padding:60px 20px">
      <div style="font-size:3rem;margin-bottom:12px">🔖</div>
      <p style="font-size:1.1rem;font-weight:600;color:var(--navy);margin-bottom:6px">No saved posts yet</p>
      <p style="color:var(--gray-500);margin-bottom:20px">Bookmark posts from the Community to find them here.</p>
      <button class="btn btn-primary" onclick="navigate('community')">Browse Community</button>
    </div>`;
    return;
  }
  // Normalize raw API data and merge into state.posts so vote/save helpers work
  const normalizedPosts = posts.map(normalizePost);
  normalizedPosts.forEach(p => {
    const idx = state.posts.findIndex(sp => sp.id === p.id);
    if (idx === -1) state.posts.push(p);
    else Object.assign(state.posts[idx], p);
  });
  container.innerHTML = normalizedPosts.map(p => renderPostCard(p)).join('');
}

/* ── Settings ───────────────────────────────────────────────── */
function renderSettings() {
  const u = state.user || {};
  const fn    = document.getElementById('settFirstName');
  const ln    = document.getElementById('settLastName');
  const bio   = document.getElementById('settBio');
  const loc   = document.getElementById('settLocation');
  const grade = document.getElementById('settGrade');
  const email = document.getElementById('settEmail');
  const tzSel = document.getElementById('settTimezone');
  if (fn)    fn.value    = u.first_name || (u.name ? u.name.split(' ')[0] : '');
  if (ln)    ln.value    = u.last_name  || (u.name ? u.name.split(' ').slice(1).join(' ') : '');
  if (bio)   bio.value   = u.bio || '';
  if (loc)   loc.value   = u.location || '';
  if (grade && u.grade) grade.value = u.grade;
  if (email) email.value = u.email || '';
  // Populate timezone select
  if (tzSel) {
    const savedTz = u.preferred_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    tzSel.innerHTML = tzOptionsHtml(savedTz);
  }

  // Show/hide remove photo button
  const removePbtn = document.getElementById('removePhotoBtn');
  if (removePbtn) removePbtn.style.display = u.avatar_url ? '' : 'none';

  // Populate avatar preview in settings
  const preview = document.getElementById('settAvatarPreview');
  if (preview) {
    const overlay = document.getElementById('settAvatarOverlay');
    if (u.avatar_url) {
      // Remove any initials placeholder first
      Array.from(preview.childNodes).forEach(n => { if (n !== overlay) n.remove(); });
      const img = document.createElement('img');
      img.src = u.avatar_url;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
      preview.insertBefore(img, overlay);
    } else {
      Array.from(preview.childNodes).forEach(n => { if (n !== overlay) n.remove(); });
      const name = ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username || 'U';
      const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
      const span = document.createElement('span');
      span.textContent = initials;
      span.style.cssText = 'font-weight:700;font-size:1.6rem;color:var(--navy)';
      preview.insertBefore(span, overlay);
    }
  }
}

async function uploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;

  const preview = document.getElementById('settAvatarPreview');
  const overlay = document.getElementById('settAvatarOverlay');

  // Show local preview immediately
  const reader = new FileReader();
  reader.onload = e => {
    // Re-fetch in case user navigated away before FileReader finished
    const preview = document.getElementById('settAvatarPreview');
    const overlay = document.getElementById('settAvatarOverlay');
    if (!preview) return;
    Array.from(preview.childNodes).forEach(n => { if (n !== overlay) n.remove(); });
    const img = document.createElement('img');
    img.src = e.target.result;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
    preview.insertBefore(img, overlay);
  };
  reader.readAsDataURL(file);

  const btn = preview.closest('.form-group')?.querySelector('button');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…'; }

  const form = new FormData();
  form.append('file', file);
  form.append('type', 'avatar');

  try {
    const res = await fetch(`${API}/upload.php`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + (state.token || '') },
      body: form,
    });
    const data = await res.json();
    if (data.success) {
      state.user.avatar_url = data.data?.url || null;
      updateSidebarUser();
      // Also refresh profile page avatar if currently visible
      const avWrap = document.getElementById('profileAvatar');
      if (avWrap) avWrap.innerHTML = avatar(state.user, 82);
      toast('Profile photo updated!');
    } else {
      toast(data.error || 'Upload failed', 'error');
    }
  } catch (err) {
    toast('Upload failed. Please try again.', 'error');
  } finally {
    input.value = '';
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> Upload Photo'; }
  }
}

async function removeAvatar() {
  const btn = document.getElementById('removePhotoBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
  const res = await api('/users.php?action=remove_avatar', 'POST');
  if (res.success) {
    state.user.avatar_url = null;
    updateSidebarUser();
    renderSettings();
    const avWrap = document.getElementById('profileAvatar');
    if (avWrap) avWrap.innerHTML = avatar(state.user, 82);
    toast('Profile photo removed');
  } else {
    toast(res.error || 'Failed to remove photo', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash"></i> Remove'; }
  }
}

/* ── Modals ─────────────────────────────────────────────────── */
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  // A new app version arrived during a live game: apply it now that the game is closed
  if (id === 'gameLobbyModal' && window._swReloadPending) { setTimeout(() => location.reload(), 250); }
  el.classList.remove('anim-open');
  el.classList.add('anim-close');
  setTimeout(() => {
    if (el.classList.contains('anim-close')) {
      el.style.display = 'none';
      el.classList.remove('anim-close');
    }
  }, 200);
  // Restore page hash if we were on a session deep-link
  if (id === 'sessionDetailModal' && state.page) {
    const curHash = window.location.hash.replace('#', '');
    if (curHash.startsWith('session/')) {
      window.location.hash = state.page;
    }
  }
}

// Close modals when clicking backdrop
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    const id = e.target.id;
    if (id) closeModal(id);
    else e.target.style.display = 'none';
  }
  // Close dropdowns on outside click
  if (!e.target.closest('#notifBtn') && !e.target.closest('#notifDropdown')) {
    const nd = document.getElementById('notifDropdown');
    if (nd) nd.style.display = 'none';
  }
  if (!e.target.closest('#headerAvatar') && !e.target.closest('#userMenu')) {
    const um = document.getElementById('userMenu');
    if (um) um.style.display = 'none';
  }
  if (!e.target.closest('#headerSearchWrap')) {
    const sd = document.getElementById('searchDropdown');
    if (sd) sd.style.display = 'none';
  }
});

/* ── Helper functions called from HTML ──────────────────────── */
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btn.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
}

function handleSearch(query) {
  if (!query.trim()) return;
  doSearch(query);
}

/* ── Global Search Dropdown ─────────────────────────────────── */
let _searchTimer = null;

function handleGlobalSearch(query) {
  const dd = document.getElementById('searchDropdown');
  if (!dd) return;
  if (!query.trim()) { dd.style.display = 'none'; return; }
  if (query.trim().length < 2) { dd.style.display = 'none'; return; }

  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => _runGlobalSearch(query.trim()), 300);
}

function _showSearchDropdown() {
  const dd = document.getElementById('searchDropdown');
  if (dd && dd.innerHTML) dd.style.display = '';
}

async function _runGlobalSearch(q) {
  const dd = document.getElementById('searchDropdown');
  if (!dd) return;
  dd.style.display = '';
  dd.innerHTML = '<div style="padding:16px;text-align:center"><i class="fas fa-spinner fa-spin" style="color:var(--gray-400)"></i></div>';

  const [usersRes, sessRes] = await Promise.all([
    api('/users.php?action=search&q=' + encodeURIComponent(q)),
    api('/teacher.php?action=sessions'),
  ]);

  let html = '';

  // People
  const users = usersRes.success ? (usersRes.data || []).slice(0, 4) : [];
  if (users.length) {
    html += '<div class="search-group-label">People</div>';
    html += users.map(u => {
      const name = ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username;
      const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0,2).toUpperCase();
      const avatarEl = u.avatar_url
        ? `<img src="${esc(u.avatar_url)}" class="search-result-icon" onerror="this.style.display='none'">`
        : `<div class="search-result-icon" style="background:linear-gradient(135deg,var(--cyan),var(--navy));color:#fff;font-size:.7rem;font-weight:700">${initials}</div>`;
      return `<div class="search-result-item" onclick="_searchNavUser(${u.id})">
        ${avatarEl}
        <div style="min-width:0"><div class="search-result-title">${esc(name)}</div>
        <div class="search-result-sub">@${esc(u.username)} · Grade ${esc(u.grade||'?')}</div></div>
      </div>`;
    }).join('');
    html += '<div class="search-divider"></div>';
  }

  // Sessions
  const rawSess = sessRes.success ? (sessRes.data || []) : [];
  const sessions = rawSess.filter(s =>
    s.title.toLowerCase().includes(q.toLowerCase()) ||
    (s.subject || '').toLowerCase().includes(q.toLowerCase())
  ).slice(0, 4);
  if (sessions.length) {
    html += '<div class="search-group-label">Sessions</div>';
    html += sessions.map(s => {
      const dt = parseUtc(s.scheduled_at);
      const ds = fmtDate(dt);
      return `<div class="search-result-item" onclick="_searchNavSession(${s.id})">
        <div class="search-result-icon"><i class="fas fa-chalkboard-teacher" style="color:var(--cyan)"></i></div>
        <div style="min-width:0"><div class="search-result-title">${esc(s.title)}</div>
        <div class="search-result-sub">${esc(s.subject||'')} · ${ds}</div></div>
      </div>`;
    }).join('');
    html += '<div class="search-divider"></div>';
  }

  if (!html) {
    html = `<div style="padding:24px 16px;text-align:center;color:var(--gray-400);font-size:.84rem">
      <i class="fas fa-magnifying-glass" style="display:block;font-size:1.3rem;margin-bottom:8px"></i>
      No results for "<b>${esc(q)}</b>"</div>`;
  } else {
    html += `<div class="search-result-item" onclick="_searchViewAll(${JSON.stringify(q).replace(/</g,'\\u003c')})" style="color:var(--cyan);font-size:.82rem;justify-content:center;font-weight:600">
      Search all posts for "${esc(q)}" →</div>`;
  }

  dd.innerHTML = html;
  dd.style.display = '';
}

function _searchNavUser(id) {
  _closeSearchDropdown();
  navigate('network');
  setTimeout(() => openProfileModal(id), 300);
}

function _searchNavSession(id) {
  _closeSearchDropdown();
  navigate('learn');
  setTimeout(() => showSessionDetailById(id), 400);
}

function _searchViewAll(q) {
  _closeSearchDropdown();
  const inp = document.getElementById('globalSearch');
  if (inp) inp.value = '';
  doSearch(q);
}

function _closeSearchDropdown() {
  const dd = document.getElementById('searchDropdown');
  if (dd) dd.style.display = 'none';
  const inp = document.getElementById('globalSearch');
  if (inp) { inp.value = ''; inp.blur(); }
}

function handleChatKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

const POST_MAX_CHARS = 5000; // keep in sync with api/posts.php createPost()
function updateCharCounter() {
  const ta = document.getElementById('postContent');
  const counter = document.getElementById('charCount');
  if (!ta || !counter) return;
  const len = ta.value.length;
  counter.textContent = len;
  const counterEl = counter.closest('.char-counter');
  if (counterEl) {
    counterEl.style.color = len > POST_MAX_CHARS ? '#dc2626' : len > POST_MAX_CHARS * 0.9 ? '#d97706' : '';
  }
}

function searchForMessage(query) {
  const results = document.getElementById('newMsgResults');
  if (!results) return;
  if (!query.trim()) { results.innerHTML = ''; return; }
  // Debounce: wait 300ms after last keystroke before hitting the API
  clearTimeout(searchForMessage._t);
  searchForMessage._t = setTimeout(async () => {
    if (query.length < 2) return;
    const res = await api('/users.php?action=search&q=' + encodeURIComponent(query));
    const matches = (res.success && res.data) ? res.data.map(u => ({
      id: u.id,
      name: ((u.first_name||'')+' '+(u.last_name||'')).trim() || u.username,
      grade: u.grade,
      avatar_url: u.avatar_url,
    })) : [];
    results.innerHTML = matches.map(u => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;transition:background 0.2s"
           onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background=''"
           onclick="startNewMessage(${u.id})">
        ${avatar(u, 36)}
        <div><div style="font-weight:600;font-size:0.85rem">${esc(u.name)}</div><div style="font-size:0.75rem;color:var(--gray-400)">Grade ${esc(u.grade||'—')}</div></div>
      </div>`).join('') || '<div style="padding:10px;color:var(--gray-400);font-size:0.85rem">No users found</div>';
  }, 300);
}

function startNewMessage(userId) {
  closeModal('newMessageModal');
  navigate('messages');
  openRealConversation(userId);
}


async function saveAccount() {
  const currentPass = document.getElementById('settCurrentPassword')?.value || '';
  const newPass     = document.getElementById('settPassword')?.value        || '';
  const confirmPass = document.getElementById('settConfirmPassword')?.value || '';
  const errEl       = document.getElementById('settPasswordError');

  function showErr(msg) {
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    else toast(msg, 'error');
  }
  if (errEl) errEl.style.display = 'none';

  const hasPwd = state.user?.has_password !== false; // social-only accounts have no password
  if (hasPwd && !currentPass) { showErr('Current password is required'); return; }
  if (!newPass || !confirmPass) { showErr('Please fill in the new password fields'); return; }
  if (newPass !== confirmPass) { showErr('New passwords do not match'); return; }
  if (newPass.length < 8) { showErr('New password must be at least 8 characters'); return; }

  const res = await api('/users.php?action=change_password', 'POST', {
    current_password: currentPass,
    new_password: newPass,
  });
  if (!res.success) { showErr(res.error || 'Failed to update password'); return; }

  // Mark account as now having a password (relevant for social-only accounts)
  if (state.user) state.user.has_password = true;
  document.getElementById('settCurrentPassword').value = '';
  document.getElementById('settPassword').value        = '';
  document.getElementById('settConfirmPassword').value = '';
  toast('Password updated successfully!');
}

function openDeleteAccountModal() {
  document.getElementById('deleteAccountPassword').value = '';
  const errEl = document.getElementById('deleteAccountError');
  if (errEl) errEl.style.display = 'none';
  openModal('deleteAccountModal');
}

async function doDeleteAccount() {
  const pass  = document.getElementById('deleteAccountPassword')?.value || '';
  const errEl = document.getElementById('deleteAccountError');
  // Social-only accounts (Telegram/Google with no password) don't need a password to delete
  const hasPwd = state.user?.has_password !== false;
  if (hasPwd && !pass) {
    if (errEl) { errEl.textContent = 'Please enter your password'; errEl.style.display = 'block'; }
    return;
  }
  const btn = document.getElementById('deleteAccountBtn');
  btn.disabled = true; btn.textContent = 'Deleting…';

  const res = await api('/users.php?action=delete_account', 'POST', { password: pass });
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash"></i> Delete Forever';

  if (res.success) {
    closeModal('deleteAccountModal');
    // Clear everything and redirect to auth
    state.token = null; state.user = null;
    localStorage.removeItem('learnora_token');
    localStorage.removeItem('learnora_tour_done');
    toast('Your account has been permanently deleted.', 'error');
    setTimeout(() => showLanding(), 1500);
  } else {
    errEl.textContent = res.error || 'Failed to delete account';
    errEl.style.display = 'block';
  }
}


async function saveProfile(e) {
  if (e) e.preventDefault();
  const fn    = document.getElementById('settFirstName')?.value?.trim() || '';
  const ln    = document.getElementById('settLastName')?.value?.trim()  || '';
  const bio   = document.getElementById('settBio')?.value      || '';
  const loc   = document.getElementById('settLocation')?.value || '';
  const grade = document.getElementById('settGrade')?.value    || '';
  const tz    = document.getElementById('settTimezone')?.value || '';

  if (!state.user) return;
  const res = await api('/users.php?action=update_profile', 'POST', {
    first_name: fn, last_name: ln, bio, location: loc, grade,
    preferred_timezone: tz,
  });
  if (!res.success) { toast(res.error || 'Failed to save', 'error'); return; }
  if (res.data) Object.assign(state.user, res.data);
  updateSidebarUser();
  toast('Profile saved!');
}

/* ── Leaderboard ────────────────────────────────────────────── */
function lbRowHtml(u, i) {
  const posClass = i===0?'gold':i===1?'silver':i===2?'bronze':'';
  const name = u.name || ((u.first_name||'')+' '+(u.last_name||'')).trim() || u.username;
  const lvl = getLevelInfo(parseInt(u.xp) || 0);
  return `
    <div class="leaderboard-item" onclick="viewUserProfile(${u.id})" style="cursor:pointer">
      <div class="lb-pos ${posClass}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
      ${avatar(u, 36)}
      <div class="lb-user-name">
        <div>${esc(name)}</div>
        <div style="font-size:0.72rem;color:var(--gray-400)">Grade ${esc(u.grade)} · ${esc(lvl.label)}</div>
      </div>
      <div class="lb-xp">⭐ ${(parseInt(u.xp)||0).toLocaleString()} XP</div>
    </div>`;
}

async function renderLeaderboard() {
  const container = document.getElementById('leaderboardContent');
  if (!container) return;
  const html = `
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-trophy" style="color:var(--warning);margin-right:8px"></i>Top Students</span>
        <div class="grade-pills" id="lb-grade-pills">
          <button class="grade-pill active" onclick="filterLeaderboard('All', this)">All</button>
        </div>
      </div>
      <div class="card-body" id="lb-list">${skeletons(5, 56)}</div>
    </div>`;
  container.innerHTML = html;

  const res = await api('/users.php?action=leaderboard');
  const lbEl = document.getElementById('lb-list');
  if (!lbEl) return;
  if (!res.success) {
    lbEl.innerHTML = errorCard('Could not load leaderboard.', '🏆', 'renderLeaderboard');
  } else if (res.data && res.data.length) {
    state.users = res.data;
    lbEl.innerHTML = res.data.map(lbRowHtml).join('');
    const pils = document.getElementById('lb-grade-pills');
    if (pils) {
      const uniqueGrades = [...new Set(res.data.map(u => u.grade).filter(Boolean))].sort();
      const realGrades = ['All', ...uniqueGrades.map(g => 'Grade ' + g)];
      pils.innerHTML = '';
      realGrades.forEach((g, i) => {
        const btn = document.createElement('button');
        btn.className = 'grade-pill' + (i === 0 ? ' active' : '');
        btn.textContent = g;
        btn.onclick = function() { filterLeaderboard(g, this); };
        pils.appendChild(btn);
      });
    }
  } else {
    lbEl.innerHTML = '<div class="empty-state" style="padding:32px;text-align:center"><i class="fas fa-trophy empty-icon"></i><p>No students yet</p></div>';
  }
}

function filterLeaderboard(grade, btn) {
  document.querySelectorAll('#lb-grade-pills .grade-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const sorted = [...(state.users || [])]
    .filter(u => grade === 'All' || 'Grade ' + u.grade === grade)
    .sort((a, b) => (parseInt(b.xp)||0) - (parseInt(a.xp)||0));
  document.getElementById('lb-list').innerHTML = sorted.length
    ? sorted.map(lbRowHtml).join('')
    : '<div class="empty-state" style="padding:24px;text-align:center"><p>No students in this grade yet</p></div>';
}

/* ── Search ─────────────────────────────────────────────────── */
async function doSearch(query) {
  if (!query.trim()) return;
  // Show community page without triggering its auto-fetch (navigate calls renderCommunity(true) internally)
  // We handle loading ourselves to avoid two concurrent fetches
  if (state.page !== 'community') {
    state.page = 'community';
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    const pg = document.getElementById('page-community');
    if (pg) pg.style.display = '';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nav = document.querySelector('.nav-item[data-page="community"]');
    if (nav) nav.classList.add('active');
    window.location.hash = 'community';
    if (window.innerWidth < 1024) closeSidebar();
  }
  if (!state.posts.length) {
    await renderCommunity(true);
  }
  const lower = query.toLowerCase();
  const filtered = state.posts.filter(p =>
    (p.title || '').toLowerCase().includes(lower) ||
    (p.body || '').toLowerCase().includes(lower) ||
    (p.subject || '').toLowerCase().includes(lower)
  );
  const feed = document.getElementById('communityFeed');
  if (feed) feed.innerHTML = filtered.length ? filtered.map(renderPostCard).join('') :
    `<div class="empty-state"><i class="fas fa-magnifying-glass empty-icon"></i><p>No results for "${esc(query)}"</p></div>`;
}

/* ══════════════════════════════════════════════════════════════
   PHASE 2 — Become a Teacher  (Part 1/6)
   ══════════════════════════════════════════════════════════════ */

const UPLOADCARE_PUB_KEY  = 'ea509fb62b1d38b3a00e';
const TEACHER_SUBJECTS    = ['Biology','Chemistry','Physics','Mathematics',
                             'Computer Science','Economics','Accounting','SAT','IELTS'];
const STD_TESTS           = ['IELTS','SAT','ACT','AS Levels','A Levels','AP'];
const DYNAMIC_TESTS       = ['AS Levels','A Levels','AP']; // trigger extra subject inputs

/* score config per test (used in step 2) */
const TEST_SCORE_CONFIG = {
  'IELTS': { type:'number', min:0,   max:9,    step:0.5,  placeholder:'e.g. 7.5',  label:'Overall Band Score (0–9)' },
  'SAT':   { type:'number', min:400, max:1600, step:10,   placeholder:'e.g. 1200', label:'Total Score (400–1600)' },
  'ACT':   { type:'number', min:1,   max:36,   step:1,    placeholder:'e.g. 28',   label:'Composite Score (1–36)' },
};

/* mutable multi-step form state */
let _bt = {
  step: 1,
  data: {
    full_name:'', age:'', location:'', public_bio:'',
    current_status:'', standardized_tests:[], test_subjects:{},
    test_scores:{}, // { 'IELTS': 7.5, 'SAT': 1200, ... }
    subjects_to_teach:[], id_document_url:'', video_pitch_url:'',
  },
  _stream:         null,
  _mediaRecorder:  null,
  _recordedChunks: [],
  _recordedBlob:   null,
  _recordingTimer: null,
  _recordingSeconds: 0,
};

function showBecomeTeacher() {
  _bt.step = 1;
  _bt.data = {
    full_name:'', age:'', location:'', public_bio:'',
    test_scores:{},
    current_status:'', standardized_tests:[], test_subjects:{},
    subjects_to_teach:[], id_document_url:'', video_pitch_url:'',
  };
  _bt._recordedBlob = null;
  openModal('becomeTeacherModal');
  _btRender();
}

/* ── Progress bar + step shell ─────────────────────────────── */
function _btRender() {
  const body = document.getElementById('becomeTeacherBody');
  if (!body) return;
  const pct = Math.round((_bt.step / 5) * 100);
  const isLast = _bt.step === 5;
  const stepLabels = ['Personal Info','Your Background & Tests','Qualification Details','What You Will Teach','Introduction Video'];
  body.innerHTML = `
    <div style="margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span style="font-size:.74rem;font-weight:600;color:var(--gray-400)">Step ${_bt.step} of 5 — ${stepLabels[_bt.step-1]}</span>
        <span style="font-size:.74rem;font-weight:600;color:var(--cyan)">${pct}%</span>
      </div>
      <div style="height:4px;background:var(--gray-100);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:var(--grad-brand);border-radius:4px;transition:width .4s"></div>
      </div>
    </div>
    <div id="_btBody">${_btStepHtml()}</div>
    <div style="display:flex;gap:10px;margin-top:20px;align-items:center">
      ${_bt.step > 1 ? `<button class="btn btn-ghost" onclick="_btBack()"><i class="fas fa-arrow-left"></i> Back</button>` : ''}
      <div style="flex:1"></div>
      ${isLast
        ? `<button class="btn btn-primary" id="btSubmitBtn" onclick="submitTeacherApplication()"><i class="fas fa-paper-plane"></i> Submit Application</button>`
        : `<button class="btn btn-primary" onclick="_btNext()">Next <i class="fas fa-arrow-right"></i></button>`}
    </div>`;
}

function _btStepHtml() {
  if (_bt.step === 1) return _btStep1();
  if (_bt.step === 2) return _btStep2();
  if (_bt.step === 3) return _btStep3();
  if (_bt.step === 4) return _btStep4();
  if (_bt.step === 5) return _btStep5();
  return '';
}

/* ── Step 1 – Personal Info ────────────────────────────────── */
function _btStep1() {
  const d = _bt.data;
  return `
    <h3 style="font-size:1rem;font-weight:700;color:var(--navy);margin-bottom:16px">Personal Information</h3>
    <div class="form-group">
      <label class="form-label">Full Name <span style="color:var(--danger)">*</span></label>
      <input class="form-control" id="btName" placeholder="Your full legal name" value="${esc(d.full_name)}">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Age <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="btAge" type="number" min="14" max="80" placeholder="e.g. 20" value="${esc(d.age)}">
      </div>
      <div class="form-group">
        <label class="form-label">Location</label>
        <input class="form-control" id="btLoc" placeholder="City, Country" value="${esc(d.location)}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Public Bio <span style="color:var(--danger)">*</span></label>
      <textarea class="form-control" id="btBio" rows="3" placeholder="A short bio students will see on your profile…" style="resize:vertical">${esc(d.public_bio)}</textarea>
    </div>`;
}

/* ── Step 2 – Status + Standardised Tests ──────────────────── */
function _btStep2() {
  const d = _bt.data;
  const statuses = ['High School Student','University Student','Graduate',
                    'Postgraduate','Educator','Professional','Other'];
  return `
    <h3 style="font-size:1rem;font-weight:700;color:var(--navy);margin-bottom:4px">Your Background</h3>
    <p style="font-size:.82rem;color:var(--gray-400);margin-bottom:16px">Tell us about your current status and any standardised tests you have personally taken and scored in. <strong style="color:var(--navy)">These are your qualifications — not the subjects you'll teach.</strong></p>
    <div class="form-group">
      <label class="form-label">Current Status <span style="color:var(--danger)">*</span></label>
      <select class="form-control" id="btStatus">
        <option value="">Select…</option>
        ${statuses.map(s => `<option value="${s}"${d.current_status===s?' selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label" style="margin-bottom:4px">Standardised Tests You Have Taken <span style="color:var(--gray-400);font-size:.75rem">(optional)</span></label>
      <p style="font-size:.76rem;color:var(--gray-400);margin-bottom:10px">Select any exams you have personally sat. Enter your score if known. You will choose what subjects to <em>teach</em> on the next page.</p>
      <div style="display:flex;flex-direction:column;gap:10px" id="testPills">
        ${STD_TESTS.map(t => {
          const on = d.standardized_tests.includes(t);
          const cfg = TEST_SCORE_CONFIG[t];
          const score = d.test_scores[t] ?? '';
          return `
            <div style="border:1.5px solid ${on?'var(--cyan)':'var(--gray-200)'};border-radius:10px;overflow:hidden;transition:border-color .2s" id="trow_${t.replace(/\s/g,'_')}">
              <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;background:${on?'var(--cyan-light)':'transparent'};transition:background .2s">
                <input type="checkbox" ${on?'checked':''} onchange="_btToggleTest(this,'${t}')" style="accent-color:var(--cyan);width:16px;height:16px;flex-shrink:0">
                <span style="font-size:.87rem;font-weight:600">${t}</span>
              </label>
              <div id="tscore_${t.replace(/\s/g,'_')}" style="padding:${on?'0 14px 12px':'0'};max-height:${on?'80px':'0'};overflow:hidden;transition:max-height .3s,padding .3s">
                <label style="font-size:.76rem;color:var(--gray-400);display:block;margin-bottom:4px">${cfg ? cfg.label : 'Score / Grade (optional)'}</label>
                <input class="form-control" type="${cfg ? cfg.type : 'text'}" ${cfg ? `min="${cfg.min}" max="${cfg.max}" step="${cfg.step}"` : ''}
                  placeholder="${cfg ? cfg.placeholder : 'e.g. A, B+'}" value="${score}"
                  id="btScore_${t.replace(/\s/g,'_')}" style="max-width:180px;font-size:.87rem">
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function _btToggleTest(checkbox, test) {
  const on  = checkbox.checked;
  const key = test.replace(/\s/g,'_');
  const row   = document.getElementById('trow_'   + key);
  const score = document.getElementById('tscore_' + key);
  const label = checkbox.closest('label');

  if (on) {
    _bt.data.standardized_tests.push(test);
    if (row) row.style.borderColor = 'var(--cyan)';
    if (label) label.style.background = 'var(--cyan-light)';
    if (score) { score.style.maxHeight = '80px'; score.style.padding = '0 14px 12px'; }
  } else {
    const idx = _bt.data.standardized_tests.indexOf(test);
    if (idx > -1) _bt.data.standardized_tests.splice(idx, 1);
    delete _bt.data.test_subjects[test];
    delete _bt.data.test_scores[test];
    if (row) row.style.borderColor = 'var(--gray-200)';
    if (label) label.style.background = 'transparent';
    if (score) { score.style.maxHeight = '0'; score.style.padding = '0'; }
  }
}

/* ── Step 3 – Dynamic Test Subjects ────────────────────────── */
function _btStep3() {
  const d = _bt.data;
  const dynTests = d.standardized_tests.filter(t => DYNAMIC_TESTS.includes(t));
  if (!dynTests.length) return `
    <h3 style="font-size:1rem;font-weight:700;color:var(--navy);margin-bottom:16px">Qualification Details</h3>
    <div style="text-align:center;padding:36px 20px;color:var(--gray-400)">
      <i class="fas fa-check-circle" style="font-size:2rem;color:var(--success);display:block;margin-bottom:12px"></i>
      <p>No subject breakdown needed for your selected tests.</p>
      <p style="font-size:.8rem;margin-top:6px">Click <strong>Next</strong> to continue to select what you will teach.</p>
    </div>`;
  return `
    <h3 style="font-size:1rem;font-weight:700;color:var(--navy);margin-bottom:4px">Qualification Details</h3>
    <p style="font-size:.82rem;color:var(--gray-400);margin-bottom:16px">List the specific subjects <strong>within your qualifications</strong> (e.g., which A-Level or AP subjects you sat). This is separate from what you will teach students.</p>
    ${dynTests.map(t => `
      <div class="form-group">
        <label class="form-label">${t} Subjects</label>
        <input class="form-control" id="btTS_${t.replace(/\s/g,'_')}"
          placeholder="e.g. Mathematics, Physics (comma-separated)"
          value="${esc((d.test_subjects[t]||[]).join(', '))}">
      </div>`).join('')}`;
}

/* ── Step 4 – Subjects to Teach + CV ───────────────────────── */
function _btStep4() {
  const d = _bt.data;
  const hasCv = !!d.id_document_url;
  return `
    <h3 style="font-size:1rem;font-weight:700;color:var(--navy);margin-bottom:4px">What You Will Teach</h3>
    <p style="font-size:.82rem;color:var(--gray-400);margin-bottom:16px">Choose the subjects you are confident and qualified to teach students in. <strong style="color:var(--navy)">These are the topics you will create sessions for — different from any tests you have taken.</strong></p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
      ${TEACHER_SUBJECTS.map(s => {
        const on = d.subjects_to_teach.includes(s);
        return `<label style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1.5px solid ${on?'var(--cyan)':'var(--gray-200)'};border-radius:8px;cursor:pointer;font-size:.83rem;font-weight:500;background:${on?'var(--cyan-light)':'#fff'};transition:all .2s" id="subj_${s.replace(/\s/g,'_')}">
          <input type="checkbox" style="display:none" ${on?'checked':''} onchange="_btToggleSubject('${s}',this.closest('label'))"> ${s}
        </label>`;
      }).join('')}
    </div>
    <div style="border-top:1px solid var(--gray-100);padding-top:18px">
      <label class="form-label">CV / Résumé <span style="color:var(--danger)">*</span></label>
      <p style="font-size:.76rem;color:var(--gray-400);margin-bottom:10px">Upload your CV or résumé. This helps admins verify your background and approve your application. PDF, Word, or image formats accepted.</p>
      <div style="display:flex;gap:8px;align-items:center">
        <input class="form-control" id="btIdUrl" placeholder="CV / résumé URL (auto-filled after upload)" value="${esc(d.id_document_url)}" style="flex:1">
        <button class="btn ${hasCv?'btn-ghost':'btn-primary'}" style="white-space:nowrap;font-size:.8rem;flex-shrink:0" onclick="_btUploadId()">
          <i class="fas fa-${hasCv?'check':'upload'}"></i> ${hasCv?'Uploaded':'Upload CV'}
        </button>
      </div>
      ${hasCv ? `<p style="font-size:.75rem;color:var(--success);margin-top:6px"><i class="fas fa-check-circle"></i> CV uploaded successfully</p>` : `<p style="font-size:.75rem;color:var(--danger);margin-top:6px"><i class="fas fa-exclamation-circle"></i> Required — please upload your CV before continuing</p>`}
    </div>`;
}

function _btToggleSubject(subj, el) {
  const idx = _bt.data.subjects_to_teach.indexOf(subj);
  if (idx > -1) {
    _bt.data.subjects_to_teach.splice(idx, 1);
    el.style.border = '1.5px solid var(--gray-200)';
    el.style.background = '#fff';
  } else {
    _bt.data.subjects_to_teach.push(subj);
    el.style.border = '1.5px solid var(--cyan)';
    el.style.background = 'var(--cyan-light)';
  }
}

function _btUploadId() {
  // Use a hidden file input to upload via our own API
  let inp = document.getElementById('_btIdFileInput');
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'file';
    inp.id   = '_btIdFileInput';
    inp.accept = 'image/*,.pdf,.doc,.docx';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', async () => {
      const file = inp.files[0];
      if (!file) return;
      inp.value = '';
      if (file.size > 5 * 1024 * 1024) {
        toast('File too large (max 5 MB). Upload to Google Drive and paste the public link instead.', 'error');
        return;
      }
      const btn = document.querySelector('#becomeTeacherModal button[onclick="_btUploadId()"]');
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
      try {
        const up = await _uploadFile(file);
        if (up.success) {
          _bt.data.id_document_url = up.data.url;
          toast('CV uploaded!', 'success');
          _btRender(); // re-renders step to show "Uploaded" state + success message
          return;
        }
        toast(up.error || 'Upload failed', 'error');
      } catch(e) { toast('Upload failed', 'error'); }
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> Upload CV'; }
    });
  }
  inp.click();
}

/* ── Step 5 – Video Introduction ────────────────────────────── */
function _btStep5() {
  const d = _bt.data;
  const hasVid = !!(_bt._recordedBlob || d.video_pitch_url);
  return `
    <h3 style="font-size:1rem;font-weight:700;color:var(--navy);margin-bottom:4px">Introduction Video <span style="color:var(--danger)">*</span></h3>
    <p style="font-size:.82rem;color:var(--gray-400);margin-bottom:16px">Record or upload a short video (up to 60 seconds) introducing yourself and explaining why you want to teach on Learnora. Admins watch this to assess your communication style and enthusiasm. <strong style="color:var(--navy)">This is required.</strong></p>
    <div style="border:1.5px dashed var(--gray-200);border-radius:12px;padding:20px;text-align:center;background:#fafbfc" id="btVidBox">
      <video id="btPreviewVid" style="width:100%;max-height:220px;border-radius:8px;display:${hasVid?'block':'none'};margin-bottom:12px" playsinline ${hasVid?`src="${esc(d.video_pitch_url)}"`:''} controls></video>
      <div id="btRecStatus" style="font-size:.82rem;color:var(--gray-400);margin-bottom:12px">${hasVid?'<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Video ready</span>':'No video recorded yet'}</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" id="btRecBtn" onclick="_btStartRec()"><i class="fas fa-circle" style="color:#f55"></i> Start Recording</button>
        <button class="btn btn-ghost" onclick="_btUploadVid()"><i class="fas fa-upload"></i> Upload Instead</button>
        ${hasVid ? `<button class="btn btn-ghost" onclick="_btClearVid()"><i class="fas fa-trash"></i> Remove</button>` : ''}
      </div>
    </div>
    <div class="form-group" style="margin-top:14px">
      <label class="form-label" style="font-size:.8rem">Or paste a video URL</label>
      <input class="form-control" id="btVidUrl" placeholder="YouTube / Drive / Loom link…" value="${esc(d.video_pitch_url)}">
    </div>`;
}

/* ── Video recording helpers ────────────────────────────────── */
async function _btStartRec() {
  if (_bt._mediaRecorder && _bt._mediaRecorder.state === 'recording') {
    _btStopRec(); return;
  }
  try {
    _bt._stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    _bt._recordedChunks = [];
    _bt._recordedBlob = null;
    _bt._recordingSeconds = 0;

    const vid = document.getElementById('btPreviewVid');
    if (vid) { vid.srcObject = _bt._stream; vid.style.display = 'block'; vid.controls = false; vid.play(); }

    _bt._mediaRecorder = new MediaRecorder(_bt._stream);
    _bt._mediaRecorder.ondataavailable = e => { if (e.data.size) _bt._recordedChunks.push(e.data); };
    _bt._mediaRecorder.onstop = _btOnRecStop;
    _bt._mediaRecorder.start(200);

    const btn = document.getElementById('btRecBtn');
    if (btn) btn.innerHTML = '<i class="fas fa-stop" style="color:#f55"></i> Stop Recording';

    _bt._recordingTimer = setInterval(() => {
      _bt._recordingSeconds++;
      const st = document.getElementById('btRecStatus');
      if (st) st.innerHTML = `<span style="color:var(--danger)"><i class="fas fa-circle" style="animation:pulse 1s infinite"></i> Recording… ${_bt._recordingSeconds}s / 60s</span>`;
      if (_bt._recordingSeconds >= 60) _btStopRec();
    }, 1000);
  } catch(e) {
    toast('Camera access denied: ' + e.message, 'error');
  }
}

function _btStopRec() {
  clearInterval(_bt._recordingTimer);
  if (_bt._mediaRecorder && _bt._mediaRecorder.state !== 'inactive') _bt._mediaRecorder.stop();
  if (_bt._stream) { _bt._stream.getTracks().forEach(t => t.stop()); _bt._stream = null; }
}

function _btOnRecStop() {
  _bt._recordedBlob = new Blob(_bt._recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(_bt._recordedBlob);
  const vid = document.getElementById('btPreviewVid');
  if (vid) { vid.srcObject = null; vid.src = url; vid.controls = true; }
  const st = document.getElementById('btRecStatus');
  if (st) st.innerHTML = '<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Recording saved (' + _bt._recordingSeconds + 's)</span>';
  const btn = document.getElementById('btRecBtn');
  if (btn) btn.innerHTML = '<i class="fas fa-redo"></i> Re-record';
  _bt.data.video_pitch_url = url; // local blob URL (uploaded on submit)
}

function _btClearVid() {
  _bt._recordedBlob = null;
  _bt.data.video_pitch_url = '';
  _btRender();
}

function _btUploadVid() {
  let inp = document.getElementById('_btVidFileInput');
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'file';
    inp.id   = '_btVidFileInput';
    inp.accept = 'video/*';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', async () => {
      const file = inp.files[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) { toast('Video too large (max 50 MB)', 'error'); inp.value = ''; return; }
      const st = document.getElementById('btRecStatus');
      if (st) st.innerHTML = '<span style="color:var(--cyan)"><i class="fas fa-spinner fa-spin"></i> Uploading video…</span>';
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('type', 'file');
        const res = await fetch(`${API}/upload.php`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + (state.token || '') },
          body: form,
        });
        const up = await res.json();
        if (up.success) {
          _bt.data.video_pitch_url = up.data.url;
          _bt._recordedBlob = null;
          toast('Video uploaded!', 'success');
          inp.value = '';
          _btRender(); // re-renders step with video preview + success indicator
          return;
        }
        if (st) st.innerHTML = 'Upload failed';
        toast(up.error || 'Upload failed', 'error');
      } catch(e) { if (st) st.innerHTML = 'Upload failed'; toast('Upload failed', 'error'); }
      inp.value = '';
    });
  }
  inp.click();
}

/* ── Navigation: Next / Back ────────────────────────────────── */
async function _btNext() {
  // Collect current step data
  if (_bt.step === 1) {
    const name = document.getElementById('btName')?.value.trim() || '';
    const age  = document.getElementById('btAge')?.value.trim()  || '';
    const loc  = document.getElementById('btLoc')?.value.trim()  || '';
    const bio  = document.getElementById('btBio')?.value.trim()  || '';
    if (!name) { toast('Please enter your full name', 'error'); return; }
    if (!age || parseInt(age) < 14) { toast('Please enter a valid age (14+)', 'error'); return; }
    if (!bio) { toast('Please write a short bio', 'error'); return; }
    Object.assign(_bt.data, { full_name: name, age, location: loc, public_bio: bio });

  } else if (_bt.step === 2) {
    const status = document.getElementById('btStatus')?.value || '';
    if (!status) { toast('Please select your current status', 'error'); return; }
    _bt.data.current_status = status;
    // Collect scores for scored tests
    _bt.data.standardized_tests.forEach(t => {
      const key = t.replace(/\s/g,'_');
      const el  = document.getElementById('btScore_' + key);
      if (el && el.value) {
        const cfg = TEST_SCORE_CONFIG[t];
        _bt.data.test_scores[t] = cfg ? parseFloat(el.value) : el.value.trim();
      }
    });

  } else if (_bt.step === 3) {
    // Collect dynamic test subjects
    DYNAMIC_TESTS.filter(t => _bt.data.standardized_tests.includes(t)).forEach(t => {
      const key = t.replace(/\s/g, '_');
      const val = document.getElementById('btTS_' + key)?.value.trim() || '';
      _bt.data.test_subjects[t] = val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
    });

  } else if (_bt.step === 4) {
    const urlEl = document.getElementById('btIdUrl');
    if (urlEl) _bt.data.id_document_url = urlEl.value.trim();
    if (!_bt.data.subjects_to_teach.length) { toast('Please select at least one subject you want to teach', 'error'); return; }
    if (!_bt.data.id_document_url) { toast('Please upload your CV / résumé before continuing', 'error'); return; }

  } else if (_bt.step === 5) {
    const urlEl = document.getElementById('btVidUrl');
    if (urlEl && urlEl.value.trim()) _bt.data.video_pitch_url = urlEl.value.trim();
    if (!_bt._recordedBlob && !_bt.data.video_pitch_url) { toast('Please record or upload your introduction video — it is required', 'error'); return; }
  }

  _bt.step++;
  _btRender();
}

function _btBack() {
  _btStopRec();
  _bt.step = Math.max(1, _bt.step - 1);
  _btRender();
}

/* ── Submit Teacher Application ─────────────────────────────── */
async function submitTeacherApplication() {
  // Collect step 5 URL field if filled
  const urlEl = document.getElementById('btVidUrl');
  if (urlEl && urlEl.value.trim()) _bt.data.video_pitch_url = urlEl.value.trim();

  // Final validation
  if (!_bt.data.id_document_url) { toast('CV / résumé is required', 'error'); return; }
  if (!_bt._recordedBlob && !_bt.data.video_pitch_url) { toast('Introduction video is required', 'error'); return; }

  // Upload recorded blob via our own upload API
  if (_bt._recordedBlob) {
    const btn = document.getElementById('btSubmitBtn');
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading video…';
    try {
      const formData = new FormData();
      formData.append('file', _bt._recordedBlob, 'video-pitch.webm');
      formData.append('type', 'file');
      const up = await fetch(`${API}/upload.php`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + (state.token || '') },
        body: formData,
      });
      const upJson = await up.json();
      if (upJson.success) { _bt.data.video_pitch_url = upJson.data.url; }
      else { toast('Video upload failed, submitting without it', 'error'); _bt.data.video_pitch_url = ''; }
    } catch(e) {
      toast('Video upload failed, submitting without it', 'error');
      _bt.data.video_pitch_url = '';
    }
  }

  const btn = document.getElementById('btSubmitBtn');
  if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';

  const res = await api('/teacher.php?action=apply', 'POST', {
    ..._bt.data,
    standardized_tests: _bt.data.standardized_tests,
    test_subjects:      _bt.data.test_subjects,
    test_scores:        _bt.data.test_scores,
    subjects_to_teach:  _bt.data.subjects_to_teach,
  });

  if (!res.success) {
    toast(res.error || 'Submission failed', 'error');
    if (btn) btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
    return;
  }

  closeModal('becomeTeacherModal');
  toast('Application submitted! We\'ll review it shortly.', 'success');
  _btStopRec();
}

/* ══════════════════════════════════════════════════════════════
   PHASE 3 — Teacher Training  (Part 3/6)
   ══════════════════════════════════════════════════════════════ */

const TRAINING_MODULES = [
  {
    id: 1,
    title: 'Welcome to Teaching on Learnora',
    icon: '🎓',
    duration: '5 min',
    desc: 'Understand your role, responsibilities, and how sessions work on the platform.',
    points: [
      'As a teacher, you create and host live or scheduled sessions for students.',
      'You are responsible for accurate subject representation and a safe learning environment.',
      'Learnora admins have reviewed your application and approved your subjects.',
      'Students can rate and review you after each session — quality matters.',
    ],
  },
  {
    id: 2,
    title: 'Creating Effective Sessions',
    icon: '📋',
    duration: '5 min',
    desc: 'Learn best practices for scheduling, titles, descriptions, and meeting links.',
    points: [
      'Use a clear, descriptive session title (e.g. "IGCSE Biology: Cell Division Deep Dive").',
      'Provide a Zoom, Google Meet, or Microsoft Teams link before publishing.',
      'Set a realistic maximum student count — smaller is often better for interaction.',
      'Schedule sessions at least 24 hours in advance so students can plan.',
    ],
  },
  {
    id: 3,
    title: 'Community Guidelines & Safety',
    icon: '🛡️',
    duration: '3 min',
    desc: 'The rules that keep Learnora a safe, respectful place for everyone.',
    points: [
      'Never share personal contact details (phone numbers, personal email) in sessions.',
      'No discriminatory language, harassment, or off-topic content.',
      'Recording students requires their explicit consent.',
      'Violations may result in immediate suspension of your teacher account.',
    ],
  },
  {
    id: 4,
    title: 'Earning XP as a Teacher',
    icon: '⭐',
    duration: '2 min',
    desc: 'How the XP system rewards quality teaching.',
    points: [
      'You earn +1 XP per 10 minutes of session duration when you end a session.',
      'Students who attend earn +1 XP each — they appreciate you showing up!',
      'Both you and students earn +1 XP when feedback is submitted.',
      'High ratings improve your visibility on the platform.',
    ],
  },
  {
    id: 5,
    title: 'Ready to Start!',
    icon: '🚀',
    duration: '1 min',
    desc: 'You\'re all set. Complete training to unlock your Teacher Hub.',
    points: [
      'Your Teacher Hub lets you create sessions, view attendees, and track feedback.',
      'Students discover your sessions on the Learn page and can register in one click.',
      'After each session, click "End Session" so XP is awarded automatically.',
      'If you ever have questions, reach out via the community or settings.',
    ],
  },
];

let _trainingStep = 0; // 0-indexed module index; -1 = overview

async function renderTraining() {
  const pg = document.getElementById('page-training');
  if (!pg) return;

  const role = state.user?.role || 'student';
  if (role !== 'teacher_pending_training') {
    pg.innerHTML = `<div style="padding:40px;text-align:center;color:var(--gray-400)">
      <i class="fas fa-lock" style="font-size:2rem;display:block;margin-bottom:12px"></i>
      <p>This page is only available during teacher training.</p>
    </div>`;
    return;
  }

  _trainingStep = -1;
  _renderTrainingOverview(pg);
}

function _renderTrainingOverview(pg) {
  const totalMins = TRAINING_MODULES.reduce((s, m) => s + parseInt(m.duration), 0);
  pg.innerHTML = `
    <div style="max-width:700px;margin:0 auto;padding:32px 20px">
      <div style="text-align:center;margin-bottom:32px">
        <div style="font-size:3rem;margin-bottom:12px">🎓</div>
        <h1 style="font-size:1.5rem;font-weight:800;color:var(--navy);margin-bottom:8px">Teacher Training</h1>
        <p style="color:var(--gray-400);font-size:.9rem">Complete all ${TRAINING_MODULES.length} modules (~${totalMins} min) to unlock your Teacher Hub</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px" id="trainingModuleList">
        ${TRAINING_MODULES.map((m, i) => `
          <div class="card" style="cursor:pointer;transition:box-shadow .2s" onclick="startTrainingModule(${i})" onmouseover="this.style.boxShadow='0 4px 20px rgba(41,171,226,.15)'" onmouseout="this.style.boxShadow=''">
            <div style="display:flex;align-items:center;gap:16px">
              <div style="font-size:2rem;flex-shrink:0">${m.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:.95rem;font-weight:700;color:var(--navy)">${m.title}</div>
                <div style="font-size:.8rem;color:var(--gray-400);margin-top:2px">${m.desc}</div>
              </div>
              <div style="flex-shrink:0;text-align:right">
                <div style="font-size:.75rem;color:var(--gray-300);margin-bottom:4px">${m.duration}</div>
                <i class="fas fa-chevron-right" style="color:var(--cyan)"></i>
              </div>
            </div>
          </div>`).join('')}
      </div>
      <div style="margin-top:28px;padding:20px;background:var(--cyan-light);border-radius:12px;border:1.5px solid var(--cyan);text-align:center">
        <p style="font-size:.85rem;color:var(--navy);font-weight:600;margin-bottom:12px">Read all modules, then complete your training</p>
        <button class="btn btn-primary" onclick="confirmCompleteTraining()"><i class="fas fa-graduation-cap"></i> Complete Training &amp; Activate Account</button>
      </div>
    </div>`;
}

function startTrainingModule(index) {
  const pg = document.getElementById('page-training');
  if (!pg) return;
  const m = TRAINING_MODULES[index];
  const isLast = index === TRAINING_MODULES.length - 1;
  pg.innerHTML = `
    <div style="max-width:640px;margin:0 auto;padding:32px 20px">
      <button class="btn btn-ghost" style="margin-bottom:20px" onclick="renderTraining()"><i class="fas fa-arrow-left"></i> Back to overview</button>
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:3.5rem;margin-bottom:10px">${m.icon}</div>
        <h2 style="font-size:1.25rem;font-weight:800;color:var(--navy)">${m.title}</h2>
        <span style="font-size:.78rem;color:var(--gray-400)">${m.duration} read</span>
      </div>
      <p style="color:var(--gray-500);font-size:.9rem;line-height:1.7;margin-bottom:20px">${m.desc}</p>
      <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:10px;margin-bottom:28px">
        ${m.points.map(p => `
          <li style="display:flex;gap:12px;align-items:flex-start;padding:14px;background:#f8fafc;border-radius:10px;border:1px solid var(--gray-100)">
            <i class="fas fa-check-circle" style="color:var(--cyan);margin-top:2px;flex-shrink:0"></i>
            <span style="font-size:.87rem;color:var(--navy);line-height:1.6">${p}</span>
          </li>`).join('')}
      </ul>
      <div style="display:flex;gap:10px;justify-content:space-between">
        ${index > 0 ? `<button class="btn btn-ghost" onclick="startTrainingModule(${index-1})"><i class="fas fa-arrow-left"></i> Previous</button>` : '<div></div>'}
        ${isLast
          ? `<button class="btn btn-primary" onclick="confirmCompleteTraining()"><i class="fas fa-graduation-cap"></i> Complete Training</button>`
          : `<button class="btn btn-primary" onclick="startTrainingModule(${index+1})">Next <i class="fas fa-arrow-right"></i></button>`}
      </div>
    </div>`;
}

async function confirmCompleteTraining() {
  if (!confirm('Mark training as complete and activate your Teacher account?')) return;

  const res = await api('/teacher.php?action=complete_training', 'POST', {});
  if (!res.success) { toast(res.error || 'Could not complete training', 'error'); return; }

  state.user.role = 'active_teacher';
  toast('🎉 Training complete! Welcome to the Teacher Hub.', 'success');
  updateSidebarForRole();
  setTimeout(() => navigate('teacher'), 800);
}

/* ══════════════════════════════════════════════════════════════
   PHASE 4 — Teacher Hub  (Part 4/6)
   ══════════════════════════════════════════════════════════════ */

async function renderTeacherHub() {
  const pg = document.getElementById('page-teacher');
  if (!pg) return;

  const role = state.user?.role || 'student';
  if (role !== 'active_teacher') {
    pg.innerHTML = `<div style="padding:40px;text-align:center;color:var(--gray-400)">
      <i class="fas fa-chalkboard-teacher" style="font-size:2.5rem;display:block;margin-bottom:12px"></i>
      <p>You need to be an active teacher to view this page.</p>
    </div>`;
    return;
  }

  pg.innerHTML = `
    <div style="padding:24px 20px;max-width:860px;margin:0 auto">
      <div class="teacher-hub-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px">
        <div>
          <h1 style="font-size:1.4rem;font-weight:800;color:var(--navy)">Teacher Hub</h1>
          <p style="font-size:.83rem;color:var(--gray-400)">Manage your sessions and courses</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost" onclick="showCreateCourse()"><i class="fas fa-book-open"></i> Create Course</button>
          <button class="btn btn-primary" onclick="showCreateSession()"><i class="fas fa-plus"></i> Create Session</button>
        </div>
      </div>
      <div id="teacherHubBody">${skeletons(3, 120)}</div>
      <div id="teacherCoursesSection" style="margin-top:24px"></div>
    </div>`;

  // Load sessions and courses in parallel
  const [sessRes, courseRes] = await Promise.all([
    api('/teacher.php?action=my_sessions'),
    api('/teacher.php?action=my_courses'),
  ]);

  const body        = document.getElementById('teacherHubBody');
  const coursesBody = document.getElementById('teacherCoursesSection');
  if (!body) return;

  if (!sessRes.success) { body.innerHTML = errorCard('Could not load sessions.', '📋', 'renderTeacherHub'); return; }

  const sessions = sessRes.data || [];
  _teacherSessionsCache = sessions;
  // Only show standalone sessions (no course_id)
  const standalone = sessions.filter(s => !s.course_id);
  const live       = standalone.filter(s => s.status === 'live');
  const upcoming   = standalone.filter(s => s.status === 'upcoming');
  const ended      = standalone.filter(s => s.status === 'ended');

  if (!standalone.length) {
    body.innerHTML = `
      <div style="text-align:center;padding:32px 20px;color:var(--gray-400)">
        <div style="font-size:3rem;margin-bottom:14px">📋</div>
        <p style="font-size:1rem;font-weight:600;color:var(--navy);margin-bottom:6px">No standalone sessions yet</p>
        <p style="font-size:.85rem;margin-bottom:20px">Create a single session or a multi-session course!</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-ghost" onclick="showCreateCourse()"><i class="fas fa-book-open"></i> Create Course</button>
          <button class="btn btn-primary" onclick="showCreateSession()"><i class="fas fa-plus"></i> Create Session</button>
        </div>
      </div>`;
  } else {
    body.innerHTML = `
      ${live.length ? `
        <h3 style="font-size:.9rem;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">🔴 Live Now (${live.length})</h3>
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px">
          ${live.map(s => teacherSessionCard(s, 'live')).join('')}
        </div>` : ''}
      ${upcoming.length ? `
        <h3 style="font-size:.9rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Upcoming Sessions (${upcoming.length})</h3>
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px">
          ${upcoming.map(s => teacherSessionCard(s, 'upcoming')).join('')}
        </div>` : ''}
      ${ended.length ? `
        <h3 style="font-size:.9rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Past Sessions (${ended.length})</h3>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${ended.map(s => teacherSessionCard(s, 'ended')).join('')}
        </div>` : ''}`;
  }

  // Render courses section
  if (coursesBody) {
    const courses = courseRes.success ? (courseRes.data || []) : [];
    if (courses.length) {
      coursesBody.innerHTML = `
        <h3 style="font-size:.9rem;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.05em;margin-bottom:14px;padding-top:8px;border-top:1px solid var(--gray-100)">
          <i class="fas fa-book-open" style="color:var(--cyan);margin-right:6px"></i> My Courses (${courses.length})
        </h3>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${courses.map(c => teacherCourseCard(c)).join('')}
        </div>`;
    }
  }
}

function teacherSessionCard(s, type) {
  const dt       = parseUtc(s.scheduled_at);
  const dateStr  = dt.toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
  const timeStr  = fmtTime(dt);
  const regCount = parseInt(s.registered_count) || 0;
  const fbCount  = parseInt(s.feedback_count)   || 0;
  const isLive   = s.status === 'live';

  const statusBadge = isLive
    ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(34,197,94,.12);color:#16a34a;font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px"><span style="width:6px;height:6px;background:#22c55e;border-radius:50%;animation:liveBlip 1s infinite"></span>LIVE NOW</span>`
    : type === 'upcoming'
      ? `<span style="background:var(--cyan-light);color:var(--cyan);font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px">UPCOMING</span>`
      : `<span style="background:#f0fdf4;color:#16a34a;font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px">ENDED</span>`;

  return `
    <div class="card" style="padding:16px 20px${isLive ? ';border:2px solid #22c55e' : ''}">
      <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            ${statusBadge}
            <span style="font-size:.75rem;background:var(--gray-100);padding:2px 8px;border-radius:12px;color:var(--gray-400)">${esc(s.subject)}</span>
          </div>
          <div style="font-size:.97rem;font-weight:700;color:var(--navy);margin-bottom:4px">${esc(s.title)}</div>
          <div style="font-size:.8rem;color:var(--gray-400)"><i class="fas fa-calendar" style="width:14px"></i> ${dateStr} at ${timeStr} &nbsp;·&nbsp; <i class="fas fa-clock" style="width:14px"></i> ${s.duration_minutes} min</div>
          <div style="font-size:.8rem;color:var(--gray-400);margin-top:3px"><i class="fas fa-users" style="width:14px"></i> ${regCount} / ${s.max_students} registered${type==='ended' ? ` &nbsp;·&nbsp; <i class="fas fa-star" style="width:14px;color:#f59e0b"></i> ${fbCount} review${fbCount===1?'':'s'}` : ''}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${isLive ? `
            <button class="btn btn-primary" style="font-size:.8rem;padding:6px 14px;background:#16a34a;border-color:#16a34a" onclick="joinLiveSession(${s.id})"><i class="fas fa-video"></i> Rejoin Room</button>
            <button class="btn btn-danger" style="font-size:.8rem;padding:6px 12px" onclick="endSessionConfirm(${s.id},'${esc(s.title).replace(/'/g,"\\'")}')"><i class="fas fa-stop-circle"></i> End</button>` : ''}
          ${type === 'upcoming' && !isLive ? `
            <button class="btn btn-primary" style="font-size:.8rem;padding:6px 14px;background:#16a34a;border-color:#16a34a" data-start-session="${s.id}" onclick="startLiveSession(${s.id})"><i class="fas fa-broadcast-tower"></i> Go Live</button>
            <button class="btn btn-ghost" style="font-size:.8rem;padding:6px 12px" onclick="viewSessionAttendees(${s.id},'upcoming')"><i class="fas fa-users"></i> Attendees</button>
            <button class="btn btn-ghost" style="font-size:.8rem;padding:6px 12px" onclick="showEditSessionById(${s.id})"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-ghost" style="font-size:.8rem;padding:6px 12px;color:var(--danger)" onclick="cancelSessionConfirm(${s.id},'${esc(s.title).replace(/'/g,"\\'")}')"><i class="fas fa-ban"></i> Cancel</button>` : ''}
          ${type === 'ended' ? `
            <button class="btn btn-ghost" style="font-size:.8rem;padding:6px 12px" onclick="viewSessionAttendees(${s.id},'ended')"><i class="fas fa-users"></i> Attendees</button>` : ''}
          ${type === 'ended' && !s.attendance_reported_at ? `
            <button class="btn btn-primary" style="font-size:.8rem;padding:6px 12px" onclick="openAttendanceReport(${s.id},'${esc(s.title).replace(/'/g,"\\'")}')"><i class="fas fa-clipboard-check"></i> Mark Attendance</button>` : ''}
          <button class="btn btn-ghost" style="font-size:.8rem;padding:6px 12px" onclick="showSessionDetailById(${s.id})"><i class="fas fa-eye"></i> View</button>
        </div>
      </div>
    </div>`;
}

/* ── Teacher Course Card ────────────────────────────────────── */
function teacherCourseCard(c) {
  const sessions     = c.sessions || [];
  const regCount     = parseInt(c.registered_count) || 0;
  const nextRaw      = c.next_session_at;
  const nextStr      = nextRaw ? `Next: ${fmtDate(parseUtc(nextRaw))} · ${fmtTime(parseUtc(nextRaw))}` : 'All sessions ended';
  const statusColors = { upcoming: ['var(--cyan-light)','var(--cyan)'], ongoing: ['#fef3c7','#92400e'], completed: ['#f0fdf4','#16a34a'], cancelled: ['#fef2f2','#ef4444'] };
  const [sbg, scol]  = statusColors[c.status] || ['var(--gray-100)','var(--gray-500)'];
  const isCancelled  = c.status === 'cancelled' || c.status === 'completed';

  const sessionRows = sessions.map((s, i) => {
    const dt        = parseUtc(s.scheduled_at);
    const isLive    = s.status === 'live';
    const isUp      = s.status === 'upcoming';
    const isEnded   = s.status === 'ended';
    const dotColor  = isLive ? '#22c55e' : isUp ? 'var(--cyan)' : isEnded ? 'var(--gray-400)' : 'var(--danger)';
    const safeTitle = esc(s.title || 'Session ' + (i + 1)).replace(/'/g, "\\'");
    return `
      <div style="display:flex;align-items:center;gap:8px;font-size:.78rem;padding:7px 10px;background:var(--gray-50);border-radius:6px;flex-wrap:wrap">
        <span style="min-width:18px;font-weight:800;color:${dotColor}">${i + 1}</span>
        <span style="color:var(--navy);flex:1">${fmtDate(dt)} · ${fmtTime(dt)} · ${s.duration_minutes}min</span>
        <div style="display:flex;gap:4px;flex-shrink:0">
          ${isLive ? `
            <button class="btn btn-primary" style="font-size:.7rem;padding:3px 9px;background:#16a34a;border-color:#16a34a" onclick="joinLiveSession(${s.id})"><i class="fas fa-video"></i> Rejoin</button>
            <button class="btn btn-danger" style="font-size:.7rem;padding:3px 8px" onclick="endSessionConfirm(${s.id},'${safeTitle}')"><i class="fas fa-stop-circle"></i></button>
          ` : ''}
          ${isUp ? `
            <button class="btn btn-primary" style="font-size:.7rem;padding:3px 9px;background:#16a34a;border-color:#16a34a" onclick="startLiveSession(${s.id})"><i class="fas fa-broadcast-tower"></i> Go Live</button>
            <button class="btn btn-ghost" style="font-size:.7rem;padding:3px 8px" onclick="viewSessionAttendees(${s.id},'upcoming')"><i class="fas fa-users"></i></button>
            <button class="btn btn-ghost" style="font-size:.7rem;padding:3px 8px;color:var(--danger)" onclick="cancelSessionConfirm(${s.id},'${safeTitle}')"><i class="fas fa-ban"></i></button>
          ` : ''}
          ${isEnded ? `
            <button class="btn btn-ghost" style="font-size:.7rem;padding:3px 8px" onclick="viewSessionAttendees(${s.id},'ended')"><i class="fas fa-users"></i></button>
            ${!s.attendance_reported_at ? `<button class="btn btn-primary" style="font-size:.7rem;padding:3px 9px" onclick="openAttendanceReport(${s.id},'${safeTitle}')"><i class="fas fa-clipboard-check"></i> Attendance</button>` : ''}
          ` : ''}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="card" style="padding:16px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="background:${sbg};color:${scol};font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:20px">${c.status.toUpperCase()}</span>
            <span style="background:linear-gradient(135deg,#7c3aed,#1565C0);color:white;font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:20px">COURSE · ${sessions.length} sessions</span>
            <span style="background:var(--gray-100);color:var(--gray-500);font-size:.7rem;padding:2px 8px;border-radius:20px">${esc(c.subject)}</span>
          </div>
          <div style="font-weight:700;font-size:.97rem;color:var(--navy)">${esc(c.title)}</div>
          <div style="font-size:.78rem;color:var(--gray-400);margin-top:3px"><i class="fas fa-calendar" style="margin-right:4px"></i>${nextStr}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:.82rem;font-weight:700;color:var(--navy)">${regCount} / ${c.max_students}</div>
          <div style="font-size:.72rem;color:var(--gray-400)">enrolled</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:12px">
        ${sessionRows}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--gray-100)">
        <button class="btn btn-primary" style="font-size:.78rem;padding:5px 12px" onclick="showCourseDetail(${c.id})"><i class="fas fa-eye"></i> View Details</button>
        <button class="btn btn-ghost" style="font-size:.78rem;padding:5px 12px" onclick="viewCourseStudents(${c.id})"><i class="fas fa-users"></i> Students (${regCount})</button>
        ${!isCancelled ? `<button class="btn btn-ghost" style="font-size:.78rem;padding:5px 12px;color:var(--danger)" onclick="cancelCourse(${c.id},'${esc(c.title).replace(/'/g,"\\'")}')"><i class="fas fa-ban"></i> Cancel Course</button>` : ''}
      </div>
    </div>`;
}

/* ── View Course Students (teacher) ────────────────────────── */
async function viewCourseStudents(courseId) {
  openModal('attendeesModal');
  const body = document.getElementById('attendeesBody');
  const titleEl = document.querySelector('#attendeesModal .modal-title');
  if (titleEl) titleEl.innerHTML = '<i class="fas fa-users" style="color:var(--cyan);margin-right:8px"></i>Enrolled Students';
  if (body) body.innerHTML = skeletons(3, 60);

  const res = await api('/teacher.php?action=course_students&course_id=' + courseId);
  if (!body) return;
  if (!res.success) { body.innerHTML = errorCard('Could not load students'); return; }
  const list = res.data || [];

  if (!list.length) {
    body.innerHTML = `<div style="text-align:center;padding:32px;color:var(--gray-400)"><i class="fas fa-users" style="font-size:2rem;display:block;margin-bottom:10px"></i><p>No enrolled students yet</p></div>`;
    return;
  }
  body.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px">
    ${list.map(u => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--gray-50);border-radius:10px">
        <img src="${esc(u.avatar_url||"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E")}" style="width:36px;height:36px;border-radius:50%;object-fit:cover" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.88rem;color:var(--navy)">${esc(u.first_name)} ${esc(u.last_name)}</div>
          <div style="font-size:.76rem;color:var(--gray-400)">@${esc(u.username)} · Grade ${esc(u.grade||'?')}</div>
          ${u.intro_answer ? `<div style="font-size:.75rem;color:var(--gray-500);margin-top:3px;font-style:italic">"${esc(u.intro_answer)}"</div>` : ''}
        </div>
      </div>`).join('')}
  </div>`;
}

async function cancelCourse(courseId, title) {
  if (!confirm(`Cancel the entire course "${title}"?\n\nAll upcoming sessions will be cancelled. This cannot be undone.`)) return;
  const res = await api('/teacher.php?action=cancel_course', 'POST', { course_id: courseId });
  if (!res.success) { toast(res.error || 'Could not cancel course', 'error'); return; }
  toast('Course cancelled.', 'success');
  renderTeacherHub();
}

/* ── Create Session Modal ───────────────────────────────────── */
function showCreateSession() {
  const approvedRaw = state.user?.approved_subjects || '[]';
  let approved = [];
  try { approved = JSON.parse(approvedRaw); } catch {}

  const body = document.getElementById('createSessionBody');
  if (!body) return;

  // Default scheduled_at: tomorrow at 15:00 local
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(15, 0, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  const defaultDt = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth()+1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
  // Default timezone: teacher's saved preference, then browser timezone
  const defaultTz = state.user?.preferred_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Session Title <span style="color:var(--danger)">*</span></label>
      <input class="form-control" id="csTitle" placeholder="e.g. IGCSE Biology: Photosynthesis Q&A">
    </div>
    <div class="session-form-grid">
      <div class="form-group">
        <label class="form-label">Subject <span style="color:var(--danger)">*</span></label>
        <select class="form-control" id="csSubject">
          <option value="">Select…</option>
          ${TEACHER_SUBJECTS.map(s => {
            const isApproved = approved.includes(s);
            return `<option value="${esc(s)}" ${isApproved?'':'disabled'} style="${isApproved?'':'color:var(--gray-400)'}">${esc(s)}${isApproved?'':' (not approved)'}</option>`;
          }).join('')}
        </select>
        ${approved.length < TEACHER_SUBJECTS.length ? `<p style="font-size:.73rem;color:var(--gray-400);margin-top:4px">Only your approved subjects are selectable. Apply to teach more subjects via your profile.</p>` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">Duration (minutes)</label>
        <input class="form-control" id="csDuration" type="number" min="10" max="480" value="60">
      </div>
    </div>
    <div class="session-form-grid">
      <div class="form-group">
        <label class="form-label">Date &amp; Time <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="csDatetime" type="datetime-local" value="${defaultDt}">
      </div>
      <div class="form-group">
        <label class="form-label">Max Students</label>
        <input class="form-control" id="csMax" type="number" min="1" max="200" value="20">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Session Timezone</label>
      ${tzSelectHtml('csTimezone', defaultTz)}
      <p style="font-size:.74rem;color:var(--gray-400);margin-top:4px">Date & Time above is in this timezone. Students see it in their local time.</p>
    </div>
    <div class="form-group">
      <label class="form-label">Meeting Link</label>
      <input class="form-control" id="csMeetLink" placeholder="Zoom / Google Meet / Teams URL">
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-control" id="csDesc" rows="3" placeholder="What will students learn? Any prerequisites?" style="resize:vertical"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Intro Question for Students <span style="color:var(--gray-400);font-size:.76rem">(optional)</span></label>
      <input class="form-control" id="csIntroQ" placeholder="e.g. Which topics do you need help with? What's your current level?">
      <p style="font-size:.74rem;color:var(--gray-400);margin-top:4px">Students must answer this before registering. You'll see their answers in the Attendees panel.</p>
    </div>`;

  openModal('createSessionModal');
}

async function submitCreateSession() {
  const title    = document.getElementById('csTitle')?.value.trim()    || '';
  const subject  = document.getElementById('csSubject')?.value         || '';
  const duration = parseInt(document.getElementById('csDuration')?.value || 60);
  const dt       = document.getElementById('csDatetime')?.value        || '';
  const tz       = document.getElementById('csTimezone')?.value        || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const maxStu   = parseInt(document.getElementById('csMax')?.value    || 20);
  const link     = document.getElementById('csMeetLink')?.value.trim() || '';
  const desc     = document.getElementById('csDesc')?.value.trim()     || '';
  const introQ   = document.getElementById('csIntroQ')?.value.trim()   || '';

  if (!title)   { toast('Title is required', 'error'); return; }
  if (!subject) { toast('Please select a subject', 'error'); return; }
  if (!dt)      { toast('Please pick a date and time', 'error'); return; }

  const btn = document.querySelector('#createSessionModal .btn-primary');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…'; btn.disabled = true; }

  const res = await api('/teacher.php?action=create_session', 'POST', {
    title, subject, description: desc,
    scheduled_at:     dt.replace('T', ' ') + ':00',
    session_timezone: tz,
    duration_minutes: duration,
    meeting_link: link,
    max_students: maxStu,
    intro_question: introQ,
  });

  if (btn) { btn.innerHTML = '<i class="fas fa-plus"></i> Create Session'; btn.disabled = false; }
  if (!res.success) { toast(res.error || 'Could not create session', 'error'); return; }

  closeModal('createSessionModal');
  toast('Session created!', 'success');
  renderTeacherHub();
}

/* ── Create Choice (Single Session vs Course) ───────────────── */
function showCreateChoice() {
  openModal('createChoiceModal');
}

/* ── Create Course Modal ────────────────────────────────────── */
function showCreateCourse() {
  const approvedRaw = state.user?.approved_subjects || '[]';
  let approved = [];
  try { approved = JSON.parse(approvedRaw); } catch {}

  const body = document.getElementById('createCourseBody');
  if (!body) return;

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(15, 0, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  const defaultDt = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth()+1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
  const defaultTz = state.user?.preferred_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Course Title <span style="color:var(--danger)">*</span></label>
      <input class="form-control" id="ccTitle" placeholder="e.g. IGCSE Biology Complete Course">
    </div>
    <div class="session-form-grid">
      <div class="form-group">
        <label class="form-label">Subject <span style="color:var(--danger)">*</span></label>
        <select class="form-control" id="ccSubject">
          <option value="">Select…</option>
          ${TEACHER_SUBJECTS.map(s => {
            const isApproved = approved.includes(s);
            return `<option value="${esc(s)}" ${isApproved?'':'disabled'} style="${isApproved?'':'color:var(--gray-400)'}">${esc(s)}${isApproved?'':' (not approved)'}</option>`;
          }).join('')}
        </select>
        ${approved.length < TEACHER_SUBJECTS.length ? `<p style="font-size:.73rem;color:var(--gray-400);margin-top:4px">Only approved subjects are selectable.</p>` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">Max Students</label>
        <input class="form-control" id="ccMax" type="number" min="1" max="200" value="20">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Default Description <span style="color:var(--gray-400);font-size:.76rem">(used for sessions without individual descriptions)</span></label>
      <textarea class="form-control" id="ccDesc" rows="2" placeholder="What will students learn across this course? Prerequisites?" style="resize:vertical"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Session Timezone <span style="color:var(--danger)">*</span></label>
      ${tzSelectHtml('ccTimezone', defaultTz)}
      <p style="font-size:.74rem;color:var(--gray-400);margin-top:4px">All session dates below are in this timezone.</p>
    </div>
    <div class="form-group">
      <label class="form-label">Intro Question for Students <span style="color:var(--gray-400);font-size:.76rem">(optional)</span></label>
      <input class="form-control" id="ccIntroQ" placeholder="e.g. What topics do you need help with most?">
    </div>
    <div class="form-group">
      <label class="form-label">Number of Sessions <span style="color:var(--danger)">*</span></label>
      <div style="display:flex;align-items:center;gap:12px">
        <input class="form-control" id="ccNumSessions" type="number" min="1" max="20" value="3" style="width:80px" oninput="_updateCourseSessionRows()">
        <span style="font-size:.85rem;color:var(--gray-400)">sessions (max 20)</span>
      </div>
    </div>
    <div id="ccSessionRows" style="margin-top:4px"></div>`;

  // Initialize session rows
  _updateCourseSessionRows();
  openModal('createCourseModal');
}

function _updateCourseSessionRows() {
  const n = Math.min(20, Math.max(1, parseInt(document.getElementById('ccNumSessions')?.value || 1)));
  const container = document.getElementById('ccSessionRows');
  if (!container) return;

  const tz = document.getElementById('ccTimezone')?.value || 'UTC';
  // Keep existing values
  const existing = {};
  container.querySelectorAll('[data-sess-idx]').forEach(row => {
    const i = row.dataset.sessIdx;
    const dt  = row.querySelector('.cc-sess-dt')?.value  || '';
    const dur = row.querySelector('.cc-sess-dur')?.value || '60';
    const dsc = row.querySelector('.cc-sess-dsc')?.value || '';
    existing[i] = { dt, dur, dsc };
  });

  const pad = v => String(v).padStart(2, '0');
  const rows = [];
  for (let i = 0; i < n; i++) {
    const prev = existing[i] || {};
    // Default: offset each session by i days from tomorrow at 15:00
    const d = new Date(); d.setDate(d.getDate() + 1 + i); d.setHours(15, 0, 0, 0);
    const defDt = prev.dt || `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T15:00`;
    const defDur = prev.dur || '60';
    const defDsc = prev.dsc || '';

    rows.push(`
      <div class="course-session-row" data-sess-idx="${i}">
        <div style="font-weight:700;font-size:.85rem;color:var(--cyan);margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--gray-200)">Session ${i+1}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div class="form-group" style="margin:0">
            <label class="form-label" style="font-size:.76rem">Date &amp; Time <span style="color:var(--danger)">*</span></label>
            <input class="form-control cc-sess-dt" type="datetime-local" value="${defDt}" style="font-size:.82rem">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label" style="font-size:.76rem">Duration (min)</label>
            <input class="form-control cc-sess-dur" type="number" min="10" max="480" value="${defDur}" style="font-size:.82rem">
          </div>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" style="font-size:.76rem">Notes <span style="color:var(--gray-400)">(optional — leave blank to use course description)</span></label>
          <textarea class="form-control cc-sess-dsc" rows="2" placeholder="Specific topics for this session…" style="resize:vertical;font-size:.82rem">${esc(defDsc)}</textarea>
        </div>
      </div>`);
  }
  container.innerHTML = `
    <div style="font-size:.82rem;font-weight:700;color:var(--navy);margin-bottom:10px;border-top:1px solid var(--gray-100);padding-top:14px">
      <i class="fas fa-calendar-alt" style="color:var(--cyan);margin-right:6px"></i>Session Dates &amp; Details
    </div>
    ${rows.join('')}`;
}

async function submitCreateCourse() {
  const title   = document.getElementById('ccTitle')?.value.trim()    || '';
  const subject = document.getElementById('ccSubject')?.value         || '';
  const desc    = document.getElementById('ccDesc')?.value.trim()     || '';
  const tz      = document.getElementById('ccTimezone')?.value        || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const maxStu  = parseInt(document.getElementById('ccMax')?.value    || 20);
  const introQ  = document.getElementById('ccIntroQ')?.value.trim()   || '';
  const numSess = parseInt(document.getElementById('ccNumSessions')?.value || 1);

  if (!title)   { toast('Course title is required', 'error'); return; }
  if (!subject) { toast('Please select a subject', 'error'); return; }

  const sessions = [];
  const rows = document.querySelectorAll('#ccSessionRows [data-sess-idx]');
  let valid = true;
  rows.forEach((row, i) => {
    const dt  = row.querySelector('.cc-sess-dt')?.value  || '';
    const dur = parseInt(row.querySelector('.cc-sess-dur')?.value || 60);
    const dsc = row.querySelector('.cc-sess-dsc')?.value.trim() || '';
    if (!dt) { toast(`Please set a date for Session ${i+1}`, 'error'); valid = false; return; }
    sessions.push({ scheduled_at: dt.replace('T', ' ') + ':00', duration_minutes: dur, description: dsc });
  });
  if (!valid) return;
  if (!sessions.length) { toast('Add at least one session', 'error'); return; }

  const btn = document.getElementById('createCourseBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…'; btn.disabled = true; }

  const res = await api('/teacher.php?action=create_course', 'POST', {
    title, subject, description: desc,
    session_timezone: tz,
    max_students: maxStu,
    intro_question: introQ,
    sessions,
  });

  if (btn) { btn.innerHTML = '<i class="fas fa-plus"></i> Create Course'; btn.disabled = false; }
  if (!res.success) { toast(res.error || 'Could not create course', 'error'); return; }

  closeModal('createCourseModal');
  toast(`Course created with ${sessions.length} session${sessions.length > 1 ? 's' : ''}!`, 'success');
  renderTeacherHub();
}

/* ── Cancel Session (teacher) ───────────────────────────────── */
async function cancelSessionConfirm(sessionId, title) {
  if (!confirm(`Cancel "${title}"?\n\nRegistered students will no longer see this session. This cannot be undone.`)) return;
  const res = await api('/teacher.php?action=cancel_session', 'POST', { session_id: sessionId });
  if (!res.success) { toast(res.error || 'Could not cancel session', 'error'); return; }
  toast('Session cancelled.', 'success');
  renderTeacherHub();
}

/* ── End Session ────────────────────────────────────────────── */
async function endSessionConfirm(sessionId, title) {
  if (!confirm(`End session "${title}"?\n\nYou'll mark attendance in the next step — students receive XP only for marked attendance.`)) return;

  const res = await api('/teacher.php?action=end_session', 'POST', { session_id: sessionId });
  if (!res.success) { toast(res.error || 'Could not end session', 'error'); return; }

  toast(`Session ended! You earned +${res.data?.xp_earned || 0} XP`, 'success');
  renderTeacherHub();

  // Open attendance report modal immediately
  showAttendanceReport(
    res.data?.session?.id   || sessionId,
    res.data?.session?.title || title,
    res.data?.xp_earned     || 0,
    res.data?.students      || []
  );
}

/* ── Attendance Report Modal ────────────────────────────────── */
let _attendanceSessionId = null;

function showAttendanceReport(sessionId, title, xpEarned, students) {
  _attendanceSessionId = sessionId;

  const subtitle = document.getElementById('attendanceReportSubtitle');
  if (subtitle) subtitle.textContent = `Session: "${title}" — mark which students attended.`;

  const list = document.getElementById('attendanceStudentList');
  if (!list) return;

  if (!students.length) {
    list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--gray-400)"><i class="fas fa-users" style="font-size:2rem;display:block;margin-bottom:10px"></i><p>No registered students</p></div>`;
  } else {
    list.innerHTML = students.map(s => {
      const name = esc(`${s.first_name} ${s.last_name}`);
      const uname = esc(s.username || '');
      const av = s.avatar_url
        ? `<img src="${esc(s.avatar_url)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover">`
        : `<div class="user-avatar avatar-sm" style="width:36px;height:36px;font-size:.8rem">${(s.first_name||'?')[0].toUpperCase()}</div>`;
      return `<label style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--gray-100);border-radius:10px;cursor:pointer;transition:background .15s" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background=''">
        <input type="checkbox" class="attendance-cb" value="${s.id}" onchange="updateAttendanceCount()" style="width:16px;height:16px;flex-shrink:0">
        ${av}
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.9rem">${name}</div>
          ${uname ? `<div style="font-size:.8rem;color:var(--gray-500)">@${uname}</div>` : ''}
        </div>
      </label>`;
    }).join('');
  }

  // Reset select-all state
  const selAll = document.getElementById('attendanceSelectAll');
  if (selAll) selAll.checked = false;
  updateAttendanceCount();

  openModal('attendanceReportModal');
}

function toggleAttendanceAll(checked) {
  document.querySelectorAll('.attendance-cb').forEach(cb => { cb.checked = checked; });
  updateAttendanceCount();
}

function updateAttendanceCount() {
  const total    = document.querySelectorAll('.attendance-cb').length;
  const selected = document.querySelectorAll('.attendance-cb:checked').length;
  const el = document.getElementById('attendanceCount');
  if (el) el.textContent = `${selected} / ${total} selected`;
  const selAll = document.getElementById('attendanceSelectAll');
  if (selAll) selAll.checked = total > 0 && selected === total;
}

async function submitAttendanceReport() {
  if (!_attendanceSessionId) return;
  const checkedIds = [...document.querySelectorAll('.attendance-cb:checked')].map(cb => parseInt(cb.value));
  const btn = document.getElementById('submitAttendanceBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'; }

  const res = await api('/teacher.php?action=submit_attendance_report', 'POST', {
    session_id: _attendanceSessionId,
    attended_ids: checkedIds,
  });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Submit Attendance'; }
  if (!res.success) { toast(res.error || 'Could not submit attendance', 'error'); return; }

  closeModal('attendanceReportModal');
  toast(`Attendance submitted! ${res.data.attended} student(s) received XP.`, 'success');
  _attendanceSessionId = null;
  renderTeacherHub();
}

/* ── Open Attendance Report for a past session ──────────────── */
async function openAttendanceReport(sessionId, title) {
  // Show a loading state in the modal while fetching students
  _attendanceSessionId = sessionId;
  const list = document.getElementById('attendanceStudentList');
  if (list) list.innerHTML = skeletons(3, 50);
  const subtitle = document.getElementById('attendanceReportSubtitle');
  if (subtitle) subtitle.textContent = `Session: "${title}" — mark which students attended.`;
  openModal('attendanceReportModal');

  const res = await api('/teacher.php?action=session_attendees&session_id=' + sessionId);
  if (!res.success) {
    if (list) list.innerHTML = errorCard('Could not load student list');
    return;
  }
  showAttendanceReport(sessionId, title, 0, res.data || []);
}

/* ── View Attendees Modal ───────────────────────────────────── */
async function viewSessionAttendees(sessionId, sessionStatus) {
  openModal('attendeesModal');
  const body = document.getElementById('attendeesBody');
  if (body) body.innerHTML = skeletons(3, 60);

  const res = await api('/teacher.php?action=session_attendees&session_id=' + sessionId);
  if (!body) return;

  if (!res.success) { body.innerHTML = errorCard('Could not load attendees'); return; }
  const list = res.data || [];

  // If status wasn't passed, try to infer from the data (first row has it in some APIs)
  const isEnded = sessionStatus === 'ended';

  if (!list.length) {
    body.innerHTML = `<div style="text-align:center;padding:32px;color:var(--gray-400)"><i class="fas fa-users" style="font-size:2rem;display:block;margin-bottom:10px"></i><p>No registrations yet</p></div>`;
    return;
  }

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      ${list.map(a => {
        const attended = parseInt(a.attended);
        const hasFb    = parseInt(a.has_feedback);
        return `
        <div style="padding:12px;background:#fafbfc;border-radius:10px">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <img src="${esc(a.avatar_url||"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E")}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:.88rem;color:var(--navy)">${esc(a.first_name)} ${esc(a.last_name)}</div>
              <div style="font-size:.76rem;color:var(--gray-400)">@${esc(a.username)}${isEnded && attended ? ' · <span style="color:var(--success);font-weight:600">✓ Attended</span>' : isEnded ? ' · <span style="color:var(--gray-400)">Absent</span>' : ''}</div>
            </div>
            ${isEnded
              ? (hasFb
                  ? '<span style="font-size:.75rem;color:var(--success);font-weight:600;flex-shrink:0"><i class="fas fa-check-circle"></i> Reviewed</span>'
                  : (attended
                      ? `<button class="btn btn-ghost" style="font-size:.75rem;padding:5px 10px;flex-shrink:0" onclick="showFeedbackModal(${sessionId},${a.id},'teacher_to_student')"><i class="fas fa-comment-alt"></i> Feedback</button>`
                      : ''))
              : `<span style="font-size:.72rem;color:var(--gray-400);font-style:italic">Registered</span>`
            }
          </div>
          ${a.intro_answer ? `<div style="margin-top:8px;padding:8px 10px;background:var(--cyan-light);border-radius:6px;font-size:.78rem;color:var(--navy)"><i class="fas fa-quote-left" style="color:var(--cyan);margin-right:4px"></i>${esc(a.intro_answer)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   PHASE 5 — Learn Hub / Session Discovery  (Part 5/6)
   ══════════════════════════════════════════════════════════════ */

let _learnHubFilter = 'All';
let _learnHubTab    = 'discover'; // 'discover' | 'my' | 'past'
let _learnHubSearch = '';

async function renderLearnHub() {
  // Reset filter state on each page render so users always start fresh
  _learnHubFilter = 'All';
  _learnHubSearch = '';
  _learnHubTab    = 'discover';
  const pg = document.getElementById('page-learn');
  if (!pg) return;
  pg.classList.remove('page-session-detail-active');

  const role      = state.user?.role || 'student';
  const isTeacher = role === 'active_teacher';

  pg.innerHTML = `
    <div class="lh-container">
      <div class="lh-header">
        <div>
          <h1 style="font-size:1.4rem;font-weight:800;color:var(--navy)">Learn</h1>
          <p style="font-size:.83rem;color:var(--gray-400)">Discover peer-led sessions or track your registrations</p>
        </div>
        ${role === 'student' ? `<button class="btn btn-ghost" style="font-size:.83rem;margin-left:auto" onclick="showBecomeTeacher()"><i class="fas fa-chalkboard-teacher"></i> Become a Teacher</button>` : ''}
        ${isTeacher ? `<button class="btn btn-primary" style="font-size:.83rem;margin-left:auto" onclick="navigate('teacher')"><i class="fas fa-chalkboard-teacher"></i> Teacher Hub</button>` : ''}
      </div>

      <!-- Application status banner (students only) -->
      <div id="appStatusBanner"></div>

      <!-- Tabs -->
      <div class="lh-tabs-wrap" style="border-radius:10px;padding:4px;margin-bottom:16px;max-width:100%;box-sizing:border-box;border:1.5px solid var(--gray-200)">
        <button id="lhTabDiscover" onclick="_lhTab('discover')"
          style="padding:7px 14px;border-radius:7px;border:none;cursor:pointer;font-size:.84rem;font-weight:600;transition:all .2s;background:${_learnHubTab==='discover'?'var(--surface)':'transparent'};color:${_learnHubTab==='discover'?'var(--navy)':'var(--gray-400)'}">
          <i class="fas fa-compass"></i><span class="lh-tab-label"> Discover</span>
        </button>
        <button id="lhTabMy" onclick="_lhTab('my')"
          style="padding:7px 14px;border-radius:7px;border:none;cursor:pointer;font-size:.84rem;font-weight:600;transition:all .2s;background:${_learnHubTab==='my'?'var(--surface)':'transparent'};color:${_learnHubTab==='my'?'var(--navy)':'var(--gray-400)'}">
          <i class="fas fa-calendar-check"></i><span class="lh-tab-label"> My Sessions</span>
        </button>
        <button id="lhTabCourses" onclick="_lhTab('courses')"
          style="padding:7px 14px;border-radius:7px;border:none;cursor:pointer;font-size:.84rem;font-weight:600;transition:all .2s;background:${_learnHubTab==='courses'?'var(--surface)':'transparent'};color:${_learnHubTab==='courses'?'var(--navy)':'var(--gray-400)'}">
          <i class="fas fa-graduation-cap"></i><span class="lh-tab-label"> My Courses</span>
        </button>
        <button id="lhTabPast" onclick="_lhTab('past')"
          style="padding:7px 14px;border-radius:7px;border:none;cursor:pointer;font-size:.84rem;font-weight:600;transition:all .2s;background:${_learnHubTab==='past'?'var(--surface)':'transparent'};color:${_learnHubTab==='past'?'var(--navy)':'var(--gray-400)'}">
          <i class="fas fa-history"></i><span class="lh-tab-label"> Past</span>
        </button>
      </div>

      <!-- Search (discover tab only) -->
      <div id="lhSearchBar" style="display:${_learnHubTab==='discover'?'flex':'none'};gap:8px;margin-bottom:14px">
        <div style="flex:1;position:relative">
          <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--gray-400);font-size:.85rem"></i>
          <input class="form-control" id="lhSearchInput" placeholder="Search by session title or teacher name…"
            value="${esc(_learnHubSearch)}" oninput="_lhSearch(this.value)"
            style="padding-left:36px;font-size:.87rem">
        </div>
      </div>

      <!-- Subject filter pills (discover tab only) -->
      <div id="learnFilterPills" class="courses-filter-scroll" style="display:${_learnHubTab==='discover'?'flex':'none'}">
        ${['All', ...TEACHER_SUBJECTS].map(s => `
          <button class="courses-filter-pill ${_learnHubFilter===s?'active':''}" data-filter="${s}" onclick="filterLearnHub('${s}')">${s}</button>
        `).join('')}
      </div>

      <div id="learnSessionsGrid">${skeletons(4, 140)}</div>
    </div>`;

  _loadAppStatusBanner();
  _lhLoadTab();
}

function _lhTab(tab) {
  _learnHubTab = tab;
  // Update tab button styles
  ['discover','my','courses','past'].forEach(t => {
    const btn = document.getElementById('lhTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (!btn) return;
    const active = t === tab;
    btn.style.background = active ? 'var(--surface)' : 'transparent';
    btn.style.color      = active ? 'var(--navy)'    : 'var(--gray-400)';
  });
  // Toggle search/filter visibility
  const searchBar  = document.getElementById('lhSearchBar');
  const filterPills= document.getElementById('learnFilterPills');
  if (searchBar)   searchBar.style.display   = tab === 'discover' ? 'flex'  : 'none';
  if (filterPills) filterPills.style.display  = tab === 'discover' ? 'flex'  : 'none';
  _lhLoadTab();
}

function _lhSearch(val) {
  _learnHubSearch = val;
  clearTimeout(_lhSearch._t);
  _lhSearch._t = setTimeout(_loadLearnHubSessions, 300);
}

function _lhLoadTab() {
  if (_learnHubTab === 'discover') return _loadLearnHubSessions();
  if (_learnHubTab === 'my')       return _loadMyUpcomingSessions();
  if (_learnHubTab === 'courses')  return _renderMyCourses();
  if (_learnHubTab === 'past')     return renderPastSessions();
}

async function _renderMyCourses() {
  const grid = document.getElementById('learnSessionsGrid');
  if (!grid) return;
  grid.innerHTML = skeletons(3, 160);

  const res = await api('/courses.php?action=enrolled');
  if (!document.getElementById('learnSessionsGrid')) return;
  if (!res.success) { grid.innerHTML = errorCard('Could not load your courses.', '📚', '_renderMyCourses'); return; }

  const courses = res.data || [];

  if (!courses.length) {
    grid.innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:var(--gray-400)">
        <div style="font-size:3rem;margin-bottom:14px">🎓</div>
        <p style="font-size:1rem;font-weight:600;color:var(--navy);margin-bottom:6px">No enrolled courses yet</p>
        <p style="font-size:.85rem;margin-bottom:20px">Discover and enrol in a course from the Discover tab.</p>
        <button class="btn btn-primary" onclick="_lhTab('discover')"><i class="fas fa-compass"></i> Browse Courses</button>
      </div>`;
    return;
  }

  grid.innerHTML = `<div style="display:flex;flex-direction:column;gap:16px">${courses.map(c => enrolledCourseCard(c)).join('')}</div>`;
}

async function _loadAppStatusBanner() {
  const role = state.user?.role || 'student';
  if (role !== 'student') return;
  const el = document.getElementById('appStatusBanner');
  if (!el) return;

  const res = await api('/teacher.php?action=application_status');
  if (!res.success || !res.data || res.data.status === 'none') return;

  const s = res.data;
  const colours = { pending: ['#fef3c7','#92400e','#f59e0b'], approved: ['#f0fdf4','#065f46','#16a34a'], declined: ['#fef2f2','#991b1b','#ef4444'] };
  const [bg, text, border] = colours[s.status] || ['#f8fafc','#374151','#d1d5db'];
  const icons = { pending:'⏳', approved:'✅', declined:'❌' };
  el.innerHTML = `
    <div style="background:${bg};border:1.5px solid ${border};border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <span style="font-size:1.3rem">${icons[s.status]||'📋'}</span>
      <div>
        <div style="font-weight:700;font-size:.87rem;color:${text}">Teacher Application — ${s.status.charAt(0).toUpperCase()+s.status.slice(1)}</div>
        ${s.admin_notes ? `<div style="font-size:.78rem;color:${text};opacity:.8;margin-top:2px">${esc(s.admin_notes)}</div>` : ''}
        <div style="font-size:.74rem;opacity:.6;color:${text};margin-top:2px">Submitted ${timeAgo(s.submitted_at)}</div>
      </div>
      ${s.status === 'declined' ? `<button class="btn btn-ghost" style="margin-left:auto;font-size:.78rem" onclick="showBecomeTeacher()">Re-apply</button>` : ''}
    </div>`;
}

function filterLearnHub(subject) {
  _learnHubFilter = subject;
  document.querySelectorAll('#learnFilterPills .courses-filter-pill').forEach(btn => {
    const isActive = (btn.dataset.filter || btn.textContent.trim()) === subject;
    btn.classList.toggle('active', isActive);
  });
  // _loadLearnHubSessions already fetches and renders both sessions AND courses
  _loadLearnHubSessions();
}

let _learnHubAbort = null;
let _learnHubCoursesCache = [];
let _learnHubReqSeq = 0;

async function _loadLearnHubSessions() {
  const grid = document.getElementById('learnSessionsGrid');
  if (!grid) return;
  grid.innerHTML = skeletons(4, 140);

  // Sequence counter: ignore responses from superseded requests
  const seq = ++_learnHubReqSeq;

  const qs = _learnHubFilter !== 'All' ? `&subject=${encodeURIComponent(_learnHubFilter)}` : '';
  const [sessRes, courseRes] = await Promise.all([
    api('/teacher.php?action=sessions' + qs),
    api('/teacher.php?action=courses' + qs),
  ]);
  // Discard stale responses (user clicked a different filter while request was in-flight)
  if (seq !== _learnHubReqSeq) return;
  if (!document.getElementById('learnSessionsGrid')) return;

  if (!sessRes.success) { grid.innerHTML = errorCard('Could not load sessions.', '📅', '_loadLearnHubSessions'); return; }
  let sessions = sessRes.data || [];
  _learnHubSessionsCache = sessions;
  _learnHubCoursesCache  = courseRes.success ? (courseRes.data || []) : [];

  // Client-side search filter
  if (_learnHubSearch.trim()) {
    const q = _learnHubSearch.toLowerCase();
    sessions = sessions.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.first_name + ' ' + s.last_name).toLowerCase().includes(q) ||
      (s.username || '').toLowerCase().includes(q)
    );
  }

  let html = '';

  // Courses section (if any)
  let courses = _learnHubCoursesCache;
  if (_learnHubSearch.trim()) {
    const q = _learnHubSearch.toLowerCase();
    courses = courses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.first_name + ' ' + c.last_name).toLowerCase().includes(q)
    );
  }

  if (courses.length) {
    html += `
      <div style="margin-bottom:24px;min-width:0;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <span style="font-size:.82rem;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.05em">
            <i class="fas fa-book-open" style="color:var(--cyan);margin-right:5px"></i>Courses
          </span>
          <span style="font-size:.75rem;color:var(--gray-400)">${courses.length} available</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr));gap:14px" id="learnCoursesGrid">
          ${courses.map(c => courseDiscoveryCard(c)).join('')}
        </div>
      </div>`;
  }

  // Sessions section
  if (!sessions.length && !courses.length) {
    const noMsg = _learnHubSearch ? `No results match "<strong>${esc(_learnHubSearch)}</strong>".`
                : _learnHubFilter !== 'All' ? `No upcoming ${_learnHubFilter} sessions or courses right now.`
                : 'Check back soon — teachers are scheduling sessions and courses!';
    grid.innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:var(--gray-400)">
        <div style="font-size:3rem;margin-bottom:14px">📅</div>
        <p style="font-size:1rem;font-weight:600;color:var(--navy);margin-bottom:6px">Nothing found</p>
        <p style="font-size:.85rem">${noMsg}</p>
      </div>`;
    return;
  }

  if (sessions.length) {
    html += `
      <div style="margin-bottom:8px;min-width:0;overflow:hidden">
        ${courses.length ? `<div style="font-size:.82rem;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">
          <i class="fas fa-calendar-alt" style="color:var(--cyan);margin-right:5px"></i>Single Sessions
        </div>` : ''}
        <div id="learnSessionsInnerGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr));gap:16px">
          ${sessions.map(s => sessionDiscoveryCard(s)).join('')}
        </div>
      </div>`;
  }

  grid.innerHTML = html;
}

async function _loadLearnHubCourses() {
  // Used when only courses need refreshing (e.g., after register/unregister)
  const qs = _learnHubFilter !== 'All' ? `&subject=${encodeURIComponent(_learnHubFilter)}` : '';
  const res = await api('/teacher.php?action=courses' + qs);
  if (!res.success) return;
  _learnHubCoursesCache = res.data || [];
  const grid = document.getElementById('learnCoursesGrid');
  if (grid) grid.innerHTML = _learnHubCoursesCache.map(c => courseDiscoveryCard(c)).join('');
}

function courseDiscoveryCard(c) {
  const sessions    = c.sessions || [];
  const regCount    = parseInt(c.registered_count) || 0;
  const maxStu      = parseInt(c.max_students) || 0;
  const isFull      = maxStu > 0 && regCount >= maxStu;
  const isReg       = parseInt(c.is_registered) > 0;
  const isOwn       = state.user && parseInt(c.teacher_id) === parseInt(state.user.id);
  const avgRating   = parseFloat(c.avg_rating) || 0;
  const nextRaw     = c.next_session_at;
  const nextDt      = nextRaw ? parseUtc(nextRaw) : null;
  const nextStr     = nextDt ? fmtDate(nextDt) : 'TBD';
  const teacherName = `${esc(c.first_name)} ${esc(c.last_name)}`;

  // Pastel subject colours
  const subjectColors = {
    'Mathematics':'#e0f2fe|#0369a1','Physics':'#fce7f3|#9d174d','Chemistry':'#ecfdf5|#065f46',
    'Biology':'#f0fdf4|#16a34a','English':'#fff7ed|#c2410c','History':'#fef3c7|#92400e',
    'Computer Science':'#ede9fe|#5b21b6','Economics':'#f0f9ff|#0369a1',
    'default':'#f3f4f6|#374151',
  };
  const [sbg, scol] = (subjectColors[c.subject] || subjectColors['default']).split('|');

  const accentColors = { 'Mathematics':'#0ea5e9','Physics':'#ec4899','Chemistry':'#10b981',
    'Biology':'#22c55e','English':'#f97316','History':'#f59e0b',
    'Computer Science':'#8b5cf6','default':'#29ABE2' };
  const accentColor = accentColors[c.subject] || accentColors['default'];

  return `
    <div class="course-discovery-card" onclick="_openCourse(event,${c.id})" title="Ctrl+click to open in new tab">
      <div class="course-card-accent" style="background:linear-gradient(90deg,${accentColor},#1565C0)"></div>
      <div class="course-card-body">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <span class="course-subject-pill" style="background:${sbg};color:${scol}">${esc(c.subject)}</span>
          <span class="course-badge"><i class="fas fa-book-open" style="font-size:.6rem"></i> ${sessions.length} sessions</span>
        </div>
        <div style="min-width:0">
          <div style="font-weight:800;font-size:.97rem;color:var(--navy);line-height:1.35;margin-bottom:4px;overflow-wrap:break-word">${esc(c.title)}</div>
          ${c.description ? `<div style="font-size:.78rem;color:var(--gray-500);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(c.description)}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;cursor:pointer;min-width:0" onclick="event.stopPropagation();viewTeacherProfile(${c.teacher_id})">
          <img src="${esc(c.avatar_url||"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E")}" style="width:26px;height:26px;min-width:26px;border-radius:50%;object-fit:cover" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'">
          <span style="font-size:.78rem;font-weight:600;color:var(--navy);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1">${teacherName}</span>
          ${avgRating ? `<span style="font-size:.72rem;color:#f59e0b;flex-shrink:0;font-weight:600">★ ${avgRating}</span>` : `<span style="font-size:.72rem;color:var(--gray-300);flex-shrink:0">New</span>`}
        </div>
      </div>
      <div class="course-card-footer">
        <div style="display:flex;align-items:center;gap:5px;font-size:.75rem;color:var(--gray-400)">
          <i class="fas fa-calendar-alt" style="color:var(--cyan)"></i>
          <span>${nextStr}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:.72rem;color:var(--gray-400)">${regCount}${maxStu ? '/'+maxStu : ''}</span>
          ${isOwn
            ? `<span style="font-size:.72rem;color:var(--gray-400);font-weight:600">Your course</span>`
            : isReg
              ? `<span style="font-size:.75rem;color:#16a34a;font-weight:700"><i class="fas fa-check-circle"></i> Enrolled</span>`
              : isFull
                ? `<span style="font-size:.72rem;color:var(--danger);font-weight:600">Full</span>`
                : `<span style="font-size:.75rem;color:var(--cyan);font-weight:700">View &amp; Enroll →</span>`
          }
        </div>
      </div>
    </div>`;
}

function sessionDiscoveryCard(s) {
  const dt      = parseUtc(s.scheduled_at);
  const dateStr = fmtDate(dt);
  const timeStr = fmtTime(dt);
  const regCount = parseInt(s.registered_count) || 0;
  const isFull   = regCount >= parseInt(s.max_students);
  const isReg    = parseInt(s.is_registered) > 0;
  const isOwn    = state.user && parseInt(s.teacher_id) === parseInt(state.user.id);
  const isLive   = s.status === 'live';

  const lvlInfo     = getLevelInfo(parseInt(s.xp) || 0);
  const teacherName = `${esc(s.first_name)} ${esc(s.last_name)}`;
  const avgRating   = parseFloat(s.avg_rating) || 0;
  const totalReviews= parseInt(s.total_reviews) || 0;
  const ratingStr   = avgRating ? `${avgRating}★ (${totalReviews})` : 'New tutor';

  const headerBg = isLive ? 'background:linear-gradient(135deg,#14532d,#16a34a)' : 'background:var(--grad-brand)';

  return `
    <div class="card" style="display:flex;flex-direction:column;gap:0;overflow:hidden;padding:0;min-width:0;word-break:break-word${isLive ? ';box-shadow:0 0 0 2px #22c55e' : ''}">
      <div style="${headerBg};padding:14px 16px;cursor:pointer;min-width:0" onclick="_openSession(event,${s.id})" title="Ctrl+click to open in new tab">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;margin-bottom:6px">
          <span style="background:rgba(255,255,255,.2);color:#fff;font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px">${esc(s.subject)}</span>
          ${isLive
            ? `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.2);color:#fff;font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px"><span style="width:6px;height:6px;background:#fff;border-radius:50%;animation:liveBlip 1s infinite"></span>LIVE</span>`
            : `<span style="font-size:.72rem;color:rgba(255,255,255,.8)">${s.duration_minutes} min</span>`}
        </div>
        <div style="font-size:.97rem;font-weight:700;color:#fff;line-height:1.3;overflow-wrap:break-word">${esc(s.title)}</div>
      </div>
      <div style="padding:14px 16px;flex:1;display:flex;flex-direction:column;gap:10px;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;cursor:pointer;min-width:0" onclick="viewTeacherProfile(${s.teacher_id})">
          <img src="${esc(s.avatar_url||"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E")}" style="width:28px;height:28px;border-radius:50%;object-fit:cover" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'">
          <div style="min-width:0;flex:1">
            <div style="font-size:.82rem;font-weight:600;color:var(--navy);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${teacherName}</div>
            <div style="font-size:.72rem;color:var(--gray-400)">${lvlInfo.label} · <span style="color:${avgRating>=4?'#f59e0b':avgRating>0?'var(--gray-400)':'var(--gray-300)'}">${ratingStr}</span></div>
          </div>
        </div>
        <div style="font-size:.78rem;color:var(--gray-400);overflow-wrap:break-word">
          <i class="fas fa-calendar" style="width:14px"></i> ${dateStr} at ${timeStr} <span style="color:var(--gray-300);font-size:.72rem">(your time)</span><br>
          <i class="fas fa-users" style="width:14px;margin-top:4px"></i> ${regCount} / ${s.max_students} registered
          ${isFull ? '<span style="color:var(--danger);font-weight:600"> · Full</span>' : ''}
        </div>
        ${s.description ? `<p style="font-size:.78rem;color:var(--gray-500);line-height:1.5;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(s.description)}</p>` : ''}
        ${s.intro_question ? `<div style="font-size:.75rem;background:var(--cyan-light);border-radius:6px;padding:6px 10px;color:var(--cyan);margin-top:2px"><i class="fas fa-question-circle"></i> <em>${esc(s.intro_question.length>60?s.intro_question.slice(0,60)+'…':s.intro_question)}</em></div>` : ''}
        <div style="margin-top:auto">
          ${isOwn && isLive
            ? `<button class="btn btn-primary" style="width:100%;font-size:.82rem;background:#16a34a;border-color:#16a34a" onclick="joinLiveSession(${s.id})"><i class="fas fa-broadcast-tower"></i> Rejoin Your Room</button>`
            : isOwn
            ? `<button class="btn btn-ghost" style="width:100%;font-size:.82rem" disabled>Your Session</button>`
            : isLive && isReg
            ? `<button class="btn btn-danger" style="width:100%;font-size:.82rem" onclick="joinLiveSession(${s.id})"><i class="fas fa-video"></i> Join Now — LIVE</button>`
            : isReg
              ? `<button class="btn btn-ghost" style="width:100%;font-size:.82rem;color:var(--danger)" onclick="unregisterSession(${s.id})"><i class="fas fa-times-circle"></i> Unregister</button>`
              : isFull
                ? `<button class="btn btn-ghost" style="width:100%;font-size:.82rem" disabled><i class="fas fa-ban"></i> Session Full</button>`
                : `<button class="btn btn-primary" style="width:100%;font-size:.82rem" onclick="registerForSession(${s.id})"><i class="fas fa-plus-circle"></i> Register</button>`}
        </div>
      </div>
    </div>`;
}

function registerForSession(sessionId) {
  // Open the pre-registration modal (which handles the actual API call)
  showPreRegModal(sessionId);
}

async function registerForSessionDirect(sessionId, introAnswer, triggerBtn) {
  if (triggerBtn) triggerBtn.disabled = true;
  const res = await api('/teacher.php?action=register_session', 'POST', { session_id: sessionId, intro_answer: introAnswer });
  if (triggerBtn) triggerBtn.disabled = false;
  if (!res.success) { toast(res.error || 'Could not register', 'error'); return; }
  toast('Registered! See you at the session. 📚', 'success');
  _loadLearnHubSessions();
}

async function unregisterSession(sessionId, btn) {
  if (!confirm('Unregister from this session?\n\nYou can re-register later if spots are available.')) return;
  if (btn) btn.disabled = true;
  const res = await api('/teacher.php?action=unregister_session', 'POST', { session_id: sessionId });
  if (btn) btn.disabled = false;
  if (!res.success) { toast(res.error || 'Could not unregister', 'error'); return; }
  toast('Unregistered. We hope to see you at another session!', 'success');
  // Reload whichever tab is active
  if (_learnHubTab === 'my') _loadMyUpcomingSessions();
  else _loadLearnHubSessions();
}

/* ══════════════════════════════════════════════════════════════
   Session Detail — Full-page tabbed view (like Course Detail)
   ══════════════════════════════════════════════════════════════ */
let _sdSession = null;
let _sdTab     = 'overview';
let _sdSource  = 'learn';

async function showSessionDetailById(sessionId) {
  // Track where we came from BEFORE navigating
  _sdSource = state.page || 'learn';

  // Navigate to learn page if needed
  if (state.page !== 'learn') navigate('learn');

  window.location.hash = 'session/' + sessionId;
  _sdTab = 'overview';

  const pg = document.getElementById('page-learn');
  if (!pg) return;

  pg.classList.add('page-session-detail-active');
  pg.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div class="cd-modal-header" id="sessionDetailHeader">
        <button class="cd-back-btn" onclick="_sdGoBack()" title="Go back">
          <i class="fas fa-arrow-left"></i><span>Back</span>
        </button>
      </div>
      <div class="cd-tab-nav" id="sessionDetailTabNav" style="display:none"></div>
      <div class="cd-modal-body" id="sessionDetailBody">${skeletons(3, 100)}</div>
    </div>`;

  const res = await api('/teacher.php?action=session_detail&session_id=' + sessionId);
  const body = document.getElementById('sessionDetailBody');
  if (!body) return;
  if (!res.success || !res.data) {
    body.innerHTML = errorCard('Could not load session details');
    return;
  }

  _sdSession = res.data;
  _sdRenderHeader();
  _sdRenderTabNav();
  _sdRenderTab('overview');
}

function _sdGoBack() {
  const pg = document.getElementById('page-learn');
  if (pg) pg.classList.remove('page-session-detail-active');
  if (_sdSource && _sdSource !== 'learn') {
    navigate(_sdSource);
  } else {
    renderLearnHub();
  }
}

function _sdRenderHeader() {
  const s      = _sdSession;
  const header = document.getElementById('sessionDetailHeader');
  if (!header) return;
  const regCount  = parseInt(s.registered_count) || 0;
  const avgRating = parseFloat(s.avg_rating)      || 0;
  const isReg     = parseInt(s.is_registered)     > 0;
  const isOwn     = state.user && parseInt(s.teacher_id) === parseInt(state.user.id);
  const isFull    = regCount >= parseInt(s.max_students);
  const isLive    = s.status === 'live';
  const backLabel = { learn:'Learn', teacher:'Teacher Hub', courses:'Courses', dashboard:'Dashboard' }[_sdSource] || 'Back';

  header.innerHTML = `
    <button class="cd-back-btn" onclick="_sdGoBack()" title="Go back"><i class="fas fa-arrow-left"></i><span>Back to ${backLabel}</span></button>
    <div class="cd-title-bar">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
          <span class="cd-subject-badge">${esc(s.subject)}</span>
          ${isLive ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(34,197,94,.25);color:#4ade80;font-size:.72rem;font-weight:700;padding:2px 10px;border-radius:20px"><span style="width:6px;height:6px;background:#22c55e;border-radius:50%;animation:liveBlip 1s infinite"></span>LIVE NOW</span>` : ''}
          <span style="font-size:.72rem;color:rgba(255,255,255,.7)">${regCount}/${s.max_students} registered</span>
          ${avgRating ? `<span style="font-size:.72rem;color:#fbbf24;font-weight:700">${avgRating}★</span>` : ''}
        </div>
        <h2 class="cd-title">${esc(s.title)}</h2>
      </div>
    </div>
    <div class="cd-meta-row">
      <div class="cd-teacher-card" onclick="viewTeacherProfile(${s.teacher_id})">
        <img src="${esc(s.avatar_url||"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E")}" class="cd-teacher-avatar" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'">
        <div>
          <div class="cd-teacher-name">${esc(s.first_name)} ${esc(s.last_name)}</div>
          <div class="cd-teacher-sub">@${esc(s.username)}${avgRating ? ` · ${avgRating}★` : ' · New tutor'}</div>
        </div>
      </div>
      <div class="cd-action-box">
        ${isOwn && isLive
          ? `<button class="btn cd-enroll-btn" style="background:#16a34a!important;border-color:#16a34a!important" onclick="joinLiveSession(${s.id})"><i class="fas fa-video"></i> Rejoin Room</button>`
          : isOwn
            ? `<span style="font-size:.82rem;color:rgba(255,255,255,.7)"><i class="fas fa-chalkboard-teacher"></i> Your session</span>`
            : isLive && isReg
              ? `<button class="btn cd-enroll-btn" style="background:#16a34a!important;border-color:#16a34a!important" onclick="joinLiveSession(${s.id})"><i class="fas fa-video"></i> Join Now — LIVE</button>`
              : isReg
                ? `<span style="font-size:.82rem;color:var(--success,#16a34a);font-weight:600"><i class="fas fa-check-circle"></i> Registered</span>
                   <button class="btn btn-ghost cd-unenroll-btn" onclick="_sdUnregister(${s.id})"><i class="fas fa-times-circle"></i> Unregister</button>`
                : isFull
                  ? `<button class="btn btn-ghost" disabled style="width:100%">Session Full</button>`
                  : `${s.intro_question ? `<div style="margin-bottom:8px"><label style="font-size:.78rem;font-weight:600;color:#fff;display:block;margin-bottom:4px">${esc(s.intro_question)} <span style="color:#fca5a5">*</span></label><textarea class="form-control" id="sdIntroAnswer" rows="2" placeholder="Your answer…" style="font-size:.82rem;background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2);color:#fff"></textarea></div>` : ''}
                     <button class="btn cd-enroll-btn" onclick="_sdRegister(${s.id},${s.intro_question ? 'true' : 'false'})"><i class="fas fa-plus-circle"></i> Register</button>`
        }
        <button onclick="(()=>{const u=window.location.origin+window.location.pathname+'#session/${s.id}';navigator.clipboard.writeText(u).then(()=>toast('Session link copied!'));})()" class="btn btn-ghost" style="font-size:.75rem;padding:4px 8px;margin-top:6px" title="Copy shareable link"><i class="fas fa-link"></i> Share</button>
      </div>
    </div>`;
}

function _sdRenderTabNav() {
  const nav = document.getElementById('sessionDetailTabNav');
  if (!nav) return;
  nav.style.display = 'flex';
  const isOwn = state.user && parseInt(_sdSession.teacher_id) === parseInt(state.user.id);
  const tabs = isOwn
    ? [['overview','Overview'],['resources','Resources'],['discussion','Discussion'],['students','Students']]
    : [['overview','Overview'],['resources','Resources'],['discussion','Discussion']];
  nav.innerHTML = tabs.map(([key, label]) =>
    `<button class="cd-tab-btn ${_sdTab === key ? 'active' : ''}" onclick="_sdRenderTab('${key}')">${label}</button>`
  ).join('');
}

async function _sdRenderTab(tab) {
  _sdTab = tab;
  document.querySelectorAll('#sessionDetailTabNav .cd-tab-btn').forEach(b => b.classList.toggle('active', b.textContent.trim() === _sdTabLabel(tab)));
  const body = document.getElementById('sessionDetailBody');
  if (!body) return;

  const s     = _sdSession;
  const isOwn = state.user && parseInt(s.teacher_id) === parseInt(state.user.id);
  const isReg = parseInt(s.is_registered) > 0;
  const canSee = isOwn || isReg;

  if (tab === 'overview') {
    body.innerHTML = _sdOverviewHtml(s, isOwn);
  } else if (tab === 'resources') {
    if (!canSee) { body.innerHTML = _cdLockedHtml('Resources are visible to registered students.'); return; }
    body.innerHTML = skeletons(2, 60);
    const res = await api('/teacher.php?action=session_resources&session_id=' + s.id);
    if (!document.getElementById('sessionDetailBody')) return;
    body.innerHTML = _sdResourcesHtml(res.success ? res.data : [], s.id, isOwn);
  } else if (tab === 'discussion') {
    if (!canSee) { body.innerHTML = _cdLockedHtml('Discussion is visible to registered students.'); return; }
    body.innerHTML = skeletons(2, 60);
    const res = await api('/teacher.php?action=session_discussion&session_id=' + s.id);
    if (!document.getElementById('sessionDetailBody')) return;
    body.innerHTML = _sdDiscussionHtml(res.success ? res.data : [], s.id);
  } else if (tab === 'students' && isOwn) {
    body.innerHTML = skeletons(2, 60);
    const res = await api('/teacher.php?action=session_attendees&session_id=' + s.id);
    if (!document.getElementById('sessionDetailBody')) return;
    body.innerHTML = _sdStudentsHtml(res.success ? (res.data || []) : []);
  }
}

function _sdTabLabel(tab) {
  return { overview:'Overview', resources:'Resources', discussion:'Discussion', students:'Students' }[tab] || tab;
}

function _sdOverviewHtml(s, isOwn) {
  const dt      = parseUtc(s.scheduled_at);
  const dateStr = dt.toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  const timeStr = fmtTime(dt);
  const regCount = parseInt(s.registered_count) || 0;
  const isLive   = s.status === 'live';
  const isUpcoming = s.status === 'upcoming';
  return `
    ${isLive ? `<div style="background:rgba(34,197,94,.1);border:1.5px solid #22c55e;border-radius:12px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:10px">
      <span style="width:10px;height:10px;background:#22c55e;border-radius:50%;animation:liveBlip 1s infinite;flex-shrink:0"></span>
      <div><div style="font-weight:700;color:#16a34a;font-size:.9rem">This session is LIVE right now!</div>
      <div style="font-size:.8rem;color:#16a34a;opacity:.8">Join using the button above.</div></div></div>` : ''}
    <!-- Session time card - prominent -->
    <div class="cd-stat-card" style="margin-bottom:18px;background:var(--grad-brand);border:none;display:flex;align-items:center;gap:14px;text-align:left;padding:16px 20px">
      <div style="width:44px;height:44px;background:rgba(255,255,255,.2);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas fa-calendar-alt" style="color:#fff;font-size:1.1rem"></i>
      </div>
      <div>
        <div style="font-size:.7rem;font-weight:700;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">${isLive ? 'Live Now' : isUpcoming ? 'Upcoming Session' : 'Session Time'}</div>
        <div style="font-size:.95rem;font-weight:800;color:#fff">${dateStr}</div>
        <div style="font-size:.82rem;color:rgba(255,255,255,.8)">${timeStr} · ${s.duration_minutes} min</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:20px">
      <div class="cd-stat-card"><div class="cd-stat-num">${regCount}</div><div class="cd-stat-lbl">Registered</div></div>
      <div class="cd-stat-card"><div class="cd-stat-num">${s.max_students}</div><div class="cd-stat-lbl">Capacity</div></div>
      <div class="cd-stat-card"><div class="cd-stat-num">${s.duration_minutes}<span style="font-size:.6em">m</span></div><div class="cd-stat-lbl">Duration</div></div>
    </div>
    ${s.description ? `<div style="margin-bottom:16px"><div style="font-size:.78rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">About this session</div><p style="font-size:.9rem;color:var(--gray-700);line-height:1.7;margin:0">${esc(s.description)}</p></div>` : ''}
    ${s.intro_question && !isOwn ? `<div style="background:var(--cyan-light);border-radius:10px;padding:12px 16px;margin-bottom:16px"><p style="font-size:.82rem;font-weight:600;color:var(--cyan);margin-bottom:2px"><i class="fas fa-question-circle"></i> Teacher's Question</p><p style="font-size:.85rem;color:var(--navy);margin:0">${esc(s.intro_question)}</p></div>` : ''}`;
}

function _sdResourcesHtml(resources, sessionId, isOwn) {
  const items = resources.map(r => `
    <div class="cd-resource-row">
      <i class="fas ${r.resource_type==='file'?'fa-file-alt':'fa-link'}" style="color:var(--cyan);font-size:1rem;flex-shrink:0"></i>
      <div style="flex:1;min-width:0">
        <a href="${esc(r.url)}" target="_blank" rel="noopener" style="font-weight:600;font-size:.88rem;color:var(--navy);text-decoration:none">${esc(r.title)}</a>
        <div style="font-size:.72rem;color:var(--gray-400)">${esc(r.first_name)} ${esc(r.last_name)} · ${timeAgo(r.created_at)}</div>
      </div>
      ${isOwn ? `<button onclick="_sdDeleteResource(${r.id},${sessionId})" style="background:none;border:none;color:var(--gray-300);cursor:pointer;padding:4px"><i class="fas fa-trash"></i></button>` : ''}
    </div>`).join('');

  const addForm = isOwn ? `
    <div class="cd-add-resource" id="sdAddResourceForm">
      <div style="font-size:.82rem;font-weight:700;color:var(--navy);margin-bottom:8px">Add Resource</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <input class="form-control" id="sdResTitle" placeholder="Title" style="font-size:.82rem">
        <select class="form-control" id="sdResType" style="font-size:.82rem"><option value="link">Link</option><option value="file">File URL</option></select>
      </div>
      <input class="form-control" id="sdResUrl" placeholder="URL or paste file link" style="font-size:.82rem;margin-bottom:8px">
      <button class="btn btn-primary" style="font-size:.8rem" onclick="_sdSubmitResource(${sessionId})"><i class="fas fa-plus"></i> Add</button>
    </div>` : '';

  return `
    ${addForm}
    ${items || `<p style="color:var(--gray-400);font-size:.85rem;text-align:center;padding:24px 0">${isOwn ? 'No resources yet — add your first one above.' : 'No resources have been uploaded yet.'}</p>`}`;
}

async function _sdSubmitResource(sessionId) {
  const title = document.getElementById('sdResTitle')?.value.trim() || '';
  const type  = document.getElementById('sdResType')?.value || 'link';
  const url   = document.getElementById('sdResUrl')?.value.trim() || '';
  if (!title || !url) { toast('Title and URL are required', 'error'); return; }
  const res = await api('/teacher.php?action=add_session_resource', 'POST', { session_id: sessionId, title, type, url });
  if (!res.success) { toast(res.error || 'Failed to add resource', 'error'); return; }
  toast('Resource added!', 'success');
  _sdRenderTab('resources');
}

async function _sdDeleteResource(id, sessionId) {
  if (!confirm('Delete this resource?')) return;
  const res = await api('/teacher.php?action=delete_session_resource', 'POST', { id });
  if (!res.success) { toast(res.error || 'Failed to delete', 'error'); return; }
  toast('Deleted', 'success');
  _sdRenderTab('resources');
}

function _sdDiscussionHtml(posts, sessionId) {
  const me = state.user;
  const compose = `
    <div class="cd-disc-compose" style="margin-bottom:12px">
      <textarea class="form-control" id="sdDiscInput" rows="2" placeholder="Ask a question or share a thought…" style="font-size:.85rem;margin-bottom:8px;resize:none"></textarea>
      <button class="btn btn-primary" style="font-size:.8rem" onclick="_sdSubmitDiscussion(${sessionId})"><i class="fas fa-paper-plane"></i> Post</button>
    </div>`;

  const items = posts.map(p => `
    <div class="cd-discussion-post${parseInt(p.is_pinned) ? ' cd-pinned' : ''}">
      <img src="${esc(p.avatar_url||"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E")}" class="cd-disc-avatar" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap">
          <span style="font-weight:700;font-size:.83rem;color:var(--navy)">${esc(p.first_name)} ${esc(p.last_name)}</span>
          ${parseInt(p.is_pinned) ? `<span style="font-size:.68rem;background:#fef3c7;color:#92400e;padding:1px 7px;border-radius:20px;font-weight:700">📌 Pinned</span>` : ''}
          <span style="font-size:.72rem;color:var(--gray-400);margin-left:auto">${timeAgo(p.created_at)}</span>
        </div>
        <p style="font-size:.85rem;color:var(--gray-700);margin:0;line-height:1.5">${esc(p.body)}</p>
      </div>
      ${me && parseInt(p.user_id) === parseInt(me.id) ? `<button onclick="_sdDeleteDiscussion(${p.id},${sessionId})" style="background:none;border:none;color:var(--gray-300);cursor:pointer;padding:4px;align-self:flex-start"><i class="fas fa-trash" style="font-size:.8rem"></i></button>` : ''}
    </div>`).join('');

  return `
    ${compose}
    ${items || `<p style="color:var(--gray-400);font-size:.85rem;text-align:center;padding:24px 0">No posts yet — be the first to start a discussion!</p>`}`;
}

async function _sdSubmitDiscussion(sessionId) {
  const body = document.getElementById('sdDiscInput')?.value.trim() || '';
  if (!body) { toast('Please write something first', 'error'); return; }
  const res = await api('/teacher.php?action=add_session_discussion', 'POST', { session_id: sessionId, body });
  if (!res.success) { toast(res.error || 'Failed to post', 'error'); return; }
  toast('Posted!', 'success');
  _sdRenderTab('discussion');
}

async function _sdDeleteDiscussion(id, sessionId) {
  if (!confirm('Delete this post?')) return;
  const res = await api('/teacher.php?action=delete_session_discussion', 'POST', { id });
  if (!res.success) { toast(res.error || 'Failed to delete', 'error'); return; }
  toast('Deleted', 'success');
  _sdRenderTab('discussion');
}

function _sdStudentsHtml(students) {
  if (!students.length) return `<p style="color:var(--gray-400);font-size:.85rem;text-align:center;padding:32px 0">No registered students yet.</p>`;
  return `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${students.map(u => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--gray-50);border:1px solid var(--gray-100);border-radius:10px">
          <img src="${esc(u.avatar_url||"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E")}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:.88rem;color:var(--navy)">${esc(u.first_name)} ${esc(u.last_name)}</div>
            <div style="font-size:.75rem;color:var(--gray-400)">@${esc(u.username)}</div>
          </div>
          ${parseInt(u.attended) ? `<span style="font-size:.75rem;color:var(--success);font-weight:700"><i class="fas fa-check-circle"></i> Attended</span>` : `<span style="font-size:.75rem;color:var(--gray-400)">Registered</span>`}
        </div>`).join('')}
    </div>`;
}

async function _sdRegister(sessionId, hasIntro) {
  const answer = hasIntro ? (document.getElementById('sdIntroAnswer')?.value.trim() || '') : null;
  if (hasIntro && !answer) { toast('Please answer the teacher\'s question', 'error'); return; }
  const res = await api('/teacher.php?action=register_session', 'POST', { session_id: sessionId, intro_answer: answer });
  if (!res.success) { toast(res.error || 'Failed to register', 'error'); return; }
  toast('Registered successfully!', 'success');
  // Refresh session data
  const detailRes = await api('/teacher.php?action=session_detail&session_id=' + sessionId);
  if (detailRes.success) { _sdSession = detailRes.data; _sdRenderHeader(); _sdRenderTabNav(); }
}

async function _sdUnregister(sessionId) {
  if (!confirm('Unregister from this session?')) return;
  const res = await api('/teacher.php?action=unregister_session', 'POST', { session_id: sessionId });
  if (!res.success) { toast(res.error || 'Failed to unregister', 'error'); return; }
  toast('Unregistered', 'success');
  const detailRes = await api('/teacher.php?action=session_detail&session_id=' + sessionId);
  if (detailRes.success) { _sdSession = detailRes.data; _sdRenderHeader(); _sdRenderTabNav(); }
}

/* ══════════════════════════════════════════════════════════════
   Course Detail — schoolhouse-style tabbed modal
   ══════════════════════════════════════════════════════════════ */
let _cdCourse = null; // cached course data for tab re-renders
let _cdTab    = 'overview';
let _cdSource = 'courses'; // page to return to on back

async function showCourseDetail(courseId) {
  // Track where we came from BEFORE navigating
  _cdSource = state.page || 'courses';

  // Navigate to courses page
  if (state.page !== 'courses') navigate('courses');

  window.location.hash = 'course/' + courseId;
  _cdTab = 'overview';

  const pg = document.getElementById('page-courses');
  if (!pg) return;

  // Switch page to full-height no-padding mode for the detail view
  pg.classList.add('page-course-detail-active');
  pg.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div class="cd-modal-header" id="courseDetailHeader">
        <button class="cd-back-btn" onclick="_cdGoBack()" title="Go back">
          <i class="fas fa-arrow-left"></i><span>Back</span>
        </button>
      </div>
      <div class="cd-tab-nav" id="courseDetailTabNav" style="display:none"></div>
      <div class="cd-modal-body" id="courseDetailBody">${skeletons(3, 100)}</div>
    </div>`;

  const res = await api('/teacher.php?action=course_detail&course_id=' + courseId);
  const body = document.getElementById('courseDetailBody');
  if (!body) return;
  if (!res.success) { body.innerHTML = errorCard('Could not load course details'); return; }

  _cdCourse = res.data;
  _cdRenderHeader();
  _cdRenderTabNav();
  _cdRenderTab('overview');
}

function _cdGoBack() {
  const pg = document.getElementById('page-courses');
  if (pg) pg.classList.remove('page-course-detail-active');
  if (_cdSource && _cdSource !== 'courses') {
    navigate(_cdSource);
  } else {
    window.location.hash = 'courses';
    renderCoursesPage();
  }
}

function _cdRenderHeader() {
  const c      = _cdCourse;
  const header = document.getElementById('courseDetailHeader');
  if (!header) return;
  const regCount  = parseInt(c.registered_count) || 0;
  const avgRating = parseFloat(c.avg_rating)      || 0;
  const isReg     = parseInt(c.is_registered)     > 0;
  const isOwn     = state.user && parseInt(c.teacher_id) === parseInt(state.user.id);
  const isFull    = regCount >= parseInt(c.max_students);

  const backLabel = { learn:'Learn', teacher:'Teacher Hub', courses:'Courses', dashboard:'Dashboard' }[_cdSource] || 'Back';
  header.innerHTML = `
    <button class="cd-back-btn" onclick="_cdGoBack()" title="Go back"><i class="fas fa-arrow-left"></i><span>Back to ${backLabel}</span></button>
    <!-- Course title bar -->
    <div class="cd-title-bar">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
          <span class="cd-subject-badge">${esc(c.subject)}</span>
          <span style="font-size:.72rem;color:rgba(255,255,255,.7)">${(c.sessions||[]).length} sessions · ${regCount}/${c.max_students} enrolled</span>
          ${avgRating ? `<span style="font-size:.72rem;color:#fbbf24;font-weight:700">${avgRating}★</span>` : ''}
        </div>
        <h2 class="cd-title">${esc(c.title)}</h2>
      </div>
    </div>
    <!-- Teacher card + action row -->
    <div class="cd-meta-row">
      <div class="cd-teacher-card" onclick="viewTeacherProfile(${c.teacher_id})">
        <img src="${esc(c.avatar_url||"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E")}" class="cd-teacher-avatar" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'">
        <div>
          <div class="cd-teacher-name">${esc(c.first_name)} ${esc(c.last_name)}</div>
          <div class="cd-teacher-sub">@${esc(c.username)}${avgRating ? ` · ${avgRating}★` : ' · New tutor'}</div>
        </div>
      </div>
      <div class="cd-action-box">
        ${isOwn
          ? `<span style="font-size:.82rem;color:var(--gray-400)"><i class="fas fa-chalkboard-teacher"></i> Your course</span>`
          : isReg
            ? `<span style="font-size:.82rem;color:var(--success,#16a34a);font-weight:600"><i class="fas fa-check-circle"></i> Enrolled</span>
               <button class="btn btn-ghost cd-unenroll-btn" onclick="unregisterCourse(${c.id},this)"><i class="fas fa-sign-out-alt"></i> Leave Course</button>`
            : isFull
              ? `<button class="btn btn-ghost" disabled style="width:100%">Course Full</button>`
              : `${c.intro_question ? `<div style="margin-bottom:8px"><label style="font-size:.78rem;font-weight:600;color:var(--navy);display:block;margin-bottom:4px">${esc(c.intro_question)} <span style="color:var(--danger)">*</span></label><textarea class="form-control" id="cdIntroAnswer" rows="2" placeholder="Your answer…" style="font-size:.82rem"></textarea></div>` : ''}
                 <button class="btn btn-primary cd-enroll-btn" onclick="registerCourseFromModal(${c.id},${c.intro_question ? 'true' : 'false'})"><i class="fas fa-graduation-cap"></i> Enrol in Course</button>`
        }
        <button onclick="(()=>{const u=window.location.origin+window.location.pathname+'#course/${c.id}';navigator.clipboard.writeText(u).then(()=>toast('Course link copied!'));})()" class="btn btn-ghost" style="font-size:.75rem;padding:4px 8px;margin-top:6px" title="Copy shareable link"><i class="fas fa-link"></i> Share</button>
      </div>
    </div>`;
}

function _cdRenderTabNav() {
  const nav = document.getElementById('courseDetailTabNav');
  if (!nav) return;
  nav.style.display = 'flex';
  const isOwn = state.user && parseInt(_cdCourse.teacher_id) === parseInt(state.user.id);
  const tabs = isOwn
    ? [['overview','Overview'],['sessions','Sessions'],['resources','Resources'],['discussion','Discussion'],['students','Students']]
    : [['overview','Overview'],['sessions','Sessions'],['resources','Resources'],['discussion','Discussion']];
  nav.innerHTML = tabs.map(([key, label]) =>
    `<button class="cd-tab-btn ${_cdTab === key ? 'active' : ''}" onclick="_cdRenderTab('${key}')">${label}</button>`
  ).join('');
}

async function _cdRenderTab(tab) {
  _cdTab = tab;
  // Update active tab button
  document.querySelectorAll('.cd-tab-btn').forEach(b => b.classList.toggle('active', b.textContent.trim() === _tabLabel(tab)));
  const body = document.getElementById('courseDetailBody');
  if (!body) return;

  const c       = _cdCourse;
  const isOwn   = state.user && parseInt(c.teacher_id) === parseInt(state.user.id);
  const isReg   = parseInt(c.is_registered) > 0;
  const canSee  = isOwn || isReg; // Resources & Discussion require enrollment

  if (tab === 'overview') {
    body.innerHTML = _cdOverviewHtml(c, isOwn);
  } else if (tab === 'sessions') {
    body.innerHTML = _cdSessionsHtml(c, isOwn);
  } else if (tab === 'resources') {
    if (!canSee) { body.innerHTML = _cdLockedHtml('Resources are visible to enrolled students.'); return; }
    body.innerHTML = skeletons(2, 60);
    const res = await api('/courses.php?action=list_resources&course_id=' + c.id);
    if (!document.getElementById('courseDetailBody')) return;
    body.innerHTML = _cdResourcesHtml(res.success ? res.data : [], c.id, isOwn);
  } else if (tab === 'discussion') {
    if (!canSee) { body.innerHTML = _cdLockedHtml('Discussion is visible to enrolled students.'); return; }
    body.innerHTML = skeletons(2, 60);
    const res = await api('/courses.php?action=list_discussion&course_id=' + c.id);
    if (!document.getElementById('courseDetailBody')) return;
    body.innerHTML = _cdDiscussionHtml(res.success ? res.data : [], c.id);
  } else if (tab === 'students' && isOwn) {
    body.innerHTML = skeletons(2, 60);
    const res = await api('/teacher.php?action=course_students&course_id=' + c.id);
    if (!document.getElementById('courseDetailBody')) return;
    body.innerHTML = _cdStudentsHtml(res.success ? res.data : []);
  }
}

function _tabLabel(tab) {
  return { overview:'Overview', sessions:'Sessions', resources:'Resources', discussion:'Discussion', students:'Students' }[tab] || tab;
}

function _cdLockedHtml(msg) {
  return `<div style="text-align:center;padding:48px 20px;color:var(--gray-400)"><i class="fas fa-lock" style="font-size:2rem;margin-bottom:12px;display:block"></i><p style="font-size:.9rem">${msg}</p></div>`;
}

function _cdOverviewHtml(c, isOwn) {
  const sessions  = c.sessions || [];
  const nextRaw   = sessions.find(s => s.status === 'upcoming')?.scheduled_at;
  const nextDt    = nextRaw ? parseUtc(nextRaw) : null;
  const isReg     = !isOwn && parseInt(c.is_registered) > 0;
  const attended  = sessions.filter(s => parseInt(s.attended)).length;
  const total     = sessions.length;
  const pct       = total ? Math.round((attended / total) * 100) : 0;

  const progressHtml = isReg && total > 0 ? `
    <div style="background:var(--gray-100);border-radius:14px;padding:16px 18px;margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:.85rem;font-weight:700;color:var(--navy)"><i class="fas fa-chart-line" style="color:var(--cyan);margin-right:6px"></i>My Progress</span>
        <span style="font-size:1.1rem;font-weight:800;color:var(--cyan)">${pct}%</span>
      </div>
      <div class="course-progress-track" style="height:8px">
        <div class="course-progress-fill" style="width:${pct}%"></div>
      </div>
      <div style="font-size:.77rem;color:var(--gray-400);margin-top:6px">${attended} of ${total} sessions attended</div>
    </div>` : '';

  return `
    ${progressHtml}
    ${c.description ? `<p style="font-size:.9rem;color:var(--gray-700);line-height:1.7;margin-bottom:20px">${esc(c.description)}</p>` : ''}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px">
      <div class="cd-stat-card"><div class="cd-stat-num">${sessions.length}</div><div class="cd-stat-lbl">Sessions</div></div>
      <div class="cd-stat-card"><div class="cd-stat-num">${parseInt(c.registered_count)||0}</div><div class="cd-stat-lbl">Enrolled</div></div>
      <div class="cd-stat-card"><div class="cd-stat-num">${parseInt(c.max_students)}</div><div class="cd-stat-lbl">Max Students</div></div>
      ${nextDt ? `<div class="cd-stat-card"><div class="cd-stat-num" style="font-size:.85rem">${fmtDate(nextDt)}</div><div class="cd-stat-lbl">Next Session</div></div>` : ''}
    </div>
    ${c.intro_question && !isOwn ? `<div style="background:var(--cyan-light);border-radius:10px;padding:12px 16px;margin-bottom:16px"><p style="font-size:.82rem;font-weight:600;color:var(--cyan);margin-bottom:2px"><i class="fas fa-question-circle"></i> Teacher's Question</p><p style="font-size:.85rem;color:var(--navy)">${esc(c.intro_question)}</p></div>` : ''}
    <div style="font-size:.78rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Schedule Preview</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${sessions.slice(0,5).map((s,i) => {
        const dt = parseUtc(s.scheduled_at);
        const done = parseInt(s.attended);
        const bg   = done ? 'var(--cyan)' : s.status === 'upcoming' ? 'var(--grad-brand)' : 'var(--gray-200)';
        return `<div style="display:flex;align-items:center;gap:10px">
          <div style="width:26px;height:26px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:800;color:#fff;flex-shrink:0">${done?'✓':(i+1)}</div>
          <div style="font-size:.82rem;color:var(--navy)">${fmtDate(dt)} <span style="color:var(--gray-400)">· ${fmtTime(dt)} · ${s.duration_minutes}min</span></div>
        </div>`;
      }).join('')}
      ${sessions.length > 5 ? `<p style="font-size:.78rem;color:var(--gray-400);margin-top:4px">+ ${sessions.length - 5} more sessions — see Sessions tab</p>` : ''}
    </div>`;
}

function _cdSessionsHtml(c, isOwn) {
  const sessions = c.sessions || [];
  if (!sessions.length) return `<p style="color:var(--gray-400);font-size:.88rem;text-align:center;padding:32px">No sessions yet.</p>`;

  const isEnrolled = !isOwn && parseInt(c.is_registered) > 0;

  return `<div style="display:flex;flex-direction:column;gap:10px">
    ${sessions.map((s, i) => {
      const dt        = parseUtc(s.scheduled_at);
      const done      = parseInt(s.attended);
      const isLive    = s.status === 'live';
      const isUp      = s.status === 'upcoming';
      const willAttend = s.will_attend !== undefined ? parseInt(s.will_attend) : 1;
      const statusColor = isLive ? '#22c55e' : isUp ? 'var(--cyan)' : done ? 'var(--gray-400)' : 'var(--danger)';
      const statusLabel = isLive ? 'LIVE' : isUp ? 'Upcoming' : done ? 'Attended' : s.status === 'ended' ? 'Ended' : s.status;
      const safeT = esc(s.title||'Session '+(i+1)).replace(/'/g,"\\'");

      // Student attendance intent controls (only for upcoming/live course sessions)
      let intentHtml = '';
      if (isEnrolled && (isUp || isLive)) {
        if (willAttend) {
          intentHtml = `<button class="btn btn-ghost" style="font-size:.7rem;padding:2px 8px;color:var(--gray-400);margin-top:3px" onclick="showAbsenceModal(${s.id},'${safeT}',${c.id})"><i class="fas fa-times-circle"></i> Mark Not Attending</button>`;
        } else {
          intentHtml = `
            <div style="margin-top:4px">
              <div style="font-size:.7rem;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:4px 8px;color:#b91c1c;font-weight:600;margin-bottom:3px">
                <i class="fas fa-times-circle"></i> Not Attending
                ${s.absent_reason ? `<div style="font-size:.67rem;font-weight:400;color:#991b1b;margin-top:2px;font-style:italic">"${esc(s.absent_reason)}"</div>` : ''}
              </div>
              <button class="btn btn-ghost" style="font-size:.7rem;padding:2px 8px;color:#16a34a" onclick="restoreAttendance(${s.id},${c.id})"><i class="fas fa-check-circle"></i> Mark Attending</button>
            </div>`;
        }
      }

      return `
        <div class="cd-session-row${isLive ? ' cd-session-live' : ''}${isEnrolled && !willAttend && isUp ? ' cd-session-absent' : ''}">
          <div class="cd-sess-num" style="background:${done?'var(--cyan)':isLive?'#22c55e':isEnrolled&&!willAttend&&isUp?'#f87171':'var(--grad-brand)'}">${done?'✓':(i+1)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:.88rem;color:var(--navy)">${esc(s.title||'Session '+(i+1))}</div>
            <div style="font-size:.76rem;color:var(--gray-400);margin-top:2px"><i class="fas fa-calendar" style="width:14px"></i>${fmtDate(dt)} · ${fmtTime(dt)} · ${s.duration_minutes}min</div>
            ${s.description ? `<div style="font-size:.76rem;color:var(--gray-500);margin-top:3px">${esc(s.description)}</div>` : ''}
            ${intentHtml}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
            <span style="font-size:.68rem;font-weight:700;color:${statusColor};background:${statusColor}18;padding:2px 8px;border-radius:20px">${statusLabel}</span>
            ${isOwn && isLive ? `<button class="btn btn-primary" style="font-size:.72rem;padding:3px 10px;background:#16a34a;border-color:#16a34a" onclick="joinLiveSession(${s.id})"><i class="fas fa-video"></i> Rejoin</button>` : ''}
            ${isOwn && isUp   ? `<button class="btn btn-primary" style="font-size:.72rem;padding:3px 10px;background:#16a34a;border-color:#16a34a" onclick="startLiveSession(${s.id})"><i class="fas fa-broadcast-tower"></i> Go Live</button>` : ''}
            ${isOwn && s.status==='ended' && !s.attendance_reported_at ? `<button class="btn btn-ghost" style="font-size:.72rem;padding:3px 10px" onclick="openAttendanceReport(${s.id},'${safeT}')"><i class="fas fa-clipboard-check"></i> Attendance</button>` : ''}
            ${!isOwn && isLive && parseInt(c.is_registered) > 0 ? `<button class="btn btn-danger" style="font-size:.72rem;padding:3px 10px" onclick="joinLiveSession(${s.id})"><i class="fas fa-video"></i> Join Live</button>` : ''}
          </div>
        </div>`;
    }).join('')}
  </div>`;
}

function showAbsenceModal(sessionId, sessionTitle, courseId) {
  const modal = document.getElementById('absenceReasonModal');
  if (!modal) return;
  document.getElementById('absenceSessionTitle').textContent = sessionTitle;
  document.getElementById('absenceReasonText').value = '';
  document.getElementById('absenceConfirmBtn').onclick = () => _submitAbsence(sessionId, courseId);
  modal.style.display = 'flex';
}

async function _submitAbsence(sessionId, courseId) {
  const reason = document.getElementById('absenceReasonText')?.value.trim() || '';
  const modal  = document.getElementById('absenceReasonModal');
  const btn    = document.getElementById('absenceConfirmBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }

  const res = await api('/teacher.php?action=set_session_attendance_intent', 'POST', {
    session_id: sessionId, will_attend: 0, reason
  });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-times-circle"></i> Confirm Not Attending'; }
  if (modal) modal.style.display = 'none';

  if (!res.success) { toast(res.error || 'Could not update attendance', 'error'); return; }
  toast('Marked as not attending. Your teacher will be notified.', 'success');

  const refresh = await api('/teacher.php?action=course_detail&course_id=' + courseId);
  if (refresh.success) { _cdCourse = refresh.data; _cdRenderTab('sessions'); }
}

async function restoreAttendance(sessionId, courseId) {
  const res = await api('/teacher.php?action=set_session_attendance_intent', 'POST', {
    session_id: sessionId, will_attend: 1
  });
  if (!res.success) { toast(res.error || 'Could not update attendance', 'error'); return; }
  toast('Marked as attending!', 'success');
  const refresh = await api('/teacher.php?action=course_detail&course_id=' + courseId);
  if (refresh.success) { _cdCourse = refresh.data; _cdRenderTab('sessions'); }
}

function _cdResourcesHtml(resources, courseId, isOwn) {
  const items = resources.map(r => `
    <div class="cd-resource-row">
      <i class="fas ${r.resource_type==='file'?'fa-file-alt':'fa-link'}" style="color:var(--cyan);font-size:1rem;flex-shrink:0"></i>
      <div style="flex:1;min-width:0">
        <a href="${esc(r.url)}" target="_blank" rel="noopener" style="font-weight:600;font-size:.88rem;color:var(--navy);text-decoration:none">${esc(r.title)}</a>
        <div style="font-size:.72rem;color:var(--gray-400)">${esc(r.first_name)} ${esc(r.last_name)} · ${timeAgo(r.created_at)}</div>
      </div>
      ${isOwn ? `<button onclick="_cdDeleteResource(${r.id},${courseId})" style="background:none;border:none;color:var(--gray-300);cursor:pointer;padding:4px"><i class="fas fa-trash"></i></button>` : ''}
    </div>`).join('');

  const addForm = isOwn ? `
    <div class="cd-add-resource" id="cdAddResourceForm">
      <div style="font-size:.82rem;font-weight:700;color:var(--navy);margin-bottom:8px">Add Resource</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <input class="form-control" id="cdResTitle" placeholder="Title" style="font-size:.82rem">
        <select class="form-control" id="cdResType" style="font-size:.82rem"><option value="link">Link</option><option value="file">File URL</option></select>
      </div>
      <input class="form-control" id="cdResUrl" placeholder="URL or paste file link" style="font-size:.82rem;margin-bottom:8px">
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="font-size:.8rem" onclick="_cdSubmitResource(${courseId})"><i class="fas fa-plus"></i> Add</button>
        <button class="btn btn-ghost" style="font-size:.8rem" onclick="_cdUploadResource(${courseId})"><i class="fas fa-upload"></i> Upload File</button>
      </div>
    </div>` : '';

  return `
    ${addForm}
    ${items || `<p style="color:var(--gray-400);font-size:.85rem;text-align:center;padding:24px 0">${isOwn ? 'No resources yet — add your first one above.' : 'No resources have been uploaded yet.'}</p>`}`;
}

async function _cdSubmitResource(courseId) {
  const title = document.getElementById('cdResTitle')?.value.trim() || '';
  const type  = document.getElementById('cdResType')?.value || 'link';
  const url   = document.getElementById('cdResUrl')?.value.trim() || '';
  if (!title || !url) { toast('Title and URL are required', 'error'); return; }
  const res = await api('/courses.php?action=add_resource', 'POST', { course_id: courseId, title, type, url });
  if (!res.success) { toast(res.error || 'Failed to add resource', 'error'); return; }
  toast('Resource added!', 'success');
  _cdRenderTab('resources');
}

function _cdUploadResource(courseId) {
  let inp = document.getElementById('_cdResFileInput');
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'file'; inp.id = '_cdResFileInput'; inp.style.display = 'none';
    inp.accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*';
    document.body.appendChild(inp);
    inp.addEventListener('change', async () => {
      const file = inp.files[0]; if (!file) return;
      inp.value = '';
      if (file.size > 5 * 1024 * 1024) {
        toast('File too large (max 5 MB). Please upload to Google Drive and paste the public link.', 'error');
        const st = document.getElementById('cdResUrl');
        if (st) { st.placeholder = 'Paste Google Drive public link here…'; st.focus(); }
        return;
      }
      const st = document.getElementById('cdResUrl');
      if (st) st.placeholder = 'Uploading…';
      try {
        const up = await _uploadFile(file);
        if (up.success) {
          const titleEl = document.getElementById('cdResTitle');
          if (titleEl && !titleEl.value) titleEl.value = file.name;
          if (st) { st.value = up.data.url; st.placeholder = 'URL or paste file link'; }
          document.getElementById('cdResType').value = 'file';
        } else { toast(up.error || 'Upload failed', 'error'); }
      } catch(e) { toast('Upload failed', 'error'); }
    });
  }
  inp.click();
}

async function _cdDeleteResource(id, courseId) {
  if (!confirm('Delete this resource?')) return;
  const res = await api('/courses.php?action=delete_resource', 'POST', { id });
  if (!res.success) { toast(res.error || 'Failed', 'error'); return; }
  _cdRenderTab('resources');
}

function _cdDiscussionHtml(posts, courseId) {
  const isOwn = state.user && parseInt(_cdCourse.teacher_id) === parseInt(state.user.id);
  const items = posts.map(p => `
    <div class="cd-discussion-post${parseInt(p.is_pinned) ? ' cd-pinned' : ''}">
      <img src="${esc(p.avatar_url||"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E")}" class="cd-disc-avatar" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="font-weight:700;font-size:.82rem;color:var(--navy)">${esc(p.first_name)} ${esc(p.last_name)}</span>
          ${p.role==='active_teacher'?'<span style="font-size:.65rem;background:var(--cyan);color:#fff;padding:1px 6px;border-radius:10px;font-weight:700">TEACHER</span>':''}
          ${parseInt(p.is_pinned)?'<span style="font-size:.65rem;background:#fbbf24;color:#fff;padding:1px 6px;border-radius:10px;font-weight:700">📌 PINNED</span>':''}
          <span style="font-size:.72rem;color:var(--gray-400);margin-left:auto">${timeAgo(p.created_at)}</span>
        </div>
        <p style="font-size:.85rem;color:var(--gray-700);line-height:1.5;margin:0">${esc(p.body)}</p>
      </div>
      ${(isOwn || (state.user && parseInt(p.user_id) === parseInt(state.user.id)))
        ? `<button onclick="_cdDeletePost(${p.id},${courseId})" style="background:none;border:none;color:var(--gray-300);cursor:pointer;padding:4px;align-self:flex-start"><i class="fas fa-trash"></i></button>`
        : ''}
    </div>`).join('');

  return `
    <div class="cd-disc-compose">
      <textarea class="form-control" id="cdDiscBody" rows="2" placeholder="Ask a question or share a thought…" style="font-size:.85rem;resize:none"></textarea>
      <button class="btn btn-primary" style="font-size:.82rem;margin-top:8px" onclick="_cdPostDiscussion(${courseId})"><i class="fas fa-paper-plane"></i> Post</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
      ${items || `<p style="color:var(--gray-400);font-size:.85rem;text-align:center;padding:24px 0">No posts yet — start the conversation!</p>`}
    </div>`;
}

async function _cdPostDiscussion(courseId) {
  const body = document.getElementById('cdDiscBody')?.value.trim() || '';
  if (!body) { toast('Please write something first', 'error'); return; }
  const res = await api('/courses.php?action=add_discussion', 'POST', { course_id: courseId, body });
  if (!res.success) { toast(res.error || 'Failed', 'error'); return; }
  _cdRenderTab('discussion');
}

async function _cdDeletePost(id, courseId) {
  if (!confirm('Delete this post?')) return;
  const res = await api('/courses.php?action=delete_discussion', 'POST', { id });
  if (!res.success) { toast(res.error || 'Failed', 'error'); return; }
  _cdRenderTab('discussion');
}

function _cdStudentsHtml(students) {
  if (!students.length) return `<div style="text-align:center;padding:40px;color:var(--gray-400)"><i class="fas fa-users" style="font-size:2.5rem;display:block;margin-bottom:12px"></i><p>No enrolled students yet</p></div>`;
  return `<div style="display:flex;flex-direction:column;gap:10px">
    ${students.map(u => {
      const absences = u.absences || [];
      const absenceHtml = absences.length ? `
        <div style="margin-top:6px;display:flex;flex-direction:column;gap:3px">
          <div style="font-size:.7rem;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:.04em"><i class="fas fa-calendar-times"></i> Not attending:</div>
          ${absences.map(a => `
            <div style="font-size:.72rem;background:#fef2f2;border-left:2px solid #fca5a5;padding:3px 8px;border-radius:4px;color:#7f1d1d">
              Session ${esc(String(a.session_number))}: ${esc(a.title)}
              ${a.absent_reason ? `<span style="display:block;font-style:italic;color:#991b1b;margin-top:1px">"${esc(a.absent_reason)}"</span>` : '<span style="color:#9ca3af;font-style:italic"> (no reason given)</span>'}
            </div>`).join('')}
        </div>` : '';
      return `
      <div style="padding:10px 12px;background:var(--gray-50);border-radius:10px;${absences.length ? 'border-left:3px solid #f87171' : ''}">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="${esc(u.avatar_url||"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E")}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:.88rem;color:var(--navy)">${esc(u.first_name)} ${esc(u.last_name)}</div>
            <div style="font-size:.76rem;color:var(--gray-400)">@${esc(u.username)} · Grade ${esc(u.grade||'?')}</div>
            ${u.intro_answer ? `<div style="font-size:.75rem;color:var(--gray-500);font-style:italic;margin-top:2px">"${esc(u.intro_answer)}"</div>` : ''}
          </div>
          <div style="font-size:.72rem;color:var(--gray-400);flex-shrink:0">${timeAgo(u.registered_at)}</div>
        </div>
        ${absenceHtml}
      </div>`;
    }).join('')}
  </div>`;
}

async function registerCourseFromModal(courseId, hasIntroQ) {
  const answer = hasIntroQ ? (document.getElementById('cdIntroAnswer')?.value.trim() || '') : '';
  if (hasIntroQ && !answer) { toast("Please answer the teacher's question first", 'error'); return; }

  const btn = document.querySelector('.cd-enroll-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enrolling…'; }

  const res = await api('/teacher.php?action=register_course', 'POST', { course_id: courseId, intro_answer: answer });
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-graduation-cap"></i> Enrol in Course'; }

  if (!res.success) { toast(res.error || 'Could not register', 'error'); return; }
  toast('Enrolled! All sessions added to your schedule.', 'success');
  // Refresh course data and re-render header
  const refresh = await api('/teacher.php?action=course_detail&course_id=' + courseId);
  if (refresh.success) { _cdCourse = refresh.data; _cdRenderHeader(); _cdRenderTabNav(); }
  _loadLearnHubSessions();
}

async function unregisterCourse(courseId, btn) {
  if (!confirm('Leave this course? You will be removed from all upcoming sessions.')) return;
  if (btn) btn.disabled = true;
  const res = await api('/teacher.php?action=unregister_course', 'POST', { course_id: courseId });
  if (btn) btn.disabled = false;
  if (!res.success) { toast(res.error || 'Could not unregister', 'error'); return; }
  toast('You have left the course.', 'success');
  const refresh = await api('/teacher.php?action=course_detail&course_id=' + courseId);
  if (refresh.success) { _cdCourse = refresh.data; _cdRenderHeader(); _cdRenderTabNav(); }
  _loadLearnHubSessions();
}

/* ── Teacher Public Profile Modal ───────────────────────────── */
async function viewTeacherProfile(userId) {
  openModal('teacherProfileModal');
  const body = document.getElementById('teacherProfileBody');
  if (body) body.innerHTML = skeletons(2, 120);

  const res = await api('/teacher.php?action=teacher_profile&user_id=' + userId);
  if (!body) return;

  if (!res.success) { body.innerHTML = errorCard('Could not load profile'); return; }
  const t = res.data;
  const lvl = getLevelInfo(parseInt(t.xp) || 0);
  const subjects = _tryParse(t.approved_subjects, []);
  const rating = t.rating || {};
  const stats  = t.stats  || {};
  const sessions = t.sessions || [];

  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
      <img src="${esc(t.avatar_url||"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E")}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--cyan)" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'">
      <div>
        <div style="font-size:1.1rem;font-weight:800;color:var(--navy)">${esc(t.first_name)} ${esc(t.last_name)}</div>
        <div style="font-size:.82rem;color:var(--gray-400)">@${esc(t.username)} · ${lvl.label} Lv.${lvl.level}</div>
        ${t.location ? `<div style="font-size:.78rem;color:var(--gray-400);margin-top:2px"><i class="fas fa-map-marker-alt"></i> ${esc(t.location)}</div>` : ''}
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      ${pilledXP(`${rating.avg_rating || '—'} ★`, 'var(--warning-light,#fef3c7)', '#92400e')}
      ${pilledXP(`${rating.total_reviews || 0} reviews`, '#f0f9ff', 'var(--cyan)')}
      ${pilledXP(`${stats.ended_sessions || 0} sessions taught`, '#f0fdf4', '#16a34a')}
    </div>
    ${t.current_status ? `<p style="font-size:.82rem;color:var(--gray-500);margin-bottom:8px"><strong>Status:</strong> ${esc(t.current_status)}</p>` : ''}
    ${t.public_bio ? `<p style="font-size:.85rem;color:var(--navy);line-height:1.6;margin-bottom:16px">${esc(t.public_bio)}</p>` : ''}
    ${subjects.length ? `
      <div style="margin-bottom:16px">
        <div style="font-size:.78rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Teaches</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${subjects.map(s => `<span style="background:var(--cyan-light);color:var(--cyan);font-size:.76rem;font-weight:600;padding:3px 10px;border-radius:20px">${esc(s)}</span>`).join('')}
        </div>
      </div>` : ''}

    ${(() => {
      const tests    = _tryParse(t.standardized_tests, []);
      const scores   = _tryParse(t.test_scores,        {});
      const testSubs = _tryParse(t.test_subjects,      {});
      if (!tests.length) return '';
      return `<div style="margin-bottom:16px">
        <div style="font-size:.78rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Qualifications</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${tests.map(test => {
            const score = scores[test];
            const subs  = testSubs[test];
            return `<div style="display:flex;align-items:center;gap:8px;font-size:.82rem">
              <i class="fas fa-certificate" style="color:var(--cyan);width:14px"></i>
              <span style="font-weight:600;color:var(--navy)">${esc(test)}</span>
              ${score != null ? `<span style="color:var(--gray-400)">Score: <strong style="color:var(--navy)">${score}</strong></span>` : ''}
              ${subs && subs.length ? `<span style="color:var(--gray-400)">· ${subs.map(s=>esc(s)).join(', ')}</span>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    })()}
    ${sessions.length ? `
      <div>
        <div style="font-size:.78rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Upcoming Sessions</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${sessions.map(s => {
            const dt = parseUtc(s.scheduled_at);
            const ds = fmtDate(dt);
            const ts = fmtTime(dt);
            return `<div style="padding:10px 14px;background:#f8fafc;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:10px">
              <div>
                <div style="font-size:.85rem;font-weight:600;color:var(--navy)">${esc(s.title)}</div>
                <div style="font-size:.75rem;color:var(--gray-400)">${ds} at ${ts} · ${s.duration_minutes} min</div>
              </div>
              <button class="btn btn-primary" style="font-size:.75rem;padding:5px 12px" onclick="closeModal('teacherProfileModal');setTimeout(()=>{navigate('learn');setTimeout(()=>showPreRegModal(${s.id}),400)},200)">Register</button>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}`;
}

/* ══════════════════════════════════════════════════════════════
   PHASE 6 — Feedback + Past Sessions  (Part 6/6)
   ══════════════════════════════════════════════════════════════ */

let _fbState = { sessionId: null, toUserId: null, type: null, rating: 0 };

function showFeedbackModal(sessionId, toUserId, type) {
  _fbState = { sessionId, toUserId, type, rating: 0 };
  const body = document.getElementById('feedbackBody');
  if (!body) return;
  const title = document.getElementById('feedbackModalTitle');
  if (title) title.textContent = type === 'teacher_to_student' ? 'Feedback for Student' : 'Rate this Session';

  const isTeacher = type === 'teacher_to_student';
  body.innerHTML = `
    <p style="font-size:.87rem;color:var(--gray-500);margin-bottom:16px">
      ${isTeacher ? 'Leave feedback for this student to help them improve.' : 'How was your learning experience?'}
    </p>
    ${!isTeacher ? `
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:.8rem;color:var(--gray-400);margin-bottom:8px">Overall Rating</div>
        <div style="display:flex;justify-content:center;gap:8px" id="fbStars">
          ${[1,2,3,4,5].map(n => `
            <span style="font-size:2rem;cursor:pointer;transition:transform .1s" onclick="setFbRating(${n})" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" id="fbStar${n}">☆</span>
          `).join('')}
        </div>
      </div>` : ''}
    <div class="form-group">
      <label class="form-label">${isTeacher ? 'Comments (optional)' : 'Written Review (optional)'}</label>
      <textarea class="form-control" id="fbReview" rows="4" placeholder="${isTeacher ? 'e.g. Great participation, keep asking questions!' : 'Tell others what you thought of this session…'}" style="resize:vertical"></textarea>
    </div>`;

  openModal('feedbackModal');
}

function setFbRating(n) {
  _fbState.rating = n;
  [1,2,3,4,5].forEach(i => {
    const el = document.getElementById('fbStar' + i);
    if (el) el.textContent = i <= n ? '★' : '☆';
  });
}

async function submitFeedback() {
  const review    = document.getElementById('fbReview')?.value.trim() || '';
  const isTeacher = _fbState.type === 'teacher_to_student';

  if (!isTeacher && _fbState.rating < 1) { toast('Please select a rating', 'error'); return; }

  const btn = document.querySelector('#feedbackModal .btn-primary');
  const resetBtn = () => { if (btn) btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit'; if (btn) btn.disabled = false; };
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'; btn.disabled = true; }

  const res = await api('/teacher.php?action=submit_feedback', 'POST', {
    session_id:    _fbState.sessionId,
    to_user_id:    _fbState.toUserId,
    feedback_type: _fbState.type,
    rating:        isTeacher ? null : _fbState.rating,
    review,
  });

  if (!res.success) { resetBtn(); toast(res.error || 'Could not submit feedback', 'error'); return; }

  resetBtn();
  closeModal('feedbackModal');
  toast('Feedback submitted! +1 XP earned', 'success');
  // Update local XP
  awardXP(1, 'Feedback submitted');
  if (state.page === 'teacher') renderTeacherHub();
  else if (_learnHubTab === 'past') _renderPastSessionsContent(document.getElementById('learnSessionsGrid'));
}

/* ── Past Sessions (tab or standalone) ──────────────────────── */
async function renderPastSessions() {
  // When called from the tab, render into the sessions grid slot
  const grid = document.getElementById('learnSessionsGrid');
  const pg   = document.getElementById('page-learn');
  if (!pg) return;

  if (grid) {
    // Tab mode — render into grid slot
    grid.innerHTML = skeletons(3, 110);
    await _renderPastSessionsContent(grid);
    return;
  }

  pg.innerHTML = `
    <div style="padding:24px 20px;max-width:860px;margin:0 auto">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
        <button class="btn btn-ghost" onclick="renderLearnHub()"><i class="fas fa-arrow-left"></i></button>
        <div>
          <h1 style="font-size:1.3rem;font-weight:800;color:var(--navy)">Past Sessions</h1>
          <p style="font-size:.82rem;color:var(--gray-400)">Sessions you taught or attended</p>
        </div>
      </div>
      <div id="pastSessionsBody">${skeletons(3, 110)}</div>
    </div>`;

  await _renderPastSessionsContent(document.getElementById('pastSessionsBody'));
}

async function _renderPastSessionsContent(container) {
  if (!container) return;
  const res = await api('/teacher.php?action=past_sessions');
  if (!res.success) { container.innerHTML = errorCard('Could not load past sessions.', '📅'); return; }

  const taught   = res.data?.taught   || [];
  const attended = res.data?.attended || [];

  if (!taught.length && !attended.length) {
    container.innerHTML = `<div style="text-align:center;padding:48px;color:var(--gray-400)">
      <div style="font-size:3rem;margin-bottom:14px">📅</div>
      <p style="font-size:.95rem;font-weight:600;color:var(--navy)">No past sessions yet</p>
    </div>`;
    return;
  }

  const sectionHtml = (title, items, role) => {
    if (!items.length) return '';
    return `
      <h3 style="font-size:.88rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">${title} (${items.length})</h3>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
        ${items.map(s => {
          const dt = parseUtc(s.scheduled_at);
          const ds = dt.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
          const avgR = parseFloat(s.avg_rating) || 0;
          const isStudent = role === 'student';
          const hasReviewed = parseInt(s.has_reviewed) > 0;
          return `
            <div class="card" style="padding:14px 18px">
              <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">
                <div style="flex:1;min-width:0">
                  <div style="font-size:.95rem;font-weight:700;color:var(--navy);margin-bottom:3px">${esc(s.title)}</div>
                  <div style="font-size:.77rem;color:var(--gray-400)">${esc(s.subject)} · ${ds}</div>
                  ${isStudent && s.first_name ? `<div style="font-size:.77rem;color:var(--gray-400);margin-top:2px">Teacher: ${esc(s.first_name)} ${esc(s.last_name)}</div>` : ''}
                  ${!isStudent && avgR ? `<div style="font-size:.77rem;color:var(--gray-400);margin-top:2px">Avg rating: ${avgR} ★ · ${s.feedback_count} review${s.feedback_count==1?'':'s'}</div>` : ''}
                </div>
                ${isStudent && !hasReviewed && parseInt(s.attended) ? `
                  <button class="btn btn-primary" style="font-size:.78rem;padding:6px 12px" onclick="showFeedbackModal(${s.id},${s.teacher_id},'student_to_teacher')"><i class="fas fa-star"></i> Review</button>` : ''}
                ${isStudent && hasReviewed ? `<span style="font-size:.76rem;color:var(--success);font-weight:600"><i class="fas fa-check"></i> Reviewed</span>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  };

  container.innerHTML = sectionHtml('Sessions I Taught', taught, 'teacher') + sectionHtml('Sessions I Attended', attended, 'student');
}

/* ── My Upcoming Sessions (student tab) ─────────────────────── */
async function _loadMyUpcomingSessions() {
  const grid = document.getElementById('learnSessionsGrid');
  if (!grid) return;
  grid.innerHTML = skeletons(3, 110);

  const res = await api('/teacher.php?action=upcoming_sessions');
  if (!grid) return;
  if (!res.success) { grid.innerHTML = errorCard('Could not load your sessions.', '📅'); return; }

  const sessions = res.data || [];
  if (!sessions.length) {
    grid.innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:var(--gray-400)">
        <div style="font-size:3rem;margin-bottom:14px">📅</div>
        <p style="font-size:1rem;font-weight:600;color:var(--navy);margin-bottom:6px">No upcoming sessions</p>
        <p style="font-size:.85rem;margin-bottom:20px">Register for sessions in the Discover tab to see them here</p>
        <button class="btn btn-primary" onclick="_lhTab('discover')"><i class="fas fa-compass"></i> Browse Sessions</button>
      </div>`;
    return;
  }

  grid.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">
    ${sessions.map(s => _mySessionCard(s)).join('')}
  </div>`;
}

function _mySessionCard(s) {
  const dt       = parseUtc(s.scheduled_at);
  const dateStr  = dt.toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long' });
  const timeStr  = fmtTime(dt);
  const regCount = parseInt(s.registered_count) || 0;
  const isLive   = s.status === 'live';
  const now      = new Date();
  const minsUntil= Math.floor((dt - now) / 60000);
  const isSoon   = !isLive && minsUntil > 0 && minsUntil <= 60;

  const badge = isLive
    ? `<span style="display:inline-flex;align-items:center;gap:5px;background:#fee2e2;color:#b91c1c;font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px"><span style="width:6px;height:6px;background:#ef4444;border-radius:50%;animation:liveBlip 1s infinite"></span>LIVE NOW</span>`
    : isSoon
    ? `<span style="background:#fef3c7;color:#92400e;font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px">⏰ In ${minsUntil} min</span>`
    : `<span style="background:var(--cyan-light);color:var(--cyan);font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px">REGISTERED</span>`;

  return `
    <div class="card" style="padding:16px 20px;border-left:3px solid ${isLive?'#ef4444':isSoon?'#f59e0b':'var(--cyan)'}">
      <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:5px">
            ${badge}
            <span style="font-size:.74rem;background:var(--gray-100);padding:2px 8px;border-radius:12px;color:var(--gray-400)">${esc(s.subject)}</span>
          </div>
          <div style="font-size:.97rem;font-weight:700;color:var(--navy);margin-bottom:4px">${esc(s.title)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.8rem;color:var(--gray-400);margin-top:2px">
            <span><i class="fas fa-user" style="width:14px"></i> ${esc(s.first_name)} ${esc(s.last_name)}</span>
            <span><i class="fas fa-calendar" style="width:14px"></i> ${dateStr} at ${timeStr}</span>
            <span><i class="fas fa-clock" style="width:14px"></i> ${s.duration_minutes} min</span>
            <span><i class="fas fa-users" style="width:14px"></i> ${regCount} / ${s.max_students} registered</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${isLive
            ? `<button class="btn btn-danger" style="font-size:.82rem;padding:7px 14px" onclick="joinLiveSession(${s.id})"><i class="fas fa-video"></i> Join Now</button>`
            : s.meeting_link && isSoon
            ? `<a href="${esc(s.meeting_link)}" target="_blank" class="btn btn-primary" style="font-size:.82rem;padding:7px 14px"><i class="fas fa-video"></i> Get Ready</a>`
            : s.meeting_link
            ? `<a href="${esc(s.meeting_link)}" target="_blank" class="btn btn-ghost" style="font-size:.82rem;padding:7px 14px"><i class="fas fa-link"></i> Meeting Link</a>`
            : ''}
          ${!isLive ? `<button class="btn btn-ghost" style="font-size:.82rem;padding:7px 14px;color:var(--gray-400)" onclick="unregisterSession(${s.id},this)"><i class="fas fa-times"></i> Cancel</button>` : ''}
        </div>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   PRE-REGISTRATION FLOW + EDIT SESSION + MISC FIXES
   ══════════════════════════════════════════════════════════════ */

/* Cache for session objects so pre-reg modal has full data */
let _learnHubSessionsCache = [];

/* ── Pre-registration modal ─────────────────────────────────── */
function showPreRegModal(sessionId) {
  const s = _learnHubSessionsCache.find(x => parseInt(x.id) === parseInt(sessionId));
  if (!s) { registerForSessionDirect(sessionId, '', null); return; } // fallback

  const dt      = parseUtc(s.scheduled_at);
  const dateStr = dt.toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  const timeStr = fmtTime(dt);
  const hasQ    = !!s.intro_question;

  const body = document.getElementById('preRegBody');
  if (!body) return;

  body.innerHTML = `
    <!-- Session summary -->
    <div style="background:var(--gray-100);border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <div style="font-size:.97rem;font-weight:700;color:var(--navy);margin-bottom:4px">${esc(s.title)}</div>
      <div style="font-size:.8rem;color:var(--gray-400)">
        <i class="fas fa-user" style="width:14px"></i> ${esc(s.first_name)} ${esc(s.last_name)} &nbsp;·&nbsp;
        <i class="fas fa-tag" style="width:14px"></i> ${esc(s.subject)}
      </div>
      <div style="font-size:.8rem;color:var(--gray-400);margin-top:3px">
        <i class="fas fa-calendar" style="width:14px"></i> ${dateStr} at ${timeStr} &nbsp;·&nbsp;
        <i class="fas fa-clock" style="width:14px"></i> ${s.duration_minutes} min
      </div>
    </div>

    <!-- Teacher's intro question -->
    ${hasQ ? `
    <div class="form-group">
      <label class="form-label" style="font-size:.88rem">
        <i class="fas fa-question-circle" style="color:var(--cyan)"></i>
        Teacher's question — <em style="font-weight:400">${esc(s.intro_question)}</em>
      </label>
      <textarea class="form-control" id="preRegAnswer" rows="3"
        placeholder="Share a bit about where you need help…"
        style="resize:vertical;font-size:.87rem"></textarea>
      <p style="font-size:.74rem;color:var(--gray-400);margin-top:4px">The teacher will read your answer before the session.</p>
    </div>` : ''}

    <!-- Attendance commitment -->
    <div style="background:#fef3c7;border:1.5px solid #f59e0b;border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <i class="fas fa-exclamation-triangle" style="color:#d97706;margin-top:2px;flex-shrink:0"></i>
        <div>
          <div style="font-size:.85rem;font-weight:700;color:#92400e;margin-bottom:6px">Attendance Commitment</div>
          <p style="font-size:.8rem;color:#92400e;margin-bottom:8px;line-height:1.6">
            Registering for a session is a commitment. <strong>Not attending without prior notice violates our Community Guidelines</strong> and may result in restrictions.
            If your plans change, please <strong>unregister at least 1 hour before</strong> the session so another student can take your spot.
          </p>
          <ul style="font-size:.78rem;color:#92400e;margin:0 0 10px 16px;line-height:1.7">
            <li>I will attend this session at the scheduled time</li>
            <li>If I cannot attend, I will unregister in advance</li>
            <li>I will be respectful to the teacher and other students</li>
          </ul>
          <div>
            <label style="font-size:.8rem;color:#92400e;font-weight:600;display:block;margin-bottom:4px">Type <strong>I understand</strong> to confirm:</label>
            <input class="form-control" id="preRegConfirm" placeholder="I understand"
              style="max-width:200px;font-size:.87rem;background:#fffbeb;border-color:#f59e0b"
              oninput="_checkPreRegReady()">
          </div>
        </div>
      </div>
    </div>`;

  // Store session ID on the submit button
  const submitBtn = document.getElementById('preRegSubmitBtn');
  if (submitBtn) { submitBtn.dataset.sessionId = sessionId; submitBtn.disabled = true; }

  openModal('preRegModal');
}

function _checkPreRegReady() {
  const val = (document.getElementById('preRegConfirm')?.value || '').trim().toLowerCase();
  const btn = document.getElementById('preRegSubmitBtn');
  if (btn) btn.disabled = val !== 'i understand';
}

async function submitPreRegistration() {
  const btn       = document.getElementById('preRegSubmitBtn');
  const sessionId = parseInt(btn?.dataset.sessionId);
  const answer    = document.getElementById('preRegAnswer')?.value.trim() || '';
  const confirm   = (document.getElementById('preRegConfirm')?.value || '').trim().toLowerCase();

  if (confirm !== 'i understand') { toast('Please type "I understand" to confirm', 'error'); return; }
  if (!sessionId) return;

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering…'; }

  const res = await api('/teacher.php?action=register_session', 'POST', {
    session_id:   sessionId,
    intro_answer: answer,
  });

  if (btn) { btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Registration'; btn.disabled = false; }

  if (!res.success) { toast(res.error || 'Could not register', 'error'); return; }

  closeModal('preRegModal');
  toast('Registered! See you at the session. 📚', 'success');
  _loadLearnHubSessions();
}

/* ── Edit Session modal ─────────────────────────────────────── */
let _editSessionId = null;
let _teacherSessionsCache = [];

function showEditSessionById(id) {
  const s = _teacherSessionsCache.find(x => parseInt(x.id) === parseInt(id));
  if (!s) { toast('Session not found', 'error'); return; }
  showEditSession(s);
}

function showEditSession(s) {
  _editSessionId = s.id;
  const body = document.getElementById('editSessionBody');
  if (!body) return;

  // Parse the stored UTC time and convert to the session's original timezone for display
  const sessTz  = s.session_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const utcDt   = parseUtc(s.scheduled_at);
  // Format the UTC datetime as a local string IN sessTz for the datetime-local input
  const tzDate  = new Intl.DateTimeFormat('sv-SE', {
    timeZone: sessTz, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hour12: false
  }).format(utcDt).replace(' ', 'T').slice(0, 16);
  const dtLocal = tzDate;

  const approvedRaw = state.user?.approved_subjects || '[]';
  let approved = [];
  try { approved = JSON.parse(approvedRaw); } catch {}

  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Session Title <span style="color:var(--danger)">*</span></label>
      <input class="form-control" id="esTitle" value="${esc(s.title)}">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Subject</label>
        <select class="form-control" id="esSubject">
          ${approved.map(sub => `<option value="${esc(sub)}"${sub===s.subject?' selected':''}>${esc(sub)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Duration (min)</label>
        <input class="form-control" id="esDuration" type="number" min="10" max="480" value="${s.duration_minutes}">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Date & Time <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="esDatetime" type="datetime-local" value="${dtLocal}">
      </div>
      <div class="form-group">
        <label class="form-label">Max Students</label>
        <input class="form-control" id="esMax" type="number" min="1" max="200" value="${s.max_students}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Session Timezone</label>
      ${tzSelectHtml('esTimezone', sessTz)}
      <p style="font-size:.74rem;color:var(--gray-400);margin-top:4px">Date & Time above is in this timezone. Students see it in their own local time.</p>
    </div>
    <div class="form-group">
      <label class="form-label">Meeting Link</label>
      <input class="form-control" id="esMeetLink" value="${esc(s.meeting_link||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-control" id="esDesc" rows="2" style="resize:vertical">${esc(s.description||'')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Intro Question for Students <span style="color:var(--gray-400);font-size:.76rem">(optional — students must answer before registering)</span></label>
      <input class="form-control" id="esIntroQ" placeholder="e.g. Which topics do you need help with?" value="${esc(s.intro_question||'')}">
    </div>`;

  openModal('editSessionModal');
}

async function submitEditSession() {
  if (!_editSessionId) return;
  const title   = document.getElementById('esTitle')?.value.trim()    || '';
  const subject = document.getElementById('esSubject')?.value         || '';
  const dur     = parseInt(document.getElementById('esDuration')?.value || 60);
  const dt      = document.getElementById('esDatetime')?.value        || '';
  const tz      = document.getElementById('esTimezone')?.value        || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const max     = parseInt(document.getElementById('esMax')?.value    || 20);
  const link    = document.getElementById('esMeetLink')?.value.trim() || '';
  const desc    = document.getElementById('esDesc')?.value.trim()     || '';
  const introQ  = document.getElementById('esIntroQ')?.value.trim()   || '';

  if (!title) { toast('Title is required', 'error'); return; }

  const btn = document.querySelector('#editSessionModal .btn-primary');
  if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

  const res = await api('/teacher.php?action=edit_session', 'POST', {
    session_id:       _editSessionId,
    title, subject, description: desc,
    scheduled_at:     dt ? dt.replace('T',' ') + ':00' : '',
    session_timezone: tz,
    duration_minutes: dur,
    meeting_link:     link,
    max_students:     max,
    intro_question:   introQ,
  });

  if (btn) btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
  if (!res.success) { toast(res.error || 'Could not save', 'error'); return; }
  closeModal('editSessionModal');
  toast('Session updated!', 'success');
  renderTeacherHub();
}

/* ── Utility helpers ────────────────────────────────────────── */
function _tryParse(str, fallback) {
  try { return JSON.parse(str) || fallback; } catch { return fallback; }
}

function pilledXP(label, bg, color) {
  return `<span style="background:${bg};color:${color};font-size:.76rem;font-weight:600;padding:4px 12px;border-radius:20px;border:1px solid ${color}20">${label}</span>`;
}

// Set by OAuth callback IIFEs to suppress showLanding() in DOMContentLoaded
let _oauthCallbackPending = false;

// Exposed so OAuth callbacks can cancel the 6s fallback guard
let _loaderGuardTimer = null;

/* ── Background notification + message badge polling ────────── */
// Polls every 60 seconds when user is logged in and the tab is visible.
let _bgPollInterval = null;

function _startBgPoll() {
  if (_bgPollInterval) return;
  _bgPollInterval = setInterval(() => {
    if (!state.token || !state.user) return;
    if (document.visibilityState === 'hidden') return;
    updateNotifBadge(true);
  }, 60000);
}

function _stopBgPoll() {
  if (_bgPollInterval) { clearInterval(_bgPollInterval); _bgPollInterval = null; }
}

// Pause polling when tab is hidden, resume when visible
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.token && state.user) {
    updateNotifBadge(true); // immediate refresh on tab focus
  }
});


/* ── Google OAuth redirect callback ─────────────────────────── */
// When Google redirects back with #id_token=... in the hash, handle it immediately
// before anything else so the user lands logged in.
(function handleGoogleOAuthReturn() {
  if (!window.location.hash) return;
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const idToken = hashParams.get('id_token');
  if (!idToken) return;

  _oauthCallbackPending = true;

  // Clear the fragment from the URL (replace with root so it matches the registered redirect URI)
  window.history.replaceState(null, '', '/');

  // Show loader while we exchange the token
  document.getElementById('appLoader')?.classList.remove('hidden');

  api('/auth.php?action=google_oauth', 'POST', { id_token: idToken }).then(res => {
    _oauthCallbackPending = false;
    _handleSocialResponse(res, 'Google');
  }).catch(() => {
    _oauthCallbackPending = false;
    showAuth('login');
    toast('Google sign-in failed. Please try again.', 'error');
  });
})();

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Splash screen typewriter — "Learn" white, "ora" cyan (starts at index 5)
  typewriterEffect(document.getElementById('appLoaderLogo'), 'Learnora', 80, null, 5);

  // Hard timeout: loader always hides within 6s even if API hangs
  _loaderGuardTimer = setTimeout(() => {
    if (document.getElementById('appWrapper')?.style.display === 'flex') return;
    showAuth();
  }, 6000);

  // Hash routing — supports #page, #course/123, #session/123, #game/PIN
  const hash = window.location.hash.replace('#', '');
  const courseMatch   = hash.match(/^course\/(\d+)$/);
  const sessionMatch  = hash.match(/^session\/(\d+)$/);
  const gameMatch     = hash.match(/^game\/([A-Z0-9]{4,8})$/i);
  if (courseMatch)  { state.page = 'courses'; state._deepLinkCourse = parseInt(courseMatch[1]); }
  else if (sessionMatch) { state.page = 'learn'; state._deepLinkSession = parseInt(sessionMatch[1]); }
  else if (gameMatch) { state.page = 'quizzes'; state._deepLinkGame = gameMatch[1].toUpperCase(); }
  else if (hash && VALID_PAGES.has(hash)) { state.page = hash; }

  // Sync auth logo to saved theme (body.app-dark already set by inline script)
  const authLogo = document.getElementById('authLogo');
  if (authLogo) authLogo.src = document.body.classList.contains('app-dark') ? 'logo-dr.png' : 'logo-lg.png';

  // Auto login if token stored
  if (state.token) {
    api('/auth.php?action=me').then(res => {
      clearTimeout(_loaderGuardTimer);
      if (res.success) {
        state.user  = res.data;
        state.xp    = parseInt(res.data.xp) || 0;
        state.level = getLevelInfo(state.xp).level;
        // Admin → redirect to hidden panel
        if ((res.data.role || 'student') === 'admin') {
          window.location.href = 'admin.html';
          return;
        }
        // Respect deep-link hash; fall back to dashboard
        if (!VALID_PAGES.has(state.page)) state.page = 'dashboard';
        showApp();
        // Handle course/session/game deep links after app renders
        if (state._deepLinkCourse)  { const id = state._deepLinkCourse;  delete state._deepLinkCourse;  setTimeout(() => showCourseDetail(id), 600); }
        if (state._deepLinkSession) { const id = state._deepLinkSession; delete state._deepLinkSession; setTimeout(() => showSessionDetailById(id), 600); }
        if (state._deepLinkGame)    { const pin = state._deepLinkGame;   delete state._deepLinkGame;    setTimeout(() => showJoinGameModal(pin), 700); }
      } else {
        // Token expired — show login
        localStorage.removeItem('learnora_token');
        state.token = null;
        showLanding();
      }
    }).catch(() => { clearTimeout(_loaderGuardTimer); showLanding(); });
  } else if (_oauthCallbackPending) {
    // An OAuth callback IIFE is processing — keep loader showing until it resolves.
    // The loaderGuard will fall back to showAuth() if the API call hangs.
  } else {
    clearTimeout(_loaderGuardTimer);
    showLanding();
  }
});
/* ══════════════════════════════════════════════════════════════
   JITSI LIVE SESSION INTEGRATION
   ══════════════════════════════════════════════════════════════ */

let _jitsiApi = null;
let _activeHelpRequestId   = null;  // set when Jitsi opens for a help session
let _activeHelpIsModerator = false; // true = teacher/tutor

/** Teacher clicks "Go Live" on a scheduled session */
async function startLiveSession(sessionId) {
  const btn = document.querySelector(`[data-start-session="${sessionId}"]`);
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting…'; }

  const res = await api('/teacher.php?action=start_session', 'POST', { session_id: sessionId });
  if (!res.success) {
    toast(res.error || 'Could not start session', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-broadcast-tower"></i> Go Live'; }
    return;
  }

  toast('Session is now LIVE! 🔴', 'success');
  renderTeacherHub(); // refresh cards
  openJitsiSession(res.data.room_id, res.data.session_id, true, '', res.data.jwt || '');
}

/** Registered student (or teacher rejoining) clicks "Join Now" */
async function joinLiveSession(sessionId) {
  const res = await api('/teacher.php?action=get_jitsi_room&session_id=' + sessionId);
  if (!res.success) { toast(res.error || 'Cannot join — session may not be live yet.', 'error'); return; }
  openJitsiSession(res.data.room_id, sessionId, res.data.is_moderator, res.data.session_title, res.data.jwt || '');
}

/** Open the Jitsi modal and initialise the meeting via JaaS (8x8.vc) */
function openJitsiSession(roomId, sessionId, isModerator, sessionTitle, jwt = '', isHelpSession = false) {
  const modal     = document.getElementById('jitsiModal');
  const container = document.getElementById('jitsiContainer');
  const titleEl   = document.getElementById('jitsiSessionTitle');
  if (!modal || !container) return;

  if (titleEl) titleEl.textContent = sessionTitle || 'Live Session';

  // Track help session state
  _activeHelpRequestId   = isHelpSession ? sessionId : null;
  _activeHelpIsModerator = isHelpSession ? isModerator : false;
  const endBtn = document.getElementById('jitsiEndBtn');
  if (endBtn) endBtn.style.display = isHelpSession ? 'inline-block' : 'none';

  // Destroy previous API instance
  container.innerHTML = '';
  if (_jitsiApi) { try { _jitsiApi.dispose(); } catch(e) {} _jitsiApi = null; }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  const jaasRoom = `${JAAS_APP_ID}/${roomId}`;

  const initJitsi = () => {
    try {
      const opts = {
        roomName: jaasRoom,
        width: '100%',
        height: '100%',
        parentNode: container,
        configOverwrite: {
          startWithAudioMuted: !isModerator,
          enableWelcomePage:   false,
          prejoinPageEnabled:  false,
          requireDisplayName:  false,
          disableDeepLinking:  true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK:      false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          MOBILE_APP_PROMO:          false,
          TOOLBAR_BUTTONS: [
            'microphone','camera','desktop','fullscreen','chat',
            'raisehand','tileview','hangup',
            ...(isModerator ? ['mute-everyone','security'] : []),
          ],
        },
      };
      if (jwt) opts.jwt = jwt;
      _jitsiApi = new JitsiMeetExternalAPI('8x8.vc', opts);
    } catch(err) {
      // Fallback: plain iframe with JWT if available
      const jwtParam = jwt ? `&jwt=${encodeURIComponent(jwt)}` : '';
      container.innerHTML = `<iframe src="https://8x8.vc/${jaasRoom}?config.prejoinPageEnabled=false${jwtParam}"
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        style="width:100%;height:100%;border:none"></iframe>`;
    }
  };

  // JaaS external_api.js is served per-app from 8x8.vc
  if (typeof JitsiMeetExternalAPI === 'undefined') {
    const script = document.createElement('script');
    script.src = `https://8x8.vc/${JAAS_APP_ID}/external_api.js`;
    script.onload  = initJitsi;
    script.onerror = () => {
      const jwtParam = jwt ? `&jwt=${encodeURIComponent(jwt)}` : '';
      container.innerHTML = `<iframe src="https://8x8.vc/${jaasRoom}?config.prejoinPageEnabled=false${jwtParam}"
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        style="width:100%;height:100%;border:none"></iframe>`;
    };
    document.head.appendChild(script);
  } else {
    initJitsi();
  }
}

/** Leave/close the Jitsi session (session stays active — allows rejoin) */
function closeJitsiSession() {
  if (_jitsiApi) { try { _jitsiApi.dispose(); } catch(e) {} _jitsiApi = null; }
  const modal = document.getElementById('jitsiModal');
  if (modal) modal.style.display = 'none';
  const endBtn = document.getElementById('jitsiEndBtn');
  if (endBtn) endBtn.style.display = 'none';
  document.body.style.overflow = '';

  // Clear help session tracking (session stays 'accepted' so both can rejoin)
  _activeHelpRequestId   = null;
  _activeHelpIsModerator = false;

  // Refresh the relevant hub view
  const role = state.user?.role;
  if (document.getElementById('page-helpqueue')?.style.display !== 'none') renderHelpQueue();
  else if (role === 'active_teacher') renderTeacherHub();
  else if (document.getElementById('page-learn')?.style.display !== 'none') _lhLoadTab('my');
}

/** End a help session permanently and prompt student for feedback */
async function endHelpSession() {
  const requestId   = _activeHelpRequestId;
  const isModerator = _activeHelpIsModerator;
  if (!requestId) { closeJitsiSession(); return; }

  if (!confirm('End this session for everyone?')) return;

  // End session on server
  const res = await api('/help_queue.php?action=end', 'POST', { request_id: requestId });
  if (!res.success) { toast(res.error || 'Could not end session', 'error'); return; }

  // Dispose Jitsi
  if (_jitsiApi) { try { _jitsiApi.dispose(); } catch(e) {} _jitsiApi = null; }
  const modal = document.getElementById('jitsiModal');
  if (modal) modal.style.display = 'none';
  const endBtn = document.getElementById('jitsiEndBtn');
  if (endBtn) endBtn.style.display = 'none';
  document.body.style.overflow = '';

  _activeHelpRequestId   = null;
  _activeHelpIsModerator = false;

  // Student (non-moderator) gets prompted for feedback
  if (!isModerator) {
    // Fetch tutor info to show in feedback modal
    const roomRes = await api('/help_queue.php?action=my_requests');
    const req = (roomRes.data || []).find(r => r.id == requestId);
    const tutorId   = req?.accepted_by  || null;
    const tutorName = req ? `${req.tutor_first || ''} ${req.tutor_last || ''}`.trim() : 'your tutor';
    showHelpFeedbackModal(requestId, tutorId, tutorName);
  } else {
    toast('Session ended.', 'success');
    renderHelpQueue();
  }
}

/* ══════════════════════════════════════════════════════════════
   HELP QUEUE — Get Instant Peer Help
   ══════════════════════════════════════════════════════════════ */

const HELP_SUBJECTS = [
  'Mathematics','Physics','Chemistry','Biology','English','History',
  'Geography','Computer Science','Economics','Psychology','Sociology',
  'Art','Music','Foreign Language','Other',
];

async function renderHelpQueue() {
  const pg = document.getElementById('page-helpqueue');
  if (!pg) return;

  const isTeacher = state.user?.role === 'active_teacher';

  pg.innerHTML = `
    <div style="padding:24px 20px;max-width:800px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px">
        <div>
          <h1 style="font-size:1.4rem;font-weight:800;color:var(--navy)">
            <i class="fas fa-hand-holding-heart" style="color:var(--cyan);margin-right:8px"></i>${isTeacher ? 'Help Queue' : 'Get Instant Help'}
          </h1>
          <p style="font-size:.83rem;color:var(--gray-400)">
            ${isTeacher
              ? 'Students waiting for help — accept a request to start an instant Jitsi session.'
              : 'Post a request and a verified tutor will join you in a live session within minutes.'}
          </p>
        </div>
        ${!isTeacher ? `<button class="btn btn-primary" onclick="showHelpRequestModal()"><i class="fas fa-plus"></i> Request Help</button>` : ''}
      </div>

      ${isTeacher ? `
        <div id="teacherActiveSessions" style="margin-bottom:16px"></div>
        <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap" id="hqSubjectFilter">
          <button class="grade-pill active" onclick="loadOpenRequests('',this)">All Subjects</button>
          ${HELP_SUBJECTS.slice(0,6).map(s => `<button class="grade-pill" onclick="loadOpenRequests('${esc(s)}',this)">${esc(s)}</button>`).join('')}
        </div>
        <div id="helpQueueList">${skeletons(3, 80)}</div>
      ` : `
        <div id="myHelpRequests">${skeletons(2, 80)}</div>
      `}
    </div>`;

  if (isTeacher) { loadTeacherActiveSessions(); loadOpenRequests('', null); }
  else loadMyRequests();
}

async function loadOpenRequests(subject, btn) {
  if (btn) {
    document.querySelectorAll('#hqSubjectFilter .grade-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const list = document.getElementById('helpQueueList');
  if (!list) return;
  list.innerHTML = skeletons(3, 80);

  const url = '/help_queue.php?action=open_requests' + (subject ? '&subject=' + encodeURIComponent(subject) : '');
  const res = await api(url);
  if (!res.success) { list.innerHTML = errorCard(res.error || 'Failed to load queue.'); return; }
  const items = res.data || [];

  if (!items.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--gray-400)">
      <div style="font-size:2.5rem;margin-bottom:12px">🎉</div>
      <p style="font-weight:600;color:var(--navy)">Queue is empty!</p>
      <p style="font-size:.85rem">No students waiting right now. Check back soon.</p>
    </div>`;
    return;
  }

  list.innerHTML = items.map(r => helpRequestCard(r, true)).join('');
}

async function loadMyRequests() {
  const el = document.getElementById('myHelpRequests');
  if (!el) return;
  const res = await api('/help_queue.php?action=my_requests');
  if (!res.success) { el.innerHTML = errorCard(res.error || 'Failed to load requests.'); return; }
  const items = res.data || [];

  if (!items.length) {
    el.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--gray-400)">
      <div style="font-size:2.5rem;margin-bottom:14px">🙋</div>
      <p style="font-weight:600;color:var(--navy);margin-bottom:6px">No requests yet</p>
      <p style="font-size:.85rem;margin-bottom:20px">Post a help request and a tutor will join you live within minutes.</p>
      <button class="btn btn-primary" onclick="showHelpRequestModal()"><i class="fas fa-plus"></i> Request Help Now</button>
    </div>`;
    return;
  }

  el.innerHTML = items.map(r => helpRequestCard(r, false)).join('');
}

function helpRequestCard(r, isTeacherView) {
  const ago     = timeAgo(r.created_at);
  const status  = r.status;
  const badge   = status === 'open'
    ? `<span style="background:#fef3c7;color:#92400e;font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px">⏳ Waiting</span>`
    : status === 'accepted'
    ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#dcfce7;color:#16a34a;font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px"><span style="width:5px;height:5px;background:#16a34a;border-radius:50%;animation:liveBlip 1s infinite"></span>In Session</span>`
    : status === 'ended'
    ? `<span style="background:#f0fdf4;color:#16a34a;font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px">✓ Ended</span>`
    : `<span style="background:var(--gray-100);color:var(--gray-400);font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:20px">Expired</span>`;

  const learnerName = isTeacherView
    ? `${esc(r.first_name)} ${esc(r.last_name)}`
    : (r.tutor_first ? `Tutor: ${esc(r.tutor_first)} ${esc(r.tutor_last)}` : '');

  return `
    <div class="card" style="padding:16px 20px;margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
        ${isTeacherView ? `<img src="${esc(r.avatar_url||"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E")}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%2220%22%20fill=%22%234f46e5%22/%3E%3Ctext%20x=%2250%25%22%20y=%2255%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20fill=%22white%22%20font-size=%2216%22%20font-family=%22sans-serif%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'">` : ''}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            ${badge}
            <span style="font-size:.75rem;background:var(--gray-100);padding:2px 8px;border-radius:12px;color:var(--gray-500)">${esc(r.subject)}</span>
            <span style="font-size:.72rem;color:var(--gray-400)">${ago}</span>
          </div>
          <div style="font-size:.95rem;font-weight:700;color:var(--navy);margin-bottom:3px">${esc(r.topic)}</div>
          ${r.description ? `<p style="font-size:.82rem;color:var(--gray-500);margin:0 0 4px;line-height:1.5">${esc(r.description)}</p>` : ''}
          ${learnerName ? `<div style="font-size:.78rem;color:var(--gray-400)">${learnerName} ${isTeacherView && r.grade ? `· Grade ${esc(r.grade)}` : ''}</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;flex-shrink:0">
          ${isTeacherView && status === 'open'
            ? `<button class="btn btn-primary" style="font-size:.82rem;padding:7px 16px" onclick="acceptHelpRequest(${r.id},this)"><i class="fas fa-video"></i> Accept & Join</button>`
            : ''}
          ${isTeacherView && status === 'accepted'
            ? `<button class="btn btn-primary" style="font-size:.82rem;padding:7px 16px;background:var(--cyan)" onclick="joinHelpSession(${r.id})"><i class="fas fa-redo"></i> Rejoin Room</button>`
            : ''}
          ${!isTeacherView && status === 'accepted'
            ? `<button class="btn btn-primary" style="font-size:.82rem;padding:7px 16px" onclick="joinHelpSession(${r.id})"><i class="fas fa-video"></i> Join Session</button>
               <button class="btn btn-ghost" style="font-size:.82rem;padding:7px 12px;color:var(--danger)" onclick="endHelpSessionFromCard(${r.id})"><i class="fas fa-stop-circle"></i> End</button>`
            : ''}
          ${!isTeacherView && status === 'open'
            ? `<button class="btn btn-ghost" style="font-size:.82rem;padding:7px 12px;color:var(--danger)" onclick="cancelHelpRequest(${r.id},this)"><i class="fas fa-times"></i> Cancel</button>`
            : ''}
          ${!isTeacherView && status === 'ended' && !r.rating
            ? `<button class="btn btn-ghost" style="font-size:.82rem;padding:7px 14px;color:var(--cyan);border-color:var(--cyan)" onclick="showHelpFeedbackModal(${r.id},${r.accepted_by||'null'},'${esc((r.tutor_first||'')+' '+(r.tutor_last||'')).trim()}')"><i class="fas fa-star"></i> Rate Session</button>`
            : ''}
        </div>
      </div>
    </div>`;
}

function showHelpRequestModal() {
  const body = document.getElementById('helpRequestBody');
  if (!body) return;
  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Subject <span style="color:var(--danger)">*</span></label>
      <select class="form-control" id="hrSubject">
        <option value="">Select subject…</option>
        ${HELP_SUBJECTS.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Topic / Question <span style="color:var(--danger)">*</span></label>
      <input class="form-control" id="hrTopic" placeholder="e.g. Quadratic equations — factoring" maxlength="200">
    </div>
    <div class="form-group">
      <label class="form-label">More details <span style="color:var(--gray-400);font-size:.76rem">(optional)</span></label>
      <textarea class="form-control" id="hrDesc" rows="3" placeholder="Describe what you're stuck on…" style="resize:vertical"></textarea>
    </div>
    <div style="background:#f0f9ff;border-left:3px solid var(--cyan);padding:10px 14px;border-radius:0 8px 8px 0;font-size:.8rem;color:var(--gray-500)">
      <i class="fas fa-info-circle" style="color:var(--cyan);margin-right:6px"></i>
      A verified tutor will accept your request and join a live video call with you. If no tutor accepts within 10 minutes, your request will expire.
    </div>`;
  openModal('helpRequestModal');
}

async function submitHelpRequest() {
  const subject = document.getElementById('hrSubject')?.value || '';
  const topic   = document.getElementById('hrTopic')?.value.trim() || '';
  const desc    = document.getElementById('hrDesc')?.value.trim() || '';

  if (!subject) { toast('Please select a subject', 'error'); return; }
  if (!topic)   { toast('Please enter a topic or question', 'error'); return; }

  const btn = document.querySelector('#helpRequestModal .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting…'; }

  const res = await api('/help_queue.php?action=post', 'POST', { subject, topic, description: desc });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Request'; }
  if (!res.success) { toast(res.error || 'Could not post request', 'error'); return; }

  closeModal('helpRequestModal');
  toast('Request posted! A tutor will join you shortly. 🎓', 'success');
  loadMyRequests();
}

async function acceptHelpRequest(requestId, btn) {
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
  const res = await api('/help_queue.php?action=accept', 'POST', { request_id: requestId });
  if (!res.success) {
    toast(res.error || 'Could not accept request', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-video"></i> Accept & Join'; }
    return;
  }
  toast('Accepted! Starting session…', 'success');
  loadOpenRequests('', null);
  openJitsiSession(res.data.room_id, requestId, true, 'Help Session', res.data.jwt || '', true);
}

async function joinHelpSession(requestId) {
  const res = await api('/help_queue.php?action=get_room&request_id=' + requestId);
  if (!res.success) { toast(res.error || 'Cannot join — tutor may not have started yet.', 'error'); return; }
  openJitsiSession(res.data.room_id, requestId, res.data.is_moderator, `Help: ${res.data.topic || ''}`, res.data.jwt || '', true);
}

async function cancelHelpRequest(requestId, btn) {
  if (!confirm('Cancel your help request?')) return;
  if (btn) btn.disabled = true;
  const res = await api('/help_queue.php?action=cancel', 'POST', { request_id: requestId });
  if (!res.success) { toast(res.error || 'Could not cancel', 'error'); if (btn) btn.disabled = false; return; }
  toast('Request cancelled.');
  loadMyRequests();
}

/** Load teacher's own currently-accepted (in-progress) sessions */
async function loadTeacherActiveSessions() {
  const el = document.getElementById('teacherActiveSessions');
  if (!el) return;
  const res = await api('/help_queue.php?action=my_active');
  if (!res.success || !res.data?.length) { el.innerHTML = ''; return; }

  el.innerHTML = `
    <div style="margin-bottom:8px;font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--cyan)">
      <i class="fas fa-circle" style="font-size:.5rem;margin-right:6px;animation:liveBlip 1s infinite"></i>Your Active Sessions
    </div>
    ${res.data.map(r => helpRequestCard({
      ...r,
      first_name: r.learner_first, last_name: r.learner_last,
      avatar_url: r.learner_avatar,
    }, true)).join('')}
    <hr style="border:none;border-top:1px solid var(--gray-200);margin:16px 0">`;
}

/** End a help session directly from the card (without being in Jitsi) */
async function endHelpSessionFromCard(requestId) {
  if (!confirm('End this session for everyone?')) return;
  const res = await api('/help_queue.php?action=end', 'POST', { request_id: requestId });
  if (!res.success) { toast(res.error || 'Could not end session', 'error'); return; }
  toast('Session ended.');
  // Fetch tutor info to show feedback modal
  const myRes = await api('/help_queue.php?action=my_requests');
  const req = (myRes.data || []).find(r => r.id == requestId);
  const tutorId   = req?.accepted_by  || null;
  const tutorName = req ? `${req.tutor_first || ''} ${req.tutor_last || ''}`.trim() : 'your tutor';
  loadMyRequests();
  if (tutorId) showHelpFeedbackModal(requestId, tutorId, tutorName);
}

/** Show the feedback modal for a help session */
function showHelpFeedbackModal(requestId, tutorId, tutorName) {
  const body = document.getElementById('feedbackBody');
  const title = document.getElementById('feedbackModalTitle');
  if (!body) return;
  if (title) title.textContent = 'Rate Your Session';

  // Store on _fbState so submitHelpFeedback can read it
  window._helpFbState = { requestId, tutorId, tutorName, rating: 0 };

  body.innerHTML = `
    <p style="font-size:.87rem;color:var(--gray-500);margin-bottom:16px">
      How was your session with <strong>${esc(tutorName || 'your tutor')}</strong>? Your rating helps them earn XP.
    </p>
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:.8rem;color:var(--gray-400);margin-bottom:8px">Overall Rating</div>
      <div style="display:flex;justify-content:center;gap:8px" id="hfbStars">
        ${[1,2,3,4,5].map(n => `
          <span style="font-size:2.2rem;cursor:pointer;transition:transform .1s" onclick="setHelpFbRating(${n})" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" id="hfbStar${n}">☆</span>
        `).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Comments <span style="color:var(--gray-400);font-size:.76rem">(optional)</span></label>
      <textarea class="form-control" id="hfbComment" rows="3" placeholder="What did you like? What could be improved?" style="resize:vertical"></textarea>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px">
      <button class="btn btn-ghost" onclick="closeModal('feedbackModal')">Skip</button>
      <button class="btn btn-primary" id="hfbSubmitBtn" onclick="submitHelpFeedback()"><i class="fas fa-paper-plane"></i> Submit Rating</button>
    </div>`;

  openModal('feedbackModal');
}

function setHelpFbRating(n) {
  if (window._helpFbState) window._helpFbState.rating = n;
  [1,2,3,4,5].forEach(i => {
    const el = document.getElementById('hfbStar' + i);
    if (el) el.textContent = i <= n ? '★' : '☆';
  });
}

async function submitHelpFeedback() {
  const state = window._helpFbState;
  if (!state) return;
  if (state.rating < 1) { toast('Please select a rating', 'error'); return; }

  const comment = document.getElementById('hfbComment')?.value.trim() || '';
  const btn = document.getElementById('hfbSubmitBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'; }

  const res = await api('/help_queue.php?action=rate', 'POST', {
    request_id: state.requestId,
    rating:     state.rating,
    comment,
  });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Rating'; }
  if (!res.success) { toast(res.error || 'Could not submit rating', 'error'); return; }

  closeModal('feedbackModal');
  window._helpFbState = null;
  const xp = res.data?.xp_awarded || 0;
  toast(`Feedback submitted! Tutor earned ${xp} XP. 🌟`, 'success');
  loadMyRequests();
}

/* ════════════════════════════════════════════════════════════════
   COMMUNITY QUIZZES — Tab loaders
   ════════════════════════════════════════════════════════════════ */

async function _loadCommunityQuizzes(container) {
  container.innerHTML = _quizLoadingHTML('Loading community quizzes…');
  const res = await api('/community_quiz.php?action=list');
  if (!res.success) {
    container.innerHTML = `<div class="error-card"><div class="error-card-icon">⚠️</div><p class="error-card-title">Could not load community quizzes</p><button class="btn btn-primary error-card-retry" onclick="_loadQuizTab('community')">Retry</button></div>`;
    return;
  }
  const quizzes = res.data || [];
  if (!quizzes.length) {
    container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--gray-500)">
      <i class="fas fa-dice-d6" style="font-size:2.5rem;margin-bottom:16px;display:block;color:var(--gray-300)"></i>
      <p style="font-weight:600;font-size:1rem;margin:0 0 8px">No community quizzes yet</p>
      <p style="font-size:.88rem;margin:0 0 20px">Be the first to create one!</p>
      <button class="quiz-create-btn" onclick="showCreateQuizModal()"><i class="fas fa-plus"></i> Create Quiz</button>
    </div>`;
    return;
  }
  const myId = state.user?.id;
  container.innerHTML = `<div class="cq-grid">${quizzes.map(q => _communityQuizCard(q, myId && q.creator_id == myId)).join('')}</div>`;
}

async function _loadMyQuizzes(container) {
  if (!state.user) {
    container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--gray-500)"><p>Please log in to see your quizzes.</p></div>`;
    return;
  }
  container.innerHTML = _quizLoadingHTML('Loading your quizzes…');
  const res = await api('/community_quiz.php?action=my');
  if (!res.success) {
    container.innerHTML = `<div class="error-card"><div class="error-card-icon">⚠️</div><p class="error-card-title">Could not load your quizzes</p><button class="btn btn-primary error-card-retry" onclick="_loadQuizTab('my')">Retry</button></div>`;
    return;
  }
  const quizzes = res.data || [];
  if (!quizzes.length) {
    container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--gray-500)">
      <i class="fas fa-bookmark" style="font-size:2.5rem;margin-bottom:16px;display:block;color:var(--gray-300)"></i>
      <p style="font-weight:600;font-size:1rem;margin:0 0 8px">No quizzes created yet</p>
      <p style="font-size:.88rem;margin:0 0 20px">Create your first quiz to get started</p>
      <button class="quiz-create-btn" onclick="showCreateQuizModal()"><i class="fas fa-plus"></i> Create Quiz</button>
    </div>`;
    return;
  }
  container.innerHTML = `<div class="cq-grid">${quizzes.map(q => _communityQuizCard(q, true)).join('')}</div>`;
}

function _communityQuizCard(q, isOwner) {
  const diffColors = { easy:'#16a34a', medium:'#d97706', hard:'#dc2626' };
  const diffBg     = { easy:'#dcfce7', medium:'#fef3c7', hard:'#fee2e2' };
  const diffLabel  = { easy:'Easy', medium:'Medium', hard:'Hard' };
  const creatorName = ((q.first_name||'') + ' ' + (q.last_name||'')).trim() || q.username || 'Unknown';
  const diff = q.difficulty || 'medium';
  return `
    <div class="cq-card">
      <div class="cq-card-top">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <h3 class="cq-card-title">${esc(q.title)}</h3>
          <span style="flex-shrink:0;font-size:.7rem;font-weight:700;color:${diffColors[diff]};background:${diffBg[diff]};padding:3px 9px;border-radius:20px;white-space:nowrap">${diffLabel[diff]}</span>
        </div>
        ${q.description ? `<p class="cq-card-desc">${esc(q.description)}</p>` : ''}
        <div class="cq-card-meta">
          ${(q.subject_name||q.subject_tag) ? `<span><i class="fas fa-tag"></i> ${esc(q.subject_name||q.subject_tag)}</span>` : ''}
          <span><i class="fas fa-circle-question"></i> ${q.question_count} question${q.question_count!=1?'s':''}</span>
          <span><i class="fas fa-gamepad"></i> ${q.play_count} play${q.play_count!=1?'s':''}</span>
        </div>
        ${!isOwner ? `<div class="cq-card-author"><i class="fas fa-user-circle"></i> ${esc(creatorName)}</div>` : ''}
      </div>
      <div class="cq-card-actions">
        <button class="cq-btn cq-btn-solo" onclick="playCommunityQuizSolo(${q.id})" title="Practice solo">
          <i class="fas fa-user"></i> Practice
        </button>
        <button class="cq-btn cq-btn-host" onclick="hostQuiz(${q.id})" title="Host a live game">
          <i class="fas fa-tower-broadcast"></i> Host Game
        </button>
        ${isOwner ? `
          <button class="cq-btn cq-btn-edit" onclick="editQuiz(${q.id})" title="Edit quiz">
            <i class="fas fa-pen"></i>
          </button>
          <button class="cq-btn cq-btn-delete" onclick="deleteCommunityQuiz(${q.id})" title="Delete quiz">
            <i class="fas fa-trash"></i>
          </button>` : ''}
      </div>
    </div>`;
}

/* ════════════════════════════════════════════════════════════════
   JOIN GAME
   ════════════════════════════════════════════════════════════════ */

function showJoinGameModal(prefillPin = '') {
  if (!state.user) { toast('Please log in to join a game', 'error'); return; }
  const body = document.getElementById('joinGameBody');
  if (body) {
    body.innerHTML = `
      <div class="form-group">
        <label class="form-label">Game PIN</label>
        <input type="text" id="joinGamePin" class="form-control"
          placeholder="Enter 6-character PIN" maxlength="6"
          style="font-size:1.4rem;letter-spacing:.2em;text-transform:uppercase;text-align:center;font-weight:700"
          oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')">
      </div>
      <div class="form-group">
        <label class="form-label">Nickname <span style="color:var(--gray-400);font-size:.8rem">(optional)</span></label>
        <input type="text" id="joinGameNickname" class="form-control"
          placeholder="Your display name in the game" maxlength="30">
      </div>`;
    if (prefillPin) {
      const pinEl = document.getElementById('joinGamePin');
      if (pinEl) pinEl.value = prefillPin.toUpperCase();
    }
  }
  const submitBtn = document.getElementById('joinGameBtn');
  if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-gamepad"></i> Join Game';
  openModal('joinGameModal');
  setTimeout(() => {
    const pinEl = document.getElementById('joinGamePin');
    if (pinEl) { pinEl.focus(); if (prefillPin) pinEl.setSelectionRange(pinEl.value.length, pinEl.value.length); }
  }, 150);
}

/* ── Open course/session cards in new tab on Ctrl/Cmd-click ── */
function _openCourse(e, id) {
  if (e.ctrlKey || e.metaKey || e.button === 1) {
    e.preventDefault();
    window.open(window.location.pathname + '#course/' + id, '_blank');
    return;
  }
  showCourseDetail(id);
}

function _openSession(e, id) {
  if (e.ctrlKey || e.metaKey || e.button === 1) {
    e.preventDefault();
    window.open(window.location.pathname + '#session/' + id, '_blank');
    return;
  }
  showSessionDetailById(id);
}

async function submitJoinGame() {
  const pin = (document.getElementById('joinGamePin')?.value || '').trim().toUpperCase();
  const nickname = (document.getElementById('joinGameNickname')?.value || '').trim();
  if (!pin || pin.length !== 6) { toast('Enter a valid 6-character PIN', 'error'); return; }
  const btn = document.getElementById('joinGameBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining…'; }
  const res = await api('/community_quiz.php?action=join', 'POST', { pin, nickname });
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-gamepad"></i> Join Game'; }
  if (!res.success) { toast(res.error || 'Could not join game', 'error'); return; }
  closeModal('joinGameModal');
  const { session_id, participant_id } = res.data;
  _showGameLobby(session_id, pin, false, participant_id);
}

/* ════════════════════════════════════════════════════════════════
   HOST GAME
   ════════════════════════════════════════════════════════════════ */

async function hostQuiz(quizId) {
  if (!state.user) { toast('Please log in to host a game', 'error'); return; }
  // Let the host choose to play along or only run the game
  _gameState = null;
  _stopGamePoll();
  const body = document.getElementById('gameLobbyBody');
  if (body) body.innerHTML = `
    <div style="text-align:center;padding:4px 0 8px">
      <h3 style="color:var(--navy);font-size:1.15rem;margin:0 0 6px">How do you want to host?</h3>
      <p style="color:var(--gray-500);font-size:.86rem;margin:0 0 18px">You'll control the game either way.</p>
      <div class="game-host-modes">
        <button class="game-host-mode" onclick="_createHostedGame(${parseInt(quizId)}, 'player')">
          <i class="fas fa-gamepad"></i>
          <strong>Play along</strong>
          <span>Answer questions and compete on the leaderboard</span>
        </button>
        <button class="game-host-mode" onclick="_createHostedGame(${parseInt(quizId)}, 'spectator')">
          <i class="fas fa-tv"></i>
          <strong>Spectate</strong>
          <span>Show questions and results, like a big screen</span>
        </button>
      </div>
    </div>`;
  openModal('gameLobbyModal');
}

async function _createHostedGame(quizId, hostMode) {
  const body = document.getElementById('gameLobbyBody');
  if (body) body.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--cyan)"></i></div>';
  const res = await api('/community_quiz.php?action=host', 'POST', { quiz_id: quizId, game_mode: 'classic', host_mode: hostMode });
  if (!res.success) { toast(res.error || 'Could not start game', 'error'); closeModal('gameLobbyModal'); return; }
  const { session_id, pin, participant_id } = res.data;
  _showGameLobby(session_id, pin, true, participant_id || null);
}

/* ════════════════════════════════════════════════════════════════
   LIVE GAME — Lobby & Play
   ════════════════════════════════════════════════════════════════ */

let _gameState = null;
let _gamePollTimer = null;
let _gameTickTimer = null;
const GAME_POLL_LOBBY_MS  = 2500;
const GAME_POLL_ACTIVE_MS = 1200;
const GAME_OPTION_COLORS  = { a: '#e21b3c', b: '#1368ce', c: '#d89e00', d: '#26890c' };
const GAME_OPTION_ICONS   = { a: 'fa-play', b: 'fa-diamond', c: 'fa-circle', d: 'fa-square' };

function _showGameLobby(sessionId, pin, isHost, participantId) {
  _gameState = { sessionId, pin, isHost, participantId, status: 'lobby', qId: null, revealed: false, offsetMs: 0 };
  openModal('gameLobbyModal');
  _fetchLobby();
  _startGamePoll();
}

async function _fetchLobby() {
  const body = document.getElementById('gameLobbyBody');
  if (!body || !_gameState) return;
  const { sessionId, pin, isHost } = _gameState;
  const res = await api('/community_quiz.php?action=lobby&session_id=' + sessionId);
  if (!_gameState || _gameState.sessionId !== sessionId) return;
  if (!res.success) {
    body.innerHTML = `<p style="color:var(--danger);text-align:center;padding:20px">${esc(res.error || 'Failed to load lobby')}</p>`;
    return;
  }
  const { session, quiz, players } = res.data;
  _gameState.status = session.status;
  _gameState.hostMode = session.host_mode || 'spectator';

  if (session.status === 'finished') {
    _stopGamePoll();
    closeModal('gameLobbyModal');
    toast('Game has ended');
    return;
  }
  if (session.status === 'active') {
    _startGamePoll();
    _fetchGameState();
    return;
  }

  const canStart = players.length >= 1;
  body.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <p style="color:var(--gray-500);font-size:.88rem;margin:0 0 6px">${esc(quiz?.title || 'Quiz')}</p>
      ${isHost ? `
        <div class="game-pin-box">
          <div class="game-pin-label">Game PIN</div>
          <div class="game-pin">${esc(pin)}</div>
        </div>
        <p style="color:var(--gray-400);font-size:.8rem;margin:6px 0 0">Share this PIN with players to join · You are ${_gameState.hostMode === 'player' ? 'playing along' : 'spectating'}</p>
      ` : `
        <div style="background:var(--gray-100);border-radius:10px;padding:12px 20px;display:inline-block;margin-top:6px">
          <p style="font-size:.9rem;color:var(--gray-600);margin:0"><i class="fas fa-hourglass-half" style="color:var(--primary,#4f46e5)"></i> Waiting for host to start…</p>
        </div>`}
    </div>
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:.82rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.05em">Players</span>
        <span style="font-size:.82rem;font-weight:700;color:var(--success)">${players.length} joined</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;min-height:36px">
        ${players.map((p, i) => `
          <div class="game-player-chip">
            <span class="game-player-num">${i + 1}</span>
            <span>${esc(p.nickname)}${parseInt(p.is_host) ? ' <small>(host)</small>' : ''}</span>
          </div>`).join('') || '<p style="color:var(--gray-400);font-size:.85rem;margin:4px 0">No players yet — share the PIN!</p>'}
      </div>
    </div>
    ${isHost ? `
      <div style="margin-top:24px;display:flex;flex-direction:column;align-items:center;gap:8px">
        <button class="btn btn-primary" style="padding:13px 36px;font-size:1rem;width:100%;max-width:260px" onclick="startHostedGame()" ${canStart ? '' : 'disabled'}>
          <i class="fas fa-play"></i> Start Game
        </button>
        ${!canStart ? '<p style="font-size:.78rem;color:var(--gray-400);margin:0">Waiting for at least one player</p>' : ''}
        <button class="btn btn-ghost btn-sm" style="font-size:.8rem;color:var(--danger);margin-top:4px" onclick="cancelHostedGame(${parseInt(sessionId)})">
          <i class="fas fa-times"></i> Cancel Game
        </button>
      </div>` : ''}`;
}

function _startGamePoll() {
  _stopGamePoll();
  const interval = _gameState && _gameState.status === 'active' ? GAME_POLL_ACTIVE_MS : GAME_POLL_LOBBY_MS;
  _gamePollTimer = setInterval(async () => {
    if (!_gameState) { _stopGamePoll(); return; }
    // Stop if the game modal was closed some other way
    const modal = document.getElementById('gameLobbyModal');
    if (!modal || modal.style.display === 'none') { _stopGamePoll(); return; }
    if (_gameState.polling) return;
    _gameState.polling = true;
    try {
      if (_gameState.status === 'lobby') await _fetchLobby();
      else if (_gameState.status === 'active') await _fetchGameState();
    } finally {
      if (_gameState) _gameState.polling = false;
    }
  }, interval);
}

function _stopGamePoll() {
  if (_gamePollTimer) { clearInterval(_gamePollTimer); _gamePollTimer = null; }
  if (_gameTickTimer) { clearInterval(_gameTickTimer); _gameTickTimer = null; }
}

async function startHostedGame() {
  if (!_gameState) return;
  const res = await api('/community_quiz.php?action=start_game', 'POST', { session_id: _gameState.sessionId });
  if (!res.success) { toast(res.error || 'Could not start game', 'error'); return; }
  _gameState.status = 'active';
  _startGamePoll();
  await _fetchGameState();
}

async function cancelHostedGame(sessionId) {
  if (!confirm('Cancel this game?')) return;
  await api('/community_quiz.php?action=finish_game', 'POST', { session_id: sessionId });
  _stopGamePoll();
  _gameState = null;
  closeModal('gameLobbyModal');
}

async function _endActiveGame() {
  if (!_gameState) return;
  if (!confirm('End the game for all players?')) return;
  const sessionId = _gameState.sessionId;
  await api('/community_quiz.php?action=finish_game', 'POST', { session_id: sessionId });
  _stopGamePoll();
  // Fetch final state and show leaderboard to host before closing
  const stateRes = await api('/community_quiz.php?action=game_state&session_id=' + sessionId);
  const body = document.getElementById('gameLobbyBody');
  if (body && stateRes.success && stateRes.data.leaderboard) {
    _renderGameResults(body, stateRes.data.leaderboard);
  } else {
    _gameState = null;
    closeModal('gameLobbyModal');
  }
}

function _leaveActiveGame() {
  if (!_gameState) return;
  if (!confirm('Leave this game?')) return;
  _stopGamePoll();
  _gameState = null;
  closeModal('gameLobbyModal');
}

async function _fetchGameState() {
  const body = document.getElementById('gameLobbyBody');
  if (!body || !_gameState) return;
  const { sessionId, participantId } = _gameState;
  const url = '/community_quiz.php?action=game_state&session_id=' + sessionId
    + (participantId ? '&participant_id=' + participantId : '');
  const sentAt = Date.now();
  const res = await api(url);
  if (!res.success || !_gameState || _gameState.sessionId !== sessionId) return;
  const gs = res.data;
  // Estimate the server clock offset (half the round trip) so every device shows the same countdown
  if (gs.server_now_ms) {
    const rtt = Date.now() - sentAt;
    _gameState.offsetMs = gs.server_now_ms + rtt / 2 - Date.now();
  }
  _gameState.status = gs.status;
  _gameState.hostMode = gs.host_mode || _gameState.hostMode;

  if (gs.status === 'finished') {
    _stopGamePoll();
    _renderGameResults(body, gs.leaderboard);
    return;
  }
  if (gs.status !== 'active' || !gs.question) return;

  _gameState.gs = gs;
  const qId = parseInt(gs.question.id);
  if (_gameState.qId !== qId) {
    // New question: full render and restart the countdown
    _gameState.qId = qId;
    _gameState.revealed = false;
    _gameState.pending = false;
    _gameState.qStartedMs = gs.q_started_ms;
    _gameState.limitMs = Math.max(5, parseInt(gs.question.time_limit) || 20) * 1000;
    _renderGameQuestion(body, gs);
    _startGameTick();
  } else {
    _updateGameQuestion(gs);
  }
}

/* Milliseconds since the current question started, on the server's clock */
function _gameElapsedMs() {
  if (!_gameState || !_gameState.qStartedMs) return 0;
  return Math.max(0, Date.now() + (_gameState.offsetMs || 0) - _gameState.qStartedMs);
}

function _startGameTick() {
  if (_gameTickTimer) clearInterval(_gameTickTimer);
  const tick = () => {
    if (!_gameState || !_gameState.limitMs) return;
    const left = Math.max(0, _gameState.limitMs - _gameElapsedMs());
    const num = document.getElementById('gameTimerNum');
    const bar = document.getElementById('gameTimerBar');
    if (num) num.textContent = Math.ceil(left / 1000);
    if (bar) bar.style.transform = `scaleX(${left / _gameState.limitMs})`;
    if (left <= 0) {
      clearInterval(_gameTickTimer); _gameTickTimer = null;
      // Time's up locally: lock the buttons and ask the server for the reveal
      document.querySelectorAll('#gameOptions .game-option').forEach(b => { b.disabled = true; });
      if (!_gameState.revealed) _fetchGameState();
    }
  };
  tick();
  _gameTickTimer = setInterval(tick, 200);
}

function _gameIsPlayer() {
  return !!(_gameState && _gameState.participantId);
}

function _renderGameQuestion(body, gs) {
  const q = gs.question;
  const isHost = _gameState?.isHost;
  const canAnswer = _gameIsPlayer() && !gs.has_answered && !gs.reveal;
  const opts = ['a', 'b', 'c', 'd'].filter(k => q['option_' + k]);

  body.innerHTML = `
    <div class="game-q-head">
      <span class="game-q-count">Question ${gs.current_q + 1} / ${gs.total_q}</span>
      <div style="display:flex;gap:6px;align-items:center">
        ${isHost
          ? `<button class="btn btn-ghost btn-sm" id="gameNextBtn" style="font-size:.78rem" onclick="_nextGameQuestion()"><i class="fas fa-forward"></i> ${gs.current_q + 1 >= gs.total_q ? 'Finish' : 'Next'}</button>
             <button class="btn btn-ghost btn-sm" style="font-size:.75rem;color:var(--danger)" onclick="_endActiveGame()"><i class="fas fa-stop-circle"></i> End</button>`
          : `<button class="btn btn-ghost btn-sm" style="font-size:.75rem;color:var(--danger)" onclick="_leaveActiveGame()"><i class="fas fa-sign-out-alt"></i> Leave</button>`}
      </div>
    </div>
    <div class="game-timer">
      <div class="game-timer-track"><div class="game-timer-bar" id="gameTimerBar"></div></div>
      <span class="game-timer-num" id="gameTimerNum">${Math.ceil(_gameState.limitMs / 1000)}</span>
    </div>
    <p class="game-q-text">${esc(q.question_text)}</p>
    <div class="game-options" id="gameOptions">
      ${opts.map(k => `
        <button class="game-option" data-key="${k}" style="background:${GAME_OPTION_COLORS[k]}"
          ${canAnswer ? `onclick="_submitGameAnswer('${k}')"` : 'disabled'}>
          <i class="fas ${GAME_OPTION_ICONS[k]}"></i>
          <span class="game-option-text">${esc(q['option_' + k])}</span>
          <span class="game-option-count" id="gameCount_${k}"></span>
        </button>`).join('')}
    </div>
    <div class="game-status" id="gameStatus"></div>
    <div id="gameStandings"></div>`;
  _updateGameQuestion(gs);
}

/* Update the parts of the question screen that change while it is on screen */
function _updateGameQuestion(gs) {
  if (!_gameState) return;
  const statusEl = document.getElementById('gameStatus');
  const mine = gs.my_answer;
  const isHost = _gameState.isHost;

  if (gs.has_answered || gs.reveal || !_gameIsPlayer()) {
    document.querySelectorAll('#gameOptions .game-option').forEach(b => { b.disabled = true; b.onclick = null; });
  }
  if (mine) {
    const picked = document.querySelector(`#gameOptions .game-option[data-key="${mine.answer}"]`);
    if (picked) picked.classList.add('picked');
  }

  if (gs.reveal) {
    _gameState.revealed = true;
    if (_gameTickTimer) { clearInterval(_gameTickTimer); _gameTickTimer = null; }
    const num = document.getElementById('gameTimerNum');
    const bar = document.getElementById('gameTimerBar');
    if (num) num.innerHTML = '<i class="fas fa-flag-checkered"></i>';
    if (bar) bar.style.transform = 'scaleX(0)';
    document.querySelectorAll('#gameOptions .game-option').forEach(b => {
      const k = b.dataset.key;
      b.classList.toggle('correct', k === gs.question.correct_answer);
      b.classList.toggle('wrong', k !== gs.question.correct_answer);
      const c = document.getElementById('gameCount_' + k);
      if (c && gs.option_counts) c.textContent = gs.option_counts[k] || 0;
    });
  }

  if (statusEl) {
    let html;
    if (gs.reveal && mine) {
      html = parseInt(mine.is_correct)
        ? `<div class="game-result good"><i class="fas fa-circle-check"></i> Correct! <strong>+${parseInt(mine.points).toLocaleString()}</strong> <small>${(parseInt(mine.time_taken_ms) / 1000).toFixed(1)}s</small></div>`
        : '<div class="game-result bad"><i class="fas fa-circle-xmark"></i> Not this time</div>';
    } else if (gs.reveal && _gameIsPlayer()) {
      html = '<div class="game-result bad"><i class="fas fa-clock"></i> Time\'s up — no answer</div>';
    } else if (mine) {
      html = '<p><i class="fas fa-check-circle" style="color:var(--success)"></i> Answer locked in — waiting for others…</p>';
    } else if (_gameIsPlayer()) {
      html = '<p>Answer fast — quicker correct answers score more points!</p>';
    } else {
      html = '<p><i class="fas fa-eye"></i> Spectating</p>';
    }
    if (isHost) {
      html += `<p class="game-answered">${gs.answered_count} / ${gs.player_count} answered${gs.reveal ? ' · click Next when ready' : ''}</p>`;
    }
    statusEl.innerHTML = html;
  }

  const stEl = document.getElementById('gameStandings');
  if (stEl) {
    const lb = gs.leaderboard || [];
    stEl.innerHTML = gs.reveal && lb.length ? `
      <div class="game-standings">
        <div class="game-standings-title">Leaderboard</div>
        ${lb.slice(0, 5).map((p, i) => `
          <div class="game-standing ${_gameState.participantId && parseInt(p.id) === parseInt(_gameState.participantId) ? 'me' : ''}">
            <span class="game-rank">${i + 1}</span>
            <span class="game-standing-name">${esc(p.nickname)}${parseInt(p.is_host) ? ' <small>(host)</small>' : ''}</span>
            <span class="game-standing-score">${(parseInt(p.score) || 0).toLocaleString()}</span>
          </div>`).join('')}
      </div>` : '';
  }
}

async function _submitGameAnswer(answer) {
  if (!_gameState?.participantId || _gameState.pending || _gameState.revealed) return;
  const gs = _gameState.gs;
  if (!gs || !gs.question) return;
  _gameState.pending = true;
  const elapsed = Math.round(_gameElapsedMs());
  // Lock the buttons right away so a double tap can't send twice
  document.querySelectorAll('#gameOptions .game-option').forEach(b => { b.disabled = true; });
  document.querySelector(`#gameOptions .game-option[data-key="${answer}"]`)?.classList.add('picked');

  const res = await api('/community_quiz.php?action=answer', 'POST', {
    session_id:     _gameState.sessionId,
    participant_id: _gameState.participantId,
    question_id:    gs.question.id,
    answer,
    time_taken_ms:  elapsed,
  });
  if (!_gameState) return;
  _gameState.pending = false;
  if (!res.success) { toast(res.error || 'Could not submit answer', 'error'); }
  await _fetchGameState();
}

async function _nextGameQuestion() {
  if (!_gameState) return;
  const btn = document.getElementById('gameNextBtn');
  if (btn) btn.disabled = true;
  const res = await api('/community_quiz.php?action=next_question', 'POST', { session_id: _gameState.sessionId });
  if (btn) btn.disabled = false;
  if (!res.success) { toast(res.error || 'Failed', 'error'); return; }
  if (res.data.finished) {
    _stopGamePoll();
    const stateRes = await api('/community_quiz.php?action=game_state&session_id=' + _gameState.sessionId);
    const body = document.getElementById('gameLobbyBody');
    if (body && stateRes.success) _renderGameResults(body, stateRes.data.leaderboard);
  } else {
    await _fetchGameState();
  }
}

function _renderGameResults(body, leaderboard) {
  _stopGamePoll();
  const ranked = leaderboard || [];
  const medals = ['🥇','🥈','🥉'];
  const myId = _gameState && _gameState.participantId ? parseInt(_gameState.participantId) : null;
  body.innerHTML = `
    <div style="text-align:center;padding:8px 0 20px">
      <div style="font-size:3rem;line-height:1;margin-bottom:8px">🏆</div>
      <h3 style="color:var(--navy);font-size:1.2rem;margin:0 0 4px">Game Over!</h3>
      <p style="color:var(--gray-500);font-size:.85rem;margin:0">Final Leaderboard</p>
    </div>
    <div>
      ${ranked.length ? ranked.map((p, i) => `
        <div class="game-final-row ${i === 0 ? 'first' : ''} ${myId === parseInt(p.id) ? 'me' : ''}">
          <span class="game-final-medal ${i >= 3 ? 'plain' : ''}">${medals[i] || i + 1}</span>
          <span class="game-standing-name">${esc(p.nickname)}${parseInt(p.is_host) ? ' <small>(host)</small>' : ''}</span>
          <div style="text-align:right;flex-shrink:0">
            <div class="game-standing-score" style="font-size:1rem">${(parseInt(p.score) || 0).toLocaleString()}</div>
            <div style="font-size:.72rem;color:var(--gray-400)">${parseInt(p.correct) || 0}/${parseInt(p.total) || 0} correct</div>
          </div>
        </div>`).join('')
        : '<p style="text-align:center;color:var(--gray-400);padding:20px">No results yet</p>'}
    </div>
    <div style="text-align:center;margin-top:20px">
      <button class="btn btn-primary" style="padding:11px 32px" onclick="_stopGamePoll();_gameState=null;closeModal('gameLobbyModal')">
        <i class="fas fa-check"></i> Done
      </button>
    </div>`;
}

/* ════════════════════════════════════════════════════════════════
   CREATE / EDIT QUIZ
   ════════════════════════════════════════════════════════════════ */

let _editingQuizId = null;
let _quizQuestions = [];

function showCreateQuizModal() {
  if (!state.user) { toast('Please log in to create a quiz', 'error'); return; }
  _editingQuizId = null;
  _quizQuestions = [{ id: Date.now() }, { id: Date.now() + 1 }];
  _renderCreateQuizForm('Create Quiz', null);
  const submitBtn = document.getElementById('createQuizSubmitBtn');
  if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check"></i> Create Quiz';
  openModal('createQuizModal');
}

async function editQuiz(quizId) {
  if (!state.user) return;
  toast('Loading quiz…', 'info');
  const res = await api('/community_quiz.php?action=get&id=' + quizId);
  if (!res.success) { toast(res.error || 'Failed to load quiz', 'error'); return; }
  const { quiz, questions } = res.data;
  _editingQuizId = quizId;
  _quizQuestions = questions.map(q => ({ ...q }));
  _renderCreateQuizForm('Edit Quiz', quiz);
  const submitBtn = document.getElementById('createQuizSubmitBtn');
  if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check"></i> Save Changes';
  openModal('createQuizModal');
}

function _renderCreateQuizForm(title, quiz) {
  const header = document.getElementById('createQuizModalTitle');
  if (header) header.textContent = title;
  const body = document.getElementById('createQuizBody');
  if (!body) return;
  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Title <span style="color:var(--danger)">*</span></label>
      <input type="text" id="cqTitle" class="form-control" placeholder="e.g. Biology Chapter 3" maxlength="120" value="${esc(quiz?.title||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea id="cqDesc" class="form-control" rows="2" placeholder="Brief description (optional)" maxlength="500">${esc(quiz?.description||'')}</textarea>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Subject Tag</label>
        <input type="text" id="cqSubjectTag" class="form-control" placeholder="e.g. Biology" maxlength="40" value="${esc(quiz?.subject_tag||quiz?.subject_name||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">Difficulty</label>
        <select id="cqDifficulty" class="form-control">
          <option value="easy" ${(quiz?.difficulty||'medium')==='easy'?'selected':''}>Easy</option>
          <option value="medium" ${(quiz?.difficulty||'medium')==='medium'?'selected':''}>Medium</option>
          <option value="hard" ${(quiz?.difficulty||'medium')==='hard'?'selected':''}>Hard</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Visibility</label>
        <select id="cqPublic" class="form-control">
          <option value="1" ${quiz?.is_public!=0?'selected':''}>Public</option>
          <option value="0" ${quiz?.is_public==0?'selected':''}>Private</option>
        </select>
      </div>
    </div>
    <div style="border-top:1px solid var(--gray-100);margin:16px 0 12px;padding-top:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:.9rem;font-weight:700;color:var(--navy)">Questions <span style="color:var(--gray-400);font-weight:400;font-size:.82rem">(min 2)</span></div>
        <button type="button" class="btn btn-ghost btn-sm" style="font-size:.8rem" onclick="_addQuizQuestion()">
          <i class="fas fa-plus"></i> Add Question
        </button>
      </div>
      <div id="cqQuestionsContainer">
        ${_quizQuestions.map((q, i) => _renderQuizQuestionRow(q, i)).join('')}
      </div>
    </div>`;
}

function _renderQuizQuestionRow(q, idx) {
  const uid = q.id;
  return `
    <div class="cq-question-row" id="cqq-${uid}" style="border:1px solid var(--gray-150,#e5e7eb);border-radius:10px;padding:14px;margin-bottom:10px;background:var(--gray-50,#f9fafb)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span class="cq-q-label" style="font-size:.8rem;font-weight:700;color:var(--primary,#4f46e5)">Q${idx+1}</span>
        <button type="button" onclick="_removeQuizQuestion(${uid})" style="border:none;background:none;cursor:pointer;color:var(--gray-400);font-size:.95rem;padding:2px 6px" title="Remove question">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
      <div class="form-group" style="margin-bottom:8px">
        <input type="text" class="form-control cq-qtext" placeholder="Question text *" maxlength="500" value="${esc(q.question_text||'')}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        ${['a','b','c','d'].map(opt => `
          <div style="display:flex;align-items:center;gap:6px">
            <input type="radio" name="cqCorrect_${uid}" value="${opt}" ${q.correct_answer===opt?'checked':''} title="Correct answer" style="cursor:pointer;flex-shrink:0;accent-color:var(--primary,#4f46e5)">
            <input type="text" class="form-control cq-opt-${opt}" placeholder="Option ${opt.toUpperCase()}${opt==='a'||opt==='b'?' *':''}" maxlength="200" value="${esc(q['option_'+opt]||'')}" style="font-size:.82rem;padding:6px 10px">
          </div>`).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:.78rem;color:var(--gray-400)">Time:</span>
        <select class="form-control cq-timelimit" style="max-width:90px;padding:4px 8px;font-size:.8rem">
          ${[10,15,20,30,45,60].map(t => `<option value="${t}" ${(q.time_limit||20)==t?'selected':''}>${t}s</option>`).join('')}
        </select>
        <span style="font-size:.74rem;color:var(--gray-400)">Radio = correct answer</span>
      </div>
    </div>`;
}

function _addQuizQuestion() {
  const newQ = { id: Date.now() };
  _quizQuestions.push(newQ);
  const container = document.getElementById('cqQuestionsContainer');
  if (!container) return;
  const idx = container.querySelectorAll('.cq-question-row').length;
  const div = document.createElement('div');
  div.innerHTML = _renderQuizQuestionRow(newQ, idx);
  container.appendChild(div.firstElementChild);
  container.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function _removeQuizQuestion(uid) {
  const rows = document.querySelectorAll('.cq-question-row');
  if (rows.length <= 2) { toast('At least 2 questions required', 'error'); return; }
  document.getElementById('cqq-' + uid)?.remove();
  _quizQuestions = _quizQuestions.filter(q => q.id !== uid);
  document.querySelectorAll('.cq-question-row').forEach((row, i) => {
    const label = row.querySelector('.cq-q-label');
    if (label) label.textContent = 'Q' + (i + 1);
  });
}

async function submitCreateQuiz() {
  const title = document.getElementById('cqTitle')?.value.trim();
  if (!title) { toast('Title is required', 'error'); return; }

  const questions = [];
  let valid = true;
  document.querySelectorAll('.cq-question-row').forEach((row, i) => {
    if (!valid) return;
    const qText   = row.querySelector('.cq-qtext')?.value.trim();
    const optA    = row.querySelector('.cq-opt-a')?.value.trim();
    const optB    = row.querySelector('.cq-opt-b')?.value.trim();
    const optC    = row.querySelector('.cq-opt-c')?.value.trim();
    const optD    = row.querySelector('.cq-opt-d')?.value.trim();
    const correct = row.querySelector('input[type=radio]:checked')?.value;
    const tLimit  = parseInt(row.querySelector('.cq-timelimit')?.value || '20');

    if (!qText) { toast(`Question ${i+1}: text is required`, 'error'); valid = false; return; }
    if (!optA || !optB) { toast(`Question ${i+1}: options A and B are required`, 'error'); valid = false; return; }
    if (!correct) { toast(`Question ${i+1}: select the correct answer (radio button)`, 'error'); valid = false; return; }

    questions.push({ question_text: qText, option_a: optA, option_b: optB, option_c: optC||'', option_d: optD||'', correct_answer: correct, time_limit: tLimit });
  });

  if (!valid) return;
  if (questions.length < 2) { toast('At least 2 questions required', 'error'); return; }

  const data = {
    title,
    description: document.getElementById('cqDesc')?.value.trim() || '',
    subject_tag: document.getElementById('cqSubjectTag')?.value.trim() || '',
    difficulty:  document.getElementById('cqDifficulty')?.value || 'medium',
    is_public:   parseInt(document.getElementById('cqPublic')?.value || '1'),
    questions,
  };
  if (_editingQuizId) data.quiz_id = _editingQuizId;

  const btn = document.getElementById('createQuizSubmitBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }

  const res = await api('/community_quiz.php?action=create', 'POST', data);

  if (btn) { btn.disabled = false; btn.innerHTML = _editingQuizId ? '<i class="fas fa-check"></i> Save Changes' : '<i class="fas fa-check"></i> Create Quiz'; }
  if (!res.success) { toast(res.error || 'Could not save quiz', 'error'); return; }

  closeModal('createQuizModal');
  toast(_editingQuizId ? 'Quiz updated!' : 'Quiz created! 🎉', 'success');
  _editingQuizId = null;
  _quizQuestions = [];
  _switchQuizTab('my');
}

async function deleteCommunityQuiz(quizId) {
  if (!confirm('Delete this quiz? This cannot be undone.')) return;
  const res = await api('/community_quiz.php?action=delete', 'POST', { quiz_id: quizId });
  if (!res.success) { toast(res.error || 'Could not delete quiz', 'error'); return; }
  toast('Quiz deleted');
  _switchQuizTab('my');
}

/* ════════════════════════════════════════════════════════════════
   SOLO PRACTICE — play a community quiz individually
   ════════════════════════════════════════════════════════════════ */

let _soloState = null;

async function playCommunityQuizSolo(quizId) {
  const pg = document.getElementById('page-quizzes');
  if (!pg) return;
  pg.innerHTML = _quizLoadingHTML('Loading quiz…');
  const res = await api('/community_quiz.php?action=get&id=' + quizId + '&play=1');
  if (!res.success) {
    pg.innerHTML = `<div class="error-card"><div class="error-card-icon">⚠️</div><p class="error-card-title">Could not load quiz</p><button class="btn btn-primary error-card-retry" onclick="(function(){_quizTab='community';renderQuizzes();})()">Back</button></div>`;
    return;
  }
  const { quiz, questions } = res.data;
  _soloState = {
    quiz,
    questions,
    current: 0,
    answers: {},   // index -> chosen key
    correct: {},   // index -> correct key
    startTime: Date.now(),
    questionStart: Date.now(),
  };
  _renderSoloQuestion(pg);
}

function _renderSoloQuestion(pg) {
  if (!pg) pg = document.getElementById('page-quizzes');
  const { quiz, questions, current, answers } = _soloState;
  const total = questions.length;
  const q = questions[current];
  const progress = Math.round(((current) / total) * 100);
  const chosen = answers[current];
  const opts = [
    { key: 'a', text: q.option_a, color: '#4f46e5' },
    { key: 'b', text: q.option_b, color: '#0891b2' },
    { key: 'c', text: q.option_c, color: '#059669' },
    { key: 'd', text: q.option_d, color: '#d97706' },
  ].filter(o => o.text);

  _soloState.questionStart = Date.now();

  pg.innerHTML = `
    <div class="quiz-runner" style="max-width:640px;margin:0 auto;padding:0 16px 40px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-top:8px">
        <button class="btn btn-ghost btn-sm" onclick="_soloAbort()"><i class="fas fa-arrow-left"></i></button>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--gray-400);margin-bottom:4px;font-weight:600">
            <span>${esc(quiz.title)}</span>
            <span>${current + 1} / ${total}</span>
          </div>
          <div style="height:6px;background:var(--gray-100);border-radius:4px;overflow:hidden">
            <div style="height:6px;background:var(--primary,#4f46e5);border-radius:4px;transition:width .3s;width:${progress}%"></div>
          </div>
        </div>
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px 22px;margin-bottom:16px">
        <p style="font-size:1.05rem;font-weight:700;color:var(--navy);margin:0;line-height:1.5">${esc(q.question_text)}</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${opts.map(o => {
          let bg = o.color, opacity = '1', cursor = 'pointer', extraStyle = '';
          if (chosen) {
            if (o.key === q.correct_answer) { bg = '#16a34a'; extraStyle = 'box-shadow:0 0 0 3px #16a34a40'; }
            else if (o.key === chosen && chosen !== q.correct_answer) { bg = '#dc2626'; }
            else { opacity = '.45'; }
            cursor = 'default';
          }
          return `<button style="background:${bg};color:#fff;padding:15px 12px;font-size:.9rem;font-weight:600;border:none;border-radius:12px;cursor:${cursor};opacity:${opacity};text-align:center;line-height:1.3;transition:opacity .2s,transform .1s;${extraStyle}"
            onclick="${chosen ? '' : `_soloAnswer('${o.key}')`}"
            ${chosen ? 'disabled' : ''}>
            ${esc(o.text)}
          </button>`;
        }).join('')}
      </div>

      ${chosen ? `
        <div style="margin-top:16px;background:${chosen===q.correct_answer?'#f0fdf4':'#fef2f2'};border:1px solid ${chosen===q.correct_answer?'#bbf7d0':'#fecaca'};border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px">
          <span style="font-size:.9rem;font-weight:600;color:${chosen===q.correct_answer?'#16a34a':'#dc2626'}">
            <i class="fas fa-${chosen===q.correct_answer?'check-circle':'times-circle'}"></i>
            ${chosen===q.correct_answer ? 'Correct!' : `Wrong — correct: <strong>${q['option_'+q.correct_answer]}</strong>`}
          </span>
          <button class="btn btn-primary btn-sm" style="flex-shrink:0" onclick="${current+1 < total ? '_soloNext()' : '_soloFinish()'}">
            ${current+1 < total ? 'Next <i class="fas fa-arrow-right"></i>' : 'See Results <i class="fas fa-flag-checkered"></i>'}
          </button>
        </div>` : ''}
    </div>`;
}

function _soloAnswer(key) {
  if (!_soloState) return;
  const { current, questions } = _soloState;
  _soloState.answers[current] = key;
  _soloState.correct[current] = questions[current].correct_answer;
  const pg = document.getElementById('page-quizzes');
  _renderSoloQuestion(pg);
}

function _soloNext() {
  if (!_soloState) return;
  _soloState.current++;
  _renderSoloQuestion();
}

function _soloAbort() {
  _soloState = null;
  _quizTab = 'community';
  renderQuizzes();
}

function _soloFinish() {
  if (!_soloState) return;
  const pg = document.getElementById('page-quizzes');
  const { quiz, questions, answers, correct } = _soloState;
  const total = questions.length;
  let correctCount = 0;
  questions.forEach((q, i) => { if (answers[i] === q.correct_answer) correctCount++; });
  const pct = Math.round((correctCount / total) * 100);
  const grade = pct >= 90 ? { label: 'Excellent!', color: '#16a34a', icon: '🌟' }
              : pct >= 70 ? { label: 'Good job!',  color: '#0891b2', icon: '👍' }
              : pct >= 50 ? { label: 'Keep going!', color: '#d97706', icon: '📚' }
              :             { label: 'Keep practicing', color: '#dc2626', icon: '💪' };

  pg.innerHTML = `
    <div style="max-width:560px;margin:0 auto;padding:16px 16px 40px">
      <div style="text-align:center;padding:24px 0 28px">
        <div style="font-size:3.5rem;line-height:1;margin-bottom:12px">${grade.icon}</div>
        <h2 style="color:var(--navy);margin:0 0 4px;font-size:1.4rem">${grade.label}</h2>
        <p style="color:var(--gray-500);margin:0;font-size:.9rem">${esc(quiz.title)}</p>
        <div style="margin:20px auto;width:110px;height:110px;position:relative">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="48" fill="none" stroke="var(--gray-100)" stroke-width="10"/>
            <circle cx="55" cy="55" r="48" fill="none" stroke="${grade.color}" stroke-width="10"
              stroke-dasharray="${Math.round(2*Math.PI*48*pct/100)} ${Math.round(2*Math.PI*48*(100-pct)/100)}"
              stroke-dashoffset="${Math.round(2*Math.PI*48*0.25)}"
              stroke-linecap="round" transform="rotate(-90 55 55)"/>
          </svg>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center">
            <div style="font-size:1.5rem;font-weight:900;color:${grade.color}">${pct}%</div>
            <div style="font-size:.7rem;color:var(--gray-400);font-weight:600">${correctCount}/${total}</div>
          </div>
        </div>
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:20px">
        ${questions.map((q, i) => {
          const chosen = answers[i];
          const isOk = chosen === q.correct_answer;
          return `
            <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:10px">
              <span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:${isOk?'#dcfce7':'#fee2e2'};display:flex;align-items:center;justify-content:center;margin-top:1px">
                <i class="fas fa-${isOk?'check':'times'}" style="font-size:.6rem;color:${isOk?'#16a34a':'#dc2626'}"></i>
              </span>
              <div style="flex:1;min-width:0">
                <p style="font-size:.85rem;font-weight:600;color:var(--navy);margin:0 0 3px;line-height:1.4">${esc(q.question_text)}</p>
                ${!isOk && chosen ? `<p style="font-size:.78rem;color:var(--gray-500);margin:0">Your answer: <span style="color:#dc2626">${esc(q['option_'+chosen]||chosen)}</span> · Correct: <span style="color:#16a34a;font-weight:600">${esc(q['option_'+q.correct_answer])}</span></p>` : ''}
                ${isOk ? `<p style="font-size:.78rem;color:#16a34a;margin:0;font-weight:500">${esc(q['option_'+q.correct_answer])}</p>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>

      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-ghost" onclick="(function(){_soloState=null;_quizTab='community';renderQuizzes();})()"><i class="fas fa-arrow-left"></i> Back</button>
        <button class="btn btn-primary" onclick="playCommunityQuizSolo(${quiz.id})"><i class="fas fa-redo"></i> Try Again</button>
      </div>
    </div>`;
  _soloState = null;
}

/* ── Notifications Page ─────────────────────────────────────── */
let _notifPageOffset = 0;
const _NOTIF_PAGE_SIZE = 30;

async function renderNotifications() {
  const pg = document.getElementById('page-notifications');
  if (!pg) return;

  _notifPageOffset = 0;

  pg.innerHTML = `
    <div style="padding:24px 20px;max-width:640px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:22px">
        <div>
          <h1 style="font-size:1.4rem;font-weight:800;color:var(--navy)"><i class="fas fa-bell" style="color:var(--cyan);margin-right:8px"></i>Notifications</h1>
          <p style="font-size:.83rem;color:var(--gray-400)">All your activity and updates</p>
        </div>
        <button class="btn btn-ghost" onclick="_markAllReadAndRefresh()"><i class="fas fa-check-double"></i> Mark all read</button>
      </div>
      <div id="notifPageList">${skeletons(6, 64)}</div>
      <div id="notifPageLoadMore" style="text-align:center;margin-top:20px;display:none">
        <button class="btn btn-ghost" onclick="_loadMoreNotifications()"><i class="fas fa-chevron-down"></i> Load more</button>
      </div>
    </div>`;

  await _loadNotificationsPage(true);

  // Mark all as read silently after viewing
  api('/notifications.php?action=mark_all_read', 'POST').then(() => {
    const dot = document.getElementById('notifDot');
    if (dot) dot.style.display = 'none';
  });
}

async function _loadNotificationsPage(reset = false) {
  const list = document.getElementById('notifPageList');
  if (!list) return;

  if (reset) {
    _notifPageOffset = 0;
    list.innerHTML = skeletons(6, 64);
  }

  const res   = await api('/notifications.php?action=list&limit=' + (_NOTIF_PAGE_SIZE + 1) + '&offset=' + _notifPageOffset);
  const items = (res.success && res.data?.notifications) ? res.data.notifications : [];
  const hasMore = items.length > _NOTIF_PAGE_SIZE;
  const page    = items.slice(0, _NOTIF_PAGE_SIZE);

  if (reset) list.innerHTML = '';

  if (!page.length && reset) {
    list.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--gray-400)">
      <i class="fas fa-bell-slash" style="font-size:2.5rem;display:block;margin-bottom:14px"></i>
      <p style="font-weight:600;color:var(--navy);margin-bottom:4px">No notifications yet</p>
      <p style="font-size:.84rem">You'll see connection requests, session updates, and more here.</p>
    </div>`;
    return;
  }

  page.forEach(n => {
    const el = document.createElement('div');
    el.innerHTML = _notifPageItemHtml(n);
    list.appendChild(el.firstElementChild);
  });

  _notifPageOffset += page.length;
  const loadMoreBtn = document.getElementById('notifPageLoadMore');
  if (loadMoreBtn) loadMoreBtn.style.display = hasMore ? '' : 'none';
}

async function _loadMoreNotifications() {
  await _loadNotificationsPage(false);
}

async function _markAllReadAndRefresh() {
  await api('/notifications.php?action=mark_all_read', 'POST');
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = 'none';
  document.querySelectorAll('#notifPageList .notif-page-item.unread').forEach(el => el.classList.remove('unread'));
  toast('All notifications marked as read.');
}

function _notifPageItemHtml(n) {
  const actor   = ((n.first_name || '') + (n.last_name ? ' ' + n.last_name : '')).trim() || n.username || 'Someone';
  const timeStr = _timeAgo(n.created_at);
  const icon    = _notifTypeIcon(n.type);
  const unread  = !parseInt(n.is_read);
  return `
    <div class="notif-page-item${unread ? ' unread' : ''}" onclick="_readNotifPage(${n.id},'${esc(n.type)}',${n.reference_id || 0})" style="display:flex;align-items:flex-start;gap:14px;padding:14px 16px;border-radius:12px;cursor:pointer;background:${unread ? 'var(--gray-100)' : 'transparent'};border:1px solid ${unread ? 'var(--gray-200)' : 'var(--gray-100)'};margin-bottom:8px;transition:background .15s">
      <div style="flex-shrink:0;width:38px;height:38px;border-radius:50%;background:var(--gray-100);display:flex;align-items:center;justify-content:center;font-size:1.2rem">${icon}</div>
      <div style="flex:1;min-width:0">
        <p style="margin:0;font-size:.875rem;line-height:1.45;color:var(--navy);font-weight:${unread ? '600' : '400'}">${esc(n.content || actor + ' sent a notification')}</p>
        <p style="font-size:.75rem;color:var(--gray-400);margin:3px 0 0">${timeStr}</p>
      </div>
      ${unread ? '<div style="flex-shrink:0;width:8px;height:8px;border-radius:50%;background:var(--cyan);margin-top:6px"></div>' : ''}
    </div>`;
}

function _readNotifPage(id, type, refId) {
  api('/notifications.php?action=mark_read', 'POST', { id });
  if (type === 'message')   navigate('messages');
  else if (type === 'connection') navigate('network');
  else if (type === 'session' || type === 'course') navigate(state.user?.role === 'active_teacher' ? 'teacher' : 'courses');
  else navigate('dashboard');
}

/* ══════════════════════════════════════════════════════════════
   POMODORO TIMER — Interactive tomato-shaped focus timer
   ══════════════════════════════════════════════════════════════ */

const _pomo = {
  duration:      25 * 60,
  shortBreak:    5 * 60,
  longBreak:     15 * 60,
  remaining:     25 * 60,
  mode:          'work',       // 'work' | 'shortBreak' | 'longBreak'
  running:       false,
  interval:      null,
  completed:     0,
  totalFocus:    0,
  todayFocus:    0,
  todayCompleted:0,
  todayDate:     null,
  history:       [],
};

function _pomoLoad() {
  try {
    const d = JSON.parse(localStorage.getItem('learnora_pomo') || '{}');
    const today = new Date().toDateString();
    if (d.todayDate === today) {
      _pomo.todayFocus     = d.todayFocus || 0;
      _pomo.todayCompleted = d.todayCompleted || 0;
      _pomo.completed      = d.completed || 0;
    } else {
      _pomo.todayFocus     = 0;
      _pomo.todayCompleted = 0;
      _pomo.completed      = d.completed || 0;
    }
    _pomo.todayDate  = today;
    _pomo.totalFocus = d.totalFocus || 0;
    _pomo.history    = d.history || [];
    if (d.duration)   _pomo.duration   = d.duration;
    if (d.shortBreak) _pomo.shortBreak = d.shortBreak;
    if (d.longBreak)  _pomo.longBreak  = d.longBreak;
  } catch(e) {}
}

function _pomoSave() {
  _pomo.todayDate = new Date().toDateString();
  localStorage.setItem('learnora_pomo', JSON.stringify({
    todayFocus:     _pomo.todayFocus,
    todayCompleted: _pomo.todayCompleted,
    completed:      _pomo.completed,
    totalFocus:     _pomo.totalFocus,
    todayDate:      _pomo.todayDate,
    history:        _pomo.history.slice(-30),
    duration:       _pomo.duration,
    shortBreak:     _pomo.shortBreak,
    longBreak:      _pomo.longBreak,
  }));
}

function _pomoFmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function _pomoFmtMins(s) {
  const m = Math.floor(s / 60);
  return m + ' min' + (m !== 1 ? 's' : '');
}

function _pomoGetTotal() {
  return _pomo.mode === 'work' ? _pomo.duration
       : _pomo.mode === 'shortBreak' ? _pomo.shortBreak
       : _pomo.longBreak;
}

function _pomoUpdateUI() {
  const timeEl    = document.getElementById('pomoTime');
  const labelEl   = document.getElementById('pomoModeLabel');
  const startBtn  = document.getElementById('pomoStartBtn');
  const fillEl    = document.getElementById('pomoTomatoFill');
  const countEl   = document.getElementById('pomoCount');
  const focusEl   = document.getElementById('pomoTodayFocus');
  const totalEl   = document.getElementById('pomoTotalFocus');
  const dotsEl    = document.getElementById('pomoDots');
  const bodyEl    = document.getElementById('pomoTomatoBody');

  if (!timeEl) return;

  timeEl.textContent = _pomoFmtTime(_pomo.remaining);

  // Update page title with timer when running
  if (_pomo.running) {
    document.title = _pomoFmtTime(_pomo.remaining) + ' — ' + (_pomo.mode === 'work' ? 'Focus' : 'Break') + ' | Learnora';
  } else if (state.page === 'pomodoro') {
    document.title = 'Pomodoro Timer — Learnora';
  }

  const modeLabels = { work: 'Focus Time', shortBreak: 'Short Break', longBreak: 'Long Break' };
  labelEl.textContent = modeLabels[_pomo.mode];

  startBtn.innerHTML = _pomo.running
    ? '<i class="fas fa-pause"></i> Pause'
    : '<i class="fas fa-play"></i> Start';
  startBtn.className = 'pomo-btn pomo-btn-primary' + (_pomo.running ? ' pomo-btn-active' : '');

  // Tomato fill level (drains from top as time passes, fill stays at bottom)
  const total = _pomoGetTotal();
  const pct = total > 0 ? (_pomo.remaining / total) : 0;
  if (fillEl) {
    const fullH = 160, topY = 50;
    const h = Math.round(fullH * pct);
    const y = topY + (fullH - h);
    fillEl.setAttribute('height', h);
    fillEl.setAttribute('y', y);
  }

  // Color the tomato body based on mode
  if (bodyEl) {
    bodyEl.setAttribute('data-mode', _pomo.mode);
  }

  // Stats
  if (countEl) countEl.textContent = _pomo.todayCompleted;
  if (focusEl) focusEl.textContent = _pomoFmtMins(_pomo.todayFocus);
  if (totalEl) totalEl.textContent = _pomoFmtMins(_pomo.totalFocus);

  // Session dots (4 per cycle)
  if (dotsEl) {
    let dots = '';
    for (let i = 0; i < 4; i++) {
      const filled = i < (_pomo.completed % 4);
      dots += `<span class="pomo-dot${filled ? ' filled' : ''}"></span>`;
    }
    dotsEl.innerHTML = dots;
  }

  // Pulse animation when running
  const tomatoEl = document.getElementById('pomoTomato');
  if (tomatoEl) {
    tomatoEl.classList.toggle('pomo-breathing', _pomo.running);
  }

  // Update active tab
  document.querySelectorAll('.pomo-tab').forEach(t => t.classList.remove('active'));
  const modeMap = { work: 0, shortBreak: 1, longBreak: 2 };
  const tabs = document.querySelectorAll('.pomo-tab');
  if (tabs[modeMap[_pomo.mode]]) tabs[modeMap[_pomo.mode]].classList.add('active');
}

function _pomoTick() {
  if (_pomo.remaining <= 0) {
    _pomoComplete();
    return;
  }
  _pomo.remaining--;
  if (_pomo.mode === 'work') {
    _pomo.todayFocus++;
    _pomo.totalFocus++;
  }
  _pomoUpdateUI();
  // Auto-save every 30 seconds
  if (_pomo.remaining % 30 === 0) _pomoSave();
}

function _pomoStart() {
  if (_pomo.running) {
    // Pause
    clearInterval(_pomo.interval);
    _pomo.interval = null;
    _pomo.running = false;
    document.title = 'Learnora — Your Path to Interactive Learning';
    _pomoSave();
  } else {
    // Start
    _pomo.running = true;
    _pomo.interval = setInterval(_pomoTick, 1000);
  }
  _pomoUpdateUI();
}

function _pomoReset() {
  clearInterval(_pomo.interval);
  _pomo.interval = null;
  _pomo.running = false;
  _pomo.remaining = _pomoGetTotal();
  document.title = 'Learnora — Your Path to Interactive Learning';
  _pomoUpdateUI();
}

function _pomoSkip() {
  clearInterval(_pomo.interval);
  _pomo.interval = null;
  _pomo.running = false;

  if (_pomo.mode === 'work') {
    // Skip to break without counting completion
    const every4 = (_pomo.completed + 1) % 4 === 0;
    _pomo.mode = every4 ? 'longBreak' : 'shortBreak';
  } else {
    _pomo.mode = 'work';
  }
  _pomo.remaining = _pomoGetTotal();
  _pomoUpdateUI();
  _pomoSave();
}

function _pomoComplete() {
  clearInterval(_pomo.interval);
  _pomo.interval = null;
  _pomo.running = false;
  document.title = 'Learnora — Your Path to Interactive Learning';

  // Play notification sound
  _pomoPlaySound();

  const wasWork = _pomo.mode === 'work';
  const modeForApi = _pomo.mode === 'shortBreak' ? 'short_break'
                   : _pomo.mode === 'longBreak'  ? 'long_break'
                   : 'work';
  const durationMins = Math.round(_pomoGetTotal() / 60);

  if (wasWork) {
    _pomo.completed++;
    _pomo.todayCompleted++;
    _pomo.history.push({ date: new Date().toISOString(), duration: _pomo.duration, type: 'work' });
    toast('Pomodoro complete! Take a break 🍅', 'success');
    const every4 = _pomo.completed % 4 === 0;
    _pomo.mode = every4 ? 'longBreak' : 'shortBreak';
  } else {
    toast('Break over! Ready to focus? 💪', 'info');
    _pomo.mode = 'work';
  }
  _pomo.remaining = _pomoGetTotal();
  _pomoSave();
  _pomoUpdateUI();

  // Sync to server
  _pomoSaveToServer(durationMins, modeForApi, 1, wasWork);
}

async function _pomoSaveToServer(durationMins, mode, completed, wasWork) {
  if (!state.token) return;
  const res = await api('/pomodoro.php?action=save_session', 'POST', {
    duration_minutes: durationMins,
    mode: mode,
    completed: completed,
  });
  if (res.success && res.data && res.data.xp_earned > 0 && wasWork) {
    awardXP(res.data.xp_earned, 'Pomodoro focus session');
  }
}

function _pomoPlaySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.12;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3 + i * 0.15 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.4);
    });
  } catch(e) {}
}

function _pomoSetMode(mode) {
  clearInterval(_pomo.interval);
  _pomo.interval = null;
  _pomo.running = false;
  _pomo.mode = mode;
  _pomo.remaining = _pomoGetTotal();
  _pomoUpdateUI();
}

function _pomoSetDuration(field, minutes) {
  const secs = minutes * 60;
  _pomo[field] = secs;
  if ((field === 'duration' && _pomo.mode === 'work') ||
      (field === 'shortBreak' && _pomo.mode === 'shortBreak') ||
      (field === 'longBreak' && _pomo.mode === 'longBreak')) {
    if (!_pomo.running) _pomo.remaining = secs;
  }
  _pomoSave();
  _pomoUpdateUI();
}

function _pomoKeyHandler(e) {
  if (state.page !== 'pomodoro') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') { e.preventDefault(); _pomoStart(); }
  else if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) { _pomoReset(); }
  else if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) { _pomoSkip(); }
}

async function renderPomodoro() {
  _pomoLoad();
  const pg = document.getElementById('page-pomodoro');
  if (!pg) return;

  // Reset timer state for fresh render (keep stats)
  if (!_pomo.running) {
    _pomo.remaining = _pomoGetTotal();
  }

  pg.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Pomodoro Timer</h1>
      <p class="page-sub">Stay focused, work in intervals, take breaks — learn smarter</p>
    </div>

    <div class="pomo-layout">
      <!-- Main Timer Area -->
      <div class="pomo-main">
        <!-- Mode Tabs -->
        <div class="pomo-tabs">
          <button class="pomo-tab ${_pomo.mode === 'work' ? 'active' : ''}" onclick="_pomoSetMode('work')">
            <i class="fas fa-brain"></i> Focus
          </button>
          <button class="pomo-tab ${_pomo.mode === 'shortBreak' ? 'active' : ''}" onclick="_pomoSetMode('shortBreak')">
            <i class="fas fa-mug-hot"></i> Short Break
          </button>
          <button class="pomo-tab ${_pomo.mode === 'longBreak' ? 'active' : ''}" onclick="_pomoSetMode('longBreak')">
            <i class="fas fa-couch"></i> Long Break
          </button>
        </div>

        <!-- Tomato Timer -->
        <div class="pomo-timer-wrap">
          <div class="pomo-tomato" id="pomoTomato">
            <!-- SVG Tomato Shape -->
            <svg viewBox="0 0 200 220" class="pomo-tomato-svg">
              <defs>
                <clipPath id="tomatoClip">
                  <ellipse cx="100" cy="130" rx="85" ry="80" />
                </clipPath>
              </defs>
              <!-- Stem -->
              <path d="M95 55 Q85 30 70 20 Q85 35 92 50 Z" fill="#4ade80" opacity="0.9"/>
              <path d="M105 55 Q115 30 130 20 Q115 35 108 50 Z" fill="#22c55e" opacity="0.9"/>
              <path d="M96 58 Q100 40 104 58 Z" fill="#16a34a"/>
              <!-- Tomato body -->
              <g id="pomoTomatoBody" data-mode="${_pomo.mode}">
                <ellipse cx="100" cy="130" rx="85" ry="80" class="pomo-tomato-base"/>
                <!-- Fill level (animated) -->
                <g clip-path="url(#tomatoClip)">
                  <rect id="pomoTomatoFill" x="15" y="50" width="170" height="160"
                        class="pomo-tomato-fill"/>
                </g>
                <!-- Highlight -->
                <ellipse cx="72" cy="108" rx="18" ry="24" fill="rgba(255,255,255,0.18)" transform="rotate(-15,72,108)"/>
              </g>
            </svg>

            <!-- Timer Text Overlay -->
            <div class="pomo-timer-text">
              <span class="pomo-time" id="pomoTime">${_pomoFmtTime(_pomo.remaining)}</span>
              <span class="pomo-mode-label" id="pomoModeLabel">${_pomo.mode === 'work' ? 'Focus Time' : _pomo.mode === 'shortBreak' ? 'Short Break' : 'Long Break'}</span>
            </div>
          </div>

          <!-- Session Dots -->
          <div class="pomo-dots" id="pomoDots"></div>
        </div>

        <!-- Controls -->
        <div class="pomo-controls">
          <button class="pomo-btn pomo-btn-secondary" onclick="_pomoReset()" title="Reset (R)">
            <i class="fas fa-rotate-left"></i> Reset
          </button>
          <button class="pomo-btn pomo-btn-primary" id="pomoStartBtn" onclick="_pomoStart()" title="Start/Pause (Space)">
            <i class="fas fa-play"></i> Start
          </button>
          <button class="pomo-btn pomo-btn-secondary" onclick="_pomoSkip()" title="Skip (S)">
            <i class="fas fa-forward"></i> Skip
          </button>
        </div>

        <p class="pomo-shortcuts-hint">
          <kbd>Space</kbd> Start / Pause &nbsp; <kbd>R</kbd> Reset &nbsp; <kbd>S</kbd> Skip
        </p>
      </div>

      <!-- Sidebar Stats & Settings -->
      <div class="pomo-sidebar">
        <!-- Today's Stats -->
        <div class="pomo-card">
          <h3 class="pomo-card-title"><i class="fas fa-chart-simple"></i> Today's Stats</h3>
          <div class="pomo-stats-grid">
            <div class="pomo-stat">
              <span class="pomo-stat-value" id="pomoCount">${_pomo.todayCompleted}</span>
              <span class="pomo-stat-label">Pomodoros</span>
            </div>
            <div class="pomo-stat">
              <span class="pomo-stat-value" id="pomoTodayFocus">${_pomoFmtMins(_pomo.todayFocus)}</span>
              <span class="pomo-stat-label">Focus Time</span>
            </div>
            <div class="pomo-stat">
              <span class="pomo-stat-value" id="pomoTotalFocus">${_pomoFmtMins(_pomo.totalFocus)}</span>
              <span class="pomo-stat-label">All Time</span>
            </div>
          </div>
        </div>

        <!-- How It Works -->
        <div class="pomo-card">
          <h3 class="pomo-card-title"><i class="fas fa-circle-info"></i> How It Works</h3>
          <div class="pomo-steps">
            <div class="pomo-step">
              <span class="pomo-step-num">1</span>
              <div>
                <strong>Focus</strong>
                <p>Work for ${_pomo.duration / 60} minutes with full concentration</p>
              </div>
            </div>
            <div class="pomo-step">
              <span class="pomo-step-num">2</span>
              <div>
                <strong>Short Break</strong>
                <p>Rest for ${_pomo.shortBreak / 60} minutes to recharge</p>
              </div>
            </div>
            <div class="pomo-step">
              <span class="pomo-step-num">3</span>
              <div>
                <strong>Repeat</strong>
                <p>After 4 pomodoros, take a ${_pomo.longBreak / 60}-min long break</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Timer Settings -->
        <div class="pomo-card">
          <h3 class="pomo-card-title"><i class="fas fa-sliders"></i> Timer Settings</h3>
          <div class="pomo-settings">
            <label class="pomo-setting">
              <span>Focus Duration</span>
              <select onchange="_pomoSetDuration('duration', +this.value)">
                ${[15,20,25,30,40,45,50,60].map(m => `<option value="${m}" ${_pomo.duration === m*60 ? 'selected' : ''}>${m} min</option>`).join('')}
              </select>
            </label>
            <label class="pomo-setting">
              <span>Short Break</span>
              <select onchange="_pomoSetDuration('shortBreak', +this.value)">
                ${[3,5,7,10].map(m => `<option value="${m}" ${_pomo.shortBreak === m*60 ? 'selected' : ''}>${m} min</option>`).join('')}
              </select>
            </label>
            <label class="pomo-setting">
              <span>Long Break</span>
              <select onchange="_pomoSetDuration('longBreak', +this.value)">
                ${[10,15,20,25,30].map(m => `<option value="${m}" ${_pomo.longBreak === m*60 ? 'selected' : ''}>${m} min</option>`).join('')}
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  `;

  _pomoUpdateUI();

  // Register keyboard shortcuts
  document.removeEventListener('keydown', _pomoKeyHandler);
  document.addEventListener('keydown', _pomoKeyHandler);

  // Load server stats (merge with localStorage, server is source of truth for totals)
  if (state.token) {
    const res = await api('/pomodoro.php?action=stats');
    if (res.success && res.data) {
      const s = res.data;
      _pomo.totalFocus = Math.max(_pomo.totalFocus, (s.all_time.total_minutes || 0) * 60);
      // If server has more today data, use it (handles multi-device)
      if (s.today.pomodoros > _pomo.todayCompleted) {
        _pomo.todayCompleted = s.today.pomodoros;
      }
      if ((s.today.minutes || 0) * 60 > _pomo.todayFocus) {
        _pomo.todayFocus = (s.today.minutes || 0) * 60;
      }
      if (s.all_time.completed_pomodoros > _pomo.completed) {
        _pomo.completed = s.all_time.completed_pomodoros;
      }
      _pomoSave();
      _pomoUpdateUI();
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   FLASHCARDS — Browse, study, create decks
   ══════════════════════════════════════════════════════════════ */

let _fcTab = 'official';
let _fcState = {
  view: 'home',
  deckId: null,
  deck: null,
  cards: [],
  currentCard: 0,
  flipped: false,
  startTime: null,
  results: {},  // cardId -> 'known' | 'learning'
  editDeckId: null,
};

async function renderFlashcards() {
  const pg = document.getElementById('page-flashcards');
  if (!pg) return;
  _fcState.view = 'home';
  _fcRenderTabs(pg);
}

function _fcRenderTabs(pg) {
  if (!pg) pg = document.getElementById('page-flashcards');
  if (!pg) return;
  pg.innerHTML = `
    <div class="page-header" style="flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="page-title">Flashcards</h1>
        <p class="page-sub">Study smarter with spaced repetition — create or browse decks</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn btn-primary" onclick="_fcShowCreateModal()" style="font-size:.85rem;padding:8px 18px;border-radius:10px">
          <i class="fas fa-plus"></i> Create Deck
        </button>
      </div>
    </div>
    <div class="quiz-main-tabs">
      <button class="quiz-main-tab ${_fcTab==='official'?'active':''}" onclick="_fcSwitchTab('official')">
        <i class="fas fa-graduation-cap"></i> Official
      </button>
      <button class="quiz-main-tab ${_fcTab==='community'?'active':''}" onclick="_fcSwitchTab('community')">
        <i class="fas fa-users"></i> Community
      </button>
      <button class="quiz-main-tab ${_fcTab==='my'?'active':''}" onclick="_fcSwitchTab('my')">
        <i class="fas fa-folder-open"></i> My Decks
      </button>
    </div>
    <div id="fcTabContent"></div>`;
  _fcLoadTab(_fcTab);
}

function _fcSwitchTab(tab) {
  _fcTab = tab;
  document.querySelectorAll('#page-flashcards .quiz-main-tab').forEach(b => b.classList.remove('active'));
  const tabs = document.querySelectorAll('#page-flashcards .quiz-main-tab');
  const map = { official: 0, community: 1, my: 2 };
  if (tabs[map[tab]]) tabs[map[tab]].classList.add('active');
  _fcLoadTab(tab);
}

async function _fcLoadTab(tab) {
  const el = document.getElementById('fcTabContent');
  if (!el) return;
  el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:30vh"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--cyan)"></i></div>';

  let res;
  if (tab === 'my') {
    res = await api('/flashcards.php?action=my_decks');
  } else {
    res = await api('/flashcards.php?action=decks&tab=' + tab);
  }

  if (!res.success) {
    el.innerHTML = '<div class="error-card"><div class="error-card-icon">⚠️</div><p class="error-card-title">Could not load decks</p><button class="btn btn-primary error-card-retry" onclick="_fcLoadTab(\'' + tab + '\')">Retry</button></div>';
    return;
  }

  const decks = res.data || [];
  if (!decks.length) {
    const msgs = {
      official: { icon: '<i class="fas fa-book-open" style="color:var(--cyan)"></i>', title: 'No official decks yet', sub: 'Official flashcard decks will appear here soon.' },
      community: { icon: '<i class="fas fa-globe" style="color:var(--cyan)"></i>', title: 'No community decks yet', sub: 'Be the first to create and share a public deck!' },
      my: { icon: '<i class="fas fa-folder-open" style="color:var(--cyan)"></i>', title: 'You haven\'t created any decks', sub: 'Create your first flashcard deck to start studying.' },
    };
    const m = msgs[tab] || msgs.official;
    el.innerHTML = `<div class="empty-state" style="text-align:center;padding:60px 20px">
      <div style="font-size:3rem;margin-bottom:12px">${m.icon}</div>
      <p style="font-size:1.1rem;font-weight:600;color:var(--navy);margin-bottom:6px">${m.title}</p>
      <p style="color:var(--gray-500);margin-bottom:20px">${m.sub}</p>
      ${tab === 'my' ? '<button class="btn btn-primary" onclick="_fcShowCreateModal()"><i class="fas fa-plus"></i> Create Deck</button>' : ''}
    </div>`;
    return;
  }

  el.innerHTML = `<div class="fc-deck-grid">${decks.map(d => _fcDeckCard(d, tab === 'my')).join('')}</div>`;
}

function _fcDeckCard(d, isMine) {
  const color = d.subject_color || '#4f46e5';
  const iconHtml = d.subject_icon ? _iconHtml(d.subject_icon, '1.3rem') : '<i class="fas fa-layer-group"></i>';
  const subName  = d.subject_name || 'General';
  const creator  = ((d.creator_first_name || '') + ' ' + (d.creator_last_name || '')).trim() || d.creator_username || '';
  const vis = d.visibility === 'public' ? '<i class="fas fa-globe" title="Public"></i>' : '<i class="fas fa-lock" title="Private"></i>';
  return `
    <div class="fc-deck-card" onclick="_fcOpenDeck(${d.id})">
      <div class="fc-deck-header" style="background:${esc(color)}14">
        <span class="fc-deck-icon" style="color:${esc(color)}">${iconHtml}</span>
        <span class="fc-deck-subject">${esc(subName)}</span>
        ${d.is_official == 1 ? '<span class="fc-badge-official">Official</span>' : ''}
        ${isMine ? '<span class="fc-badge-vis">' + vis + '</span>' : ''}
      </div>
      <div class="fc-deck-body">
        <h3 class="fc-deck-title">${esc(d.title)}</h3>
        ${d.description ? '<p class="fc-deck-desc">' + esc(d.description) + '</p>' : ''}
        <div class="fc-deck-meta">
          <span><i class="fas fa-clone"></i> ${d.card_count} card${d.card_count != 1 ? 's' : ''}</span>
          <span><i class="fas fa-chart-line"></i> ${d.times_studied} ${d.times_studied == 1 ? 'study' : 'studies'}</span>
          ${!isMine ? '<span><i class="fas fa-user"></i> ' + esc(creator) + '</span>' : ''}
        </div>
      </div>
    </div>`;
}

/* ── Deck Detail View ─────────────────────────────────────── */

async function _fcOpenDeck(deckId) {
  const pg = document.getElementById('page-flashcards');
  if (!pg) return;
  pg.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:40vh"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--cyan)"></i></div>';

  const res = await api('/flashcards.php?action=deck_detail&id=' + deckId);
  if (!res.success || !res.data) {
    pg.innerHTML = '<div class="error-card"><div class="error-card-icon">⚠️</div><p class="error-card-title">' + esc(res.error || 'Could not load deck') + '</p><button class="btn btn-primary error-card-retry" onclick="renderFlashcards()">Back</button></div>';
    return;
  }

  const d = res.data;
  _fcState.view = 'detail';
  _fcState.deckId = d.id;
  _fcState.deck = d;
  _fcState.cards = d.cards || [];

  const color = d.subject_color || '#4f46e5';
  const isOwner = state.user && parseInt(d.creator_id) === parseInt(state.user.id);
  const creator = ((d.creator_first_name||'') + ' ' + (d.creator_last_name||'')).trim() || d.creator_username || '';
  const progress = d.progress || {};
  const knownCount = Object.values(progress).filter(p => parseInt(p.confidence) >= 2).length;
  const learningCount = Object.values(progress).filter(p => parseInt(p.confidence) === 1).length;
  const newCount = _fcState.cards.length - knownCount - learningCount;

  pg.innerHTML = `
    <div style="margin-bottom:20px">
      <button class="btn btn-ghost" onclick="renderFlashcards()" style="margin-bottom:12px">
        <i class="fas fa-arrow-left"></i> Back to Decks
      </button>
      <div class="fc-detail-header" style="border-left:4px solid ${esc(color)}">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <h1 style="font-size:1.4rem;font-weight:800;color:var(--navy);margin:0">${esc(d.title)}</h1>
            ${d.is_official == 1 ? '<span class="fc-badge-official">Official</span>' : ''}
            <span style="font-size:.75rem;color:var(--gray-400)">${d.visibility === 'public' ? '<i class="fas fa-globe"></i> Public' : '<i class="fas fa-lock"></i> Private'}</span>
          </div>
          ${d.description ? '<p style="color:var(--gray-500);font-size:.88rem;margin:4px 0 8px">' + esc(d.description) + '</p>' : ''}
          <div class="fc-deck-meta" style="font-size:.8rem">
            <span><i class="fas fa-clone"></i> ${d.card_count} cards</span>
            <span><i class="fas fa-chart-line"></i> ${d.times_studied} studies</span>
            <span><i class="fas fa-user"></i> ${esc(creator)}</span>
            ${d.subject_name ? '<span><i class="fas fa-tag"></i> ' + esc(d.subject_name) + '</span>' : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;align-items:flex-start">
          ${_fcState.cards.length > 0 ? '<button class="btn btn-primary" onclick="_fcStartStudy()"><i class="fas fa-play"></i> Study</button>' : ''}
          ${isOwner ? '<button class="btn btn-ghost" onclick="_fcShowEditModal(' + d.id + ')"><i class="fas fa-pen"></i></button><button class="btn btn-ghost" style="color:var(--danger)" onclick="_fcDeleteDeck(' + d.id + ')"><i class="fas fa-trash"></i></button>' : ''}
        </div>
      </div>
    </div>

    ${_fcState.cards.length > 0 ? `
    <div class="fc-progress-bar-wrap">
      <div class="fc-progress-labels">
        <span style="color:#10b981"><i class="fas fa-check-circle"></i> Known: ${knownCount}</span>
        <span style="color:#f59e0b"><i class="fas fa-spinner"></i> Learning: ${learningCount}</span>
        <span style="color:var(--gray-400)"><i class="fas fa-circle"></i> New: ${newCount}</span>
      </div>
      <div class="fc-progress-track">
        <div class="fc-progress-seg" style="width:${_fcState.cards.length ? (knownCount/_fcState.cards.length*100) : 0}%;background:#10b981"></div>
        <div class="fc-progress-seg" style="width:${_fcState.cards.length ? (learningCount/_fcState.cards.length*100) : 0}%;background:#f59e0b"></div>
      </div>
    </div>` : ''}

    <div class="section-header" style="margin-top:24px"><h2>Cards (${_fcState.cards.length})</h2></div>
    <div class="fc-cards-list">
      ${_fcState.cards.length ? _fcState.cards.map((c, i) => {
        const prog = progress[c.id];
        const conf = prog ? parseInt(prog.confidence) : 0;
        const confLabel = conf >= 2 ? 'Known' : conf === 1 ? 'Learning' : 'New';
        const confColor = conf >= 2 ? '#10b981' : conf === 1 ? '#f59e0b' : 'var(--gray-300)';
        return `
        <div class="fc-card-row">
          <span class="fc-card-num">${i + 1}</span>
          <div class="fc-card-content">
            <div class="fc-card-front">${esc(c.front)}</div>
            <div class="fc-card-back">${esc(c.back)}</div>
          </div>
          <span class="fc-card-conf" style="color:${confColor}">${confLabel}</span>
          ${isOwner ? `<span class="fc-card-actions">
            <button class="btn btn-ghost" title="Edit card" onclick="_fcEditCard(${c.id})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-ghost" title="Delete card" style="color:var(--danger)" onclick="_fcDeleteCard(${c.id})"><i class="fas fa-trash"></i></button>
          </span>` : ''}
        </div>`;
      }).join('') : '<div class="empty-state" style="padding:30px;text-align:center"><p style="color:var(--gray-400)">No cards in this deck yet.</p></div>'}
    </div>
  `;
}

/* ── Study Mode ───────────────────────────────────────────── */

async function _fcStartStudy(reload) {
  const pg = document.getElementById('page-flashcards');
  if (!pg) return;

  // Re-fetch deck from server to get fresh card data when studying again
  if (reload && _fcState.deckId) {
    pg.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:40vh"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--cyan)"></i></div>';
    const res = await api('/flashcards.php?action=deck_detail&id=' + _fcState.deckId);
    if (res.success && res.data) {
      _fcState.deck = res.data;
      _fcState.cards = res.data.cards || [];
    }
  }

  if (!_fcState.cards.length) return;

  // Shuffle cards for a fresh study order
  const cards = _fcState.cards;
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  _fcState.view = 'study';
  _fcState.currentCard = 0;
  _fcState.flipped = false;
  _fcState.startTime = Date.now();
  _fcState.results = {};

  // Notify server (increment times_studied)
  api('/flashcards.php?action=study_start&id=' + _fcState.deckId);

  _fcRenderStudyCard(pg);
}

function _fcRenderStudyCard(pg) {
  if (!pg) pg = document.getElementById('page-flashcards');
  if (!pg) return;

  const { cards, currentCard, flipped, deck } = _fcState;
  const total = cards.length;
  const c = cards[currentCard];
  const progress = Math.round(((currentCard) / total) * 100);
  const knownSoFar = Object.values(_fcState.results).filter(r => r === 'known').length;
  const learnSoFar = Object.values(_fcState.results).filter(r => r === 'learning').length;

  pg.innerHTML = `
    <div class="fc-study-runner">
      <div class="fc-study-header">
        <button class="btn btn-ghost" onclick="_fcQuitStudy()"><i class="fas fa-xmark"></i> Quit</button>
        <div style="flex:1;text-align:center">
          <div style="font-weight:700;color:var(--navy);font-size:.9rem">${esc(deck.title)}</div>
          <div style="font-size:.78rem;color:var(--gray-400)">Card ${currentCard + 1} of ${total}</div>
        </div>
        <div style="font-size:.78rem;color:var(--gray-400);display:flex;gap:10px">
          <span style="color:#10b981">${knownSoFar} <i class="fas fa-check"></i></span>
          <span style="color:#f59e0b">${learnSoFar} <i class="fas fa-rotate"></i></span>
        </div>
      </div>
      <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${progress}%"></div></div>

      <div class="fc-flip-container" onclick="_fcFlip()">
        <div class="fc-flip-card ${flipped ? 'flipped' : ''}">
          <div class="fc-flip-front">
            <div class="fc-flip-label">FRONT</div>
            <div class="fc-flip-text">${esc(c.front)}</div>
            <div class="fc-flip-hint">Tap to reveal answer</div>
          </div>
          <div class="fc-flip-back">
            <div class="fc-flip-label">ANSWER</div>
            <div class="fc-flip-text">${esc(c.back)}</div>
          </div>
        </div>
      </div>

      ${flipped ? `
      <div class="fc-study-actions">
        <button class="fc-rate-btn fc-rate-learning" onclick="_fcRate('learning')">
          <i class="fas fa-rotate"></i>
          <span>Still Learning</span>
        </button>
        <button class="fc-rate-btn fc-rate-known" onclick="_fcRate('known')">
          <i class="fas fa-check-circle"></i>
          <span>Got It!</span>
        </button>
      </div>` : `
      <div class="fc-study-actions">
        <button class="fc-rate-btn fc-rate-flip" onclick="_fcFlip()">
          <i class="fas fa-eye"></i>
          <span>Show Answer</span>
        </button>
      </div>`}

      <p class="pomo-shortcuts-hint" style="margin-top:12px">
        <kbd>Space</kbd> Flip &nbsp; <kbd>1</kbd> Still Learning &nbsp; <kbd>2</kbd> Got It
      </p>
    </div>`;
}

function _fcFlip() {
  _fcState.flipped = !_fcState.flipped;
  _fcRenderStudyCard();
}

function _fcRate(rating) {
  const card = _fcState.cards[_fcState.currentCard];
  _fcState.results[card.id] = rating;

  // Save progress to server
  const confidence = rating === 'known' ? 2 : 1;
  api('/flashcards.php?action=card_progress', 'POST', { card_id: card.id, confidence });

  // Next card or finish
  if (_fcState.currentCard < _fcState.cards.length - 1) {
    _fcState.currentCard++;
    _fcState.flipped = false;
    _fcRenderStudyCard();
  } else {
    _fcShowResults();
  }
}

async function _fcShowResults() {
  const pg = document.getElementById('page-flashcards');
  if (!pg) return;

  const { cards, results, deck, startTime } = _fcState;
  const total = cards.length;
  const known = Object.values(results).filter(r => r === 'known').length;
  const learning = total - known;
  const pct = Math.round((known / total) * 100);
  const duration = Math.round((Date.now() - startTime) / 1000);

  const grade = pct >= 90 ? { label: 'Mastered!', icon: '🏆', color: 'var(--success)' }
              : pct >= 70 ? { label: 'Great Job!', icon: '🎯', color: 'var(--cyan)' }
              : pct >= 50 ? { label: 'Good Progress', icon: '📈', color: 'var(--warning)' }
              : { label: 'Keep Practicing', icon: '💪', color: 'var(--danger)' };

  // Save study session to server
  const res = await api('/flashcards.php?action=study_complete', 'POST', {
    deck_id: deck.id,
    cards_studied: total,
    cards_known: known,
    cards_learning: learning,
    duration_seconds: duration,
  });

  const xpEarned = res.success && res.data ? res.data.xp_earned : 0;
  if (xpEarned > 0) awardXP(xpEarned, 'Flashcard study session');

  const m = String(Math.floor(duration / 60)).padStart(2, '0');
  const s = String(duration % 60).padStart(2, '0');

  pg.innerHTML = `
    <div class="quiz-result">
      <div class="quiz-result-hero">
        <div class="quiz-result-icon">${grade.icon}</div>
        <h2 class="quiz-result-label" style="color:${grade.color}">${grade.label}</h2>
        <div class="quiz-result-score">${pct}<span>%</span></div>
        <p style="color:var(--gray-500);font-size:.9rem;margin:0 0 16px">Cards known on this session</p>
        <div class="quiz-result-stats">
          <div><i class="fas fa-check-circle" style="color:#10b981"></i> ${known} known</div>
          <div><i class="fas fa-rotate" style="color:#f59e0b"></i> ${learning} learning</div>
          <div><i class="fas fa-clone"></i> ${total} total</div>
          <div><i class="fas fa-clock"></i> ${m}:${s}</div>
          ${xpEarned > 0 ? '<div><i class="fas fa-star" style="color:#a78bfa"></i> +' + xpEarned + ' XP</div>' : ''}
        </div>
        <div style="display:flex;gap:12px;margin-top:24px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="_fcStartStudy(true)"><i class="fas fa-rotate"></i> Study Again</button>
          <button class="btn btn-ghost" onclick="_fcOpenDeck(${deck.id})">Deck Details</button>
          <button class="btn btn-ghost" onclick="renderFlashcards()">All Decks</button>
        </div>
      </div>
    </div>`;
}

function _fcQuitStudy() {
  if (!confirm('Quit studying? Your progress on unseen cards won\'t be saved.')) return;
  _fcOpenDeck(_fcState.deckId);
}

// Keyboard handler for study mode
document.addEventListener('keydown', function(e) {
  if (state.page !== 'flashcards' || _fcState.view !== 'study') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') { e.preventDefault(); _fcFlip(); }
  else if (e.key === '1') _fcRate('learning');
  else if (e.key === '2') _fcRate('known');
});

/* ── Create / Edit Deck Modal ─────────────────────────────── */

async function _fcShowCreateModal() {
  _fcState.editDeckId = null;
  const titleEl = document.getElementById('fcDeckModalTitle');
  const submitEl = document.getElementById('fcDeckModalSubmit');
  if (titleEl) titleEl.textContent = 'Create Deck';
  if (submitEl) submitEl.textContent = 'Create Deck';

  // Load subjects for dropdown
  let subjectsHtml = '<option value="">None (General)</option>';
  const res = await api('/quiz.php?action=subjects');
  if (res.success && res.data) {
    subjectsHtml += res.data.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  }

  const body = document.getElementById('fcDeckModalBody');
  if (body) body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div>
        <label style="font-size:.82rem;font-weight:600;color:var(--navy);display:block;margin-bottom:6px">Title *</label>
        <input type="text" id="fcDeckTitle" class="form-input" placeholder="e.g. Biology Chapter 5 Vocabulary" maxlength="200" style="width:100%">
      </div>
      <div>
        <label style="font-size:.82rem;font-weight:600;color:var(--navy);display:block;margin-bottom:6px">Description</label>
        <textarea id="fcDeckDesc" class="form-input" rows="2" placeholder="Optional description..." style="width:100%;resize:vertical"></textarea>
      </div>
      <div style="display:flex;gap:12px">
        <div style="flex:1">
          <label style="font-size:.82rem;font-weight:600;color:var(--navy);display:block;margin-bottom:6px">Subject</label>
          <select id="fcDeckSubject" class="form-input" style="width:100%">${subjectsHtml}</select>
        </div>
        <div style="flex:1">
          <label style="font-size:.82rem;font-weight:600;color:var(--navy);display:block;margin-bottom:6px">Visibility</label>
          <select id="fcDeckVis" class="form-input" style="width:100%">
            <option value="private">Private — Only me</option>
            <option value="public">Public — Everyone can study</option>
          </select>
        </div>
      </div>
      <div>
        <label style="font-size:.82rem;font-weight:600;color:var(--navy);display:block;margin-bottom:8px">Cards *</label>
        <div id="fcCardsList"></div>
        <button class="btn btn-ghost" onclick="_fcAddCardRow()" style="margin-top:8px;width:100%;border:2px dashed var(--gray-200);border-radius:10px;padding:10px">
          <i class="fas fa-plus"></i> Add Card
        </button>
      </div>
    </div>`;

  // Add 3 empty card rows by default
  for (let i = 0; i < 3; i++) _fcAddCardRow();

  openModal('flashcardDeckModal');
}

let _fcCardRowId = 0;
function _fcAddCardRow(front, back) {
  const list = document.getElementById('fcCardsList');
  if (!list) return;
  _fcCardRowId++;
  const id = _fcCardRowId;
  const row = document.createElement('div');
  row.className = 'fc-card-input-row';
  row.id = 'fcCardRow' + id;
  row.innerHTML = `
    <span class="fc-card-input-num">${list.children.length + 1}</span>
    <input type="text" class="form-input fc-card-input-front" placeholder="Front (question/term)" value="${esc(front || '')}" style="flex:1">
    <input type="text" class="form-input fc-card-input-back" placeholder="Back (answer/definition)" value="${esc(back || '')}" style="flex:1">
    <button class="btn btn-ghost" onclick="this.parentElement.remove();_fcRenumberCards()" style="padding:6px 8px;color:var(--gray-400);flex-shrink:0"><i class="fas fa-xmark"></i></button>`;
  list.appendChild(row);
}

function _fcRenumberCards() {
  document.querySelectorAll('#fcCardsList .fc-card-input-row').forEach((row, i) => {
    const num = row.querySelector('.fc-card-input-num');
    if (num) num.textContent = i + 1;
  });
}

async function _fcSubmitDeck() {
  const title = (document.getElementById('fcDeckTitle')?.value || '').trim();
  const desc  = (document.getElementById('fcDeckDesc')?.value || '').trim();
  const subId = document.getElementById('fcDeckSubject')?.value || '';
  const vis   = document.getElementById('fcDeckVis')?.value || 'private';

  if (!title) { toast('Please enter a title', 'error'); return; }

  const cardRows = document.querySelectorAll('#fcCardsList .fc-card-input-row');
  const cards = [];
  cardRows.forEach(row => {
    const front = (row.querySelector('.fc-card-input-front')?.value || '').trim();
    const back  = (row.querySelector('.fc-card-input-back')?.value || '').trim();
    if (front && back) cards.push({ front, back });
  });

  // New decks need at least one card; edits may change only the deck details
  if (!_fcState.editDeckId && cards.length < 1) { toast('Add at least 1 card with front and back', 'error'); return; }

  const submitBtn = document.getElementById('fcDeckModalSubmit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

  let res;
  if (_fcState.editDeckId) {
    // Update existing deck
    res = await api('/flashcards.php?action=update_deck', 'POST', {
      deck_id: _fcState.editDeckId, title, description: desc,
      subject_id: subId ? parseInt(subId) : null, visibility: vis,
    });
    if (res.success && cards.length) {
      // Existing cards are edited/deleted individually from the deck view; here we only append new ones
      const addRes = await api('/flashcards.php?action=add_cards', 'POST', { deck_id: _fcState.editDeckId, cards });
      if (!addRes.success) toast(addRes.error || 'Deck saved, but new cards could not be added', 'error');
    }
  } else {
    res = await api('/flashcards.php?action=create_deck', 'POST', {
      title, description: desc,
      subject_id: subId ? parseInt(subId) : null,
      visibility: vis, cards,
    });
  }

  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = _fcState.editDeckId ? 'Save Changes' : 'Create Deck'; }

  if (!res.success) { toast(res.error || 'Failed to save deck', 'error'); return; }

  closeModal('flashcardDeckModal');

  if (!_fcState.editDeckId && res.data?.xp_earned > 0) {
    awardXP(res.data.xp_earned, 'Created a public flashcard deck');
  }

  toast(_fcState.editDeckId ? 'Deck updated!' : 'Deck created!', 'success');

  if (_fcState.editDeckId) {
    _fcOpenDeck(_fcState.editDeckId);
  } else if (res.data?.deck_id) {
    _fcOpenDeck(res.data.deck_id);
  } else {
    _fcTab = 'my';
    renderFlashcards();
  }
}

async function _fcShowEditModal(deckId) {
  _fcState.editDeckId = deckId;
  const titleEl = document.getElementById('fcDeckModalTitle');
  const submitEl = document.getElementById('fcDeckModalSubmit');
  if (titleEl) titleEl.textContent = 'Edit Deck';
  if (submitEl) submitEl.textContent = 'Save Changes';

  // Fetch deck data
  const res = await api('/flashcards.php?action=deck_detail&id=' + deckId);
  if (!res.success) { toast('Could not load deck', 'error'); return; }
  const d = res.data;

  let subjectsHtml = '<option value="">None (General)</option>';
  const subRes = await api('/quiz.php?action=subjects');
  if (subRes.success && subRes.data) {
    subjectsHtml += subRes.data.map(s => `<option value="${s.id}" ${parseInt(d.subject_id) === parseInt(s.id) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  }

  const body = document.getElementById('fcDeckModalBody');
  if (body) body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div>
        <label style="font-size:.82rem;font-weight:600;color:var(--navy);display:block;margin-bottom:6px">Title *</label>
        <input type="text" id="fcDeckTitle" class="form-input" value="${esc(d.title)}" maxlength="200" style="width:100%">
      </div>
      <div>
        <label style="font-size:.82rem;font-weight:600;color:var(--navy);display:block;margin-bottom:6px">Description</label>
        <textarea id="fcDeckDesc" class="form-input" rows="2" style="width:100%;resize:vertical">${esc(d.description || '')}</textarea>
      </div>
      <div style="display:flex;gap:12px">
        <div style="flex:1">
          <label style="font-size:.82rem;font-weight:600;color:var(--navy);display:block;margin-bottom:6px">Subject</label>
          <select id="fcDeckSubject" class="form-input" style="width:100%">${subjectsHtml}</select>
        </div>
        <div style="flex:1">
          <label style="font-size:.82rem;font-weight:600;color:var(--navy);display:block;margin-bottom:6px">Visibility</label>
          <select id="fcDeckVis" class="form-input" style="width:100%">
            <option value="private" ${d.visibility === 'private' ? 'selected' : ''}>Private</option>
            <option value="public" ${d.visibility === 'public' ? 'selected' : ''}>Public</option>
          </select>
        </div>
      </div>
      <div>
        <label style="font-size:.82rem;font-weight:600;color:var(--navy);display:block;margin-bottom:8px">Add New Cards</label>
        <p style="font-size:.78rem;color:var(--gray-400);margin:0 0 8px">Existing cards: ${d.cards ? d.cards.length : 0}. Add more below:</p>
        <div id="fcCardsList"></div>
        <button class="btn btn-ghost" onclick="_fcAddCardRow()" style="margin-top:8px;width:100%;border:2px dashed var(--gray-200);border-radius:10px;padding:10px">
          <i class="fas fa-plus"></i> Add Card
        </button>
      </div>
    </div>`;

  _fcAddCardRow();
  openModal('flashcardDeckModal');
}

async function _fcEditCard(cardId) {
  const card = (_fcState.cards || []).find(c => parseInt(c.id) === parseInt(cardId));
  if (!card) return;
  const front = prompt('Front (question/term):', card.front);
  if (front === null) return;
  const back = prompt('Back (answer/definition):', card.back);
  if (back === null) return;
  if (!front.trim() || !back.trim()) { toast('Front and back are required', 'error'); return; }
  const res = await api('/flashcards.php?action=update_card', 'POST', { card_id: cardId, front: front.trim(), back: back.trim() });
  if (!res.success) { toast(res.error || 'Update failed', 'error'); return; }
  toast('Card updated', 'success');
  _fcOpenDeck(_fcState.deckId);
}

async function _fcDeleteCard(cardId) {
  if (!confirm('Delete this card?')) return;
  const res = await api('/flashcards.php?action=delete_card', 'POST', { card_id: cardId });
  if (!res.success) { toast(res.error || 'Delete failed', 'error'); return; }
  toast('Card deleted', 'success');
  _fcOpenDeck(_fcState.deckId);
}

async function _fcDeleteDeck(deckId) {
  if (!confirm('Delete this deck? This cannot be undone.')) return;
  const res = await api('/flashcards.php?action=delete_deck', 'POST', { deck_id: deckId });
  if (!res.success) { toast(res.error || 'Delete failed', 'error'); return; }
  toast('Deck deleted', 'success');
  renderFlashcards();
}

/* ══════════════════════════════════════════════════════════════
   STUDY GROUPS — Browse, join and chat with study groups
   ══════════════════════════════════════════════════════════════ */

const SG_POLL_MS = 5000;
let _sgState = {
  tab: 'my',          // 'my' | 'discover'
  q: '',
  page: 1,
  view: 'list',       // 'list' | 'group'
  groupId: null,
  group: null,
  members: [],
  messages: [],
  lastId: 0,          // newest message id we have (for ?after= polling)
  hasOlder: false,
  editId: null,
  pollTimer: null,
  polling: false,
};
let _sgSearchTimer = null;

function _sgStopPoll() {
  if (_sgState.pollTimer) { clearInterval(_sgState.pollTimer); _sgState.pollTimer = null; }
}

async function renderStudyGroups() {
  const pg = document.getElementById('page-studygroups');
  if (!pg) return;
  _sgStopPoll();
  _sgState.view = 'list';
  _sgState.groupId = null;
  _sgState.page = 1;
  pg.innerHTML = `
    <div class="page-header" style="flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="page-title">Study Groups</h1>
        <p class="page-sub">Learn together — join a group or start your own</p>
      </div>
      <button class="btn btn-primary" onclick="_sgShowModal()" style="font-size:.85rem;padding:8px 18px;border-radius:10px">
        <i class="fas fa-plus"></i> Create Group
      </button>
    </div>
    <div class="quiz-main-tabs">
      <button class="quiz-main-tab ${_sgState.tab === 'my' ? 'active' : ''}" data-sg-tab="my" onclick="_sgSwitchTab('my')">
        <i class="fas fa-user-group"></i> My Groups
      </button>
      <button class="quiz-main-tab ${_sgState.tab === 'discover' ? 'active' : ''}" data-sg-tab="discover" onclick="_sgSwitchTab('discover')">
        <i class="fas fa-compass"></i> Discover
      </button>
    </div>
    <div class="sg-search" id="sgSearchWrap" style="${_sgState.tab === 'discover' ? '' : 'display:none'}">
      <i class="fas fa-magnifying-glass"></i>
      <input type="search" id="sgSearch" class="form-input" placeholder="Search groups by name or description…" value="${esc(_sgState.q)}" oninput="_sgOnSearch(this.value)">
    </div>
    <div id="sgTabContent"></div>`;
  await _sgLoadList();
}

function _sgSwitchTab(tab) {
  _sgState.tab = tab;
  _sgState.page = 1;
  document.querySelectorAll('#page-studygroups .quiz-main-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.sgTab === tab);
  });
  const sw = document.getElementById('sgSearchWrap');
  if (sw) sw.style.display = tab === 'discover' ? '' : 'none';
  _sgLoadList();
}

function _sgOnSearch(value) {
  clearTimeout(_sgSearchTimer);
  _sgSearchTimer = setTimeout(() => {
    _sgState.q = value.trim();
    _sgState.page = 1;
    _sgLoadList();
  }, 300);
}

async function _sgLoadList(append) {
  const el = document.getElementById('sgTabContent');
  if (!el) return;
  if (!append) el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:30vh"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--cyan)"></i></div>';

  const tab = _sgState.tab;
  const res = tab === 'my'
    ? await api('/study_groups.php?action=my_groups')
    : await api('/study_groups.php?action=list&page=' + _sgState.page + (_sgState.q ? '&q=' + encodeURIComponent(_sgState.q) : ''));

  // User switched tab/page while loading
  if (_sgState.view !== 'list' || _sgState.tab !== tab) return;

  if (!res.success) {
    el.innerHTML = `<div class="error-card"><div class="error-card-icon">⚠️</div><p class="error-card-title">${esc(res.error || 'Could not load groups')}</p><button class="btn btn-primary error-card-retry" onclick="_sgLoadList()">Retry</button></div>`;
    return;
  }

  const groups = (res.data && res.data.groups) || [];
  if (!groups.length && !append) {
    const empty = tab === 'my'
      ? { title: 'You are not in any groups yet', sub: 'Create a group or discover one to join.', btn: '<button class="btn btn-primary" onclick="_sgSwitchTab(\'discover\')"><i class="fas fa-compass"></i> Discover Groups</button>' }
      : { title: _sgState.q ? 'No groups match your search' : 'No public groups yet', sub: 'Be the first to start one!', btn: '<button class="btn btn-primary" onclick="_sgShowModal()"><i class="fas fa-plus"></i> Create Group</button>' };
    el.innerHTML = `<div class="empty-state" style="text-align:center;padding:60px 20px">
      <div style="font-size:3rem;margin-bottom:12px"><i class="fas fa-user-group" style="color:var(--cyan)"></i></div>
      <p style="font-size:1.1rem;font-weight:600;color:var(--navy);margin-bottom:6px">${empty.title}</p>
      <p style="color:var(--gray-500);margin-bottom:20px">${empty.sub}</p>
      ${empty.btn}
    </div>`;
    return;
  }

  const cardsHtml = groups.map(_sgGroupCard).join('');
  const moreBtn = tab === 'discover' && res.data.has_more
    ? '<div style="text-align:center;margin-top:16px" id="sgMoreWrap"><button class="btn btn-ghost" onclick="_sgLoadMore()">Load more</button></div>'
    : '';
  if (append) {
    document.getElementById('sgMoreWrap')?.remove();
    el.querySelector('.fc-deck-grid')?.insertAdjacentHTML('beforeend', cardsHtml);
    el.insertAdjacentHTML('beforeend', moreBtn);
  } else {
    el.innerHTML = `<div class="fc-deck-grid">${cardsHtml}</div>${moreBtn}`;
  }
}

function _sgLoadMore() {
  _sgState.page++;
  _sgLoadList(true);
}

function _sgGroupCard(g) {
  const owner = ((g.first_name || '') + ' ' + (g.last_name || '')).trim() || g.username || '';
  const members = parseInt(g.member_count) || 0;
  const badge = g.is_mine ? '<span class="fc-badge-official">Owner</span>'
              : g.is_member ? '<span class="fc-badge-vis"><i class="fas fa-check"></i> Joined</span>' : '';
  const last = g.last_message
    ? `<p class="fc-deck-desc sg-last-msg"><i class="fas fa-message"></i> ${esc(g.last_message)}</p>`
    : (g.description ? `<p class="fc-deck-desc">${esc(g.description)}</p>` : '');
  return `
    <div class="fc-deck-card" onclick="_sgOpenGroup(${parseInt(g.id)})">
      <div class="fc-deck-header" style="background:var(--cyan-light, #e0f7fa)">
        <span class="fc-deck-icon sg-icon">${esc(g.icon || '📚')}</span>
        <span class="fc-deck-subject">${esc(g.subject || 'General')}</span>
        ${parseInt(g.is_private) === 1 ? '<span class="fc-badge-vis"><i class="fas fa-lock" title="Private"></i></span>' : ''}
        ${badge}
      </div>
      <div class="fc-deck-body">
        <h3 class="fc-deck-title">${esc(g.name)}</h3>
        ${last}
        <div class="fc-deck-meta">
          <span><i class="fas fa-users"></i> ${members} member${members !== 1 ? 's' : ''}</span>
          ${owner ? '<span><i class="fas fa-crown"></i> ' + esc(owner) + '</span>' : ''}
          ${g.last_message_at ? '<span><i class="fas fa-clock"></i> ' + esc(timeAgo(g.last_message_at)) + '</span>' : ''}
        </div>
      </div>
    </div>`;
}

/* ── Group view (info + chat) ─────────────────────────────── */

async function _sgOpenGroup(groupId) {
  const pg = document.getElementById('page-studygroups');
  if (!pg) return;
  _sgStopPoll();
  _sgState.view = 'group';
  _sgState.groupId = groupId;
  _sgState.messages = [];
  _sgState.lastId = 0;
  _sgState.hasOlder = false;
  pg.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:40vh"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--cyan)"></i></div>';

  const [gRes, mRes] = await Promise.all([
    api('/study_groups.php?action=get&group_id=' + groupId),
    api('/study_groups.php?action=members&group_id=' + groupId),
  ]);
  if (_sgState.groupId !== groupId || state.page !== 'studygroups') return;
  if (!gRes.success || !gRes.data || !gRes.data.group) {
    pg.innerHTML = `<div class="error-card"><div class="error-card-icon">⚠️</div><p class="error-card-title">${esc(gRes.error || 'Could not load group')}</p><button class="btn btn-primary error-card-retry" onclick="renderStudyGroups()">Back</button></div>`;
    return;
  }
  const g = gRes.data.group;
  _sgState.group = g;
  _sgState.members = (mRes.success && mRes.data && mRes.data.members) || [];
  _sgRenderGroup();

  if (g.is_member) {
    const res = await api('/study_groups.php?action=messages&group_id=' + groupId);
    if (_sgState.groupId !== groupId) return;
    if (res.success && res.data) {
      _sgState.messages = res.data.messages || [];
      _sgState.hasOlder = !!res.data.has_more;
      _sgState.lastId = _sgState.messages.reduce((mx, m) => Math.max(mx, parseInt(m.id) || 0), 0);
    }
    _sgRenderMessages(true);
    _sgState.pollTimer = setInterval(_sgPoll, SG_POLL_MS);
  }
}

function _sgRenderGroup() {
  const pg = document.getElementById('page-studygroups');
  const g = _sgState.group;
  if (!pg || !g) return;
  const owner = ((g.first_name || '') + ' ' + (g.last_name || '')).trim() || g.username || '';
  const members = _sgState.members;

  const actions = g.is_mine
    ? `<button class="btn btn-ghost" title="Edit group" onclick="_sgShowModal(${parseInt(g.id)})"><i class="fas fa-pen"></i></button>
       <button class="btn btn-ghost" title="Delete group" style="color:var(--danger)" onclick="_sgDeleteGroup(${parseInt(g.id)})"><i class="fas fa-trash"></i></button>`
    : g.is_member
      ? `<button class="btn btn-ghost" onclick="_sgLeave(${parseInt(g.id)})"><i class="fas fa-right-from-bracket"></i> Leave</button>`
      : `<button class="btn btn-primary" onclick="_sgJoin(${parseInt(g.id)})"><i class="fas fa-user-plus"></i> Join Group</button>`;

  pg.innerHTML = `
    <button class="btn btn-ghost" onclick="renderStudyGroups()" style="margin-bottom:12px">
      <i class="fas fa-arrow-left"></i> Back to Groups
    </button>
    <div class="fc-detail-header" style="border-left:4px solid var(--cyan)">
      <div style="display:flex;gap:12px;flex:1;min-width:0">
        <span class="sg-icon sg-icon-lg">${esc(g.icon || '📚')}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <h1 style="font-size:1.4rem;font-weight:800;color:var(--navy);margin:0;overflow-wrap:anywhere">${esc(g.name)}</h1>
            ${parseInt(g.is_private) === 1 ? '<span style="font-size:.75rem;color:var(--gray-400)"><i class="fas fa-lock"></i> Private</span>' : ''}
          </div>
          ${g.description ? '<p style="color:var(--gray-500);font-size:.88rem;margin:4px 0 8px;overflow-wrap:anywhere">' + esc(g.description) + '</p>' : ''}
          <div class="fc-deck-meta" style="font-size:.8rem">
            <span><i class="fas fa-users"></i> ${parseInt(g.member_count) || members.length} members</span>
            ${g.subject ? '<span><i class="fas fa-tag"></i> ' + esc(g.subject) + '</span>' : ''}
            ${owner ? '<span><i class="fas fa-crown"></i> ' + esc(owner) + '</span>' : ''}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;align-items:flex-start">${actions}</div>
    </div>

    <div class="sg-layout">
      <div class="sg-chat">
        ${g.is_member ? `
          <div class="sg-chat-messages" id="sgMessages"></div>
          <form class="sg-chat-input" onsubmit="event.preventDefault();_sgSend()">
            <textarea id="sgMsgInput" class="form-input" rows="1" maxlength="2000" placeholder="Write a message…"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();_sgSend()}"></textarea>
            <button type="submit" class="btn btn-primary" id="sgSendBtn" title="Send"><i class="fas fa-paper-plane"></i></button>
          </form>` : `
          <div class="empty-state" style="text-align:center;padding:50px 20px">
            <div style="font-size:2.4rem;margin-bottom:10px"><i class="fas fa-comments" style="color:var(--cyan)"></i></div>
            <p style="font-weight:600;color:var(--navy);margin-bottom:6px">Join to see the group chat</p>
            <p style="color:var(--gray-500)">Members can chat and study together here.</p>
          </div>`}
      </div>
      <aside class="sg-members">
        <h3>Members (${members.length})</h3>
        ${members.map(m => `
          <div class="sg-member">
            ${avatar(m, 30)}
            <span class="sg-member-name">${esc(((m.first_name || '') + ' ' + (m.last_name || '')).trim() || m.username || 'User')}</span>
            ${m.role !== 'member' ? '<span class="sg-role">' + esc(m.role) + '</span>' : ''}
          </div>`).join('')}
      </aside>
    </div>`;
}

function _sgMessageHtml(m) {
  const me = state.user && parseInt(m.user_id) === parseInt(state.user.id);
  const canDelete = me || (_sgState.group && _sgState.group.is_mine);
  const name = ((m.first_name || '') + ' ' + (m.last_name || '')).trim() || m.username || 'User';
  return `
    <div class="sg-msg ${me ? 'mine' : ''}" data-id="${parseInt(m.id)}">
      ${me ? '' : avatar({ id: m.user_id, first_name: m.first_name, last_name: m.last_name, username: m.username, avatar_url: m.avatar_url }, 30)}
      <div class="sg-msg-bubble">
        <div class="sg-msg-meta">
          ${me ? '' : '<span class="sg-msg-name">' + esc(name) + '</span>'}
          <span class="sg-msg-time">${esc(timeAgo(m.created_at))}</span>
          ${canDelete ? '<button class="sg-msg-del" title="Delete message" onclick="_sgDeleteMessage(' + parseInt(m.id) + ')"><i class="fas fa-trash"></i></button>' : ''}
        </div>
        <div class="sg-msg-text">${esc(m.content)}</div>
      </div>
    </div>`;
}

function _sgRenderMessages(scrollToBottom) {
  const box = document.getElementById('sgMessages');
  if (!box) return;
  const older = _sgState.hasOlder
    ? '<div style="text-align:center;margin-bottom:10px"><button class="btn btn-ghost" style="font-size:.8rem" onclick="_sgLoadOlder()">Load older messages</button></div>'
    : '';
  box.innerHTML = older + (_sgState.messages.length
    ? _sgState.messages.map(_sgMessageHtml).join('')
    : '<p style="text-align:center;color:var(--gray-400);padding:30px 0">No messages yet — say hi! 👋</p>');
  if (scrollToBottom) box.scrollTop = box.scrollHeight;
}

/* Merge messages by id (poll results may overlap with ones we just sent) */
function _sgMergeMessages(list) {
  const seen = new Set(_sgState.messages.map(m => parseInt(m.id)));
  let added = 0;
  list.forEach(m => {
    const id = parseInt(m.id);
    if (seen.has(id)) return;
    seen.add(id);
    _sgState.messages.push(m);
    _sgState.lastId = Math.max(_sgState.lastId, id);
    added++;
  });
  if (added) _sgState.messages.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  return added;
}

async function _sgPoll() {
  // Stop if the user left the page or the chat
  if (state.page !== 'studygroups' || _sgState.view !== 'group' || !document.getElementById('sgMessages')) {
    _sgStopPoll();
    return;
  }
  if (document.hidden || _sgState.polling) return;
  _sgState.polling = true;
  const groupId = _sgState.groupId;
  try {
    const res = await api('/study_groups.php?action=messages&group_id=' + groupId + '&after=' + _sgState.lastId);
    if (_sgState.groupId !== groupId || !res.success || !res.data) return;
    const box = document.getElementById('sgMessages');
    const nearBottom = box && (box.scrollHeight - box.scrollTop - box.clientHeight < 80);
    if (_sgMergeMessages(res.data.messages || [])) _sgRenderMessages(nearBottom);
  } finally {
    _sgState.polling = false;
  }
}

async function _sgLoadOlder() {
  const first = _sgState.messages[0];
  if (!first) return;
  const box = document.getElementById('sgMessages');
  const prevHeight = box ? box.scrollHeight : 0;
  const res = await api('/study_groups.php?action=messages&group_id=' + _sgState.groupId + '&before=' + parseInt(first.id));
  if (!res.success || !res.data) { toast(res.error || 'Could not load messages', 'error'); return; }
  _sgState.hasOlder = !!res.data.has_more;
  _sgState.messages = (res.data.messages || []).concat(_sgState.messages);
  _sgRenderMessages(false);
  if (box) box.scrollTop = box.scrollHeight - prevHeight; // keep the view anchored
}

async function _sgSend() {
  const input = document.getElementById('sgMsgInput');
  const btn = document.getElementById('sgSendBtn');
  const content = (input?.value || '').trim();
  if (!content) return;
  if (btn) btn.disabled = true;
  const res = await api('/study_groups.php?action=send_message', 'POST', { group_id: _sgState.groupId, content });
  if (btn) btn.disabled = false;
  if (!res.success) { toast(res.error || 'Could not send message', 'error'); return; }
  if (input) { input.value = ''; input.focus(); }
  if (res.data && res.data.message) _sgMergeMessages([res.data.message]);
  _sgRenderMessages(true);
}

async function _sgDeleteMessage(msgId) {
  if (!confirm('Delete this message?')) return;
  const res = await api('/study_groups.php?action=delete_message', 'POST', { message_id: msgId });
  if (!res.success) { toast(res.error || 'Delete failed', 'error'); return; }
  _sgState.messages = _sgState.messages.filter(m => parseInt(m.id) !== parseInt(msgId));
  _sgRenderMessages(false);
}

async function _sgJoin(groupId) {
  const res = await api('/study_groups.php?action=join', 'POST', { group_id: groupId });
  if (!res.success) { toast(res.error || 'Could not join group', 'error'); return; }
  toast('Joined group!', 'success');
  _sgOpenGroup(groupId);
}

async function _sgLeave(groupId) {
  if (!confirm('Leave this group?')) return;
  const res = await api('/study_groups.php?action=leave', 'POST', { group_id: groupId });
  if (!res.success) { toast(res.error || 'Could not leave group', 'error'); return; }
  toast('You left the group', 'success');
  renderStudyGroups();
}

async function _sgDeleteGroup(groupId) {
  if (!confirm('Delete this group and all its messages? This cannot be undone.')) return;
  const res = await api('/study_groups.php?action=delete', 'POST', { group_id: groupId });
  if (!res.success) { toast(res.error || 'Delete failed', 'error'); return; }
  toast('Group deleted', 'success');
  _sgState.tab = 'my';
  renderStudyGroups();
}

/* ── Create / Edit Group Modal ────────────────────────────── */

function _sgShowModal(groupId) {
  const g = groupId && _sgState.group && parseInt(_sgState.group.id) === parseInt(groupId) ? _sgState.group : null;
  _sgState.editId = g ? parseInt(g.id) : null;
  const titleEl = document.getElementById('sgModalTitle');
  const submitEl = document.getElementById('sgModalSubmit');
  if (titleEl) titleEl.textContent = g ? 'Edit Group' : 'Create Study Group';
  if (submitEl) submitEl.textContent = g ? 'Save Changes' : 'Create Group';
  const icons = ['📚', '🧮', '🔬', '🧪', '🧬', '🌍', '📖', '💻', '🎨', '🎵', '🏛️', '✏️'];
  const curIcon = g ? (g.icon || '📚') : '📚';
  const body = document.getElementById('sgModalBody');
  if (body) body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div>
        <label class="sg-label">Name *</label>
        <input type="text" id="sgName" class="form-input" maxlength="200" placeholder="e.g. IELTS Speaking Practice" value="${esc(g ? g.name : '')}" style="width:100%">
      </div>
      <div>
        <label class="sg-label">Description</label>
        <textarea id="sgDesc" class="form-input" rows="3" maxlength="2000" placeholder="What will this group study?" style="width:100%;resize:vertical">${esc(g ? (g.description || '') : '')}</textarea>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px">
          <label class="sg-label">Subject</label>
          <input type="text" id="sgSubject" class="form-input" maxlength="100" placeholder="e.g. Mathematics" value="${esc(g ? (g.subject || '') : '')}" style="width:100%">
        </div>
        <div style="flex:1;min-width:160px">
          <label class="sg-label">Visibility</label>
          <select id="sgPrivate" class="form-input" style="width:100%">
            <option value="0" ${g && parseInt(g.is_private) === 1 ? '' : 'selected'}>Public — anyone can find and join</option>
            <option value="1" ${g && parseInt(g.is_private) === 1 ? 'selected' : ''}>Private — hidden from Discover</option>
          </select>
        </div>
      </div>
      <div>
        <label class="sg-label">Icon</label>
        <div class="sg-icon-picker" id="sgIconPicker">
          ${icons.map(i => `<button type="button" class="sg-icon-opt ${i === curIcon ? 'active' : ''}" data-icon="${i}" onclick="_sgPickIcon(this)">${i}</button>`).join('')}
        </div>
      </div>
    </div>`;
  openModal('studyGroupModal');
  setTimeout(() => document.getElementById('sgName')?.focus(), 50);
}

function _sgPickIcon(btn) {
  document.querySelectorAll('#sgIconPicker .sg-icon-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function _sgSubmitModal() {
  const name = (document.getElementById('sgName')?.value || '').trim();
  if (!name) { toast('Please enter a group name', 'error'); return; }
  const payload = {
    name,
    description: (document.getElementById('sgDesc')?.value || '').trim(),
    subject: (document.getElementById('sgSubject')?.value || '').trim(),
    is_private: document.getElementById('sgPrivate')?.value === '1' ? 1 : 0,
    icon: document.querySelector('#sgIconPicker .sg-icon-opt.active')?.dataset.icon || '📚',
  };
  const editId = _sgState.editId;
  const btn = document.getElementById('sgModalSubmit');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  const res = editId
    ? await api('/study_groups.php?action=update', 'POST', Object.assign({ group_id: editId }, payload))
    : await api('/study_groups.php?action=create', 'POST', payload);
  if (btn) { btn.disabled = false; btn.textContent = editId ? 'Save Changes' : 'Create Group'; }
  if (!res.success) { toast(res.error || 'Could not save group', 'error'); return; }

  closeModal('studyGroupModal');
  toast(editId ? 'Group updated!' : 'Study group created!', 'success');
  const openId = editId || (res.data && res.data.group && parseInt(res.data.group.id));
  if (openId) _sgOpenGroup(openId);
  else renderStudyGroups();
}
