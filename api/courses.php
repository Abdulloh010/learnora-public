<?php
require 'config.php';

/* ── Lazy migrations ──────────────────────────────────────────── */
(function () {
    try {
        $pdo = getDB();
        $pdo->exec("CREATE TABLE IF NOT EXISTS course_resources (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            course_id    INT NOT NULL,
            user_id      INT NOT NULL,
            title        VARCHAR(255) NOT NULL,
            resource_type ENUM('link','file') NOT NULL DEFAULT 'link',
            url          TEXT NOT NULL,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $pdo->exec("CREATE TABLE IF NOT EXISTS course_discussions (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            course_id  INT NOT NULL,
            user_id    INT NOT NULL,
            body       TEXT NOT NULL,
            is_pinned  TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Exception $e) { /* silent — table may already exist */ }
})();

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

switch ($action) {
    case 'list':              listCourses();              break;
    case 'enrolled':          enrolledCourses();          break;
    case 'detail':            courseDetail();             break;
    case 'list_resources':    listResources();            break;
    case 'add_resource':      addResource($body);         break;
    case 'delete_resource':   deleteResource($body);      break;
    case 'list_discussion':   listDiscussion();           break;
    case 'add_discussion':    addDiscussion($body);       break;
    case 'delete_discussion': deleteDiscussion($body);    break;
    default: jsonError('Unknown action');
}

/* ── List / discover courses (students) ───────────────────────── */
function listCourses() {
    $pdo     = getDB();
    $subject = sanitize($_GET['subject'] ?? '');
    $search  = sanitize($_GET['search']  ?? '');
    $me      = getAuthUser();

    $select = "SELECT c.*,
                   u.first_name, u.last_name, u.username, u.avatar_url, u.xp,
                   (SELECT COUNT(*) FROM course_registrations cr  WHERE cr.course_id  = c.id) AS registered_count,
                   (SELECT ROUND(AVG(sf.rating),1)
                    FROM session_feedback sf
                    WHERE sf.to_user_id = c.teacher_id AND sf.feedback_type = 'student_to_teacher'
                      AND sf.rating IS NOT NULL) AS avg_rating,
                   (SELECT COUNT(*)
                    FROM session_feedback sf2
                    WHERE sf2.to_user_id = c.teacher_id AND sf2.feedback_type = 'student_to_teacher'
                      AND sf2.rating IS NOT NULL) AS total_reviews,
                   (SELECT MIN(ts.scheduled_at)
                    FROM teaching_sessions ts
                    WHERE ts.course_id = c.id AND ts.status = 'upcoming') AS next_session_at";

    $params = [];
    if ($me) {
        $select .= ", (SELECT COUNT(*) FROM course_registrations cr2
                       WHERE cr2.course_id = c.id AND cr2.student_id = ?) AS is_registered";
        $params[] = $me['id'];
    }

    $where = ["c.status IN ('upcoming','ongoing')"];
    if ($subject) { $where[] = 'c.subject = ?'; $params[] = $subject; }
    if ($search) {
        $where[] = '(c.title LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR c.subject LIKE ?)';
        $like     = '%' . $search . '%';
        array_push($params, $like, $like, $like, $like);
    }

    $sql  = "$select FROM courses c JOIN users u ON u.id = c.teacher_id";
    $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY next_session_at ASC LIMIT 40';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $courses = $stmt->fetchAll();

    foreach ($courses as &$course) {
        $ss = $pdo->prepare(
            "SELECT id, session_number, title, scheduled_at, duration_minutes, status
             FROM teaching_sessions WHERE course_id = ? ORDER BY session_number ASC"
        );
        $ss->execute([$course['id']]);
        $course['sessions'] = $ss->fetchAll();
    }

    jsonSuccess($courses);
}

/* ── Enrolled courses for the logged-in student (with progress) ── */
function enrolledCourses() {
    $me  = requireAuth();
    $pdo = getDB();

    $stmt = $pdo->prepare(
        "SELECT c.*,
                u.first_name, u.last_name, u.username, u.avatar_url,
                cr.registered_at, cr.intro_answer,
                (SELECT COUNT(*) FROM course_registrations cr2 WHERE cr2.course_id = c.id) AS registered_count,
                (SELECT COUNT(*) FROM teaching_sessions ts  WHERE ts.course_id  = c.id) AS total_sessions,
                (SELECT COUNT(*)
                 FROM session_registrations sr
                 JOIN teaching_sessions ts2 ON ts2.id = sr.session_id
                 WHERE ts2.course_id = c.id AND sr.student_id = ? AND sr.attended = 1) AS sessions_attended,
                (SELECT MIN(ts3.scheduled_at)
                 FROM teaching_sessions ts3
                 WHERE ts3.course_id = c.id AND ts3.status = 'upcoming') AS next_session_at
         FROM course_registrations cr
         JOIN courses c ON c.id = cr.course_id
         JOIN users u ON u.id = c.teacher_id
         WHERE cr.student_id = ?
         ORDER BY c.created_at DESC"
    );
    $stmt->execute([$me['id'], $me['id']]);
    $courses = $stmt->fetchAll();

    foreach ($courses as &$course) {
        $ss = $pdo->prepare(
            "SELECT ts.id, ts.session_number, ts.title, ts.scheduled_at,
                    ts.duration_minutes, ts.status, ts.description, ts.attendance_reported_at,
                    COALESCE(sr.attended, 0) AS attended,
                    COALESCE(sr.will_attend, 1) AS will_attend,
                    sr.absent_reason
             FROM teaching_sessions ts
             LEFT JOIN session_registrations sr
                    ON sr.session_id = ts.id AND sr.student_id = ?
             WHERE ts.course_id = ?
             ORDER BY ts.session_number ASC"
        );
        $ss->execute([$me['id'], $course['id']]);
        $course['sessions'] = $ss->fetchAll();
    }

    jsonSuccess($courses);
}

/* ── Course detail with per-student progress context ─────────── */
function courseDetail() {
    $pdo      = getDB();
    $courseId = intval($_GET['course_id'] ?? 0);
    if (!$courseId) jsonError('course_id required');
    $me = getAuthUser();

    $select = "SELECT c.*,
                   u.first_name, u.last_name, u.username, u.avatar_url, u.xp,
                   (SELECT COUNT(*) FROM course_registrations cr WHERE cr.course_id = c.id) AS registered_count,
                   (SELECT ROUND(AVG(sf.rating),1)
                    FROM session_feedback sf
                    WHERE sf.to_user_id = c.teacher_id AND sf.feedback_type = 'student_to_teacher'
                      AND sf.rating IS NOT NULL) AS avg_rating";

    $params = [];
    if ($me) {
        $select .= ", (SELECT COUNT(*) FROM course_registrations cr2
                       WHERE cr2.course_id = c.id AND cr2.student_id = ?) AS is_registered,
                      (SELECT intro_answer FROM course_registrations cr3
                       WHERE cr3.course_id = c.id AND cr3.student_id = ? LIMIT 1) AS my_intro_answer";
        array_push($params, $me['id'], $me['id']);
    }

    $params[] = $courseId;
    $sql      = "$select FROM courses c JOIN users u ON u.id = c.teacher_id WHERE c.id = ?";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $course = $stmt->fetch();
    if (!$course) jsonError('Course not found', 404);

    // Sessions — include per-student attendance when logged in
    if ($me) {
        $ss = $pdo->prepare(
            "SELECT ts.id, ts.session_number, ts.title, ts.scheduled_at,
                    ts.duration_minutes, ts.status, ts.description, ts.attendance_reported_at,
                    COALESCE(sr.attended, 0) AS attended,
                    COALESCE(sr.will_attend, 1) AS will_attend,
                    sr.absent_reason
             FROM teaching_sessions ts
             LEFT JOIN session_registrations sr
                    ON sr.session_id = ts.id AND sr.student_id = ?
             WHERE ts.course_id = ? ORDER BY ts.session_number ASC"
        );
        $ss->execute([$me['id'], $courseId]);
    } else {
        $ss = $pdo->prepare(
            "SELECT id, session_number, title, scheduled_at, duration_minutes, status, description, attendance_reported_at
             FROM teaching_sessions WHERE course_id = ? ORDER BY session_number ASC"
        );
        $ss->execute([$courseId]);
    }

    $course['sessions'] = $ss->fetchAll();
    jsonSuccess($course);
}

