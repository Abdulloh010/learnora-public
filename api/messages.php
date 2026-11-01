<?php
require 'config.php';

// Lazy migration: add file columns if missing
(function() {
    $db = getDB();
    $cols = [
        'file_url'  => 'ADD COLUMN file_url  TEXT DEFAULT NULL',
        'file_name' => 'ADD COLUMN file_name TEXT DEFAULT NULL',
        'file_mime' => 'ADD COLUMN file_mime VARCHAR(100) DEFAULT NULL',
    ];
    foreach ($cols as $col => $ddl) {
        try { $db->query("SELECT $col FROM messages LIMIT 1"); }
        catch (Exception $e) {
            try { $db->exec("ALTER TABLE messages $ddl"); } catch (Exception $e2) {}
        }
    }
    // Allow empty content (file-only messages): change NOT NULL → NULL if needed
    try {
        $db->exec("ALTER TABLE messages MODIFY COLUMN content TEXT NULL DEFAULT NULL");
    } catch (Exception $e) {}
    // Add edited flag
    try { $db->query("SELECT edited FROM messages LIMIT 1"); }
    catch (Exception $e) {
        try { $db->exec("ALTER TABLE messages ADD COLUMN edited TINYINT(1) NOT NULL DEFAULT 0"); } catch (Exception $e2) {}
    }
})();

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

switch ($action) {
    case 'conversations': conversations(); break;
    case 'thread':        thread();        break;
    case 'send':          send($body);     break;
    case 'edit':          editMessage($body); break;
    case 'delete':        deleteMessage(); break;
    case 'mark_read':     markRead();      break;
    case 'mark_all_read': markAllRead();   break;
    case 'unread_count':  unreadCount();   break;
    default: jsonError('Unknown action');
}

function conversations() {
    $me = requireAuth();
    try {
        $stmt = getDB()->prepare('
            SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url,
                   (SELECT COALESCE(file_name, content) FROM messages
                    WHERE (sender_id=? AND receiver_id=u.id) OR (sender_id=u.id AND receiver_id=?)
                    ORDER BY created_at DESC LIMIT 1) AS last_message,
                   (SELECT created_at FROM messages
                    WHERE (sender_id=? AND receiver_id=u.id) OR (sender_id=u.id AND receiver_id=?)
                    ORDER BY created_at DESC LIMIT 1) AS last_time,
                   COALESCE(SUM(CASE WHEN m.receiver_id=? AND m.is_read=0 THEN 1 ELSE 0 END), 0) AS unread
            FROM users u
            JOIN messages m ON (
                (m.sender_id=? AND m.receiver_id=u.id) OR
                (m.sender_id=u.id AND m.receiver_id=?)
            )
            WHERE u.id != ?
            GROUP BY u.id
            ORDER BY last_time DESC');
        $stmt->execute([$me['id'],$me['id'],$me['id'],$me['id'],$me['id'],$me['id'],$me['id'],$me['id']]);
        jsonSuccess($stmt->fetchAll());
    } catch(Exception $e) { jsonError('Failed to load conversations'); }
}

function thread() {
    $me      = requireAuth();
    $otherId = intval($_GET['user_id'] ?? 0);
    if (!$otherId) jsonError('User ID required');
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare(
            'SELECT m.*, u.first_name, u.last_name
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE (m.sender_id=? AND m.receiver_id=?)
                OR (m.sender_id=? AND m.receiver_id=?)
             ORDER BY m.created_at ASC
             LIMIT 200'
        );
        $stmt->execute([$me['id'], $otherId, $otherId, $me['id']]);
        $msgs = $stmt->fetchAll();
        $pdo->prepare('UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=? AND is_read=0')
            ->execute([$otherId, $me['id']]);
        jsonSuccess($msgs);
    } catch(Exception $e) { jsonError('Failed to load messages'); }
}

