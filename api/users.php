<?php
require 'config.php';

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

// Lazy migration: add each new column individually so a partial previous
// migration doesn't leave any column missing.
(function() {
    $db = getDB();
    $cols = [
        'cover_color'         => 'ADD COLUMN cover_color         TEXT DEFAULT NULL',
        'skills'              => 'ADD COLUMN skills              TEXT DEFAULT NULL',
        'experiences'         => 'ADD COLUMN experiences         TEXT DEFAULT NULL',
        'fav_subjects'        => 'ADD COLUMN fav_subjects        TEXT DEFAULT NULL',
        'role'                => "ADD COLUMN role                VARCHAR(50) NOT NULL DEFAULT 'student'",
        'approved_subjects'   => 'ADD COLUMN approved_subjects   TEXT DEFAULT NULL',
        'public_bio'          => 'ADD COLUMN public_bio          TEXT DEFAULT NULL',
        'current_status'      => 'ADD COLUMN current_status      VARCHAR(100) DEFAULT NULL',
        'standardized_tests'  => 'ADD COLUMN standardized_tests  TEXT DEFAULT NULL',
        'test_subjects'       => 'ADD COLUMN test_subjects        TEXT DEFAULT NULL',
        'preferred_timezone'  => 'ADD COLUMN preferred_timezone  VARCHAR(100) DEFAULT NULL',
        'last_active'         => 'ADD COLUMN last_active         DATETIME DEFAULT NULL',
    ];
    foreach ($cols as $col => $ddl) {
        try { $db->query("SELECT $col FROM users LIMIT 1"); }
        catch(Exception $e) {
            try { $db->exec("ALTER TABLE users $ddl"); } catch(Exception $e2) {}
        }
    }
})();

switch ($action) {
    case 'search':             search();                  break;
    case 'profile':            profile();                 break;
    case 'connect':            connect($body);            break;
    case 'disconnect':         disconnect($body);         break;
    case 'connections':        connections();             break;
    case 'suggestions':        suggestions();             break;
    case 'pending_requests':   pendingRequests();         break;
    case 'sent_requests':      sentRequests();            break;
    case 'respond_connection': respondConnection($body);  break;
    case 'cancel_request':     cancelRequest($body);      break;
    case 'update_profile':     updateProfile($body);      break;
    case 'update_extras':      updateExtras($body);       break;
    case 'toggle_fav_subject': toggleFavSubject($body);   break;
    case 'change_password':    changePassword($body);     break;
    case 'leaderboard':        leaderboard();             break;
    case 'delete_account':     deleteAccount($body);      break;
    case 'remove_avatar':      removeAvatar();            break;
    default: jsonError('Unknown action');
}

function search() {
    $q = sanitize($_GET['q'] ?? '');
    if (strlen($q) < 2) jsonError('Query too short');
    try {
        $stmt = getDB()->prepare('SELECT id,first_name,last_name,username,grade,xp,level,bio,location,avatar_url FROM users WHERE (first_name LIKE ? OR last_name LIKE ? OR username LIKE ?) AND role != \'guest\' LIMIT 20');
        $like = "%$q%";
        $stmt->execute([$like,$like,$like]);
        jsonSuccess($stmt->fetchAll());
    } catch(Exception $e) { jsonError('Search failed'); }
}