/* ── Resources ─────────────────────────────────────────────────── */
function _courseAccess(int $courseId): array {
    $pdo  = getDB();
    $me   = getAuthUser();
    $stmt = $pdo->prepare('SELECT * FROM courses WHERE id=?');
    $stmt->execute([$courseId]);
    $course = $stmt->fetch();
    if (!$course) jsonError('Course not found', 404);
    $isTeacher  = $me && intval($me['id']) === intval($course['teacher_id']);
    $isEnrolled = false;
    if ($me && !$isTeacher) {
        $r = $pdo->prepare('SELECT id FROM course_registrations WHERE course_id=? AND student_id=?');
        $r->execute([$courseId, $me['id']]);
        $isEnrolled = (bool)$r->fetch();
    }
    return [$pdo, $me, $course, $isTeacher, $isEnrolled];
}

function listResources() {
    $courseId = intval($_GET['course_id'] ?? 0);
    if (!$courseId) jsonError('course_id required');
    [$pdo, $me, $course, $isTeacher, $isEnrolled] = _courseAccess($courseId);
    if (!$isTeacher && !$isEnrolled) jsonSuccess([]); // not enrolled → empty list (hide silently)

    $stmt = $pdo->prepare(
        "SELECT cr.*, u.first_name, u.last_name FROM course_resources cr
         JOIN users u ON u.id = cr.user_id
         WHERE cr.course_id = ? ORDER BY cr.created_at ASC"
    );
    $stmt->execute([$courseId]);
    jsonSuccess($stmt->fetchAll());
}

