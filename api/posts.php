<?php
require 'config.php';

// Lazy migration: add file columns and reports table if missing
(function() {
    $db   = getDB();
    $cols = [
        'file_url'  => 'ADD COLUMN file_url  TEXT DEFAULT NULL',
        'file_name' => 'ADD COLUMN file_name TEXT DEFAULT NULL',
        'file_mime' => 'ADD COLUMN file_mime VARCHAR(100) DEFAULT NULL',
    ];
    foreach ($cols as $col => $ddl) {
        try { $db->query("SELECT $col FROM posts LIMIT 1"); }
        catch (Exception $e) {
            try { $db->exec("ALTER TABLE posts $ddl"); } catch (Exception $e2) {}
        }
    }
    // Ensure reports table exists
    try { $db->query('SELECT id FROM reports LIMIT 1'); }
    catch (Exception $e) {
        try {
            $db->exec("CREATE TABLE IF NOT EXISTS reports (
                id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                reporter_id INT UNSIGNED NOT NULL,
                target_type ENUM('post','comment') NOT NULL DEFAULT 'post',
                target_id   INT UNSIGNED NOT NULL,
                reason      VARCHAR(100) NOT NULL DEFAULT 'other',
                details     TEXT DEFAULT NULL,
                status      ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open',
                created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME DEFAULT NULL,
                INDEX idx_target (target_type, target_id),
                INDEX idx_status (status),
                UNIQUE KEY uq_reporter_target (reporter_id, target_type, target_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } catch (Exception $e2) {}
    }
})();

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

switch ($action) {
    case 'feed':           feed();                    break;
    case 'create':         createPost($body);         break;
    case 'update':         updatePost($body);         break;
    case 'vote':           votePost($body);           break;
    case 'comment':        addComment($body);         break;
    case 'delete_comment': deleteComment($body);      break;
    case 'comments':       getComments();             break;
    case 'delete':         deletePost();              break;
    case 'trending':       trending();                break;
    case 'save_post':      savePost($body);           break;
    case 'unsave_post':    unsavePost($body);         break;
    case 'saved':          savedPosts();              break;
    case 'report':         reportContent($body);      break;
    default: jsonError('Unknown action');
}

function feed() {
    $user   = getAuthUser();
    $page   = max(1, intval($_GET['page'] ?? 1));
    $limit  = 10;
    $offset = ($page-1)*$limit;
    $subject= sanitize($_GET['subject'] ?? '');
    $grade  = sanitize($_GET['grade']   ?? '');
    $type   = sanitize($_GET['type']    ?? '');
    try {
        $pdo = getDB();
        $userId = intval($_GET['user_id'] ?? 0);
        $where = ['1=1']; $params = [];
        if ($userId)  { $where[]='p.user_id=?';    $params[]=$userId; }
        if ($subject) { $where[]='p.subject=?';    $params[]=$subject; }
        if ($grade)   { $where[]='p.grade_range=?';$params[]=$grade; }
        if ($type)    { $where[]='p.post_type=?';  $params[]=$type; }
        $sql = 'SELECT p.*,u.first_name,u.last_name,u.username,u.grade as user_grade,u.xp,u.avatar_url,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) as comment_count
                FROM posts p JOIN users u ON p.user_id=u.id
                WHERE '.implode(' AND ',$where).'
                ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        $params[] = $limit; $params[] = $offset;
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $posts = $stmt->fetchAll();
        if ($user && $user['id'] && !empty($posts)) {
            // Batch-fetch votes and saves for all posts in one query each (avoids N+1)
            $postIds    = array_column($posts, 'id');
            $inPh       = implode(',', array_fill(0, count($postIds), '?'));

            $voteParams = array_merge($postIds, [$user['id']]);
            $vStmt = $pdo->prepare("SELECT post_id, vote_type FROM post_votes WHERE post_id IN ($inPh) AND user_id=?");
            $vStmt->execute($voteParams);
            $voteMap = [];
            foreach ($vStmt->fetchAll() as $row) $voteMap[$row['post_id']] = $row['vote_type'];

            $saveParams = array_merge($postIds, [$user['id']]);
            $sStmt = $pdo->prepare("SELECT post_id FROM saved_posts WHERE post_id IN ($inPh) AND user_id=?");
            $sStmt->execute($saveParams);
            $savedSet = array_flip(array_column($sStmt->fetchAll(), 'post_id'));

            foreach ($posts as &$post) {
                $post['voted'] = $voteMap[$post['id']] ?? null;
                $post['saved'] = isset($savedSet[$post['id']]);
            }
            unset($post);
        }
        jsonSuccess(['posts'=>$posts,'page'=>$page,'has_more'=>count($posts)===$limit]);
    } catch(Exception $e) { jsonError('Failed to load feed'); }
}

function createPost($data) {
    $user = requireAuth();
    if (empty($data['content'])) jsonError('Content is required');
    $title   = sanitize($data['title']   ?? 'Untitled');
    $content = sanitize($data['content']);
    if (!$content) jsonError('Content cannot be empty');
    if (mb_strlen($content) > 5000) jsonError('Content must be 5000 characters or fewer');
    $type    = in_array($data['post_type']??'',['general','notes','question','resource','discussion']) ? $data['post_type'] : 'general';
    $subject = sanitize($data['subject']    ?? '');
    $grade   = sanitize($data['grade_range']?? '');
    $fileUrl  = filter_var($data['file_url']  ?? '', FILTER_VALIDATE_URL) ? $data['file_url']  : null;
    $fileName = $fileUrl ? sanitize($data['file_name'] ?? '') : null;
    $fileMime = $fileUrl ? sanitize($data['file_mime'] ?? '') : null;
    try {
        $pdo = getDB();
        $pdo->prepare('INSERT INTO posts (user_id,title,content,post_type,subject,grade_range,file_url,file_name,file_mime,upvotes,downvotes,created_at) VALUES (?,?,?,?,?,?,?,?,?,0,0,NOW())')
            ->execute([$user['id'],$title,$content,$type,$subject,$grade,$fileUrl,$fileName ?: null,$fileMime ?: null]);
        $postId = $pdo->lastInsertId();
        $pdo->prepare('UPDATE users SET xp=xp+10 WHERE id=?')->execute([$user['id']]);
        $post = $pdo->prepare('SELECT p.*,u.first_name,u.last_name,u.username,u.avatar_url,u.grade as user_grade,u.xp FROM posts p JOIN users u ON p.user_id=u.id WHERE p.id=?');
        $post->execute([$postId]);
        jsonSuccess($post->fetch(), 201);
    } catch(Exception $e) { jsonError('Failed to create post'); }
}

function updatePost($data) {
    $user    = requireAuth();
    $id      = intval($data['post_id'] ?? 0);
    $title   = sanitize($data['title']   ?? '');
    $content = sanitize($data['content'] ?? '');
    if (!$id || !$content) jsonError('Post ID and content required');
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT user_id FROM posts WHERE id=?');
        $stmt->execute([$id]);
        $post = $stmt->fetch();
        if (!$post) jsonError('Post not found', 404);
        if ((int)$post['user_id'] !== (int)$user['id']) jsonError('Not authorized', 403);
        $pdo->prepare('UPDATE posts SET title=?, content=? WHERE id=?')->execute([$title, $content, $id]);
        jsonSuccess(['updated' => true]);
    } catch(Exception $e) { jsonError('Failed to update post'); }
}

function votePost($data) {
    $user   = requireAuth();
    $postId = intval($data['post_id'] ?? 0);
    $type   = $data['vote_type'] ?? '';
    if (!$postId || !in_array($type,['up','down'])) jsonError('Invalid vote');
    try {
        $pdo = getDB();
        $existing = $pdo->prepare('SELECT * FROM post_votes WHERE post_id=? AND user_id=?');
        $existing->execute([$postId,$user['id']]);
        $vote = $existing->fetch();
        if ($vote) {
            if ($vote['vote_type'] === $type) {
                // Undo existing vote
                $pdo->prepare('DELETE FROM post_votes WHERE id=?')->execute([$vote['id']]);
                if ($type === 'up') {
                    $pdo->prepare('UPDATE posts SET upvotes=upvotes-1 WHERE id=?')->execute([$postId]);
                } else {
                    $pdo->prepare('UPDATE posts SET downvotes=downvotes-1 WHERE id=?')->execute([$postId]);
                }
                jsonSuccess(['voted'=>null]);
            } else {
                // Switch vote direction
                $pdo->prepare('UPDATE post_votes SET vote_type=? WHERE id=?')->execute([$type,$vote['id']]);
                if ($type === 'up') {
                    $pdo->prepare('UPDATE posts SET upvotes=upvotes+1, downvotes=downvotes-1 WHERE id=?')->execute([$postId]);
                } else {
                    $pdo->prepare('UPDATE posts SET downvotes=downvotes+1, upvotes=upvotes-1 WHERE id=?')->execute([$postId]);
                }
                jsonSuccess(['voted'=>$type]);
            }
        } else {
            $pdo->prepare('INSERT INTO post_votes (post_id,user_id,vote_type,created_at) VALUES (?,?,?,NOW())')->execute([$postId,$user['id'],$type]);
            if ($type === 'up') {
                $pdo->prepare('UPDATE posts SET upvotes=upvotes+1 WHERE id=?')->execute([$postId]);
            } else {
                $pdo->prepare('UPDATE posts SET downvotes=downvotes+1 WHERE id=?')->execute([$postId]);
            }
            jsonSuccess(['voted'=>$type]);
        }
    } catch(Exception $e) { jsonError('Vote failed'); }
}

function addComment($data) {
    $user    = requireAuth();
    $postId  = intval($data['post_id'] ?? 0);
    $content = sanitize($data['content'] ?? '');
    if (!$postId || !$content) jsonError('Post ID and content required');
    try {
        $pdo = getDB();
        $pdo->prepare('INSERT INTO comments (post_id,user_id,content,created_at) VALUES (?,?,?,NOW())')->execute([$postId,$user['id'],$content]);
        $id = $pdo->lastInsertId();
        $stmt = $pdo->prepare('SELECT c.*,u.first_name,u.last_name,u.username,u.avatar_url FROM comments c JOIN users u ON c.user_id=u.id WHERE c.id=?');
        $stmt->execute([$id]);
        $comment = $stmt->fetch();

        // Notify post owner (if not themselves)
        $postStmt = $pdo->prepare('SELECT user_id, title FROM posts WHERE id=?');
        $postStmt->execute([$postId]);
        $post = $postStmt->fetch();
        if ($post && intval($post['user_id']) !== intval($user['id'])) {
            $commenterName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) ?: ($user['username'] ?? 'Someone');
            $postTitle     = mb_strimwidth($post['title'] ?? 'your post', 0, 40, '…');
            pushNotif(intval($post['user_id']), intval($user['id']), 'comment',
                "$commenterName commented on \"$postTitle\"", $postId);
        }

        jsonSuccess($comment, 201);
    } catch(Exception $e) { jsonError('Failed to add comment'); }
}

