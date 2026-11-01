<?php
require 'config.php';
require 'mailer.php';

/* ── Schema setup ───────────────────────────────────────────── */
(function() {
    $db = getDB();
    $db->exec("CREATE TABLE IF NOT EXISTS help_requests (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        learner_id       INT NOT NULL,
        subject          VARCHAR(100) NOT NULL,
        topic            VARCHAR(200) NOT NULL,
        description      TEXT,
        status           ENUM('open','accepted','ended','expired','cancelled') NOT NULL DEFAULT 'open',
        accepted_by      INT DEFAULT NULL,
        jitsi_room_id    VARCHAR(200) DEFAULT NULL,
        created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        accepted_at      DATETIME DEFAULT NULL,
        ended_at         DATETIME DEFAULT NULL,
        rating           TINYINT DEFAULT NULL,
        feedback_comment TEXT DEFAULT NULL,
        FOREIGN KEY (learner_id)  REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_status  (status),
        INDEX idx_created (created_at)
    )");

    // Lazy migrations for existing installs
    try { $db->exec("ALTER TABLE help_requests MODIFY COLUMN status ENUM('open','accepted','ended','expired','cancelled') NOT NULL DEFAULT 'open'"); } catch (Exception $e) {}
    try { $db->exec("ALTER TABLE help_requests ADD COLUMN rating TINYINT DEFAULT NULL"); } catch (Exception $e) {}
    try { $db->exec("ALTER TABLE help_requests ADD COLUMN feedback_comment TEXT DEFAULT NULL"); } catch (Exception $e) {}

    // Auto-expire requests older than 10 minutes with no acceptance
    $db->exec("UPDATE help_requests SET status='expired'
               WHERE status='open'
                 AND created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 MINUTE)");
})();

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

switch ($action) {
    case 'post':            postRequest($body);      break;
    case 'my_requests':     myRequests();            break;
    case 'open_requests':   openRequests();          break;
    case 'accept':          acceptRequest($body);    break;
    case 'end':             endRequest($body);       break;
    case 'cancel':          cancelRequest($body);    break;
    case 'get_room':        getRoom();               break;
    case 'my_active':       myActiveSessions();      break;
    case 'rate':            rateSession($body);      break;
    default: jsonError('Unknown action');
}

/* ── Student posts a help request ───────────────────────────── */
function postRequest($data) {
    $me      = requireAuth();
    $pdo     = getDB();
    $subject = sanitize($data['subject']     ?? '');
    $topic   = sanitize($data['topic']       ?? '');
    $desc    = sanitize($data['description'] ?? '');

    if (!$subject || !$topic) jsonError('Subject and topic are required');
    if (strlen($topic) > 200) jsonError('Topic too long (max 200 chars)');

    // Limit: 1 open request at a time per student
    $existing = $pdo->prepare("SELECT id FROM help_requests WHERE learner_id=? AND status='open'");
    $existing->execute([$me['id']]);
    if ($existing->fetch()) jsonError('You already have an open help request. Cancel it first.');

    $pdo->prepare('INSERT INTO help_requests (learner_id, subject, topic, description) VALUES (?,?,?,?)')
        ->execute([$me['id'], $subject, $topic, $desc]);

    $id   = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT hr.*, u.first_name, u.last_name, u.username, u.avatar_url FROM help_requests hr JOIN users u ON u.id=hr.learner_id WHERE hr.id=?');
    $stmt->execute([$id]);
    jsonSuccess($stmt->fetch());
}

/* ── Student views their own requests ───────────────────────── */
function myRequests() {
    $me  = requireAuth();
    $pdo = getDB();
    $stmt = $pdo->prepare(
        "SELECT hr.*,
                ul.first_name AS learner_first, ul.last_name AS learner_last, ul.avatar_url AS learner_avatar,
                ut.first_name AS tutor_first,   ut.last_name  AS tutor_last,  ut.avatar_url AS tutor_avatar
         FROM help_requests hr
         JOIN users ul ON ul.id = hr.learner_id
         LEFT JOIN users ut ON ut.id = hr.accepted_by
         WHERE hr.learner_id = ?
         ORDER BY hr.created_at DESC
         LIMIT 20"
    );
    $stmt->execute([$me['id']]);
    jsonSuccess($stmt->fetchAll());
}