function send($data) {
    $me         = requireAuth();
    $receiverId = intval($data['receiver_id'] ?? 0);
    $content    = sanitize($data['content']   ?? '');
    $fileUrl    = filter_var($data['file_url']  ?? '', FILTER_VALIDATE_URL) ? $data['file_url']  : null;
    $fileName   = $fileUrl ? sanitize($data['file_name'] ?? '')              : null;
    $fileMime   = $fileUrl ? sanitize($data['file_mime'] ?? '')              : null;

    if (!$receiverId) jsonError('Receiver required');
    if (!$content && !$fileUrl) jsonError('Message or file required');
    if (strlen($content) > 2000) jsonError('Message too long');

    // Receiver must exist
    $rx = getDB()->prepare('SELECT id FROM users WHERE id=?');
    $rx->execute([$receiverId]);
    if (!$rx->fetch()) jsonError('Recipient not found');

    try {
        $pdo = getDB();
        $pdo->prepare(
            'INSERT INTO messages (sender_id, receiver_id, content, file_url, file_name, file_mime, is_read, created_at)
             VALUES (?,?,?,?,?,?,0,NOW())'
        )->execute([$me['id'], $receiverId, $content ?: null, $fileUrl, $fileName ?: null, $fileMime ?: null]);

        $id   = $pdo->lastInsertId();
        $stmt = $pdo->prepare(
            'SELECT m.*, u.first_name, u.last_name
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.id=?'
        );
        $stmt->execute([$id]);
        jsonSuccess($stmt->fetch(), 201);
    } catch(Exception $e) { jsonError('Failed to send message'); }
}

function editMessage($data) {
    $me      = requireAuth();
    $id      = intval($data['message_id'] ?? 0);
    $content = sanitize($data['content']   ?? '');
    if (!$id || !$content) jsonError('Message ID and content required');
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT sender_id FROM messages WHERE id=?');
        $stmt->execute([$id]);
        $msg  = $stmt->fetch();
        if (!$msg) jsonError('Message not found', 404);
        if ((int)$msg['sender_id'] !== (int)$me['id']) jsonError('Not authorized', 403);
        $pdo->prepare('UPDATE messages SET content=?, edited=1 WHERE id=?')->execute([$content, $id]);
        jsonSuccess(['updated' => true, 'content' => $content]);
    } catch(Exception $e) { jsonError('Failed to edit message'); }
}

function deleteMessage() {
    $me = requireAuth();
    $id = intval($_GET['id'] ?? 0);
    if (!$id) jsonError('Message ID required');
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT sender_id FROM messages WHERE id=?');
        $stmt->execute([$id]);
        $msg  = $stmt->fetch();
        if (!$msg) jsonError('Message not found', 404);
        if ((int)$msg['sender_id'] !== (int)$me['id']) jsonError('Not authorized', 403);
        $pdo->prepare('DELETE FROM messages WHERE id=?')->execute([$id]);
        jsonSuccess(['deleted' => true]);
    } catch(Exception $e) { jsonError('Failed to delete message'); }
}

function markRead() {
    $me      = requireAuth();
    $otherId = intval($_GET['user_id'] ?? 0);
    if (!$otherId) jsonError('User ID required');
    try {
        getDB()->prepare('UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=? AND is_read=0')
               ->execute([$otherId, $me['id']]);
        jsonSuccess(['ok' => true]);
    } catch(Exception $e) { jsonError('Failed'); }
}

function markAllRead() {
    $me = requireAuth();
    try {
        getDB()->prepare('UPDATE messages SET is_read=1 WHERE receiver_id=? AND is_read=0')
               ->execute([$me['id']]);
        jsonSuccess(['ok' => true]);
    } catch(Exception $e) { jsonError('Failed'); }
}

function unreadCount() {
    $me = requireAuth();
    try {
        $stmt = getDB()->prepare('SELECT COUNT(*) FROM messages WHERE receiver_id=? AND is_read=0');
        $stmt->execute([$me['id']]);
        jsonSuccess(['count' => intval($stmt->fetchColumn())]);
    } catch(Exception $e) { jsonSuccess(['count' => 0]); }
}