function deleteComment($data) {
    $user      = requireAuth();
    $commentId = intval($data['comment_id'] ?? 0);
    if (!$commentId) jsonError('Comment ID required');
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT user_id FROM comments WHERE id=?');
        $stmt->execute([$commentId]);
        $comment = $stmt->fetch();
        if (!$comment) jsonError('Comment not found', 404);
        if (intval($comment['user_id']) !== intval($user['id']) && ($user['role'] ?? 'student') !== 'admin') jsonError('Not authorized', 403);
        $pdo->prepare('DELETE FROM comments WHERE id=?')->execute([$commentId]);
        jsonSuccess(['deleted' => true]);
    } catch (Exception $e) { jsonError('Failed to delete comment'); }
}

function getComments() {
    $postId = intval($_GET['post_id'] ?? 0);
    if (!$postId) jsonError('Post ID required');
    try {
        $stmt = getDB()->prepare('SELECT c.*,u.first_name,u.last_name,u.username,u.avatar_url FROM comments c JOIN users u ON c.user_id=u.id WHERE c.post_id=? ORDER BY c.created_at ASC');
        $stmt->execute([$postId]);
        jsonSuccess($stmt->fetchAll());
    } catch(Exception $e) { jsonError('Failed'); }
}

function deletePost() {
    $user = requireAuth();
    $id   = intval($_GET['id'] ?? 0);
    if (!$id) jsonError('Post ID required');
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT user_id FROM posts WHERE id=?');
        $stmt->execute([$id]);
        $post = $stmt->fetch();
        if (!$post) jsonError('Post not found', 404);
        if ((int)$post['user_id'] !== (int)$user['id'] && ($user['role'] ?? 'student') !== 'admin') jsonError('Not authorized', 403);
        $pdo->prepare('DELETE FROM post_votes  WHERE post_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM comments    WHERE post_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM saved_posts WHERE post_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM reports     WHERE target_type="post" AND target_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM posts       WHERE id=?')    ->execute([$id]);
        jsonSuccess(['deleted'=>true]);
    } catch(Exception $e) { jsonError('Failed to delete'); }
}