function profile() {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) jsonError('User ID required');
    try {
        $pdo  = getDB();
        // Try to select new columns; fall back if they don't exist yet
        try {
            $stmt = $pdo->prepare('SELECT id,first_name,last_name,username,grade,xp,level,streak,bio,location,avatar_url,cover_color,skills,experiences,fav_subjects,created_at FROM users WHERE id=?');
        } catch(Exception $e) {
            $stmt = $pdo->prepare('SELECT id,first_name,last_name,username,grade,xp,level,streak,bio,location,avatar_url,created_at FROM users WHERE id=?');
        }
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) jsonError('User not found', 404);
        $p = $pdo->prepare('SELECT COUNT(*) FROM posts WHERE user_id=?');          $p->execute([$id]);
        $q = $pdo->prepare('SELECT COUNT(*) FROM quiz_attempts WHERE user_id=?');   $q->execute([$id]);
        $c = $pdo->prepare('SELECT COUNT(*) FROM connections WHERE (requester_id=? OR receiver_id=?) AND status="accepted"'); $c->execute([$id,$id]);
        $user['posts_count']       = $p->fetchColumn();
        $user['quizzes_count']     = $q->fetchColumn();
        $user['connections_count'] = $c->fetchColumn();

        // Include connection status for the viewing user (if logged in)
        $user['conn_status']      = 'none';
        $user['conn_requester_id'] = 0;
        $meId = 0;
        $bearer = getBearerToken();
        if ($bearer) {
            $tokenStmt = $pdo->prepare('SELECT user_id FROM sessions WHERE token=? AND expires_at > NOW()');
            $tokenStmt->execute([$bearer]);
            $meId = intval($tokenStmt->fetchColumn());
        }
        if ($meId && $meId !== $id) {
            $cs = $pdo->prepare('SELECT status, requester_id FROM connections WHERE (requester_id=? AND receiver_id=?) OR (requester_id=? AND receiver_id=?) LIMIT 1');
            $cs->execute([$meId,$id,$id,$meId]);
            $row = $cs->fetch();
            if ($row) {
                $user['conn_status']       = $row['status'];
                $user['conn_requester_id'] = intval($row['requester_id']);
            }
        }

        jsonSuccess($user);
    } catch(Exception $e) { jsonError('Failed to load profile'); }
}

function connect($data) {
    $me       = requireAuth();
    $targetId = intval($data['user_id'] ?? 0);
    if (!$targetId || $targetId === $me['id']) jsonError('Invalid user');
    try {
        $pdo = getDB();
        $existing = $pdo->prepare('SELECT * FROM connections WHERE (requester_id=? AND receiver_id=?) OR (requester_id=? AND receiver_id=?)');
        $existing->execute([$me['id'],$targetId,$targetId,$me['id']]);
        $conn = $existing->fetch();
        if ($conn) {
            if ($conn['status'] === 'accepted') {
                $pdo->prepare('DELETE FROM connections WHERE id=?')->execute([$conn['id']]);
                jsonSuccess(['status'=>'removed']);
            } elseif ($conn['receiver_id'] === $me['id'] && $conn['status'] === 'pending') {
                $pdo->prepare('UPDATE connections SET status="accepted" WHERE id=?')->execute([$conn['id']]);
                $pdo->prepare('UPDATE users SET xp=xp+5 WHERE id=?')->execute([$me['id']]);
                jsonSuccess(['status'=>'accepted']);
            } else {
                jsonSuccess(['status'=>'pending']);
            }
        } else {
            $pdo->prepare('INSERT INTO connections (requester_id,receiver_id,status,created_at) VALUES (?,?,"pending",NOW())')->execute([$me['id'],$targetId]);
            // Notify the target user of the new connection request
            $senderName = trim(($me['first_name'] ?? '') . ' ' . ($me['last_name'] ?? '')) ?: ($me['username'] ?? 'Someone');
            pushNotif($targetId, intval($me['id']), 'connection', "$senderName sent you a connection request");
            jsonSuccess(['status'=>'pending']);
        }
    } catch(Exception $e) { jsonError('Connection failed'); }
}

function disconnect($data) {
    $me = requireAuth();
    $targetId = intval($data['user_id'] ?? 0);
    if (!$targetId || $targetId === $me['id']) jsonError('Invalid user');
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT id FROM connections WHERE ((requester_id=? AND receiver_id=?) OR (requester_id=? AND receiver_id=?)) AND status="accepted"');
        $stmt->execute([$me['id'], $targetId, $targetId, $me['id']]);
        $conn = $stmt->fetch();
        if (!$conn) jsonError('No accepted connection found');
        $pdo->prepare('DELETE FROM connections WHERE id=?')->execute([$conn['id']]);
        jsonSuccess(['status' => 'removed']);
    } catch (Exception $e) { jsonError('Disconnect failed'); }
}

