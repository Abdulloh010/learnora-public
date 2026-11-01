<?php
require 'config.php';

/* ── Lazy schema: new columns + tables ─────────────────────── */
(function () {
    $db = getDB();

    // role + approved_subjects on users
    foreach ([
        'role'              => "ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'student'",
        'approved_subjects' => 'ADD COLUMN approved_subjects TEXT DEFAULT NULL',
        'public_bio'        => 'ADD COLUMN public_bio TEXT DEFAULT NULL',
        'current_status'    => 'ADD COLUMN current_status VARCHAR(100) DEFAULT NULL',
        'standardized_tests'=> 'ADD COLUMN standardized_tests TEXT DEFAULT NULL',
        'test_subjects'     => 'ADD COLUMN test_subjects TEXT DEFAULT NULL',
    ] as $col => $ddl) {
        try { $db->query("SELECT $col FROM users LIMIT 1"); }
        catch (Exception $e) {
            try { $db->exec("ALTER TABLE users $ddl"); } catch (Exception $e2) {}
        }
    }

    // teacher_applications
    $db->exec("CREATE TABLE IF NOT EXISTS teacher_applications (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        user_id          INT NOT NULL,
        full_name        VARCHAR(150) NOT NULL,
        age              INT,
        location         VARCHAR(150),
        public_bio       TEXT,
        current_status   VARCHAR(100),
        standardized_tests TEXT,
        test_subjects    TEXT,
        test_scores      TEXT,
        subjects_to_teach TEXT,
        id_document_url  VARCHAR(1000),
        video_pitch_url  VARCHAR(1000),
        status           VARCHAR(30) NOT NULL DEFAULT 'pending',
        admin_notes      TEXT,
        submitted_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reviewed_at      DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_status (status),
        INDEX idx_user   (user_id)
    )");

    // teaching_sessions
    $db->exec("CREATE TABLE IF NOT EXISTS teaching_sessions (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        teacher_id       INT NOT NULL,
        title            VARCHAR(255) NOT NULL,
        subject          VARCHAR(100) NOT NULL,
        description      TEXT,
        scheduled_at     DATETIME NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 60,
        meeting_link     VARCHAR(1000),
        max_students     INT NOT NULL DEFAULT 20,
        status           VARCHAR(30) NOT NULL DEFAULT 'upcoming',
        created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ended_at         DATETIME,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_teacher   (teacher_id),
        INDEX idx_status    (status),
        INDEX idx_scheduled (scheduled_at)
    )");

    // Lazy-add columns to teaching_sessions
    foreach ([
        'intro_question'        => 'ADD COLUMN intro_question TEXT DEFAULT NULL',
        'attendance_reported_at'=> 'ADD COLUMN attendance_reported_at DATETIME DEFAULT NULL',
        'session_timezone'      => "ADD COLUMN session_timezone VARCHAR(100) NOT NULL DEFAULT 'UTC'",
        'jitsi_room_id'         => 'ADD COLUMN jitsi_room_id VARCHAR(200) DEFAULT NULL',
        'started_at'            => 'ADD COLUMN started_at DATETIME DEFAULT NULL',
    ] as $col => $ddl) {
        try { $db->query("SELECT $col FROM teaching_sessions LIMIT 1"); }
        catch (Exception $e) { try { $db->exec("ALTER TABLE teaching_sessions $ddl"); } catch (Exception $e2) {} }
    }

    // Lazy-add preferred_timezone to users
    try { $db->query('SELECT preferred_timezone FROM users LIMIT 1'); }
    catch (Exception $e) { try { $db->exec("ALTER TABLE users ADD COLUMN preferred_timezone VARCHAR(100) NOT NULL DEFAULT 'UTC'"); } catch (Exception $e2) {} }

    // session_registrations
    $db->exec("CREATE TABLE IF NOT EXISTS session_registrations (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        session_id    INT NOT NULL,
        student_id    INT NOT NULL,
        registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        attended      TINYINT  NOT NULL DEFAULT 0,
        xp_awarded    TINYINT  NOT NULL DEFAULT 0,
        intro_answer  TEXT     DEFAULT NULL,
        FOREIGN KEY (session_id) REFERENCES teaching_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id)             ON DELETE CASCADE,
        UNIQUE KEY uniq_reg (session_id, student_id)
    )");

    // Lazy-add columns to session_registrations
    foreach ([
        'intro_answer'  => 'ADD COLUMN intro_answer TEXT DEFAULT NULL',
        'reminder_sent' => 'ADD COLUMN reminder_sent TINYINT NOT NULL DEFAULT 0',
        'will_attend'   => 'ADD COLUMN will_attend TINYINT(1) NOT NULL DEFAULT 1',
        'absent_reason' => 'ADD COLUMN absent_reason TEXT DEFAULT NULL',
    ] as $col => $ddl) {
        try { $db->query("SELECT $col FROM session_registrations LIMIT 1"); }
        catch (Exception $e) { try { $db->exec("ALTER TABLE session_registrations $ddl"); } catch (Exception $e2) {} }
    }

    // courses table
    $db->exec("CREATE TABLE IF NOT EXISTS courses (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        teacher_id       INT NOT NULL,
        title            VARCHAR(255) NOT NULL,
        subject          VARCHAR(100) NOT NULL,
        description      TEXT,
        total_sessions   INT NOT NULL DEFAULT 1,
        max_students     INT NOT NULL DEFAULT 20,
        status           VARCHAR(30) NOT NULL DEFAULT 'upcoming',
        intro_question   TEXT DEFAULT NULL,
        session_timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
        created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_teacher (teacher_id),
        INDEX idx_status  (status)
    )");

    // course_registrations table
    $db->exec("CREATE TABLE IF NOT EXISTS course_registrations (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        course_id     INT NOT NULL,
        student_id    INT NOT NULL,
        registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        intro_answer  TEXT DEFAULT NULL,
        FOREIGN KEY (course_id)  REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id)   ON DELETE CASCADE,
        UNIQUE KEY uniq_course_reg (course_id, student_id)
    )");

    // Lazy-add course_id and session_number to teaching_sessions
    foreach ([
        'course_id'      => 'ADD COLUMN course_id INT DEFAULT NULL',
        'session_number' => 'ADD COLUMN session_number INT DEFAULT NULL',
    ] as $col => $ddl) {
        try { $db->query("SELECT $col FROM teaching_sessions LIMIT 1"); }
        catch (Exception $e) { try { $db->exec("ALTER TABLE teaching_sessions $ddl"); } catch (Exception $e2) {} }
    }

    // session_resources
    $db->exec("CREATE TABLE IF NOT EXISTS session_resources (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        session_id    INT NOT NULL,
        user_id       INT NOT NULL,
        title         VARCHAR(255) NOT NULL,
        resource_type ENUM('link','file') NOT NULL DEFAULT 'link',
        url           TEXT NOT NULL,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // session_discussions
    $db->exec("CREATE TABLE IF NOT EXISTS session_discussions (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        user_id    INT NOT NULL,
        body       TEXT NOT NULL,
        is_pinned  TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // session_feedback
    $db->exec("CREATE TABLE IF NOT EXISTS session_feedback (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        session_id    INT NOT NULL,
        from_user_id  INT NOT NULL,
        to_user_id    INT NOT NULL,
        feedback_type VARCHAR(30) NOT NULL,
        rating        TINYINT DEFAULT NULL,
        review        TEXT,
        xp_awarded    TINYINT NOT NULL DEFAULT 0,
        created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id)   REFERENCES teaching_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (from_user_id) REFERENCES users(id)              ON DELETE CASCADE,
        FOREIGN KEY (to_user_id)   REFERENCES users(id)              ON DELETE CASCADE,
        UNIQUE KEY uniq_feedback (session_id, from_user_id, feedback_type)
    )");

    // xp_transactions
    $db->exec("CREATE TABLE IF NOT EXISTS xp_transactions (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        user_id        INT NOT NULL,
        amount         INT NOT NULL,
        reason         VARCHAR(255) NOT NULL,
        reference_type VARCHAR(50) DEFAULT NULL,
        reference_id   INT         DEFAULT NULL,
        created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id)
    )");
})();

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