/* ── Teacher views open requests (their subject expertise optional) */
function openRequests() {
    $me      = requireAuth();
    $pdo     = getDB();
    $subject = sanitize($_GET['subject'] ?? '');

    if ($me['role'] !== 'active_teacher') jsonError('Only teachers can view the help queue');

    $sql    = "SELECT hr.*,
                      u.first_name, u.last_name, u.username, u.avatar_url, u.grade
               FROM help_requests hr
               JOIN users u ON u.id = hr.learner_id
               WHERE hr.status = 'open'";
    $params = [];
    if ($subject) { $sql .= ' AND hr.subject = ?'; $params[] = $subject; }
    $sql .= ' ORDER BY hr.created_at ASC LIMIT 50';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonSuccess($stmt->fetchAll());
}

/* ── Teacher accepts a help request → creates instant Jitsi room */
function acceptRequest($data) {
    $me  = requireAuth();
    $pdo = getDB();
    $id  = intval($data['request_id'] ?? 0);
    if (!$id) jsonError('Request ID required');
    if ($me['role'] !== 'active_teacher') jsonError('Only teachers can accept requests');

    // Check existence and ownership before atomic update
    $chk = $pdo->prepare("SELECT learner_id FROM help_requests WHERE id=? AND status='open'");
    $chk->execute([$id]);
    $chkRow = $chk->fetch();
    if (!$chkRow) jsonError('Request not found or already accepted');
    if ($chkRow['learner_id'] == $me['id']) jsonError('You cannot accept your own request');

    $roomId = 'learnora-help-' . $id . '-' . bin2hex(random_bytes(4));

    // Atomic claim: only succeeds if still 'open' (prevents race condition)
    $upd = $pdo->prepare("UPDATE help_requests SET status='accepted', accepted_by=?, jitsi_room_id=?, accepted_at=UTC_TIMESTAMP() WHERE id=? AND status='open'");
    $upd->execute([$me['id'], $roomId, $id]);
    if ($upd->rowCount() === 0) jsonError('Request was already accepted by another tutor');

    // Re-fetch for notification data
    $req = $chkRow;

    // Notify the learner via platform message
    try {
        $admin = $pdo->query("SELECT id FROM users WHERE role='admin' LIMIT 1")->fetch();
        if ($admin) {
            $tutorName = "{$me['first_name']} {$me['last_name']}";
            $msg = "✅ A tutor ({$tutorName}) accepted your help request for \"{$req['topic']}\". Join now!";
            $pdo->prepare('INSERT INTO messages (sender_id,receiver_id,content,is_read,created_at) VALUES (?,?,?,0,NOW())')
                ->execute([$admin['id'], $req['learner_id'], $msg]);
        }
    } catch (Exception $e) {}

    $jwt = generateJaaSToken(
        $me['id'],
        trim(($me['first_name'] ?? '') . ' ' . ($me['last_name'] ?? '')),
        $me['email'] ?? '',
        true,  // tutor = moderator
        $me['avatar_url'] ?? '',
        $roomId
    );

    jsonSuccess([
        'room_id'      => $roomId,
        'request_id'   => $id,
        'is_moderator' => true,
        'jwt'          => $jwt,
    ]);
}

/* ── End / close a help session ─────────────────────────────── */
function endRequest($data) {
    $me  = requireAuth();
    $pdo = getDB();
    $id  = intval($data['request_id'] ?? 0);
    if (!$id) jsonError('Request ID required');

    $stmt = $pdo->prepare("SELECT * FROM help_requests WHERE id=?");
    $stmt->execute([$id]);
    $req = $stmt->fetch();
    if (!$req) jsonError('Request not found');

    $isOwner  = $req['learner_id']  == $me['id'];
    $isAcceptor = $req['accepted_by'] == $me['id'];
    if (!$isOwner && !$isAcceptor) jsonError('Access denied');

    $pdo->prepare("UPDATE help_requests SET status='ended', ended_at=UTC_TIMESTAMP() WHERE id=?")
        ->execute([$id]);
    jsonSuccess(['ended' => true]);
}

/* ── Student cancels their own open request ─────────────────── */
function cancelRequest($data) {
    $me  = requireAuth();
    $pdo = getDB();
    $id  = intval($data['request_id'] ?? 0);
    if (!$id) jsonError('Request ID required');

    $pdo->prepare("UPDATE help_requests SET status='cancelled', ended_at=UTC_TIMESTAMP() WHERE id=? AND learner_id=? AND status='open'")
        ->execute([$id, $me['id']]);
    jsonSuccess(['cancelled' => true]);
}

