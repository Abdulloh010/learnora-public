/* ════════════════════════════════════════════════════════════════
   Learnora — Courses Page
   ════════════════════════════════════════════════════════════════ */

let _coursesTab    = 'discover';
let _coursesFilter = 'All';
let _coursesSearch = '';
let _coursesCache  = [];
let _enrolledCache = [];

const COURSE_SUBJECTS = ['All','Mathematics','Physics','Chemistry','Biology',
  'English','History','Geography','Computer Science','Economics','Art','Music'];

/* ── Entry point (called by navigate) ─────────────────────────── */
async function renderCoursesPage() {
  const pg = document.getElementById('page-courses');
  if (!pg) return;

  // Reset full-page mode if returning from course detail
  pg.classList.remove('page-course-detail-active');

  pg.innerHTML = `
    <div class="courses-page-wrap">
      <!-- Hero banner -->
      <div class="courses-hero">
        <div class="courses-hero-inner">
          <div class="courses-hero-icon"><i class="fas fa-book-open"></i></div>
          <div>
            <h1 class="courses-hero-title">Courses</h1>
            <p class="courses-hero-sub">Structured multi-session learning programmes led by peers</p>
          </div>
        </div>
      </div>
      <!-- Tab bar -->
      <div class="courses-tabs-wrap">
        <div class="courses-tabs">
          <button class="courses-tab-btn ${_coursesTab === 'discover' ? 'active' : ''}" onclick="switchCoursesTab('discover')">
            <i class="fas fa-compass"></i><span>Discover</span>
          </button>
          <button class="courses-tab-btn ${_coursesTab === 'enrolled' ? 'active' : ''}" onclick="switchCoursesTab('enrolled')">
            <i class="fas fa-graduation-cap"></i><span>My Courses</span>
          </button>
        </div>
      </div>
      <div class="courses-tab-body" id="coursesTabBody"></div>
    </div>`;

  if (_coursesTab === 'discover') renderCourseDiscover();
  else renderEnrolledCourses();
}

function switchCoursesTab(tab) {
  _coursesTab = tab;
  document.querySelectorAll('#page-courses .courses-tab-btn').forEach(b => {
    const t = b.getAttribute('onclick').includes("'discover'") ? 'discover' : 'enrolled';
    b.classList.toggle('active', t === tab);
  });
  const body = document.getElementById('coursesTabBody');
  if (!body) return;
  if (tab === 'discover') renderCourseDiscover();
  else renderEnrolledCourses();
}

/* ── Discover tab ──────────────────────────────────────────────── */
function renderCourseDiscover() {
  const body = document.getElementById('coursesTabBody');
  if (!body) return;

  body.innerHTML = `
    <div class="courses-search-row">
      <div style="flex:1;min-width:0;position:relative">
        <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--gray-400);font-size:.85rem;pointer-events:none"></i>
        <input class="form-control" id="coursesSearchInput" placeholder="Search courses or teachers…"
          value="${esc(_coursesSearch)}" oninput="_coursesSearch=this.value;_debouncedLoadCourses()"
          style="padding-left:36px">
      </div>
    </div>
    <div class="courses-filter-scroll" id="coursesFilterBtns">
      ${COURSE_SUBJECTS.map(s =>
        `<button class="courses-filter-pill ${_coursesFilter === s ? 'active' : ''}"
           onclick="setCourseFilter('${s}')">${s}</button>`
      ).join('')}
    </div>
    <div id="coursesGrid">${skeletons(4, 180)}</div>`;

  _loadCourses();
}

function setCourseFilter(subject) {
  _coursesFilter = subject;
  document.querySelectorAll('#coursesFilterBtns .courses-filter-pill').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === subject);
  });
  _loadCourses();
}

let _coursesDebounceTimer = null;
function _debouncedLoadCourses() {
  clearTimeout(_coursesDebounceTimer);
  _coursesDebounceTimer = setTimeout(_loadCourses, 320);
}