switch ($action) {
    case 'send_reminders':      sendSessionReminders();    break;
    case 'apply':               applyTeacher($body);       break;
    case 'application_status':  applicationStatus();       break;
    case 'complete_training':   completeTraining();        break;
    case 'create_session':      createSession($body);      break;
    case 'my_sessions':         mySessions();              break;
    case 'end_session':              endSession($body);              break;
    case 'submit_attendance_report': submitAttendanceReport($body);  break;
    case 'cancel_session':      cancelSession($body);      break;
    case 'edit_session':        editSession($body);        break;
    case 'sessions':            getSessions();             break;
    case 'teacher_profile':     teacherProfile();          break;
    case 'register_session':    registerSession($body);    break;
    case 'unregister_session':  unregisterSession($body);  break;
    case 'my_registrations':    myRegistrations();         break;
    case 'upcoming_sessions':   upcomingSessions();        break;
    case 'session_attendees':   sessionAttendees();        break;
    case 'submit_feedback':     submitFeedback($body);     break;
    case 'past_sessions':       pastSessions();            break;
    case 'session_detail':           sessionDetail();                  break;
    case 'session_resources':        sessionResources();               break;
    case 'add_session_resource':     addSessionResource($body);        break;
    case 'delete_session_resource':  deleteSessionResource($body);     break;
    case 'session_discussion':       sessionDiscussion();              break;
    case 'add_session_discussion':   addSessionDiscussion($body);      break;
    case 'delete_session_discussion':deleteSessionDiscussion($body);   break;
    case 'mark_attended':       markAttended($body);       break;
    case 'start_session':       startSession($body);       break;
    case 'get_jitsi_room':      getJitsiRoom();            break;
    case 'live_sessions':       getLiveSessions();         break;
    case 'create_course':       createCourse($body);       break;
    case 'my_courses':          myCourses();               break;
    case 'courses':             getCourses();              break;
    case 'register_course':     registerCourse($body);     break;
    case 'unregister_course':   unregisterCourse($body);   break;
    case 'course_detail':       courseDetail();            break;
    case 'cancel_course':       cancelCourse($body);       break;
    case 'course_students':              courseStudents();                       break;
    case 'set_session_attendance_intent': setSessionAttendanceIntent($body);   break;
    default: jsonError('Unknown action');
}

/* ── Timezone Helper: convert datetime string from $tz to UTC ── */
function toUtc(string $dateStr, string $tz): string {
    try {
        $dt = new DateTime($dateStr, new DateTimeZone($tz));
        $dt->setTimezone(new DateTimeZone('UTC'));
        return $dt->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        return $dateStr; // fallback: store as-is
    }
}

/* ── Format a UTC datetime in a given display timezone ────────── */
function fmtSessionTime(string $utcDateStr, string $displayTz): string {
    try {
        $dt = new DateTime($utcDateStr, new DateTimeZone('UTC'));
        $dt->setTimezone(new DateTimeZone($displayTz));
        return $dt->format('l, F j, Y \a\t g:i A') . " ($displayTz)";
    } catch (Exception $e) {
        return $utcDateStr;
    }
}

/* ── Send a system message from the admin user ─────────────────── */
function sendSystemMessage($pdo, int $toUserId, string $content): void {
    try {
        $admin = $pdo->query("SELECT id FROM users WHERE role='admin' LIMIT 1")->fetch();
        if (!$admin) return;
        $pdo->prepare('INSERT INTO messages (sender_id,receiver_id,content,is_read,created_at) VALUES (?,?,?,0,NOW())')
            ->execute([$admin['id'], $toUserId, $content]);
    } catch (Exception $e) {}
}