/* ── Teacher: get their own currently-accepted sessions ────── */
function myActiveSessions() {
    $me  = requireAuth();
    $pdo = getDB();

    if ($me['role'] === 'active_teacher') {
        // Teacher: show sessions they accepted that are still in-progress
        $stmt = $pdo->prepare(
            "SELECT hr.*,
                    ul.first_name AS learner_first, ul.last_name AS learner_last, ul.avatar_url AS learner_avatar, ul.grade
             FROM help_requests hr
             JOIN users ul ON ul.id = hr.learner_id
             WHERE hr.accepted_by = ? AND hr.status = 'accepted'
             ORDER BY hr.accepted_at DESC LIMIT 5"
        );
        $stmt->execute([$me['id']]);
    } else {
        // Learner: their own accepted (in-session) requests
        $stmt = $pdo->prepare(
            "SELECT hr.*,
                    ut.first_name AS tutor_first, ut.last_name AS tutor_last, ut.avatar_url AS tutor_avatar
             FROM help_requests hr
             LEFT JOIN users ut ON ut.id = hr.accepted_by
             WHERE hr.learner_id = ? AND hr.status = 'accepted'
             ORDER BY hr.accepted_at DESC LIMIT 5"
        );
        $stmt->execute([$me['id']]);
    }

    jsonSuccess($stmt->fetchAll());
}

/* ── Student rates a completed help session ─────────────────── */
function rateSession($data) {
    $me      = requireAuth();
    $pdo     = getDB();
    $id      = intval($data['request_id'] ?? 0);
    $rating  = intval($data['rating']     ?? 0);
    $comment = sanitize($data['comment']  ?? '');

    if (!$id) jsonError('Request ID required');
    if ($rating < 1 || $rating > 5) jsonError('Rating must be 1–5');

    $stmt = $pdo->prepare("SELECT * FROM help_requests WHERE id=?");
    $stmt->execute([$id]);
    $req = $stmt->fetch();
    if (!$req) jsonError('Request not found');
    if ($req['learner_id'] != $me['id']) jsonError('Only the student can rate this session');
    if (!in_array($req['status'], ['ended', 'accepted'])) jsonError('Session is not rateable yet');
    if ($req['rating'] !== null) jsonError('You already rated this session');

    // Save rating
    $pdo->prepare("UPDATE help_requests SET rating=?, feedback_comment=?, status='ended', ended_at=COALESCE(ended_at,UTC_TIMESTAMP()) WHERE id=?")
        ->execute([$rating, $comment, $id]);

    // Award XP to tutor: rating * 2 XP (max 10 per session)
    if ($req['accepted_by']) {
        $xpAward = $rating * 2;
        $pdo->prepare("UPDATE users SET xp = xp + ? WHERE id=?")
            ->execute([$xpAward, $req['accepted_by']]);
    }

    jsonSuccess(['rated' => true, 'xp_awarded' => ($req['accepted_by'] ? $rating * 2 : 0)]);
}

/* ── Get Jitsi room for an accepted request ─────────────────── */
function getRoom() {
    $me  = requireAuth();
    $pdo = getDB();
    $id  = intval($_GET['request_id'] ?? 0);
    if (!$id) jsonError('Request ID required');

    $stmt = $pdo->prepare("SELECT * FROM help_requests WHERE id=?");
    $stmt->execute([$id]);
    $req = $stmt->fetch();
    if (!$req) jsonError('Request not found');
    if ($req['status'] !== 'accepted') jsonError('Session is not active');
    if (!$req['jitsi_room_id']) jsonError('Room not created');

    $isLearner = $req['learner_id']   == $me['id'];
    $isTutor   = $req['accepted_by']  == $me['id'];
    if (!$isLearner && !$isTutor) jsonError('Access denied');

    $jwt = generateJaaSToken(
        $me['id'],
        trim(($me['first_name'] ?? '') . ' ' . ($me['last_name'] ?? '')),
        $me['email'] ?? '',
        $isTutor,
        $me['avatar_url'] ?? '',
        (string)($req['jitsi_room_id'] ?? '')
    );

    jsonSuccess([
        'room_id'      => $req['jitsi_room_id'],
        'is_moderator' => $isTutor,
        'topic'        => $req['topic'],
        'subject'      => $req['subject'],
        'jwt'          => $jwt,
    ]);
}
