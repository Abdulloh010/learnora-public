<?php
require 'config.php';

// Lazy migration: create pomodoro table if missing (mirrors db/schema.sql)
(function() {
    $db = getDB();
    try { $db->query('SELECT id FROM pomodoro_sessions LIMIT 1'); }
    catch (Exception $e) {
        $db->exec("CREATE TABLE IF NOT EXISTS pomodoro_sessions (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            user_id          INT NOT NULL,
            duration_minutes INT NOT NULL DEFAULT 25,
            mode             ENUM('work','short_break','long_break') NOT NULL DEFAULT 'work',
            completed        TINYINT NOT NULL DEFAULT 1,
            xp_earned        INT NOT NULL DEFAULT 0,
            completed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (user_id),
            INDEX idx_completed_at (completed_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }
})();

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

switch ($action) {
    case 'save_session': saveSession($body); break;
    case 'stats':        getStats();         break;
    case 'history':      getHistory();       break;
    default: jsonError('Unknown action');
}

/* ── Save a completed Pomodoro session ──────────────────────────── */
function saveSession($data) {
    $user     = requireAuth();
    $duration = intval($data['duration_minutes'] ?? 0);
    $mode     = (string)($data['mode'] ?? 'work');
    $completed = intval($data['completed'] ?? 1) ? 1 : 0;

    if ($duration <= 0) jsonError('Duration required');
    if ($duration > 180) jsonError('Duration too long');
    if (!in_array($mode, ['work', 'short_break', 'long_break'], true)) $mode = 'work';

    // Only award XP for completed work sessions
    $xpEarned = 0;
    if ($completed && $mode === 'work') {
        // Base: 10 XP per pomodoro, bonus for longer sessions
        if ($duration >= 50)      $xpEarned = 20;
        elseif ($duration >= 40)  $xpEarned = 17;
        elseif ($duration >= 30)  $xpEarned = 15;
        elseif ($duration >= 25)  $xpEarned = 12;
        else                      $xpEarned = 10;
    }

    try {
        $pdo = getDB();

        // Insert session record
        $pdo->prepare(
            'INSERT INTO pomodoro_sessions (user_id, duration_minutes, mode, completed, xp_earned, completed_at)
             VALUES (?, ?, ?, ?, ?, NOW())'
        )->execute([$user['id'], $duration, $mode, $completed, $xpEarned]);
        $sessionId = intval($pdo->lastInsertId());

        // Award XP to user
        if ($xpEarned > 0) {
            $pdo->prepare('UPDATE users SET xp = xp + ? WHERE id = ?')
                ->execute([$xpEarned, $user['id']]);
        }

        // Update last_active
        try { $pdo->prepare('UPDATE users SET last_active = NOW() WHERE id = ?')->execute([$user['id']]); }
        catch (Exception $e) { /* column may not exist on older deployments */ }

        // Return updated XP
        $stmt = $pdo->prepare('SELECT xp FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $newXP = intval($stmt->fetchColumn());

        jsonSuccess([
            'xp_earned' => $xpEarned,
            'total_xp'  => $newXP,
            'session_id' => $sessionId,
        ]);
    } catch (Exception $e) {
        jsonError('Failed to save session');
    }
}

/* ── Get aggregated Pomodoro stats for authenticated user ──────── */
function getStats() {
    $user = requireAuth();
    try {
        $pdo = getDB();

        // All-time stats
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) as total_sessions,
                    COALESCE(SUM(duration_minutes), 0) as total_minutes,
                    COALESCE(SUM(xp_earned), 0) as total_xp,
                    COALESCE(SUM(CASE WHEN mode = "work" AND completed = 1 THEN 1 ELSE 0 END), 0) as completed_pomodoros
             FROM pomodoro_sessions WHERE user_id = ?'
        );
        $stmt->execute([$user['id']]);
        $allTime = $stmt->fetch();

        // Today stats
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) as today_sessions,
                    COALESCE(SUM(duration_minutes), 0) as today_minutes,
                    COALESCE(SUM(CASE WHEN mode = "work" AND completed = 1 THEN 1 ELSE 0 END), 0) as today_pomodoros
             FROM pomodoro_sessions WHERE user_id = ? AND DATE(completed_at) = CURDATE()'
        );
        $stmt->execute([$user['id']]);
        $today = $stmt->fetch();

        jsonSuccess([
            'all_time' => [
                'total_sessions'      => intval($allTime['total_sessions']),
                'total_minutes'       => intval($allTime['total_minutes']),
                'total_xp'            => intval($allTime['total_xp']),
                'completed_pomodoros' => intval($allTime['completed_pomodoros']),
            ],
            'today' => [
                'sessions'   => intval($today['today_sessions']),
                'minutes'    => intval($today['today_minutes']),
                'pomodoros'  => intval($today['today_pomodoros']),
            ],
        ]);
    } catch (Exception $e) {
        jsonError('Failed to load stats');
    }
}

/* ── Get recent Pomodoro history ────────────────────────────────── */
function getHistory() {
    $user  = requireAuth();
    $limit = max(1, min(intval($_GET['limit'] ?? 20), 100));
    try {
        $stmt = getDB()->prepare(
            'SELECT id, duration_minutes, mode, completed, xp_earned, completed_at
             FROM pomodoro_sessions WHERE user_id = ?
             ORDER BY completed_at DESC LIMIT ?'
        );
        $stmt->execute([$user['id'], $limit]);
        jsonSuccess($stmt->fetchAll());
    } catch (Exception $e) {
        jsonError('Failed to load history');
    }
}