function connections() {
    $userId = intval($_GET['user_id'] ?? 0);
    if (!$userId) jsonError('User ID required');
    try {
        $stmt = getDB()->prepare('SELECT u.id,u.first_name,u.last_name,u.username,u.grade,u.xp,u.level,u.avatar_url,u.cover_color FROM users u JOIN connections c ON (c.requester_id=u.id OR c.receiver_id=u.id) WHERE ((c.requester_id=? AND c.receiver_id=u.id) OR (c.receiver_id=? AND c.requester_id=u.id)) AND c.status="accepted"');
        $stmt->execute([$userId,$userId]);
        jsonSuccess($stmt->fetchAll());
    } catch(Exception $e) { jsonError('Failed'); }
}

function suggestions() {
    $me = requireAuth();
    // Limit to 100 users (was 200 which could be very slow with correlated subqueries)
    try {
        // Use a single LEFT JOIN instead of two correlated subqueries for connection status
        $stmt = getDB()->prepare(
            'SELECT u.id,u.first_name,u.last_name,u.username,u.grade,u.xp,u.level,u.bio,u.avatar_url,u.cover_color,
             COALESCE(c.status, "none")        AS conn_status,
             COALESCE(c.requester_id, 0)       AS conn_requester_id
             FROM users u
             LEFT JOIN connections c ON (
                 (c.requester_id=? AND c.receiver_id=u.id)
              OR (c.requester_id=u.id AND c.receiver_id=?)
             )
             WHERE u.id != ? AND u.role != \'guest\'
             ORDER BY u.xp DESC
             LIMIT 100'
        );
        $stmt->execute([$me['id'], $me['id'], $me['id']]);
        jsonSuccess($stmt->fetchAll());
    } catch(Exception $e) { jsonError('Failed'); }
}

function pendingRequests() {
    $me = requireAuth();
    try {
        $stmt = getDB()->prepare(
            'SELECT c.id as connection_id,u.id,u.first_name,u.last_name,u.username,u.grade,u.xp,u.bio,u.avatar_url,u.cover_color
             FROM connections c JOIN users u ON c.requester_id=u.id
             WHERE c.receiver_id=? AND c.status="pending"
             ORDER BY c.created_at DESC'
        );
        $stmt->execute([$me['id']]);
        jsonSuccess($stmt->fetchAll());
    } catch(Exception $e) { jsonError('Failed'); }
}

function sentRequests() {
    $me = requireAuth();
    try {
        $stmt = getDB()->prepare(
            'SELECT c.id as connection_id,u.id,u.first_name,u.last_name,u.username,u.grade,u.xp,u.bio,u.avatar_url,u.cover_color
             FROM connections c JOIN users u ON c.receiver_id=u.id
             WHERE c.requester_id=? AND c.status="pending"
             ORDER BY c.created_at DESC'
        );
        $stmt->execute([$me['id']]);
        jsonSuccess($stmt->fetchAll());
    } catch(Exception $e) { jsonError('Failed'); }
}

function cancelRequest($data) {
    $me     = requireAuth();
    $connId = intval($data['connection_id'] ?? 0);
    if (!$connId) jsonError('Invalid request');
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT id FROM connections WHERE id=? AND requester_id=? AND status="pending"');
        $stmt->execute([$connId, $me['id']]);
        if (!$stmt->fetch()) jsonError('Request not found');
        $pdo->prepare('DELETE FROM connections WHERE id=?')->execute([$connId]);
        jsonSuccess(['status' => 'cancelled']);
    } catch(Exception $e) { jsonError('Failed'); }
}

