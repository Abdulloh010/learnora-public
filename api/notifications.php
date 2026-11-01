<?php
require 'config.php';

// Ensure notifications table exists (lazy create so it works on any DB version)
(function() {
    try {
        getDB()->query('SELECT id FROM notifications LIMIT 1');
    } catch (Exception $e) {
        try {
            getDB()->exec("CREATE TABLE IF NOT EXISTS notifications (
                id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id     INT UNSIGNED NOT NULL,
                actor_id    INT UNSIGNED DEFAULT NULL,
                type        VARCHAR(50)  NOT NULL DEFAULT 'general',
                content     TEXT         DEFAULT NULL,
                reference_id INT UNSIGNED DEFAULT NULL,
                is_read     TINYINT(1)   NOT NULL DEFAULT 0,
                created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user  (user_id),
                INDEX idx_unread(user_id, is_read)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } catch (Exception $e2) {}
    }
})();

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

switch ($action) {
    case 'list':         listNotifications();       break;
    case 'unread_count': unreadCount();             break;
    case 'mark_read':    markRead($body);           break;
    case 'mark_all_read':markAllRead();             break;
    default: jsonError('Unknown action');
}

function listNotifications() {
    $user   = requireAuth();
    $limit  = max(1, min(100, intval($_GET['limit']  ?? 20)));
    $offset = max(0,          intval($_GET['offset'] ?? 0));
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare(
            'SELECT n.id, n.type, n.content, n.is_read, n.created_at, n.reference_id,
                    u.id as actor_id, u.first_name, u.last_name, u.username, u.avatar_url
             FROM notifications n
             LEFT JOIN users u ON u.id = n.actor_id
             WHERE n.user_id = ?
             ORDER BY n.created_at DESC
             LIMIT ? OFFSET ?'
        );
        $stmt->execute([$user['id'], $limit, $offset]);
        jsonSuccess(['notifications' => $stmt->fetchAll()]);
    } catch (Exception $e) { jsonError('Failed to load notifications'); }
}

function unreadCount() {
    $user = requireAuth();
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id=? AND is_read=0');
        $stmt->execute([$user['id']]);
        jsonSuccess(['count' => (int)$stmt->fetchColumn()]);
    } catch (Exception $e) { jsonError('Failed'); }
}

function markRead($data) {
    $user = requireAuth();
    $id   = intval($data['id'] ?? 0);
    if (!$id) jsonError('Notification ID required');
    try {
        getDB()->prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?')
               ->execute([$id, $user['id']]);
        jsonSuccess(['marked' => true]);
    } catch (Exception $e) { jsonError('Failed'); }
}

function markAllRead() {
    $user = requireAuth();
    try {
        getDB()->prepare('UPDATE notifications SET is_read=1 WHERE user_id=?')
               ->execute([$user['id']]);
        jsonSuccess(['marked' => true]);
    } catch (Exception $e) { jsonError('Failed'); }
}