/* ── Notify student of session registration (message + optional email) */
function notifyRegistration($pdo, array $student, array $session, string $teacherName): void {
    $tz      = $session['session_timezone'] ?: 'UTC';
    $timeStr = fmtSessionTime($session['scheduled_at'], $tz);
    $link    = !empty($session['meeting_link']) ? $session['meeting_link'] : '';

    // Platform message
    $platform = "✅ Registered for \"{$session['title']}\" with $teacherName. Starts: $timeStr"
              . ($link ? " — Join: $link" : '');
    sendSystemMessage($pdo, $student['id'], $platform);

    // Email if available
    if (empty($student['email'])) return;
    $name    = htmlspecialchars($student['first_name'] ?? '');
    $sTitle  = htmlspecialchars($session['title'] ?? '');
    $teacher = htmlspecialchars($teacherName);
    $dur     = intval($session['duration_minutes']);
    $linkBtn = $link
        ? "<div style='text-align:center;margin:24px 0'><a href='" . htmlspecialchars($link) . "' style='display:inline-block;background:linear-gradient(135deg,#1565C0,#29ABE2);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700'>Join Session →</a></div>"
        : '';
    $html = emailTemplate("Session Registration Confirmed", "
        <h2 style='margin:0 0 8px;font-size:1.4rem;color:#0D1B4B'>You're registered, $name!</h2>
        <p style='color:#64748b;margin:0 0 20px'>You've successfully signed up for:</p>
        <div style='background:#f0f9ff;border-left:4px solid #29ABE2;padding:14px 18px;border-radius:0 8px 8px 0;margin:0 0 20px'>
          <p style='margin:0 0 4px;font-size:1.05rem;font-weight:700;color:#0D1B4B'>$sTitle</p>
          <p style='margin:0;color:#64748b;font-size:.9rem'>with $teacher</p>
          <p style='margin:8px 0 0;color:#64748b;font-size:.9rem'>📅 $timeStr</p>
          <p style='margin:4px 0 0;color:#64748b;font-size:.9rem'>⏱ $dur minutes</p>
        </div>
        $linkBtn
        <p style='color:#64748b;font-size:.85rem'>Check your upcoming sessions in the <strong>Learn Hub</strong> at any time.</p>
    ", "Registered for {$session['title']} — $timeStr");
    sendMail($student['email'], "{$student['first_name']} {$student['last_name']}", "Registration Confirmed: {$session['title']}", $html);
}

/* ── XP Helper ─────────────────────────────────────────────── */
function awardXP($pdo, $userId, $amount, $reason, $refType = null, $refId = null) {
    $pdo->prepare('UPDATE users SET xp = xp + ? WHERE id = ?')->execute([$amount, $userId]);
    $pdo->prepare('INSERT INTO xp_transactions (user_id, amount, reason, reference_type, reference_id) VALUES (?,?,?,?,?)')
        ->execute([$userId, $amount, $reason, $refType, $refId]);
}

/* ── Phase 2: Submit Teacher Application ────────────────────── */
function applyTeacher($data) {
    $me  = requireAuth();
    $pdo = getDB();

    // Block if already applied
    $existing = $pdo->prepare('SELECT id, status FROM teacher_applications WHERE user_id = ?');
    $existing->execute([$me['id']]);
    $app = $existing->fetch();
    if ($app && in_array($app['status'], ['pending', 'approved'])) {
        jsonError('You already have a ' . $app['status'] . ' application.');
    }

    $fullName       = sanitize($data['full_name']         ?? '');
    $age            = intval($data['age']                 ?? 0);
    $location       = sanitize($data['location']          ?? '');
    $publicBio      = sanitize($data['public_bio']        ?? '');
    $currentStatus  = sanitize($data['current_status']    ?? '');
    $tests          = json_encode($data['standardized_tests']  ?? []);
    $testSubjects   = json_encode($data['test_subjects']       ?? []);
    $testScores     = json_encode($data['test_scores']         ?? []);
    $subjectsToTeach= json_encode($data['subjects_to_teach']   ?? []);
    $idDocUrl       = sanitize($data['id_document_url']   ?? '');
    $videoPitchUrl  = sanitize($data['video_pitch_url']   ?? '');

    if (!$fullName) jsonError('Full name is required');
    if (!$currentStatus) jsonError('Current status is required');
    if (empty($data['subjects_to_teach'])) jsonError('Please select at least one subject to teach');
    if (!$idDocUrl) jsonError('CV / résumé is required');
    if (!$videoPitchUrl) jsonError('Introduction video is required');

    // Lazy-add test_scores column if missing
    try { $pdo->query('SELECT test_scores FROM teacher_applications LIMIT 1'); }
    catch (Exception $e) { try { $pdo->exec('ALTER TABLE teacher_applications ADD COLUMN test_scores TEXT DEFAULT NULL'); } catch (Exception $e2) {} }

    // Insert or re-open declined application
    if ($app && $app['status'] === 'declined') {
        $pdo->prepare('UPDATE teacher_applications SET full_name=?,age=?,location=?,public_bio=?,current_status=?,standardized_tests=?,test_subjects=?,test_scores=?,subjects_to_teach=?,id_document_url=?,video_pitch_url=?,status="pending",admin_notes=NULL,submitted_at=NOW(),reviewed_at=NULL WHERE id=?')
            ->execute([$fullName,$age,$location,$publicBio,$currentStatus,$tests,$testSubjects,$testScores,$subjectsToTeach,$idDocUrl,$videoPitchUrl,$app['id']]);
    } else {
        $pdo->prepare('INSERT INTO teacher_applications (user_id,full_name,age,location,public_bio,current_status,standardized_tests,test_subjects,test_scores,subjects_to_teach,id_document_url,video_pitch_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$me['id'],$fullName,$age,$location,$publicBio,$currentStatus,$tests,$testSubjects,$testScores,$subjectsToTeach,$idDocUrl,$videoPitchUrl]);
    }

    jsonSuccess(['submitted' => true]);
}

/* ── Check Application Status ──────────────────────────────── */
function applicationStatus() {
    $me  = requireAuth();
    $pdo = getDB();
    $stmt = $pdo->prepare('SELECT id,status,admin_notes,submitted_at,reviewed_at FROM teacher_applications WHERE user_id=? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$me['id']]);
    $app = $stmt->fetch();
    jsonSuccess($app ?: ['status' => 'none']);
}

/* ── Phase 4: Complete Teacher Training ─────────────────────── */
function completeTraining() {
    $me  = requireAuth();
    $pdo = getDB();
    $role = $me['role'] ?? 'student';
    if ($role !== 'teacher_pending_training') jsonError('Not in training mode');
    $pdo->prepare("UPDATE users SET role='active_teacher' WHERE id=?")->execute([$me['id']]);
    // Award XP for completing training
    awardXP($pdo, $me['id'], 10, 'Completed teacher training', 'training', null);
    jsonSuccess(['role' => 'active_teacher']);
}

/* ── Phase 5: Create Session ────────────────────────────────── */
function createSession($data) {
    $me  = requireAuth();
    $pdo = getDB();
    $role = $me['role'] ?? 'student';
    if ($role !== 'active_teacher') jsonError('Only active teachers can create sessions');

    $title           = sanitize($data['title']            ?? '');
    $subject         = sanitize($data['subject']           ?? '');
    $description     = sanitize($data['description']       ?? '');
    $scheduledAt     = sanitize($data['scheduled_at']      ?? '');
    $duration        = intval($data['duration_minutes']    ?? 60);
    $meetingLink     = sanitize($data['meeting_link']      ?? '');
    $maxStudents     = intval($data['max_students']        ?? 20);
    $introQuestion   = sanitize($data['intro_question']    ?? '');
    $sessionTimezone = sanitize($data['session_timezone']  ?? 'UTC');

    if (!$title || !$subject || !$scheduledAt) jsonError('Title, subject, and date/time are required');
    if ($duration < 10 || $duration > 480) jsonError('Duration must be between 10 and 480 minutes');
    if ($maxStudents < 1 || $maxStudents > 200) jsonError('Max students must be between 1 and 200');

    // Validate subject against approved subjects
    $approvedRaw = $me['approved_subjects'] ?? '[]';
    $approved    = json_decode($approvedRaw, true) ?: [];
    if (!in_array($subject, $approved)) jsonError('You are not approved to teach ' . $subject);

    // Convert scheduled_at from teacher's timezone → UTC for storage
    $scheduledAtUtc = toUtc($scheduledAt, $sessionTimezone);

    $pdo->prepare('INSERT INTO teaching_sessions (teacher_id,title,subject,description,scheduled_at,duration_minutes,meeting_link,max_students,intro_question,session_timezone) VALUES (?,?,?,?,?,?,?,?,?,?)')
        ->execute([$me['id'],$title,$subject,$description,$scheduledAtUtc,$duration,$meetingLink,$maxStudents,$introQuestion,$sessionTimezone]);

    $id = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT ts.*, u.first_name, u.last_name, u.username, u.avatar_url, u.xp FROM teaching_sessions ts JOIN users u ON u.id=ts.teacher_id WHERE ts.id=?');
    $stmt->execute([$id]);
    jsonSuccess($stmt->fetch());
}

/* ── My Sessions (teacher) ─────────────────────────────────── */
function mySessions() {
    $me  = requireAuth();
    $pdo = getDB();
    $stmt = $pdo->prepare(
        'SELECT ts.*,
                (SELECT COUNT(*) FROM session_registrations sr WHERE sr.session_id=ts.id) AS registered_count,
                (SELECT COUNT(*) FROM session_feedback sf WHERE sf.session_id=ts.id AND sf.feedback_type="student_to_teacher") AS feedback_count
         FROM teaching_sessions ts
         WHERE ts.teacher_id=?
         ORDER BY ts.scheduled_at DESC'
    );
    $stmt->execute([$me['id']]);
    jsonSuccess($stmt->fetchAll());
}

/* ── Phase 7: End Session (teacher) ─────────────────────────── */
function endSession($data) {
    $me        = requireAuth();
    $pdo       = getDB();
    $sessionId = intval($data['session_id'] ?? 0);
    if (!$sessionId) jsonError('Session ID required');

    $stmt = $pdo->prepare('SELECT * FROM teaching_sessions WHERE id=? AND teacher_id=?');
    $stmt->execute([$sessionId, $me['id']]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Session not found');
    if ($session['status'] === 'ended') jsonError('Session already ended');
    if ($session['status'] === 'cancelled') jsonError('Session was cancelled');

    // Mark session ended — students NOT yet marked; teacher does that via attendance report
    $pdo->prepare("UPDATE teaching_sessions SET status='ended', ended_at=NOW() WHERE id=?")->execute([$sessionId]);

    // Award teacher XP immediately: +1 per 10 minutes of scheduled duration
    $duration  = intval($session['duration_minutes']);
    $teacherXP = max(1, intval(floor($duration / 10)));
    awardXP($pdo, $me['id'], $teacherXP, "Hosted {$duration}-minute session: {$session['title']}", 'session', $sessionId);

    // Return registered students so the JS attendance report modal can pre-populate
    $students = $pdo->prepare(
        'SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url
         FROM session_registrations sr
         JOIN users u ON u.id = sr.student_id
         WHERE sr.session_id = ?
         ORDER BY sr.registered_at ASC'
    );
    $students->execute([$sessionId]);

    jsonSuccess([
        'ended'     => true,
        'xp_earned' => $teacherXP,
        'students'  => $students->fetchAll(),
        'session'   => ['id' => $sessionId, 'title' => $session['title']],
    ]);
}

/* ── Attendance Report ──────────────────────────────────────── */
function submitAttendanceReport($data) {
    $me          = requireAuth();
    $pdo         = getDB();
    $sessionId   = intval($data['session_id']   ?? 0);
    $attendedIds = $data['attended_ids']         ?? [];
    if (!$sessionId) jsonError('Session ID required');
    if (!is_array($attendedIds)) jsonError('attended_ids must be an array');

    // Verify teacher owns this ended session
    $stmt = $pdo->prepare("SELECT * FROM teaching_sessions WHERE id=? AND teacher_id=? AND status='ended'");
    $stmt->execute([$sessionId, $me['id']]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Session not found or not ended');
    if ($session['attendance_reported_at']) jsonError('Attendance report already submitted for this session');

    // Validate all provided IDs were actually registered
    $registered = $pdo->prepare('SELECT student_id FROM session_registrations WHERE session_id=?');
    $registered->execute([$sessionId]);
    $registeredIds = array_column($registered->fetchAll(), 'student_id');
    $attendedIds   = array_values(array_filter(array_map('intval', $attendedIds),
                       fn($id) => in_array($id, $registeredIds)));

    $awarded = 0;
    foreach ($registeredIds as $sid) {
        $didAttend = in_array($sid, $attendedIds);

        // Mark attended=1 or attended=0
        $pdo->prepare('UPDATE session_registrations SET attended=? WHERE session_id=? AND student_id=?')
            ->execute([$didAttend ? 1 : 0, $sessionId, $sid]);

        if ($didAttend) {
            // Award +1 XP for attending
            $pdo->prepare('UPDATE session_registrations SET xp_awarded=1 WHERE session_id=? AND student_id=?')
                ->execute([$sessionId, $sid]);
            awardXP($pdo, $sid, 1, 'Attended session: ' . $session['title'], 'session', $sessionId);

            // Bonus +1 XP for first-ever attended session
            $prev = $pdo->prepare('SELECT COUNT(*) FROM session_registrations WHERE student_id=? AND attended=1 AND session_id!=?');
            $prev->execute([$sid, $sessionId]);
            if (intval($prev->fetchColumn()) === 0) { // 0 other attended sessions means this is the first
                awardXP($pdo, $sid, 1, 'First session attended!', 'session', $sessionId);
            }
            $awarded++;
        }
    }

    // Lock the report
    $pdo->prepare('UPDATE teaching_sessions SET attendance_reported_at=NOW() WHERE id=?')->execute([$sessionId]);

    jsonSuccess([
        'reported'     => true,
        'attended'     => $awarded,
        'not_attended' => count($registeredIds) - $awarded,
    ]);
}

/* ── Phase 6: Public Session Discovery ──────────────────────── */
function getSessions() {
    $pdo     = getDB();
    $subject = sanitize($_GET['subject'] ?? '');
    $me      = getAuthUser();

    $sql = 'SELECT ts.*,
                   u.first_name, u.last_name, u.username, u.avatar_url, u.xp,
                   (SELECT COUNT(*) FROM session_registrations sr WHERE sr.session_id=ts.id) AS registered_count,
                   (SELECT ROUND(AVG(sf.rating),1) FROM session_feedback sf WHERE sf.to_user_id=ts.teacher_id AND sf.feedback_type="student_to_teacher" AND sf.rating IS NOT NULL) AS avg_rating,
                   (SELECT COUNT(*) FROM session_feedback sf2 WHERE sf2.to_user_id=ts.teacher_id AND sf2.feedback_type="student_to_teacher" AND sf2.rating IS NOT NULL) AS total_reviews';
    if ($me) {
        $sql .= ', (SELECT COUNT(*) FROM session_registrations sr2 WHERE sr2.session_id=ts.id AND sr2.student_id=?) AS is_registered';
    }
    $sql .= ', ts.intro_question, ts.jitsi_room_id, ts.started_at FROM teaching_sessions ts JOIN users u ON u.id=ts.teacher_id WHERE ts.course_id IS NULL AND ((ts.status="upcoming" AND ts.scheduled_at >= UTC_TIMESTAMP()) OR ts.status="live")';

    $params = $me ? [$me['id']] : [];
    if ($subject) { $sql .= ' AND ts.subject=?'; $params[] = $subject; }
    $sql .= ' ORDER BY ts.scheduled_at ASC LIMIT 50';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonSuccess($stmt->fetchAll());
}

/* ── Public Teacher Profile ─────────────────────────────────── */
function teacherProfile() {
    $pdo    = getDB();
    $userId = intval($_GET['user_id'] ?? 0);
    if (!$userId) jsonError('User ID required');

    $stmt = $pdo->prepare(
        "SELECT id, first_name, last_name, username, avatar_url, xp, location,
                public_bio, current_status, standardized_tests, test_subjects, approved_subjects
         FROM users WHERE id=? AND role='active_teacher'"
    );
    $stmt->execute([$userId]);
    $teacher = $stmt->fetch();
    if (!$teacher) jsonError('Teacher not found');

    // Upcoming sessions
    $sessions = $pdo->prepare(
        "SELECT ts.*, (SELECT COUNT(*) FROM session_registrations sr WHERE sr.session_id=ts.id) AS registered_count
         FROM teaching_sessions ts WHERE ts.teacher_id=? AND (ts.status='live' OR (ts.status='upcoming' AND ts.scheduled_at>=NOW())) ORDER BY ts.status DESC, ts.scheduled_at ASC LIMIT 10"
    );
    $sessions->execute([$userId]);
    $teacher['sessions'] = $sessions->fetchAll();

    // Stats
    $stats = $pdo->prepare(
        "SELECT COUNT(*) as total_sessions,
                SUM(CASE WHEN status='ended' THEN 1 ELSE 0 END) as ended_sessions
         FROM teaching_sessions WHERE teacher_id=?"
    );
    $stats->execute([$userId]);
    $teacher['stats'] = $stats->fetch();

    // Average rating
    $rating = $pdo->prepare(
        "SELECT ROUND(AVG(rating),1) as avg_rating, COUNT(*) as total_reviews
         FROM session_feedback WHERE to_user_id=? AND feedback_type='student_to_teacher' AND rating IS NOT NULL"
    );
    $rating->execute([$userId]);
    $teacher['rating'] = $rating->fetch();

    jsonSuccess($teacher);
}

/* ── Register for Session ───────────────────────────────────── */
function registerSession($data) {
    $me        = requireAuth();
    $pdo       = getDB();
    $sessionId   = intval($data['session_id']   ?? 0);
    $introAnswer = sanitize($data['intro_answer'] ?? '');
    if (!$sessionId) jsonError('Session ID required');

    // Only students may register
    $role = $me['role'] ?? 'student';
    if ($role !== 'student') jsonError('Only students can register for sessions');

    $stmt = $pdo->prepare('SELECT * FROM teaching_sessions WHERE id=? AND status="upcoming"');
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Session not found or not available');
    if ((int)$session['teacher_id'] === (int)$me['id']) jsonError('You cannot register for your own session');
    if (!empty($session['course_id'])) jsonError('This session is part of a course. Please enrol in the full course instead.');

    // Require intro answer if question exists
    if (!empty($session['intro_question']) && empty($introAnswer)) {
        jsonError('Please answer the teacher\'s question before registering');
    }

    // Check capacity
    $count = $pdo->prepare('SELECT COUNT(*) FROM session_registrations WHERE session_id=?');
    $count->execute([$sessionId]);
    if (intval($count->fetchColumn()) >= intval($session['max_students'])) jsonError('Session is full');

    try {
        $pdo->prepare('INSERT INTO session_registrations (session_id, student_id, intro_answer) VALUES (?,?,?)')->execute([$sessionId, $me['id'], $introAnswer]);
    } catch (Exception $e) {
        jsonError('You are already registered for this session');
    }

    // Fetch teacher name for notification
    $teacherStmt = $pdo->prepare('SELECT first_name, last_name FROM users WHERE id=?');
    $teacherStmt->execute([$session['teacher_id']]);
    $teacher = $teacherStmt->fetch();
    $teacherName = $teacher ? "{$teacher['first_name']} {$teacher['last_name']}" : 'your teacher';

    // Fetch student email for notification
    $stuStmt = $pdo->prepare('SELECT id, first_name, last_name, email, preferred_timezone FROM users WHERE id=?');
    $stuStmt->execute([$me['id']]);
    $student = $stuStmt->fetch();

    // Send platform message + email notification
    notifyRegistration($pdo, $student, $session, $teacherName);

    jsonSuccess(['registered' => true]);
}

/* ── Unregister from Session ────────────────────────────────── */
function unregisterSession($data) {
    $me        = requireAuth();
    $pdo       = getDB();
    $sessionId = intval($data['session_id'] ?? 0);
    if (!$sessionId) jsonError('Session ID required');

    $pdo->prepare('DELETE FROM session_registrations WHERE session_id=? AND student_id=? AND attended=0')
        ->execute([$sessionId, $me['id']]);
    jsonSuccess(['unregistered' => true]);
}

/* ── My Registrations (student) ─────────────────────────────── */
function myRegistrations() {
    $me  = requireAuth();
    $pdo = getDB();
    $stmt = $pdo->prepare(
        'SELECT ts.*, u.first_name, u.last_name, u.username, u.avatar_url,
                sr.registered_at, sr.attended, sr.xp_awarded,
                (SELECT COUNT(*) FROM session_registrations sr2 WHERE sr2.session_id=ts.id) AS registered_count,
                (SELECT COUNT(*) FROM session_feedback sf WHERE sf.session_id=ts.id AND sf.from_user_id=? AND sf.feedback_type="student_to_teacher") AS has_reviewed
         FROM session_registrations sr
         JOIN teaching_sessions ts ON ts.id=sr.session_id
         JOIN users u ON u.id=ts.teacher_id
         WHERE sr.student_id=?
         ORDER BY ts.scheduled_at DESC'
    );
    $stmt->execute([$me['id'], $me['id']]);
    jsonSuccess($stmt->fetchAll());
}

/* ── Session Attendees (teacher only) ───────────────────────── */
function sessionAttendees() {
    $me        = requireAuth();
    $pdo       = getDB();
    $sessionId = intval($_GET['session_id'] ?? 0);
    if (!$sessionId) jsonError('Session ID required');

    $stmt = $pdo->prepare('SELECT id, teacher_id FROM teaching_sessions WHERE id=?');
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch();
    if (!$session || (int)$session['teacher_id'] !== (int)$me['id']) jsonError('Access denied');

    $attendees = $pdo->prepare(
        'SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url, u.xp,
                sr.attended, sr.xp_awarded, sr.registered_at, sr.intro_answer,
                (SELECT COUNT(*) FROM session_feedback sf WHERE sf.session_id=? AND sf.to_user_id=u.id AND sf.feedback_type="teacher_to_student") AS has_feedback
         FROM session_registrations sr
         JOIN users u ON u.id=sr.student_id
         WHERE sr.session_id=?
         ORDER BY sr.registered_at ASC'
    );
    $attendees->execute([$sessionId, $sessionId]);
    jsonSuccess($attendees->fetchAll());
}

/* ── Phase 7: Submit Feedback ───────────────────────────────── */
function submitFeedback($data) {
    $me        = requireAuth();
    $pdo       = getDB();
    $sessionId = intval($data['session_id'] ?? 0);
    $toUserId  = intval($data['to_user_id'] ?? 0);
    $type      = sanitize($data['feedback_type'] ?? '');
    $review    = sanitize($data['review'] ?? '');
    $rating    = isset($data['rating']) ? intval($data['rating']) : null;

    if (!$sessionId || !$toUserId || !$type) jsonError('Missing required fields');
    if (!in_array($type, ['student_to_teacher', 'teacher_to_student'])) jsonError('Invalid feedback type');
    if ($type === 'student_to_teacher' && ($rating === null || $rating < 1 || $rating > 5)) jsonError('Rating must be 1-5');

    // Verify the session exists and ended
    $stmt = $pdo->prepare("SELECT * FROM teaching_sessions WHERE id=? AND status='ended'");
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Session not found or not ended yet');

    // Verify roles
    if ($type === 'student_to_teacher') {
        if ((int)$session['teacher_id'] !== (int)$toUserId) jsonError('Invalid recipient');
        $regCheck = $pdo->prepare('SELECT id FROM session_registrations WHERE session_id=? AND student_id=?');
        $regCheck->execute([$sessionId, $me['id']]);
        if (!$regCheck->fetch()) jsonError('You did not attend this session');
    } elseif ($type === 'teacher_to_student') {
        if ($session['teacher_id'] != $me['id']) jsonError('Only the teacher can leave feedback for students');
    }

    try {
        $pdo->prepare('INSERT INTO session_feedback (session_id,from_user_id,to_user_id,feedback_type,rating,review) VALUES (?,?,?,?,?,?)')
            ->execute([$sessionId, $me['id'], $toUserId, $type, $rating, $review]);
    } catch (Exception $e) {
        jsonError('You have already submitted feedback for this session');
    }

    // Award XP
    if ($type === 'student_to_teacher') {
        // +1 XP to student for leaving feedback
        awardXP($pdo, $me['id'], 1, 'Left feedback for session: ' . $session['title'], 'feedback', $sessionId);
        // +1 XP to teacher for receiving feedback
        awardXP($pdo, $toUserId, 1, 'Received student feedback for: ' . $session['title'], 'feedback', $sessionId);
    } elseif ($type === 'teacher_to_student') {
        // +1 XP to student for receiving teacher feedback
        awardXP($pdo, $toUserId, 1, 'Received teacher feedback for: ' . $session['title'], 'feedback', $sessionId);
    }

    jsonSuccess(['submitted' => true]);
}

/* ── Past Sessions ──────────────────────────────────────────── */
function pastSessions() {
    $me  = requireAuth();
    $pdo = getDB();

    // Sessions I taught
    $taught = $pdo->prepare(
        "SELECT ts.*, 'teacher' as my_role,
                (SELECT COUNT(*) FROM session_registrations sr WHERE sr.session_id=ts.id AND sr.attended=1) AS attendee_count,
                (SELECT COUNT(*) FROM session_feedback sf WHERE sf.session_id=ts.id AND sf.feedback_type='student_to_teacher') AS feedback_count,
                (SELECT ROUND(AVG(sf2.rating),1) FROM session_feedback sf2 WHERE sf2.session_id=ts.id AND sf2.feedback_type='student_to_teacher') AS avg_rating
         FROM teaching_sessions ts
         WHERE ts.teacher_id=? AND ts.status='ended'
         ORDER BY ts.ended_at DESC LIMIT 30"
    );
    $taught->execute([$me['id']]);
    $taughtRows = $taught->fetchAll();

    // Sessions I attended
    $attended = $pdo->prepare(
        "SELECT ts.*, 'student' as my_role,
                sr.attended, sr.xp_awarded,
                u.first_name, u.last_name, u.username, u.avatar_url,
                (SELECT COUNT(*) FROM session_feedback sf WHERE sf.session_id=ts.id AND sf.from_user_id=? AND sf.feedback_type='student_to_teacher') AS has_reviewed,
                (SELECT COUNT(*) FROM session_feedback sf2 WHERE sf2.session_id=ts.id AND sf2.to_user_id=? AND sf2.feedback_type='teacher_to_student') AS has_teacher_feedback
         FROM session_registrations sr
         JOIN teaching_sessions ts ON ts.id=sr.session_id
         JOIN users u ON u.id=ts.teacher_id
         WHERE sr.student_id=? AND ts.status='ended'
         ORDER BY ts.ended_at DESC LIMIT 30"
    );
    $attended->execute([$me['id'], $me['id'], $me['id']]);
    $attendedRows = $attended->fetchAll();

    jsonSuccess(['taught' => $taughtRows, 'attended' => $attendedRows]);
}

/* ── Session Detail ─────────────────────────────────────────── */
function sessionDetail() {
    $pdo       = getDB();
    $sessionId = intval($_GET['session_id'] ?? 0);
    $me        = getAuthUser();
    if (!$sessionId) jsonError('Session ID required');

    $stmt = $pdo->prepare(
        'SELECT ts.*, u.first_name, u.last_name, u.username, u.avatar_url, u.xp,
                (SELECT COUNT(*) FROM session_registrations sr WHERE sr.session_id=ts.id) AS registered_count,
                (SELECT ROUND(AVG(sf.rating),1) FROM session_feedback sf WHERE sf.session_id=ts.id) AS avg_rating,
                (SELECT COUNT(*) FROM session_feedback sf WHERE sf.session_id=ts.id) AS total_reviews
         FROM teaching_sessions ts JOIN users u ON u.id=ts.teacher_id WHERE ts.id=?'
    );
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Session not found');

    $session['is_registered'] = 0;
    if ($me) {
        $reg = $pdo->prepare('SELECT id FROM session_registrations WHERE session_id=? AND student_id=?');
        $reg->execute([$sessionId, $me['id']]);
        $regRow = $reg->fetch();
        $session['is_registered'] = $regRow ? 1 : 0;
        $session['my_registration'] = $regRow ?: null;
    }

    jsonSuccess($session);
}

/* ── Session Resources ─────────────────────────────────────── */
function _sessionAccess(int $sessionId): array {
    $pdo  = getDB();
    $me   = getAuthUser();
    $stmt = $pdo->prepare('SELECT * FROM teaching_sessions WHERE id=?');
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Session not found', 404);
    $isTeacher  = $me && intval($me['id']) === intval($session['teacher_id']);
    $isRegistered = false;
    if ($me && !$isTeacher) {
        $r = $pdo->prepare('SELECT id FROM session_registrations WHERE session_id=? AND student_id=?');
        $r->execute([$sessionId, $me['id']]);
        $isRegistered = (bool)$r->fetch();
    }
    return [$pdo, $me, $session, $isTeacher, $isRegistered];
}

function sessionResources() {
    $sessionId = intval($_GET['session_id'] ?? 0);
    if (!$sessionId) jsonError('session_id required');
    [$pdo, $me, $session, $isTeacher, $isRegistered] = _sessionAccess($sessionId);
    if (!$isTeacher && !$isRegistered) jsonSuccess([]);
    $stmt = $pdo->prepare(
        "SELECT sr.*, u.first_name, u.last_name FROM session_resources sr
         JOIN users u ON u.id = sr.user_id
         WHERE sr.session_id = ? ORDER BY sr.created_at ASC"
    );
    $stmt->execute([$sessionId]);
    jsonSuccess($stmt->fetchAll());
}

function addSessionResource($data) {
    $me = requireAuth();
    $pdo = getDB();
    $sessionId = intval($data['session_id'] ?? 0);
    $title     = sanitize($data['title'] ?? '');
    $type      = in_array($data['type'] ?? '', ['link','file']) ? $data['type'] : 'link';
    $url       = sanitize($data['url'] ?? '');
    if (!$sessionId || !$title || !$url) jsonError('session_id, title and url required');
    $own = $pdo->prepare('SELECT teacher_id FROM teaching_sessions WHERE id=?');
    $own->execute([$sessionId]);
    $row = $own->fetch();
    if (!$row || intval($row['teacher_id']) !== intval($me['id'])) jsonError('Not authorised');
    $pdo->prepare("INSERT INTO session_resources (session_id, user_id, title, resource_type, url) VALUES (?,?,?,?,?)")
        ->execute([$sessionId, $me['id'], $title, $type, $url]);
    jsonSuccess(['id' => $pdo->lastInsertId(), 'title' => $title, 'resource_type' => $type, 'url' => $url]);
}

function deleteSessionResource($data) {
    $me = requireAuth();
    $pdo = getDB();
    $id = intval($data['id'] ?? 0);
    if (!$id) jsonError('id required');
    $stmt = $pdo->prepare(
        "SELECT sr.id FROM session_resources sr
         JOIN teaching_sessions ts ON ts.id = sr.session_id
         WHERE sr.id=? AND ts.teacher_id=?"
    );
    $stmt->execute([$id, $me['id']]);
    if (!$stmt->fetch()) jsonError('Not found or not authorised');
    $pdo->prepare("DELETE FROM session_resources WHERE id=?")->execute([$id]);
    jsonSuccess(['deleted' => true]);
}

/* ── Session Discussion ─────────────────────────────────────── */
function sessionDiscussion() {
    $sessionId = intval($_GET['session_id'] ?? 0);
    if (!$sessionId) jsonError('session_id required');
    [$pdo, $me, $session, $isTeacher, $isRegistered] = _sessionAccess($sessionId);
    if (!$isTeacher && !$isRegistered) jsonSuccess([]);
    $stmt = $pdo->prepare(
        "SELECT sd.*, u.first_name, u.last_name, u.avatar_url, u.username FROM session_discussions sd
         JOIN users u ON u.id = sd.user_id
         WHERE sd.session_id = ? ORDER BY sd.is_pinned DESC, sd.created_at ASC"
    );
    $stmt->execute([$sessionId]);
    jsonSuccess($stmt->fetchAll());
}

function addSessionDiscussion($data) {
    $me = requireAuth();
    $pdo = getDB();
    $sessionId = intval($data['session_id'] ?? 0);
    $body      = sanitize($data['body'] ?? '');
    if (!$sessionId || !$body) jsonError('session_id and body required');
    [$pdo2, $me2, $session, $isTeacher, $isRegistered] = _sessionAccess($sessionId);
    if (!$isTeacher && !$isRegistered) jsonError('Not authorised');
    $pdo->prepare("INSERT INTO session_discussions (session_id, user_id, body) VALUES (?,?,?)")
        ->execute([$sessionId, $me['id'], $body]);
    jsonSuccess(['id' => $pdo->lastInsertId()]);
}

function deleteSessionDiscussion($data) {
    $me = requireAuth();
    $pdo = getDB();
    $id = intval($data['id'] ?? 0);
    if (!$id) jsonError('id required');
    $stmt = $pdo->prepare(
        "SELECT sd.id FROM session_discussions sd WHERE sd.id=? AND sd.user_id=?"
    );
    $stmt->execute([$id, $me['id']]);
    if (!$stmt->fetch()) jsonError('Not found or not authorised');
    $pdo->prepare("DELETE FROM session_discussions WHERE id=?")->execute([$id]);
    jsonSuccess(['deleted' => true]);
}

/* ── Mark Attended (teacher verifies student) ───────────────── */
function markAttended($data) {
    $me        = requireAuth();
    $pdo       = getDB();
    $sessionId = intval($data['session_id'] ?? 0);
    $studentId = intval($data['student_id'] ?? 0);
    if (!$sessionId || !$studentId) jsonError('Missing IDs');

    $stmt = $pdo->prepare('SELECT teacher_id FROM teaching_sessions WHERE id=?');
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch();
    if (!$session || $session['teacher_id'] != $me['id']) jsonError('Access denied');

    $pdo->prepare('UPDATE session_registrations SET attended=1 WHERE session_id=? AND student_id=?')
        ->execute([$sessionId, $studentId]);
    jsonSuccess(['marked' => true]);
}

/* ── Edit Session (teacher only, upcoming only) ─────────────── */
function editSession($data) {
    $me        = requireAuth();
    $pdo       = getDB();
    $sessionId = intval($data['session_id'] ?? 0);
    if (!$sessionId) jsonError('Session ID required');

    $stmt = $pdo->prepare('SELECT * FROM teaching_sessions WHERE id=? AND teacher_id=?');
    $stmt->execute([$sessionId, $me['id']]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Session not found');
    if ($session['status'] !== 'upcoming') jsonError('Only upcoming sessions can be edited');

    $title           = sanitize($data['title']            ?? $session['title']);
    $description     = sanitize($data['description']      ?? $session['description']);
    $scheduledAt     = sanitize($data['scheduled_at']     ?? '');
    $duration        = intval($data['duration_minutes']   ?? $session['duration_minutes']);
    $meetingLink     = sanitize($data['meeting_link']     ?? $session['meeting_link']);
    $maxStudents     = intval($data['max_students']       ?? $session['max_students']);
    $introQuestion   = sanitize($data['intro_question']   ?? $session['intro_question'] ?? '');
    $sessionTimezone = sanitize($data['session_timezone'] ?? $session['session_timezone'] ?? 'UTC');

    if (!$title) jsonError('Title is required');
    if ($duration < 10 || $duration > 480) jsonError('Duration must be 10–480 minutes');
    if ($maxStudents < 1 || $maxStudents > 200) jsonError('Max students must be 1–200');

    // If a new datetime was provided, convert from chosen timezone → UTC
    $scheduledAtUtc = $scheduledAt
        ? toUtc($scheduledAt, $sessionTimezone)
        : $session['scheduled_at']; // keep existing UTC value unchanged

    $pdo->prepare('UPDATE teaching_sessions SET title=?,description=?,scheduled_at=?,duration_minutes=?,meeting_link=?,max_students=?,intro_question=?,session_timezone=? WHERE id=?')
        ->execute([$title,$description,$scheduledAtUtc,$duration,$meetingLink,$maxStudents,$introQuestion,$sessionTimezone,$sessionId]);

    jsonSuccess(['updated' => true]);
}

/* ── Cancel Session (teacher only) ─────────────────────────── */
function cancelSession($data) {
    $me        = requireAuth();
    $pdo       = getDB();
    $sessionId = intval($data['session_id'] ?? 0);
    if (!$sessionId) jsonError('Session ID required');

    $stmt = $pdo->prepare('SELECT * FROM teaching_sessions WHERE id=? AND teacher_id=?');
    $stmt->execute([$sessionId, $me['id']]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Session not found');
    if ($session['status'] !== 'upcoming') jsonError('Only upcoming sessions can be cancelled');

    $pdo->prepare("UPDATE teaching_sessions SET status='cancelled', ended_at=NOW() WHERE id=?")->execute([$sessionId]);
    jsonSuccess(['cancelled' => true]);
}

/* ── Upcoming Sessions for current student ──────────────────── */
function upcomingSessions() {
    $me  = requireAuth();
    $pdo = getDB();
    $stmt = $pdo->prepare(
        'SELECT ts.*, u.first_name, u.last_name, u.username, u.avatar_url,
                sr.registered_at,
                (SELECT COUNT(*) FROM session_registrations sr2 WHERE sr2.session_id=ts.id) AS registered_count
         FROM session_registrations sr
         JOIN teaching_sessions ts ON ts.id=sr.session_id
         JOIN users u ON u.id=ts.teacher_id
         WHERE sr.student_id=? AND ts.course_id IS NULL AND (ts.status="upcoming" OR ts.status="live") AND (ts.status="live" OR ts.scheduled_at >= UTC_TIMESTAMP())
         ORDER BY ts.status DESC, ts.scheduled_at ASC
         LIMIT 10'
    );
    $stmt->execute([$me['id']]);
    jsonSuccess($stmt->fetchAll());
}

/* ── Send 1-hour reminders (called by cron) ─────────────────── */
function sendSessionReminders() {
    // Protect endpoint — require secret key when called over HTTP
    if (php_sapi_name() !== 'cli') {
        $secret = defined('CRON_SECRET') ? CRON_SECRET : '';
        if (!$secret || ($_GET['key'] ?? '') !== $secret) jsonError('Forbidden', 403);
    }
    $pdo = getDB();

    // Sessions starting 45–75 min from now (stored in UTC)
    $sessions = $pdo->query(
        "SELECT ts.*, u.first_name AS teacher_first, u.last_name AS teacher_last
         FROM teaching_sessions ts
         JOIN users u ON u.id = ts.teacher_id
         WHERE ts.status = 'upcoming'
           AND ts.scheduled_at BETWEEN DATE_ADD(UTC_TIMESTAMP(), INTERVAL 45 MINUTE)
                                   AND DATE_ADD(UTC_TIMESTAMP(), INTERVAL 75 MINUTE)"
    )->fetchAll();

    $sent = 0;
    foreach ($sessions as $sess) {
        $students = $pdo->prepare(
            "SELECT u.id, u.first_name, u.last_name, u.email, u.preferred_timezone
             FROM session_registrations sr
             JOIN users u ON u.id = sr.student_id
             WHERE sr.session_id = ? AND sr.reminder_sent = 0"
        );
        $students->execute([$sess['id']]);
        $teacherName = "{$sess['teacher_first']} {$sess['teacher_last']}";

        foreach ($students->fetchAll() as $stu) {
            // Display time in student's preferred timezone (fallback to session timezone)
            $dispTz  = !empty($stu['preferred_timezone']) ? $stu['preferred_timezone'] : ($sess['session_timezone'] ?: 'UTC');
            $timeStr = fmtSessionTime($sess['scheduled_at'], $dispTz);
            $link    = $sess['meeting_link'] ?? '';

            // Platform message
            $platform = "⏰ Reminder: \"{$sess['title']}\" with $teacherName starts in ~1 hour — $timeStr"
                      . ($link ? " | Join: $link" : '');
            sendSystemMessage($pdo, $stu['id'], $platform);

            // Email if available
            if (!empty($stu['email'])) {
                $name   = htmlspecialchars($stu['first_name'] ?? '');
                $sTitle = htmlspecialchars($sess['title'] ?? '');
                $tName  = htmlspecialchars($teacherName);
                $dur    = intval($sess['duration_minutes']);
                $linkBtn = $link
                    ? "<div style='text-align:center;margin:24px 0'><a href='" . htmlspecialchars($link) . "' style='display:inline-block;background:linear-gradient(135deg,#1565C0,#29ABE2);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700'>Join Session →</a></div>"
                    : '';
                $html = emailTemplate("Session Starting Soon! ⏰", "
                    <h2 style='margin:0 0 8px;font-size:1.4rem;color:#0D1B4B'>Your session starts in ~1 hour, $name!</h2>
                    <p style='color:#64748b;margin:0 0 20px'>Get ready for:</p>
                    <div style='background:#f0f9ff;border-left:4px solid #29ABE2;padding:14px 18px;border-radius:0 8px 8px 0;margin:0 0 20px'>
                      <p style='margin:0 0 4px;font-size:1.05rem;font-weight:700;color:#0D1B4B'>$sTitle</p>
                      <p style='margin:0;color:#64748b;font-size:.9rem'>with $tName</p>
                      <p style='margin:8px 0 0;color:#64748b;font-size:.9rem'>🕐 $timeStr</p>
                      <p style='margin:4px 0 0;color:#64748b;font-size:.9rem'>⏱ $dur minutes</p>
                    </div>
                    $linkBtn
                    <p style='color:#64748b;font-size:.85rem'>Prepare your materials — see you there!</p>
                ", "Reminder: $sTitle starts in ~1 hour");
                sendMail($stu['email'], "{$stu['first_name']} {$stu['last_name']}", "Starting Soon: {$sess['title']}", $html);
            }

            $pdo->prepare('UPDATE session_registrations SET reminder_sent=1 WHERE session_id=? AND student_id=?')
                ->execute([$sess['id'], $stu['id']]);
            $sent++;
        }
    }

    jsonSuccess(['reminders_sent' => $sent, 'sessions_checked' => count($sessions)]);
}

/* ── Start a session (teacher clicks "Go Live") ──────────────── */
function startSession($data) {
    $me        = requireAuth();
    $pdo       = getDB();
    $sessionId = intval($data['session_id'] ?? 0);
    if (!$sessionId) jsonError('Session ID required');
    if ($me['role'] !== 'active_teacher') jsonError('Only teachers can start sessions');

    $stmt = $pdo->prepare('SELECT * FROM teaching_sessions WHERE id=? AND teacher_id=?');
    $stmt->execute([$sessionId, $me['id']]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Session not found');
    if (in_array($session['status'], ['ended','cancelled'])) jsonError('Session cannot be started');

    // Generate room ID once (idempotent)
    $roomId = $session['jitsi_room_id'] ?: ('learnora-' . $sessionId . '-' . bin2hex(random_bytes(5)));

    $pdo->prepare("UPDATE teaching_sessions SET status='live', jitsi_room_id=?, started_at=COALESCE(started_at, UTC_TIMESTAMP()) WHERE id=?")
        ->execute([$roomId, $sessionId]);

    $jwt = generateJaaSToken(
        $me['id'],
        trim(($me['first_name'] ?? '') . ' ' . ($me['last_name'] ?? '')),
        $me['email'] ?? '',
        true,   // teacher = moderator
        $me['avatar_url'] ?? '',
        $roomId
    );

    jsonSuccess(['room_id' => $roomId, 'session_id' => $sessionId, 'is_moderator' => true, 'jwt' => $jwt]);
}

/* ── Get Jitsi room for a live session (teacher or registered student) */
function getJitsiRoom() {
    $me        = requireAuth();
    $pdo       = getDB();
    $sessionId = intval($_GET['session_id'] ?? 0);
    if (!$sessionId) jsonError('Session ID required');

    $stmt = $pdo->prepare(
        "SELECT ts.*, u.first_name AS teacher_first, u.last_name AS teacher_last
         FROM teaching_sessions ts
         JOIN users u ON u.id = ts.teacher_id
         WHERE ts.id = ?"
    );
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Session not found');
    if ($session['status'] !== 'live') jsonError('Session is not live yet');
    if (!$session['jitsi_room_id']) jsonError('Session room not created yet');

    $isTeacher = intval($session['teacher_id']) === intval($me['id']);
    if (!$isTeacher) {
        $reg = $pdo->prepare('SELECT id FROM session_registrations WHERE session_id=? AND student_id=?');
        $reg->execute([$sessionId, $me['id']]);
        if (!$reg->fetch()) jsonError('You are not registered for this session');
    }

    $jwt = generateJaaSToken(
        $me['id'],
        trim(($me['first_name'] ?? '') . ' ' . ($me['last_name'] ?? '')),
        $me['email'] ?? '',
        $isTeacher,
        $me['avatar_url'] ?? '',
        (string)($session['jitsi_room_id'] ?? '')
    );

    jsonSuccess([
        'room_id'       => $session['jitsi_room_id'],
        'is_moderator'  => $isTeacher,
        'session_title' => $session['title'],
        'session_id'    => $sessionId,
        'jwt'           => $jwt,
    ]);
}

/* ── Create Course (multiple linked sessions) ─────────────────── */
function createCourse($data) {
    $me  = requireAuth();
    $pdo = getDB();

    if ($me['role'] !== 'active_teacher') jsonError('Only active teachers can create courses');

    $title     = sanitize($data['title']          ?? '');
    $subject   = sanitize($data['subject']        ?? '');
    $desc      = sanitize($data['description']    ?? '');
    $tz        = sanitize($data['session_timezone'] ?? 'UTC');
    $maxStu    = intval($data['max_students']      ?? 20);
    $introQ    = sanitize($data['intro_question']  ?? '');
    $sessions  = $data['sessions'] ?? [];
    if (!is_array($sessions)) $sessions = [];

    if (!$title)            jsonError('Course title is required');
    if (!$subject)          jsonError('Subject is required');
    if (!is_array($sessions) || count($sessions) < 1) jsonError('At least one session date is required');
    if (count($sessions) > 20) jsonError('Maximum 20 sessions per course');
    if ($maxStu < 1 || $maxStu > 500) jsonError('max_students must be between 1 and 500');
    try { new DateTimeZone($tz); } catch (Exception $e) { jsonError('Invalid timezone'); }

    $approved = json_decode($me['approved_subjects'] ?? '[]', true) ?: [];
    if (!in_array($subject, $approved)) jsonError('You are not approved to teach ' . $subject);

    $totalSessions = count($sessions);

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO courses (teacher_id, title, subject, description, total_sessions, max_students, intro_question, session_timezone)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$me['id'], $title, $subject, $desc, $totalSessions, $maxStu, $introQ ?: null, $tz]);
        $courseId = $pdo->lastInsertId();

        foreach ($sessions as $i => $sess) {
            $sessDateRaw = sanitize($sess['scheduled_at'] ?? '');
            $sessDesc    = sanitize($sess['description']  ?? '');
            $duration    = intval($sess['duration_minutes'] ?? 60);
            if ($duration < 10) $duration = 10;
            if ($duration > 480) $duration = 480;

            if (!$sessDateRaw) jsonError('Date required for session ' . ($i + 1));
            $scheduledUtc = toUtc($sessDateRaw, $tz);

            // Use session-specific description if provided, else course description
            $finalDesc = $sessDesc ?: $desc;

            $ins = $pdo->prepare(
                "INSERT INTO teaching_sessions
                 (teacher_id, course_id, session_number, title, subject, description, scheduled_at, duration_minutes, max_students, session_timezone, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')"
            );
            $sessionTitle = $title . ' — Session ' . ($i + 1);
            $ins->execute([$me['id'], $courseId, $i + 1, $sessionTitle, $subject, $finalDesc, $scheduledUtc, $duration, $maxStu, $tz]);
        }

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Failed to create course: ' . $e->getMessage());
    }

    // Return the created course with its sessions
    $cs = $pdo->prepare(
        "SELECT ts.*, c.title AS course_title
         FROM teaching_sessions ts
         JOIN courses c ON c.id = ts.course_id
         WHERE ts.course_id = ?
         ORDER BY ts.session_number ASC"
    );
    $cs->execute([$courseId]);
    $courseSessions = $cs->fetchAll();

    $cc = $pdo->prepare("SELECT * FROM courses WHERE id = ?");
    $cc->execute([$courseId]);
    $course = $cc->fetch();
    $course['sessions'] = $courseSessions;

    jsonSuccess($course);
}

/* ── My Courses (teacher) ──────────────────────────────────────── */
function myCourses() {
    $me  = requireAuth();
    $pdo = getDB();

    $stmt = $pdo->prepare(
        "SELECT c.*,
                (SELECT COUNT(*) FROM course_registrations cr WHERE cr.course_id = c.id) AS registered_count,
                (SELECT MIN(ts.scheduled_at) FROM teaching_sessions ts WHERE ts.course_id = c.id AND ts.status = 'upcoming') AS next_session_at
         FROM courses c
         WHERE c.teacher_id = ?
         ORDER BY c.created_at DESC"
    );
    $stmt->execute([$me['id']]);
    $courses = $stmt->fetchAll();

    // Attach sessions to each course
    foreach ($courses as &$course) {
        $ss = $pdo->prepare(
            "SELECT id, session_number, title, scheduled_at, duration_minutes, status, description, attendance_reported_at
             FROM teaching_sessions WHERE course_id = ? ORDER BY session_number ASC"
        );
        $ss->execute([$course['id']]);
        $course['sessions'] = $ss->fetchAll();
    }

    jsonSuccess($courses);
}

/* ── Course Discovery (students) ──────────────────────────────── */
function getCourses() {
    $pdo     = getDB();
    $subject = sanitize($_GET['subject'] ?? '');
    $me      = getAuthUser();

    $sql = "SELECT c.*,
                   u.first_name, u.last_name, u.username, u.avatar_url, u.xp,
                   (SELECT COUNT(*) FROM course_registrations cr WHERE cr.course_id = c.id) AS registered_count,
                   (SELECT ROUND(AVG(sf.rating),1) FROM session_feedback sf
                    WHERE sf.to_user_id = c.teacher_id AND sf.feedback_type = 'student_to_teacher'
                    AND sf.rating IS NOT NULL) AS avg_rating,
                   (SELECT COUNT(*) FROM session_feedback sf2
                    WHERE sf2.to_user_id = c.teacher_id AND sf2.feedback_type = 'student_to_teacher'
                    AND sf2.rating IS NOT NULL) AS total_reviews,
                   (SELECT MIN(ts.scheduled_at) FROM teaching_sessions ts
                    WHERE ts.course_id = c.id AND ts.status = 'upcoming') AS next_session_at";
    if ($me) {
        $sql .= ", (SELECT COUNT(*) FROM course_registrations cr2
                   WHERE cr2.course_id = c.id AND cr2.student_id = ?) AS is_registered";
    }
    $sql .= " FROM courses c
              JOIN users u ON u.id = c.teacher_id
              WHERE c.status = 'upcoming'
              AND (SELECT MIN(ts2.scheduled_at) FROM teaching_sessions ts2
                   WHERE ts2.course_id = c.id) >= UTC_TIMESTAMP()";

    $params = $me ? [$me['id']] : [];
    if ($subject) { $sql .= ' AND c.subject = ?'; $params[] = $subject; }
    $sql .= ' ORDER BY next_session_at ASC LIMIT 30';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $courses = $stmt->fetchAll();

    // Attach session list to each course
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

/* ── Register for a Course ─────────────────────────────────────── */
function registerCourse($data) {
    $me       = requireAuth();
    $pdo      = getDB();
    $courseId = intval($data['course_id']   ?? 0);
    $answer   = sanitize($data['intro_answer'] ?? '');

    $stmt = $pdo->prepare("SELECT * FROM courses WHERE id = ? AND status = 'upcoming'");
    $stmt->execute([$courseId]);
    $course = $stmt->fetch();
    if (!$course) jsonError('Course not found or no longer available');
    if (intval($course['teacher_id']) === intval($me['id'])) jsonError('You cannot register for your own course');

    if (!empty($course['intro_question']) && empty($answer)) {
        jsonError("Please answer the teacher's question before registering");
    }

    $count = $pdo->prepare('SELECT COUNT(*) FROM course_registrations WHERE course_id = ?');
    $count->execute([$courseId]);
    if (intval($count->fetchColumn()) >= intval($course['max_students'])) {
        jsonError('Course is full');
    }

    $already = $pdo->prepare('SELECT id FROM course_registrations WHERE course_id = ? AND student_id = ?');
    $already->execute([$courseId, $me['id']]);
    if ($already->fetch()) jsonError('Already registered for this course');

    $pdo->beginTransaction();
    try {
        $pdo->prepare("INSERT INTO course_registrations (course_id, student_id, intro_answer) VALUES (?,?,?)")
            ->execute([$courseId, $me['id'], $answer ?: null]);

        // Register for every upcoming session in this course
        $sessions = $pdo->prepare(
            "SELECT id FROM teaching_sessions WHERE course_id = ? AND status = 'upcoming'"
        );
        $sessions->execute([$courseId]);
        foreach ($sessions->fetchAll() as $sess) {
            $ins = $pdo->prepare(
                "INSERT IGNORE INTO session_registrations (session_id, student_id, intro_answer) VALUES (?,?,?)"
            );
            $ins->execute([$sess['id'], $me['id'], $answer ?: null]);
        }
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Registration failed: ' . $e->getMessage());
    }

    jsonSuccess(['message' => 'Registered for course']);
}

/* ── Unregister from a Course ──────────────────────────────────── */
function unregisterCourse($data) {
    $me       = requireAuth();
    $pdo      = getDB();
    $courseId = intval($data['course_id'] ?? 0);

    $pdo->prepare("DELETE FROM course_registrations WHERE course_id = ? AND student_id = ?")
        ->execute([$courseId, $me['id']]);

    // Remove from all upcoming sessions of this course
    $sessions = $pdo->prepare(
        "SELECT id FROM teaching_sessions WHERE course_id = ? AND status = 'upcoming'"
    );
    $sessions->execute([$courseId]);
    foreach ($sessions->fetchAll() as $sess) {
        $pdo->prepare("DELETE FROM session_registrations WHERE session_id = ? AND student_id = ?")
            ->execute([$sess['id'], $me['id']]);
    }

    jsonSuccess(['message' => 'Unregistered from course']);
}

/* ── Course Detail ─────────────────────────────────────────────── */
function courseDetail() {
    $pdo      = getDB();
    $me       = getAuthUser();
    $courseId = intval($_GET['course_id'] ?? 0);

    $sql = "SELECT c.*, u.first_name, u.last_name, u.username, u.avatar_url, u.xp,
                   (SELECT COUNT(*) FROM course_registrations cr WHERE cr.course_id = c.id) AS registered_count,
                   (SELECT ROUND(AVG(sf.rating),1) FROM session_feedback sf
                    WHERE sf.to_user_id = c.teacher_id AND sf.feedback_type = 'student_to_teacher'
                    AND sf.rating IS NOT NULL) AS avg_rating";
    if ($me) {
        $sql .= ", (SELECT COUNT(*) FROM course_registrations cr2
                   WHERE cr2.course_id = c.id AND cr2.student_id = ?) AS is_registered";
    }
    $sql .= " FROM courses c JOIN users u ON u.id = c.teacher_id WHERE c.id = ?";

    $params = $me ? [$me['id'], $courseId] : [$courseId];
    $stmt   = $pdo->prepare($sql);
    $stmt->execute($params);
    $course = $stmt->fetch();
    if (!$course) jsonError('Course not found');

    if ($me) {
        $ss = $pdo->prepare(
            "SELECT ts.id, ts.session_number, ts.title, ts.scheduled_at, ts.duration_minutes, ts.status, ts.description, ts.attendance_reported_at,
                    COALESCE(sr.attended, 0) AS attended
             FROM teaching_sessions ts
             LEFT JOIN session_registrations sr ON sr.session_id = ts.id AND sr.student_id = ?
             WHERE ts.course_id = ? ORDER BY ts.session_number ASC"
        );
        $ss->execute([$me['id'], $courseId]);
    } else {
        $ss = $pdo->prepare(
            "SELECT id, session_number, title, scheduled_at, duration_minutes, status, description, attendance_reported_at, 0 AS attended
             FROM teaching_sessions WHERE course_id = ? ORDER BY session_number ASC"
        );
        $ss->execute([$courseId]);
    }
    $course['sessions'] = $ss->fetchAll();

    jsonSuccess($course);
}

/* ── Cancel Course ─────────────────────────────────────────────── */
function cancelCourse($data) {
    $me       = requireAuth();
    $pdo      = getDB();
    $courseId = intval($data['course_id'] ?? 0);
    if (!$courseId) jsonError('course_id required');

    $stmt = $pdo->prepare('SELECT * FROM courses WHERE id=? AND teacher_id=?');
    $stmt->execute([$courseId, $me['id']]);
    if (!$stmt->fetch()) jsonError('Course not found or not yours');

    $pdo->prepare("UPDATE teaching_sessions SET status='cancelled' WHERE course_id=? AND status='upcoming'")
        ->execute([$courseId]);
    $pdo->prepare("UPDATE courses SET status='cancelled' WHERE id=?")
        ->execute([$courseId]);

    jsonSuccess(['message' => 'Course cancelled']);
}

/* ── Course Students (teacher) ─────────────────────────────────── */
function courseStudents() {
    $me       = requireAuth();
    $pdo      = getDB();
    $courseId = intval($_GET['course_id'] ?? 0);
    if (!$courseId) jsonError('course_id required');

    $own = $pdo->prepare('SELECT teacher_id FROM courses WHERE id=?');
    $own->execute([$courseId]);
    $row = $own->fetch();
    if (!$row) jsonError('Course not found');
    if (intval($row['teacher_id']) !== intval($me['id'])) jsonError('Not authorized');

    $stmt = $pdo->prepare(
        "SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url, u.grade,
                cr.registered_at, cr.intro_answer
         FROM course_registrations cr
         JOIN users u ON u.id = cr.student_id
         WHERE cr.course_id = ?
         ORDER BY cr.registered_at ASC"
    );
    $stmt->execute([$courseId]);
    $students = $stmt->fetchAll();

    // Attach per-session absences for each student
    foreach ($students as &$student) {
        $abs = $pdo->prepare(
            "SELECT sr.session_id, sr.will_attend, sr.absent_reason,
                    ts.title, ts.session_number, ts.scheduled_at
             FROM session_registrations sr
             JOIN teaching_sessions ts ON ts.id = sr.session_id
             WHERE sr.student_id = ? AND ts.course_id = ? AND sr.will_attend = 0
             ORDER BY ts.session_number ASC"
        );
        $abs->execute([$student['id'], $courseId]);
        $student['absences'] = $abs->fetchAll();
    }

    jsonSuccess($students);
}

/* ── Student: Set attendance intent for a course session ──────── */
function setSessionAttendanceIntent($data) {
    $me        = requireAuth();
    $pdo       = getDB();
    $sessionId = intval($data['session_id'] ?? 0);
    $willAttend = isset($data['will_attend']) ? (int)(bool)$data['will_attend'] : 1;
    $reason    = isset($data['reason']) ? sanitize($data['reason']) : null;

    if (!$sessionId) jsonError('session_id required');

    // Verify the student is registered for this session and it belongs to a course
    $stmt = $pdo->prepare(
        'SELECT sr.id, ts.course_id, ts.status, ts.scheduled_at
         FROM session_registrations sr
         JOIN teaching_sessions ts ON ts.id = sr.session_id
         WHERE sr.session_id = ? AND sr.student_id = ?'
    );
    $stmt->execute([$sessionId, $me['id']]);
    $reg = $stmt->fetch();
    if (!$reg)            jsonError('You are not registered for this session');
    if (!$reg['course_id']) jsonError('Attendance intent is only available for course sessions');
    if ($reg['status'] === 'ended') jsonError('This session has already ended');

    $pdo->prepare(
        'UPDATE session_registrations SET will_attend = ?, absent_reason = ? WHERE session_id = ? AND student_id = ?'
    )->execute([$willAttend, $willAttend ? null : ($reason ?: null), $sessionId, $me['id']]);

    jsonSuccess(['updated' => true]);
}

/* ── Get all currently live sessions ─────────────────────────── */
function getLiveSessions() {
    $pdo = getDB();
    $me  = getAuthUser();
    $stmt = $pdo->prepare(
        "SELECT ts.id, ts.title, ts.subject, ts.jitsi_room_id, ts.started_at, ts.duration_minutes,
                u.first_name, u.last_name, u.avatar_url,
                (SELECT COUNT(*) FROM session_registrations sr WHERE sr.session_id=ts.id) AS registered_count
         FROM teaching_sessions ts
         JOIN users u ON u.id = ts.teacher_id
         WHERE ts.status = 'live'
         ORDER BY ts.started_at ASC"
    );
    $stmt->execute();
    jsonSuccess($stmt->fetchAll());
}