function respondConnection($data) {
    $me     = requireAuth();
    $connId = intval($data['connection_id'] ?? 0);
    $action = $data['action'] ?? '';
    if (!$connId || !in_array($action, ['accept','reject'])) jsonError('Invalid request');
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT * FROM connections WHERE id=? AND receiver_id=? AND status="pending"');
        $stmt->execute([$connId, $me['id']]);
        $conn = $stmt->fetch();
        if (!$conn) jsonError('Connection request not found');
        if ($action === 'accept') {
            $pdo->prepare('UPDATE connections SET status="accepted" WHERE id=?')->execute([$connId]);
            $pdo->prepare('UPDATE users SET xp=xp+5 WHERE id=?')->execute([$me['id']]);
            // Notify the original requester that their request was accepted
            $acceptorName = trim(($me['first_name'] ?? '') . ' ' . ($me['last_name'] ?? '')) ?: ($me['username'] ?? 'Someone');
            pushNotif(intval($conn['requester_id']), intval($me['id']), 'connection',
                "$acceptorName accepted your connection request");
            jsonSuccess(['status' => 'accepted']);
        } else {
            $pdo->prepare('DELETE FROM connections WHERE id=?')->execute([$connId]);
            jsonSuccess(['status' => 'rejected']);
        }
    } catch(Exception $e) { jsonError('Failed'); }
}

function updateProfile($data) {
    $user      = requireAuth();
    $firstName = sanitize($data['first_name']        ?? '');
    $lastName  = sanitize($data['last_name']         ?? '');
    $bio       = sanitize($data['bio']               ?? '');
    $location  = sanitize($data['location']          ?? '');
    $grade     = sanitize($data['grade']             ?? '');
    $timezone  = sanitize($data['preferred_timezone'] ?? '');

    if (!$firstName) jsonError('First name is required');

    // Validate timezone string is a real IANA timezone
    if ($timezone) {
        try { new DateTimeZone($timezone); } catch (Exception $e) { $timezone = ''; }
    }

    try {
        $pdo = getDB();
        $sets   = 'first_name=?,last_name=?,bio=?,location=?';
        $params = [$firstName, $lastName, $bio, $location];
        if ($grade)    { $sets .= ',grade=?';              $params[] = $grade; }
        if ($timezone) { $sets .= ',preferred_timezone=?'; $params[] = $timezone; }
        $params[] = $user['id'];
        $pdo->prepare("UPDATE users SET $sets WHERE id=?")->execute($params);

        $stmt = $pdo->prepare('SELECT id,first_name,last_name,username,email,grade,xp,level,streak,bio,location,avatar_url,preferred_timezone FROM users WHERE id=?');
        $stmt->execute([$user['id']]);
        jsonSuccess($stmt->fetch());
    } catch (Exception $e) { jsonError('Update failed'); }
}

// Partial update: only updates fields that are present in the request body
function updateExtras($data) {
    $user    = requireAuth();
    $updates = [];
    $params  = [];

    if (array_key_exists('cover_color', $data)) {
        $updates[] = 'cover_color=?';
        $params[]  = sanitize($data['cover_color'] ?? '') ?: null;
    }
    if (array_key_exists('skills', $data)) {
        $skills    = $data['skills'];
        $updates[] = 'skills=?';
        $params[]  = is_array($skills) ? json_encode(array_values($skills)) : null;
    }
    if (array_key_exists('experiences', $data)) {
        $exps      = $data['experiences'];
        $updates[] = 'experiences=?';
        $params[]  = is_array($exps) ? json_encode(array_values($exps)) : null;
    }
    if (empty($updates)) { jsonSuccess(['updated' => false]); return; }

    $params[] = $user['id'];
    try {
        getDB()->prepare('UPDATE users SET ' . implode(',', $updates) . ' WHERE id=?')
               ->execute($params);
        jsonSuccess(['updated' => true]);
    } catch(Exception $e) { jsonError('Update failed'); }
}

// Toggle a subject in/out of fav_subjects
function toggleFavSubject($data) {
    $user      = requireAuth();
    $subjectId = intval($data['subject_id'] ?? 0);
    if (!$subjectId) jsonError('Subject ID required');
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT fav_subjects FROM users WHERE id=?');
        $stmt->execute([$user['id']]);
        $row  = $stmt->fetch();
        $favs = json_decode($row['fav_subjects'] ?? '[]', true) ?: [];
        if (in_array($subjectId, $favs)) {
            $favs = array_values(array_filter($favs, fn($x) => $x !== $subjectId));
            $isFav = false;
        } else {
            $favs[] = $subjectId;
            $isFav  = true;
        }
        $pdo->prepare('UPDATE users SET fav_subjects=? WHERE id=?')
            ->execute([json_encode($favs), $user['id']]);
        jsonSuccess(['is_fav' => $isFav, 'fav_subjects' => $favs]);
    } catch(Exception $e) { jsonError('Toggle failed'); }
}