function addResource($data) {
    $me = requireAuth();
    $pdo = getDB();
    $courseId = intval($data['course_id'] ?? 0);
    $title    = sanitize($data['title']   ?? '');
    $type     = in_array($data['type'] ?? '', ['link','file']) ? $data['type'] : 'link';
    $url      = sanitize($data['url']     ?? '');
    if (!$courseId || !$title || !$url) jsonError('course_id, title and url required');

    $own = $pdo->prepare('SELECT teacher_id FROM courses WHERE id=?');
    $own->execute([$courseId]);
    $row = $own->fetch();
    if (!$row || intval($row['teacher_id']) !== intval($me['id'])) jsonError('Not authorised');

    $pdo->prepare("INSERT INTO course_resources (course_id, user_id, title, resource_type, url) VALUES (?,?,?,?,?)")
        ->execute([$courseId, $me['id'], $title, $type, $url]);
    jsonSuccess(['id' => $pdo->lastInsertId(), 'title' => $title, 'resource_type' => $type, 'url' => $url]);
}

function deleteResource($data) {
    $me = requireAuth();
    $pdo = getDB();
    $id = intval($data['id'] ?? 0);
    if (!$id) jsonError('id required');

    $stmt = $pdo->prepare(
        "SELECT cr.id FROM course_resources cr
         JOIN courses c ON c.id = cr.course_id
         WHERE cr.id=? AND c.teacher_id=?"
    );
    $stmt->execute([$id, $me['id']]);
    if (!$stmt->fetch()) jsonError('Not found or not authorised');

    $pdo->prepare("DELETE FROM course_resources WHERE id=?")->execute([$id]);
    jsonSuccess(['deleted' => true]);
}

/* ── Discussion ────────────────────────────────────────────────── */
function listDiscussion() {
    $courseId = intval($_GET['course_id'] ?? 0);
    if (!$courseId) jsonError('course_id required');
    [$pdo, $me, $course, $isTeacher, $isEnrolled] = _courseAccess($courseId);
    if (!$isTeacher && !$isEnrolled) jsonSuccess([]);

    $stmt = $pdo->prepare(
        "SELECT cd.*, u.first_name, u.last_name, u.username, u.avatar_url, u.role
         FROM course_discussions cd
         JOIN users u ON u.id = cd.user_id
         WHERE cd.course_id = ?
         ORDER BY cd.is_pinned DESC, cd.created_at ASC"
    );
    $stmt->execute([$courseId]);
    jsonSuccess($stmt->fetchAll());
}

function addDiscussion($data) {
    $me = requireAuth();
    $pdo = getDB();
    $courseId = intval($data['course_id'] ?? 0);
    $body     = sanitize($data['body']    ?? '');
    if (!$courseId || !$body) jsonError('course_id and body required');

    [$pdo2, $me2, $course, $isTeacher, $isEnrolled] = _courseAccess($courseId);
    if (!$isTeacher && !$isEnrolled) jsonError('You must be enrolled to post in this discussion');

    $pdo->prepare("INSERT INTO course_discussions (course_id, user_id, body) VALUES (?,?,?)")
        ->execute([$courseId, $me['id'], $body]);
    jsonSuccess(['id' => $pdo->lastInsertId()]);
}

function deleteDiscussion($data) {
    $me = requireAuth();
    $pdo = getDB();
    $id = intval($data['id'] ?? 0);
    if (!$id) jsonError('id required');

    // Teacher of the course OR post owner can delete
    $stmt = $pdo->prepare(
        "SELECT cd.user_id, c.teacher_id FROM course_discussions cd
         JOIN courses c ON c.id = cd.course_id
         WHERE cd.id=?"
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) jsonError('Post not found');
    if (intval($row['user_id']) !== intval($me['id']) && intval($row['teacher_id']) !== intval($me['id'])) {
        jsonError('Not authorised');
    }

    $pdo->prepare("DELETE FROM course_discussions WHERE id=?")->execute([$id]);
    jsonSuccess(['deleted' => true]);
}
