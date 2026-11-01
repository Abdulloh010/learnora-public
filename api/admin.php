<?php
require 'config.php';
require 'mailer.php';

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

/* ── Require admin role ─────────────────────────────────────── */
function requireAdmin() {
    $user = requireAuth();
    $role = $user['role'] ?? 'student';
    if ($role !== 'admin') jsonError('Admin access required', 403);
    return $user;
}

switch ($action) {
    case 'stats':               adminStats();               break;
    case 'applications':        adminApplications();        break;
    case 'review_application':  reviewApplication($body);  break;
    case 'users':               adminUsers();               break;
    case 'send_email':          adminSendEmail($body);      break;
    case 'sessions':            adminSessions();            break;
    case 'list_reports':        listReports();              break;
    case 'resolve_report':      resolveReport($body);       break;
    case 'delete_reported':     deleteReportedContent($body); break;
    default: jsonError('Unknown action');
}

/* ── Dashboard Stats ────────────────────────────────────────── */
function adminStats() {
    requireAdmin();
    $pdo = getDB();

    $totalUsers         = $pdo->query("SELECT COUNT(*) FROM users WHERE role NOT IN ('admin','guest')")->fetchColumn();
    $totalTeachers      = $pdo->query("SELECT COUNT(*) FROM users WHERE role='active_teacher'")->fetchColumn();
    $pendingApps        = $pdo->query("SELECT COUNT(*) FROM teacher_applications WHERE status='pending'")->fetchColumn();
    $totalSessions      = $pdo->query("SELECT COUNT(*) FROM teaching_sessions")->fetchColumn();
    $totalRegistrations = $pdo->query("SELECT COUNT(*) FROM session_registrations")->fetchColumn();

    // Extended stats
    $totalPosts    = 0; $totalCourses = 0; $totalQuizzes = 0; $openReports = 0;
    $newUsersWeek  = 0;
    try { $totalPosts    = intval($pdo->query("SELECT COUNT(*) FROM posts")->fetchColumn()); } catch(Exception $e){}
    try { $totalCourses  = intval($pdo->query("SELECT COUNT(*) FROM courses")->fetchColumn()); } catch(Exception $e){}
    try { $totalQuizzes  = intval($pdo->query("SELECT COUNT(*) FROM quizzes")->fetchColumn()); } catch(Exception $e){}
    try { $openReports   = intval($pdo->query("SELECT COUNT(*) FROM reports WHERE status='open'")->fetchColumn()); } catch(Exception $e){}
    try { $newUsersWeek  = intval($pdo->query("SELECT COUNT(*) FROM users WHERE role != 'guest' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn()); } catch(Exception $e){}

    jsonSuccess([
        'total_users'         => intval($totalUsers),
        'total_teachers'      => intval($totalTeachers),
        'pending_applications'=> intval($pendingApps),
        'total_sessions'      => intval($totalSessions),
        'total_registrations' => intval($totalRegistrations),
        'total_posts'         => $totalPosts,
        'total_courses'       => $totalCourses,
        'total_quizzes'       => $totalQuizzes,
        'open_reports'        => $openReports,
        'new_users_week'      => $newUsersWeek,
    ]);
}

/* ── Teacher Applications Queue ─────────────────────────────── */
function adminApplications() {
    requireAdmin();
    $pdo    = getDB();
    $status = sanitize($_GET['status'] ?? 'pending');
    if (!in_array($status, ['pending', 'approved', 'declined', 'all'])) $status = 'pending';

    $sql = 'SELECT ta.*, u.username, u.email, u.avatar_url, u.xp
            FROM teacher_applications ta
            JOIN users u ON u.id=ta.user_id';
    if ($status !== 'all') $sql .= ' WHERE ta.status=?';
    $sql .= ' ORDER BY ta.submitted_at DESC';

    $stmt = $pdo->prepare($sql);
    if ($status !== 'all') $stmt->execute([$status]);
    else $stmt->execute();

    jsonSuccess($stmt->fetchAll());
}

/* ── Approve or Decline Application ─────────────────────────── */
function reviewApplication($data) {
    requireAdmin();
    $pdo    = getDB();
    $appId  = intval($data['application_id'] ?? 0);
    $action = sanitize($data['action']       ?? ''); // 'approve' | 'decline'
    $notes  = htmlspecialchars(strip_tags($data['admin_notes'] ?? ''), ENT_QUOTES, 'UTF-8');
    $subjectsApproved = $data['approved_subjects'] ?? [];
    if (!is_array($subjectsApproved)) $subjectsApproved = [];

    if (!$appId || !in_array($action, ['approve', 'decline'])) jsonError('Invalid request');

    $stmt = $pdo->prepare('SELECT * FROM teacher_applications WHERE id=?');
    $stmt->execute([$appId]);
    $app = $stmt->fetch();
    if (!$app) jsonError('Application not found');

    $newStatus = ($action === 'approve') ? 'approved' : 'declined';
    $pdo->prepare("UPDATE teacher_applications SET status=?, admin_notes=?, reviewed_at=NOW() WHERE id=?")
        ->execute([$newStatus, $notes, $appId]);

    if ($action === 'approve') {
        // Approve: set the subjects from either admin's selection or the applicant's requested subjects
        $subjects = !empty($subjectsApproved)
            ? $subjectsApproved
            : json_decode($app['subjects_to_teach'] ?? '[]', true);

        $pdo->prepare("UPDATE users SET role='teacher_pending_training', approved_subjects=?, public_bio=?, current_status=?, standardized_tests=?, test_subjects=?, location=? WHERE id=?")
            ->execute([
                json_encode($subjects),
                $app['public_bio'],
                $app['current_status'],
                $app['standardized_tests'],
                $app['test_subjects'],
                $app['location'],
                $app['user_id'],
            ]);

        // Auto-delete intro video from Uploadcare to preserve free-tier storage
        if (!empty($app['video_pitch_url'])) {
            deleteUploadcareFile($app['video_pitch_url']);
            $pdo->prepare("UPDATE teacher_applications SET video_pitch_url=NULL WHERE id=?")->execute([$appId]);
        }

        // Send approval email
        $userStmt = $pdo->prepare('SELECT first_name, last_name, email FROM users WHERE id=?');
        $userStmt->execute([$app['user_id']]);
        $user = $userStmt->fetch();
        if ($user && $user['email']) {
            $name = $user['first_name'];
            $html = emailTemplate('Application Approved! 🎉', "
                <h2 style='margin:0 0 8px;font-size:1.4rem;color:#0D1B4B'>Congratulations, $name!</h2>
                <p style='color:#64748b;margin:0 0 16px'>Your application to become a Learnora teacher has been <strong style='color:#10B981'>approved</strong>.</p>
                <p style='color:#64748b;margin:0 0 16px'>You have been enrolled in the <strong>Teacher Training Module</strong>. Please log in to complete your training and unlock your Teacher Dashboard.</p>
                " . ($notes ? "<div style='background:#f0f9ff;border-left:4px solid #29ABE2;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0'><p style='margin:0;color:#0D1B4B;font-size:0.9rem'><strong>Admin note:</strong> $notes</p></div>" : '') . "
                <div style='text-align:center;margin:28px 0'>
                  <a href='https://learnora.uz' style='display:inline-block;background:linear-gradient(135deg,#1565C0,#29ABE2);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700'>Start Training →</a>
                </div>
            ");
            sendMail($user['email'], "{$user['first_name']} {$user['last_name']}", 'Your Learnora Teacher Application was Approved!', $html);
        }
    } else {
        // Decline: notify the user
        $userStmt = $pdo->prepare('SELECT first_name, last_name, email FROM users WHERE id=?');
        $userStmt->execute([$app['user_id']]);
        $user = $userStmt->fetch();
        if ($user && $user['email']) {
            $name = $user['first_name'];
            $html = emailTemplate('Application Update', "
                <h2 style='margin:0 0 8px;font-size:1.4rem;color:#0D1B4B'>Hi $name,</h2>
                <p style='color:#64748b;margin:0 0 16px'>Thank you for applying to become a Learnora teacher. After careful review, we were unable to approve your application at this time.</p>
                " . ($notes ? "<div style='background:#fff7ed;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0'><p style='margin:0;color:#0D1B4B;font-size:0.9rem'><strong>Feedback:</strong> $notes</p></div>" : '') . "
                <p style='color:#64748b;margin:0'>You are welcome to re-apply after addressing any feedback above.</p>
            ");
            sendMail($user['email'], "{$user['first_name']} {$user['last_name']}", 'Update on your Learnora Teacher Application', $html);
        }
    }

    jsonSuccess(['reviewed' => true, 'status' => $newStatus]);
}

/* ── List All Users (for email targeting) ───────────────────── */
function adminUsers() {
    requireAdmin();
    $pdo = getDB();
    $stmt = $pdo->query("SELECT id, first_name, last_name, username, email, role, xp, created_at FROM users WHERE role NOT IN ('admin','guest') ORDER BY created_at DESC");
    jsonSuccess($stmt->fetchAll());
}

/* ── Send Email (single user or broadcast) ──────────────────── */
function adminSendEmail($data) {
    requireAdmin();
    $pdo      = getDB();
    $subject  = sanitize($data['subject']   ?? '');
    $message  = $data['message']            ?? '';   // rich text — kept as-is for email body
    $target   = sanitize($data['target']    ?? '');  // 'all' | user_id
    $preview  = sanitize($data['preview']   ?? '');  // preview text for email clients

    if (!$subject || !$message) jsonError('Subject and message are required');

    $html = emailTemplate($subject, $message, $preview);

    if ($target === 'all') {
        $stmt = $pdo->query("SELECT first_name, last_name, email FROM users WHERE email IS NOT NULL AND role != 'admin'");
        $recipients = $stmt->fetchAll();
        $sent = 0;
        foreach ($recipients as $r) {
            if (!$r['email']) continue;
            sendMail($r['email'], "{$r['first_name']} {$r['last_name']}", $subject, $html);
            $sent++;
        }
        jsonSuccess(['sent' => $sent, 'broadcast' => true]);
    } else {
        $userId = intval($target);
        $stmt = $pdo->prepare('SELECT first_name, last_name, email FROM users WHERE id=?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if (!$user || !$user['email']) jsonError('User not found or has no email');
        sendMail($user['email'], "{$user['first_name']} {$user['last_name']}", $subject, $html);
        jsonSuccess(['sent' => 1, 'broadcast' => false]);
    }
}

/* ── Admin: All Sessions ────────────────────────────────────── */
function adminSessions() {
    requireAdmin();
    $pdo = getDB();
    $stmt = $pdo->query(
        'SELECT ts.*, u.first_name, u.last_name, u.username,
                (SELECT COUNT(*) FROM session_registrations sr WHERE sr.session_id=ts.id) AS registered_count
         FROM teaching_sessions ts JOIN users u ON u.id=ts.teacher_id
         ORDER BY ts.scheduled_at DESC LIMIT 100'
    );
    jsonSuccess($stmt->fetchAll());
}

/* ── Content Reports ────────────────────────────────────────── */
function listReports() {
    requireAdmin();
    $pdo    = getDB();
    $status = sanitize($_GET['status'] ?? 'open');
    if (!in_array($status, ['open','resolved','dismissed','all'])) $status = 'open';

    try {
        $where  = $status !== 'all' ? 'WHERE r.status = ?' : '';
        $params = $status !== 'all' ? [$status] : [];
        $stmt  = $pdo->prepare(
            "SELECT r.*,
                    reporter.username  AS reporter_username,
                    reporter.first_name AS reporter_first_name,
                    reporter.last_name  AS reporter_last_name
             FROM reports r
             JOIN users reporter ON reporter.id = r.reporter_id
             $where
             ORDER BY r.created_at DESC
             LIMIT 200"
        );
        $stmt->execute($params);
        $reports = $stmt->fetchAll();

        // Attach the actual content (post title or comment snippet)
        foreach ($reports as &$rep) {
            $rep['content_preview'] = '';
            try {
                if ($rep['target_type'] === 'post') {
                    $s = $pdo->prepare('SELECT title, content FROM posts WHERE id=?');
                    $s->execute([$rep['target_id']]);
                    $row = $s->fetch();
                    $rep['content_preview'] = $row ? (($row['title'] ?? '') . ': ' . mb_strimwidth((string)($row['content'] ?? ''), 0, 120, '…')) : '[deleted]';
                    $rep['author_id']       = $row ? intval($row['user_id'] ?? 0) : 0;
                } else {
                    $s = $pdo->prepare('SELECT content, user_id FROM comments WHERE id=?');
                    $s->execute([$rep['target_id']]);
                    $row = $s->fetch();
                    $rep['content_preview'] = $row ? mb_strimwidth((string)($row['content'] ?? ''), 0, 120, '…') : '[deleted]';
                    $rep['author_id']       = $row ? intval($row['user_id']) : 0;
                }
            } catch (Exception $e) {}
        }
        unset($rep);
        jsonSuccess($reports);
    } catch (Exception $e) { jsonError('Failed to load reports'); }
}

function resolveReport($data) {
    requireAdmin();
    $id     = intval($data['report_id'] ?? 0);
    $action = sanitize($data['action']  ?? ''); // 'resolved' | 'dismissed'
    if (!$id || !in_array($action, ['resolved','dismissed'])) jsonError('Invalid request');
    try {
        getDB()->prepare(
            'UPDATE reports SET status=?, resolved_at=NOW() WHERE id=?'
        )->execute([$action, $id]);
        jsonSuccess(['updated' => true]);
    } catch (Exception $e) { jsonError('Failed to update report'); }
}

function deleteReportedContent($data) {
    requireAdmin();
    $pdo        = getDB();
    $reportId   = intval($data['report_id']   ?? 0);
    $targetType = sanitize($data['target_type'] ?? '');
    $targetId   = intval($data['target_id']   ?? 0);
    if (!$targetId || !in_array($targetType, ['post','comment'])) jsonError('Invalid request');

    try {
        if ($targetType === 'post') {
            $pdo->prepare('DELETE FROM post_votes  WHERE post_id=?')->execute([$targetId]);
            $pdo->prepare('DELETE FROM comments    WHERE post_id=?')->execute([$targetId]);
            $pdo->prepare('DELETE FROM saved_posts WHERE post_id=?')->execute([$targetId]);
            $pdo->prepare('DELETE FROM posts       WHERE id=?')->execute([$targetId]);
        } else {
            $pdo->prepare('DELETE FROM comments WHERE id=?')->execute([$targetId]);
        }
        // Mark all reports for this content as resolved
        $pdo->prepare(
            'UPDATE reports SET status="resolved", resolved_at=NOW() WHERE target_type=? AND target_id=?'
        )->execute([$targetType, $targetId]);
        jsonSuccess(['deleted' => true]);
    } catch (Exception $e) { jsonError('Failed to delete content'); }
}

/* ── Uploadcare: Delete a file from CDN to free storage ─────── */
function deleteUploadcareFile($fileUrl) {
    if (!$fileUrl) return;
    // Extract UUID from Uploadcare CDN URL: https://ucarecdn.com/{uuid}/
    if (!preg_match('/ucarecdn\.com\/([a-f0-9\-]{36})/i', $fileUrl, $m)) return;
    $uuid    = $m[1];
    $authHdr = 'Authorization: Uploadcare.Simple ' . UPLOADCARE_PUB_KEY . ':' . UPLOADCARE_SECRET_KEY;
    $ctx = stream_context_create([
        'http' => [
            'method'        => 'DELETE',
            'header'        => implode("\r\n", [
                $authHdr,
                'Accept: application/vnd.uploadcare-v0.7+json',
                'Content-Length: 0',
            ]),
            'ignore_errors' => true,
            'timeout'       => 10,
        ],
    ]);
    @file_get_contents('https://api.uploadcare.com/files/' . $uuid . '/storage/', false, $ctx);
}