function changePassword($data) {
    $user    = requireAuth();
    $current = $data['current_password'] ?? '';
    $newPass = $data['new_password']     ?? '';
    if (!$newPass) jsonError('New password is required');
    if (strlen($newPass) < 8) jsonError('New password must be at least 8 characters');
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id=?');
        $stmt->execute([$user['id']]);
        $row  = $stmt->fetch();
        if (!$row) jsonError('User not found');
        // Social-only accounts (Google/Telegram) have no password — allow setting one
        // without requiring a current password (they have no password to verify against).
        if ($row['password_hash']) {
            if (!$current) jsonError('Current password is required');
            if (!password_verify($current, $row['password_hash'])) jsonError('Current password is incorrect');
        }
        $hash = password_hash($newPass, PASSWORD_BCRYPT);
        $pdo->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([$hash, $user['id']]);
        jsonSuccess(['updated' => true, 'password_set' => true]);
    } catch (Exception $e) { jsonError('Failed to update password'); }
}

function leaderboard() {
    $grade = sanitize($_GET['grade'] ?? '');
    try {
        $sql = "SELECT id,first_name,last_name,username,grade,xp,level,streak,avatar_url FROM users WHERE role != 'guest'";
        $params = [];
        if ($grade) { $sql .= ' AND grade=?'; $params[] = $grade; }
        $sql .= ' ORDER BY xp DESC LIMIT 50';
        $stmt = getDB()->prepare($sql);
        $stmt->execute($params);
        jsonSuccess($stmt->fetchAll());
    } catch(Exception $e) { jsonError('Failed'); }
}

function removeAvatar() {
    $user = requireAuth();
    try {
        getDB()->prepare('UPDATE users SET avatar_url=NULL WHERE id=?')->execute([$user['id']]);
        jsonSuccess(['removed' => true]);
    } catch(Exception $e) { jsonError('Failed to remove photo'); }
}

function deleteAccount($data) {
    $user     = requireAuth();
    $password = $data['password'] ?? '';

    $pdo  = getDB();
    $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id=?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();
    if (!$row) jsonError('User not found');

    // Social-only accounts (Google/Telegram) have no password — skip password check.
    // Accounts with a password hash must provide the correct current password.
    if ($row['password_hash']) {
        if (!$password) jsonError('Password is required to delete your account');
        if (!password_verify($password, $row['password_hash'])) jsonError('Incorrect password');
    }

    $id = $user['id'];
    try {
        $pdo->beginTransaction();
        // Delete all related data then the user
        $pdo->prepare('DELETE FROM sessions       WHERE user_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM connections    WHERE requester_id=? OR receiver_id=?')->execute([$id,$id]);
        $pdo->prepare('DELETE FROM messages       WHERE sender_id=? OR receiver_id=?')->execute([$id,$id]);
        // Post votes / comments / saves
        $pdo->prepare('DELETE pv FROM post_votes pv
                       JOIN posts p ON p.id=pv.post_id WHERE p.user_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM post_votes     WHERE user_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM comments       WHERE user_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM saved_posts    WHERE user_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM comments       WHERE post_id IN (SELECT id FROM posts WHERE user_id=?)')->execute([$id]);
        $pdo->prepare('DELETE FROM post_votes     WHERE post_id IN (SELECT id FROM posts WHERE user_id=?)')->execute([$id]);
        $pdo->prepare('DELETE FROM posts          WHERE user_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM quiz_attempts  WHERE user_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM users          WHERE id=?')->execute([$id]);
        $pdo->commit();
        jsonSuccess(['deleted' => true]);
    } catch(Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('deleteAccount error: ' . $e->getMessage());
        jsonError('Failed to delete account. Please try again.');
    }
}