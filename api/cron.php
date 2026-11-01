<?php
/**
 * Learnora Cron Runner
 * Sends 1-hour-before session reminders to registered students.
 *
 * Recommended crontab entry (every 15 minutes):
 *   * /15 * * * * php /path/to/api/cron.php >> /var/log/learnora-cron.log 2>&1
 *
 * Can also be triggered via HTTP with a secret key:
 *   GET /api/cron.php?key=YOUR_CRON_SECRET&action=reminders
 */

// ── Guard: HTTP access requires secret key ──────────────────────
if (php_sapi_name() !== 'cli') {
    require_once __DIR__ . '/config.php';
    $secret = defined('CRON_SECRET') ? CRON_SECRET : '';
    if (!$secret || ($_GET['key'] ?? '') !== $secret) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        exit;
    }
} else {
    require_once __DIR__ . '/config.php';
}

require_once __DIR__ . '/mailer.php';

// ── Helper: send a system platform message ──────────────────────
function cronSendSystemMessage($pdo, int $toUserId, string $content): void {
    try {
        $admin = $pdo->query("SELECT id FROM users WHERE role='admin' LIMIT 1")->fetch();
        if (!$admin) return;
        $pdo->prepare('INSERT INTO messages (sender_id,receiver_id,content,is_read,created_at) VALUES (?,?,?,0,NOW())')
            ->execute([$admin['id'], $toUserId, $content]);
    } catch (Exception $e) {}
}

// ── Helper: format UTC datetime in a display timezone ───────────
function cronFmtTime(string $utcStr, string $tz): string {
    try {
        $dt = new DateTime($utcStr, new DateTimeZone('UTC'));
        $dt->setTimezone(new DateTimeZone($tz));
        return $dt->format('g:i A') . " ($tz)";
    } catch (Exception $e) {
        return $utcStr;
    }
}

// ── Main: send reminders for sessions starting in 45–75 min ─────
try {
    $pdo = getDB();

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
            $dispTz  = !empty($stu['preferred_timezone']) ? $stu['preferred_timezone'] : ($sess['session_timezone'] ?: 'UTC');
            $timeStr = cronFmtTime($sess['scheduled_at'], $dispTz);
            $link    = $sess['meeting_link'] ?? '';

            // Platform message
            $platform = "⏰ Reminder: \"{$sess['title']}\" with $teacherName starts in ~1 hour at $timeStr"
                      . ($link ? " | Join: $link" : '');
            cronSendSystemMessage($pdo, $stu['id'], $platform);

            // Email if available
            if (!empty($stu['email'])) {
                $name    = htmlspecialchars($stu['first_name'] ?? '');
                $sTitle  = htmlspecialchars($sess['title'] ?? '');
                $tName   = htmlspecialchars($teacherName);
                $dur     = intval($sess['duration_minutes']);
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

    // Auto-end live sessions whose duration + 5-min buffer has passed
    $expired = $pdo->query(
        "SELECT id, title FROM teaching_sessions
         WHERE status = 'live'
           AND DATE_ADD(started_at, INTERVAL (duration_minutes + 5) MINUTE) < UTC_TIMESTAMP()"
    )->fetchAll();
    $autoEnded = 0;
    foreach ($expired as $sess) {
        $pdo->prepare("UPDATE teaching_sessions SET status='ended', ended_at=UTC_TIMESTAMP() WHERE id=?")
            ->execute([$sess['id']]);
        $autoEnded++;
    }

    // Auto-end stale help sessions accepted > 3 hours ago (stuck in 'accepted')
    $staleHelp = $pdo->query(
        "SELECT id FROM help_requests
         WHERE status = 'accepted'
           AND accepted_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)"
    )->fetchAll();
    $staleHelpEnded = 0;
    foreach ($staleHelp as $hr) {
        $pdo->prepare("UPDATE help_requests SET status='ended', ended_at=UTC_TIMESTAMP() WHERE id=?")
            ->execute([$hr['id']]);
        $staleHelpEnded++;
    }

    // Remove expired guest accounts (guest mode keeps nothing longer than GUEST_TTL_HOURS)
    cleanupGuests(500);

    $msg = "[" . date('Y-m-d H:i:s') . "] Reminders sent: $sent | Sessions auto-ended: $autoEnded | Stale help sessions ended: $staleHelpEnded";
    if (php_sapi_name() === 'cli') {
        echo $msg . "\n";
    } else {
        echo json_encode(['ok' => true, 'reminders_sent' => $sent, 'sessions_checked' => count($sessions), 'auto_ended' => $autoEnded, 'stale_help_ended' => $staleHelpEnded]);
    }
} catch (Exception $e) {
    $msg = "[" . date('Y-m-d H:i:s') . "] Cron error: " . $e->getMessage();
    if (php_sapi_name() === 'cli') {
        echo $msg . "\n";
    } else {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