async function _loadCourses() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;
  grid.innerHTML = skeletons(4, 180);

  let qs = '';
  if (_coursesFilter !== 'All') qs += '&subject=' + encodeURIComponent(_coursesFilter);
  if (_coursesSearch.trim())    qs += '&search='  + encodeURIComponent(_coursesSearch.trim());

  const res = await api('/courses.php?action=list' + qs);
  if (!document.getElementById('coursesGrid')) return; // navigated away
  if (!res.success) { grid.innerHTML = errorCard('Could not load courses.', '📚', '_loadCourses'); return; }

  _coursesCache = res.data || [];

  if (!_coursesCache.length) {
    grid.innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:var(--gray-400)">
        <div style="font-size:3rem;margin-bottom:14px">📚</div>
        <p style="font-size:1rem;font-weight:600;color:var(--navy);margin-bottom:6px">No courses found</p>
        <p style="font-size:.85rem">${_coursesSearch
          ? `No results for "<strong>${esc(_coursesSearch)}</strong>"`
          : 'Check back soon — teachers are creating courses!'
        }</p>
      </div>`;
    return;
  }

  grid.innerHTML = `
    <div class="courses-discover-grid">
      ${_coursesCache.map(c => coursePageCard(c)).join('')}
    </div>`;
}

function coursePageCard(c) {
  const sessions  = c.sessions || [];
  const regCount  = parseInt(c.registered_count) || 0;
  const isFull    = regCount >= parseInt(c.max_students);
  const isReg     = parseInt(c.is_registered) > 0;
  const isOwn     = state.user && parseInt(c.teacher_id) === parseInt(state.user.id);
  const avgRating = parseFloat(c.avg_rating) || 0;
  const nextRaw   = c.next_session_at;
  const nextDt    = nextRaw ? parseUtc(nextRaw) : null;
  const nextStr   = nextDt ? `Starts ${fmtDate(nextDt)}` : 'Schedule TBD';
  const avatar    = esc(c.avatar_url || '');

  return `
    <div class="course-page-card" onclick="showCourseDetail(${c.id})">
      <div class="cpcard-header">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span class="cpcard-subject">${esc(c.subject)}</span>
          <span class="cpcard-sessions">${sessions.length} session${sessions.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="cpcard-title">${esc(c.title)}</div>
      </div>
      <div class="cpcard-body">
        ${c.description ? `<p class="cpcard-desc">${esc(c.description)}</p>` : ''}
        <div class="cpcard-teacher" onclick="event.stopPropagation();viewTeacherProfile(${c.teacher_id})">
          <img src="${avatar}" onerror="this.style.background='var(--gray-200)';this.removeAttribute('src')"
            style="width:26px;height:26px;border-radius:50%;object-fit:cover;background:var(--gray-100)">
          <span>${esc(c.first_name)} ${esc(c.last_name)}</span>
          ${avgRating ? `<span class="cpcard-rating">${avgRating}★</span>` : ''}
        </div>
        <div class="cpcard-meta">
          <span><i class="fas fa-calendar" style="margin-right:4px"></i>${nextStr}</span>
          <span style="color:var(--gray-400)">${regCount}/${c.max_students} enrolled</span>
        </div>
        <div class="cpcard-footer">
          ${isOwn
            ? `<span style="font-size:.75rem;color:var(--gray-400)">Your course</span>`
            : isReg
              ? `<span class="cpcard-enrolled"><i class="fas fa-check-circle"></i> Enrolled</span>`
              : isFull
                ? `<span class="cpcard-full">Course Full</span>`
                : `<span class="cpcard-enroll">View &amp; Enroll</span>`
          }
        </div>
      </div>
    </div>`;
}

/* ── My Courses tab ────────────────────────────────────────────── */
async function renderEnrolledCourses() {
  const body = document.getElementById('coursesTabBody');
  if (!body) return;
  body.innerHTML = skeletons(3, 160);

  const res = await api('/courses.php?action=enrolled');
  if (!document.getElementById('coursesTabBody')) return;
  if (!res.success) { body.innerHTML = errorCard('Could not load your courses.', '📚', 'renderEnrolledCourses'); return; }

  _enrolledCache = res.data || [];

  if (!_enrolledCache.length) {
    body.innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:var(--gray-400)">
        <div style="font-size:3rem;margin-bottom:14px">🎓</div>
        <p style="font-size:1rem;font-weight:600;color:var(--navy);margin-bottom:6px">No courses yet</p>
        <p style="font-size:.85rem;margin-bottom:20px">Discover and enrol in a course to start learning.</p>
        <button class="btn btn-primary" onclick="switchCoursesTab('discover')">
          <i class="fas fa-compass"></i> Browse Courses
        </button>
      </div>`;
    return;
  }

  body.innerHTML = `
    <div class="courses-enrolled-list">
      ${_enrolledCache.map(c => enrolledCourseCard(c)).join('')}
    </div>`;
}

function enrolledCourseCard(c) {
  const sessions = c.sessions || [];
  const total    = sessions.length;
  const attended = sessions.filter(s => parseInt(s.attended)).length;
  const pct      = total ? Math.round((attended / total) * 100) : 0;
  const nextRaw  = c.next_session_at;
  const nextDt   = nextRaw ? parseUtc(nextRaw) : null;
  const nextStr  = nextDt ? `${fmtDate(nextDt)} · ${fmtTime(nextDt)}` : 'All sessions ended';

  const dotHtml = sessions.slice(0, 6).map((s, i) => {
    const done     = parseInt(s.attended);
    const upcoming = s.status === 'upcoming';
    const bg       = done ? 'var(--cyan)' : upcoming ? 'var(--gray-200)' : 'var(--gray-300)';
    const color    = done ? '#fff' : 'var(--gray-500)';
    return `<div title="Session ${i + 1}: ${esc(s.title || 'Session ' + (i + 1))}"
      style="width:22px;height:22px;border-radius:50%;background:${bg};display:flex;align-items:center;
             justify-content:center;font-size:.6rem;color:${color};font-weight:700;flex-shrink:0">
      ${done ? '<i class="fas fa-check" style="font-size:.55rem"></i>' : (i + 1)}
    </div>`;
  }).join('');

  return `
    <div class="enrolled-course-card" onclick="showCourseDetail(${c.id})">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
            <span class="cpcard-subject" style="font-size:.68rem">${esc(c.subject)}</span>
            <span style="font-size:.7rem;color:var(--gray-400)">${total} sessions</span>
          </div>
          <div style="font-weight:700;font-size:1rem;color:var(--navy);line-height:1.3">${esc(c.title)}</div>
          <div style="font-size:.78rem;color:var(--gray-500);margin-top:3px">${esc(c.first_name)} ${esc(c.last_name)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:1.25rem;font-weight:800;color:var(--cyan)">${pct}%</div>
          <div style="font-size:.72rem;color:var(--gray-400)">${attended}/${total} done</div>
        </div>
      </div>
      <div class="course-progress-track">
        <div class="course-progress-fill" style="width:${pct}%"></div>
      </div>
      <div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <span style="font-size:.77rem;color:var(--gray-400)">
          <i class="fas fa-calendar" style="margin-right:4px"></i>${nextStr}
        </span>
        <div style="display:flex;gap:5px;align-items:center">
          ${dotHtml}
          ${total > 6 ? `<span style="color:var(--gray-400);font-size:.7rem">+${total - 6}</span>` : ''}
        </div>
      </div>
    </div>`;
}
