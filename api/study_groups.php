<?php
require 'config.php';

// Lazy migration: create study group tables if missing (also in db/study_groups.sql)
(function() {
    $db = getDB();
    try { $db->query('SELECT id FROM study_groups LIMIT 1'); }
    catch (Exception $e) {
        $db->exec("CREATE TABLE IF NOT EXISTS study_groups (
            id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            creator_id  INT UNSIGNED NOT NULL,
            name        VARCHAR(200) NOT NULL,
            description TEXT DEFAULT NULL,
            subject     VARCHAR(100) DEFAULT NULL,
            icon        VARCHAR(10) DEFAULT '📚',
            is_private  TINYINT(1) NOT NULL DEFAULT 0,
            member_count INT UNSIGNED NOT NULL DEFAULT 1,
            created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_creator (creator_id),
            INDEX idx_subject (subject)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }
    try { $db->query('SELECT id FROM study_group_members LIMIT 1'); }
    catch (Exception $e) {
        $db->exec("CREATE TABLE IF NOT EXISTS study_group_members (
            id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            group_id   INT UNSIGNED NOT NULL,
            user_id    INT UNSIGNED NOT NULL,
            role       ENUM('member','moderator','owner') NOT NULL DEFAULT 'member',
            joined_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_group_user (group_id, user_id),
            INDEX idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }
    try { $db->query('SELECT id FROM study_group_messages LIMIT 1'); }
    catch (Exception $e) {
        $db->exec("CREATE TABLE IF NOT EXISTS study_group_messages (
            id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            group_id   INT UNSIGNED NOT NULL,
            user_id    INT UNSIGNED NOT NULL,
            content    TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_group (group_id, created_at),
            INDEX idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }
})();

const SG_MAX_OWNED   = 10;
const SG_PAGE_SIZE   = 12;
const SG_MSG_PAGE    = 30;
const SG_MSG_POLL    = 100;

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

try {
    switch ($action) {
        case 'list':           listGroups();           break;
        case 'my_groups':      myGroups();             break;
        case 'create':         createGroup($body);     break;
        case 'get':            getGroup();             break;
        case 'update':         updateGroup($body);     break;
        case 'delete':         deleteGroup($body);     break;
        case 'join':           joinGroup($body);       break;
        case 'leave':          leaveGroup($body);      break;
        case 'members':        getMembers();           break;
        case 'messages':       getMessages();          break;
        case 'send_message':   sendMessage($body);     break;
        case 'delete_message': deleteMessage($body);   break;
        default: jsonError('Unknown action');
    }
} catch (Exception $e) {
    jsonError('Study groups request failed', 500);
}

/* Clamp a sanitized string to $max characters */
function sgText($value, int $max): string {
    $s = sanitize($value);
    return $max > 0 ? mb_substr($s, 0, $max) : $s;
}

/* Membership row (with role) for a user in a group, or null */
function sgMembership(int $groupId, $user) {
    if (!$user) return null;
    $stmt = getDB()->prepare('SELECT id, role FROM study_group_members WHERE group_id = ? AND user_id = ?');
    $stmt->execute([$groupId, $user['id']]);
    return $stmt->fetch() ?: null;
}

/* Recount members so member_count never drifts */
function sgRecount(int $groupId): void {
    getDB()->prepare(
        'UPDATE study_groups SET member_count = (SELECT COUNT(*) FROM study_group_members WHERE group_id = ?) WHERE id = ?'
    )->execute([$groupId, $groupId]);
}

function listGroups() {
    $user    = getAuthUser();
    $subject = sanitize($_GET['subject'] ?? '');
    $search  = sanitize($_GET['q'] ?? '');
    $page    = max(1, intval($_GET['page'] ?? 1));
    $offset  = ($page - 1) * SG_PAGE_SIZE;

    $where  = ['g.is_private = 0'];
    $params = [];
    if ($subject) { $where[] = 'g.subject = ?'; $params[] = $subject; }
    if ($search)  { $where[] = '(g.name LIKE ? OR g.description LIKE ?)'; $params[] = "%$search%"; $params[] = "%$search%"; }

    $pdo  = getDB();
    $sql  = 'SELECT g.*, u.first_name, u.last_name, u.username
             FROM study_groups g
             JOIN users u ON g.creator_id = u.id
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY g.member_count DESC, g.updated_at DESC
             LIMIT ? OFFSET ?';
    $params[] = SG_PAGE_SIZE;
    $params[] = $offset;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $groups = $stmt->fetchAll();

    // Add membership flags
    $memberSet = [];
    if ($user && !empty($groups)) {
        $ids = array_column($groups, 'id');
        $in  = implode(',', array_fill(0, count($ids), '?'));
        $mem = $pdo->prepare("SELECT group_id FROM study_group_members WHERE user_id = ? AND group_id IN ($in)");
        $mem->execute(array_merge([$user['id']], $ids));
        $memberSet = array_flip(array_column($mem->fetchAll(), 'group_id'));
    }
    foreach ($groups as &$g) {
        $g['is_member'] = isset($memberSet[$g['id']]);
        $g['is_mine']   = $user ? intval($g['creator_id']) === intval($user['id']) : false;
    }
    unset($g);

    jsonSuccess(['groups' => $groups, 'has_more' => count($groups) === SG_PAGE_SIZE]);
}

function myGroups() {
    $user = requireAuth();
    $pdo  = getDB();

    $stmt = $pdo->prepare(
        'SELECT g.*, u.first_name, u.last_name, u.username, m.role,
                (SELECT content FROM study_group_messages WHERE group_id = g.id ORDER BY id DESC LIMIT 1) as last_message,
                (SELECT created_at FROM study_group_messages WHERE group_id = g.id ORDER BY id DESC LIMIT 1) as last_message_at
         FROM study_groups g
         JOIN study_group_members m ON g.id = m.group_id AND m.user_id = ?
         JOIN users u ON g.creator_id = u.id
         ORDER BY g.updated_at DESC'
    );
    $stmt->execute([$user['id']]);
    $groups = $stmt->fetchAll();
    foreach ($groups as &$g) {
        $g['is_member'] = true;
        $g['is_mine']   = intval($g['creator_id']) === intval($user['id']);
    }
    unset($g);
    jsonSuccess(['groups' => $groups]);
}

function createGroup($body) {
    $user = requireAuth();
    $name = sgText($body['name'] ?? '', 0);
    if ($name === '') jsonError('Group name is required');
    if (mb_strlen($name) > 200) jsonError('Name too long (max 200 characters)');

    // Limit: max SG_MAX_OWNED owned groups
    $pdo   = getDB();
    $count = $pdo->prepare('SELECT COUNT(*) FROM study_groups WHERE creator_id = ?');
    $count->execute([$user['id']]);
    if (intval($count->fetchColumn()) >= SG_MAX_OWNED) jsonError('You can only create up to ' . SG_MAX_OWNED . ' study groups');

    $desc       = sgText($body['description'] ?? '', 2000);
    $subject    = sgText($body['subject'] ?? '', 100);
    $icon       = sgText($body['icon'] ?? '', 10) ?: '📚';
    $is_private = !empty($body['is_private']) ? 1 : 0;

    $pdo->beginTransaction();
    $pdo->prepare(
        'INSERT INTO study_groups (creator_id, name, description, subject, icon, is_private, member_count)
         VALUES (?, ?, ?, ?, ?, ?, 1)'
    )->execute([$user['id'], $name, $desc, $subject, $icon, $is_private]);
    $groupId = intval($pdo->lastInsertId());

    // Creator becomes the owner-member
    $pdo->prepare(
        'INSERT INTO study_group_members (group_id, user_id, role) VALUES (?, ?, ?)'
    )->execute([$groupId, $user['id'], 'owner']);

    // Auto-send welcome message
    $pdo->prepare(
        'INSERT INTO study_group_messages (group_id, user_id, content) VALUES (?, ?, ?)'
    )->execute([$groupId, $user['id'], "Welcome to $name! Let's study together 🎉"]);
    $pdo->commit();

    $grp = $pdo->prepare('SELECT * FROM study_groups WHERE id = ?');
    $grp->execute([$groupId]);
    $group = $grp->fetch();
    $group['is_member'] = true;
    $group['is_mine']   = true;
    $group['role']      = 'owner';
    jsonSuccess(['group' => $group, 'message' => 'Study group created!']);
}

function getGroup() {
    $user    = getAuthUser();
    $groupId = intval($_GET['group_id'] ?? 0);
    if (!$groupId) jsonError('group_id required');

    $stmt = getDB()->prepare(
        'SELECT g.*, u.first_name, u.last_name, u.username
         FROM study_groups g JOIN users u ON g.creator_id = u.id WHERE g.id = ?'
    );
    $stmt->execute([$groupId]);
    $group = $stmt->fetch();
    if (!$group) jsonError('Group not found', 404);

    $membership = sgMembership($groupId, $user);
    // Private groups are visible to their members only
    if (intval($group['is_private']) === 1 && !$membership) jsonError('Group not found', 404);

    $group['is_member'] = (bool)$membership;
    $group['is_mine']   = $user ? intval($group['creator_id']) === intval($user['id']) : false;
    $group['role']      = $membership['role'] ?? null;
    jsonSuccess(['group' => $group]);
}

function updateGroup($body) {
    $user    = requireAuth();
    $groupId = intval($body['group_id'] ?? 0);
    if (!$groupId) jsonError('group_id required');

    $pdo = getDB();
    $chk = $pdo->prepare('SELECT id FROM study_groups WHERE id = ? AND creator_id = ?');
    $chk->execute([$groupId, $user['id']]);
    if (!$chk->fetch()) jsonError('Group not found or not yours', 403);

    $sets = []; $params = [];
    // Column names come from this fixed whitelist only
    foreach (['name' => 200, 'description' => 2000, 'subject' => 100, 'icon' => 10] as $field => $maxLen) {
        if (array_key_exists($field, $body)) {
            $val = sanitize($body[$field]);
            if (mb_strlen($val) > $maxLen) jsonError(ucfirst($field) . ' too long');
            if ($field === 'name' && $val === '') jsonError('Group name is required');
            if ($field === 'icon' && $val === '') $val = '📚';
            $sets[]   = "$field = ?";
            $params[] = $val;
        }
    }
    if (array_key_exists('is_private', $body)) { $sets[] = 'is_private = ?'; $params[] = !empty($body['is_private']) ? 1 : 0; }

    if ($sets) {
        $params[] = $groupId;
        $pdo->prepare('UPDATE study_groups SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    }
    jsonSuccess(['message' => 'Group updated']);
}

function deleteGroup($body) {
    $user    = requireAuth();
    $groupId = intval($body['group_id'] ?? $_GET['group_id'] ?? 0);
    if (!$groupId) jsonError('group_id required');

    $pdo = getDB();
    $chk = $pdo->prepare('SELECT id FROM study_groups WHERE id = ? AND creator_id = ?');
    $chk->execute([$groupId, $user['id']]);
    if (!$chk->fetch()) jsonError('Group not found or not yours', 403);

    $pdo->beginTransaction();
    $pdo->prepare('DELETE FROM study_group_messages WHERE group_id = ?')->execute([$groupId]);
    $pdo->prepare('DELETE FROM study_group_members WHERE group_id = ?')->execute([$groupId]);
    $pdo->prepare('DELETE FROM study_groups WHERE id = ?')->execute([$groupId]);
    $pdo->commit();

    jsonSuccess(['message' => 'Group deleted']);
}

function joinGroup($body) {
    $user    = requireAuth();
    $groupId = intval($body['group_id'] ?? 0);
    if (!$groupId) jsonError('group_id required');

    $pdo  = getDB();
    $grp  = $pdo->prepare('SELECT * FROM study_groups WHERE id = ?');
    $grp->execute([$groupId]);
    $group = $grp->fetch();
    if (!$group) jsonError('Group not found', 404);
    if (sgMembership($groupId, $user)) jsonError('Already a member');
    // There is no invite flow yet, so private groups can't be joined from outside
    if (intval($group['is_private']) === 1) jsonError('This group is private', 403);

    $pdo->prepare('INSERT IGNORE INTO study_group_members (group_id, user_id, role) VALUES (?, ?, ?)')
        ->execute([$groupId, $user['id'], 'member']);
    sgRecount($groupId);

    // Join notice in the chat
    $name = trim(sanitize(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''))) ?: ($user['username'] ?? 'Someone');
    $pdo->prepare('INSERT INTO study_group_messages (group_id, user_id, content) VALUES (?, ?, ?)')
        ->execute([$groupId, $user['id'], $name . ' joined the group 👋']);

    jsonSuccess(['message' => 'Joined group!']);
}

function leaveGroup($body) {
    $user    = requireAuth();
    $groupId = intval($body['group_id'] ?? 0);
    if (!$groupId) jsonError('group_id required');

    $pdo  = getDB();
    $grp  = $pdo->prepare('SELECT * FROM study_groups WHERE id = ?');
    $grp->execute([$groupId]);
    $group = $grp->fetch();
    if (!$group) jsonError('Group not found', 404);

    // Owner cannot leave (must delete instead)
    if (intval($group['creator_id']) === intval($user['id'])) jsonError('The owner cannot leave. Delete the group instead.');

    $del = $pdo->prepare('DELETE FROM study_group_members WHERE group_id = ? AND user_id = ?');
    $del->execute([$groupId, $user['id']]);
    if ($del->rowCount() === 0) jsonError('Not a member');
    sgRecount($groupId);

    jsonSuccess(['message' => 'Left group']);
}

function getMembers() {
    $user    = getAuthUser();
    $groupId = intval($_GET['group_id'] ?? 0);
    if (!$groupId) jsonError('group_id required');

    $pdo = getDB();
    $grp = $pdo->prepare('SELECT is_private FROM study_groups WHERE id = ?');
    $grp->execute([$groupId]);
    $isPrivate = $grp->fetchColumn();
    if ($isPrivate === false) jsonError('Group not found', 404);
    if (intval($isPrivate) === 1 && !sgMembership($groupId, $user)) jsonError('Group not found', 404);

    $stmt = $pdo->prepare(
        "SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url, u.xp, u.grade,
                m.role, m.joined_at
         FROM study_group_members m
         JOIN users u ON m.user_id = u.id
         WHERE m.group_id = ?
         ORDER BY FIELD(m.role, 'owner', 'moderator', 'member'), m.joined_at ASC
         LIMIT 100"
    );
    $stmt->execute([$groupId]);
    jsonSuccess(['members' => $stmt->fetchAll()]);
}

/* Messages: latest page by default, ?before=<id> for older pages, ?after=<id> for polling */
function getMessages() {
    $user    = requireAuth();
    $groupId = intval($_GET['group_id'] ?? 0);
    if (!$groupId) jsonError('group_id required');
    if (!sgMembership($groupId, $user)) jsonError('Not a member', 403);

    $before = intval($_GET['before'] ?? 0);
    $after  = intval($_GET['after'] ?? 0);
    $select = 'SELECT m.*, u.first_name, u.last_name, u.username, u.avatar_url
               FROM study_group_messages m
               JOIN users u ON m.user_id = u.id';
    $pdo = getDB();

    if ($after > 0) {
        // New messages since the last one the client has, oldest first
        $stmt = $pdo->prepare("$select WHERE m.group_id = ? AND m.id > ? ORDER BY m.id ASC LIMIT ?");
        $stmt->execute([$groupId, $after, SG_MSG_POLL]);
        $msgs = $stmt->fetchAll();
        jsonSuccess(['messages' => $msgs, 'has_more' => count($msgs) === SG_MSG_POLL]);
    }

    if ($before > 0) {
        $stmt = $pdo->prepare("$select WHERE m.group_id = ? AND m.id < ? ORDER BY m.id DESC LIMIT ?");
        $stmt->execute([$groupId, $before, SG_MSG_PAGE]);
    } else {
        $stmt = $pdo->prepare("$select WHERE m.group_id = ? ORDER BY m.id DESC LIMIT ?");
        $stmt->execute([$groupId, SG_MSG_PAGE]);
    }
    $msgs = array_reverse($stmt->fetchAll());
    jsonSuccess(['messages' => $msgs, 'has_more' => count($msgs) === SG_MSG_PAGE]);
}

function sendMessage($body) {
    $user    = requireAuth();
    $groupId = intval($body['group_id'] ?? 0);
    $content = sanitize($body['content'] ?? '');
    if (!$groupId || $content === '') jsonError('group_id and content required');
    if (mb_strlen($content) > 2000) jsonError('Message too long (max 2000 characters)');
    if (!sgMembership($groupId, $user)) jsonError('Not a member', 403);

    $pdo = getDB();
    $pdo->prepare('INSERT INTO study_group_messages (group_id, user_id, content) VALUES (?, ?, ?)')
        ->execute([$groupId, $user['id'], $content]);
    $msgId = intval($pdo->lastInsertId());

    // Touch group updated_at so active groups sort first
    $pdo->prepare('UPDATE study_groups SET updated_at = NOW() WHERE id = ?')->execute([$groupId]);

    $msg = $pdo->prepare(
        'SELECT m.*, u.first_name, u.last_name, u.username, u.avatar_url
         FROM study_group_messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?'
    );
    $msg->execute([$msgId]);
    jsonSuccess(['message' => $msg->fetch()]);
}

function deleteMessage($body) {
    $user  = requireAuth();
    $msgId = intval($body['message_id'] ?? 0);
    if (!$msgId) jsonError('message_id required');

    $pdo  = getDB();
    $stmt = $pdo->prepare(
        'SELECT m.*, g.creator_id FROM study_group_messages m
         JOIN study_groups g ON m.group_id = g.id
         WHERE m.id = ?'
    );
    $stmt->execute([$msgId]);
    $msg = $stmt->fetch();
    if (!$msg) jsonError('Message not found', 404);

    // Only the message author or the group owner can delete
    if (intval($msg['user_id']) !== intval($user['id']) && intval($msg['creator_id']) !== intval($user['id'])) {
        jsonError('Not authorized', 403);
    }

    $pdo->prepare('DELETE FROM study_group_messages WHERE id = ?')->execute([$msgId]);
    jsonSuccess(['message' => 'Message deleted']);
}