function trending() {
    try {
        $stmt = getDB()->query('SELECT subject, COUNT(*) as count FROM posts WHERE subject IS NOT NULL AND subject <> "" AND created_at>DATE_SUB(NOW(),INTERVAL 7 DAY) GROUP BY subject ORDER BY count DESC LIMIT 10');
        jsonSuccess($stmt->fetchAll());
    } catch(Exception $e) { jsonSuccess([]); }
}

function savePost($data) {
    $user   = requireAuth();
    $postId = intval($data['post_id'] ?? 0);
    if (!$postId) jsonError('Post ID required');
    try {
        $pdo = getDB();
        $exists = $pdo->prepare('SELECT id FROM saved_posts WHERE post_id=? AND user_id=?');
        $exists->execute([$postId, $user['id']]);
        if (!$exists->fetch()) {
            $pdo->prepare('INSERT INTO saved_posts (post_id,user_id,created_at) VALUES (?,?,NOW())')->execute([$postId,$user['id']]);
        }
        jsonSuccess(['saved' => true]);
    } catch(Exception $e) { jsonError('Failed to save post'); }
}

function unsavePost($data) {
    $user   = requireAuth();
    $postId = intval($data['post_id'] ?? 0);
    if (!$postId) jsonError('Post ID required');
    try {
        getDB()->prepare('DELETE FROM saved_posts WHERE post_id=? AND user_id=?')->execute([$postId,$user['id']]);
        jsonSuccess(['saved' => false]);
    } catch(Exception $e) { jsonError('Failed to unsave post'); }
}

function reportContent($data) {
    $user       = requireAuth();
    $targetType = in_array($data['target_type'] ?? '', ['post','comment']) ? $data['target_type'] : 'post';
    $targetId   = intval($data['target_id'] ?? 0);
    $reason     = sanitize($data['reason']  ?? 'other');
    $details    = sanitize($data['details'] ?? '');
    if (!$targetId) jsonError('Target ID required');
    $validReasons = ['spam','harassment','inappropriate','misinformation','other'];
    if (!in_array($reason, $validReasons)) $reason = 'other';
    try {
        getDB()->prepare(
            'INSERT IGNORE INTO reports (reporter_id, target_type, target_id, reason, details, status, created_at)
             VALUES (?, ?, ?, ?, ?, "open", NOW())'
        )->execute([$user['id'], $targetType, $targetId, $reason, $details ?: null]);
        jsonSuccess(['reported' => true]);
    } catch (Exception $e) { jsonError('Failed to submit report'); }
}

function savedPosts() {
    $user = requireAuth();
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT p.*,u.first_name,u.last_name,u.username,u.grade as user_grade,u.xp,u.avatar_url,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) as comment_count
                FROM posts p
                JOIN users u ON p.user_id=u.id
                JOIN saved_posts sp ON sp.post_id=p.id
                WHERE sp.user_id=?
                ORDER BY sp.created_at DESC');
        $stmt->execute([$user['id']]);
        $posts = $stmt->fetchAll();
        if (!empty($posts)) {
            $postIds = array_column($posts, 'id');
            $inPh    = implode(',', array_fill(0, count($postIds), '?'));
            $vStmt   = $pdo->prepare("SELECT post_id, vote_type FROM post_votes WHERE post_id IN ($inPh) AND user_id=?");
            $vStmt->execute(array_merge($postIds, [$user['id']]));
            $voteMap = [];
            foreach ($vStmt->fetchAll() as $row) $voteMap[$row['post_id']] = $row['vote_type'];
            foreach ($posts as &$post) {
                $post['saved'] = true;
                $post['voted'] = $voteMap[$post['id']] ?? null;
            }
            unset($post);
        }
        jsonSuccess(['posts' => $posts]);
    } catch(Exception $e) { jsonError('Failed to load saved posts'); }
}