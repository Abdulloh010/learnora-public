<?php
require 'config.php';

// Lazy migration: create flashcard tables if missing (mirrors db/schema.sql, without FKs)
(function() {
    $db = getDB();
    $tables = [
        'flashcard_decks' => "CREATE TABLE IF NOT EXISTS flashcard_decks (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            creator_id     INT NOT NULL,
            subject_id     INT DEFAULT NULL,
            title          VARCHAR(200) NOT NULL,
            description    TEXT,
            visibility     ENUM('public','private') NOT NULL DEFAULT 'private',
            is_official    TINYINT NOT NULL DEFAULT 0,
            card_count     INT NOT NULL DEFAULT 0,
            times_studied  INT NOT NULL DEFAULT 0,
            created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_creator (creator_id),
            INDEX idx_subject (subject_id),
            INDEX idx_visibility (visibility)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        'flashcard_cards' => "CREATE TABLE IF NOT EXISTS flashcard_cards (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            deck_id    INT NOT NULL,
            front      TEXT NOT NULL,
            back       TEXT NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_deck (deck_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        'flashcard_study_sessions' => "CREATE TABLE IF NOT EXISTS flashcard_study_sessions (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            user_id          INT NOT NULL,
            deck_id          INT NOT NULL,
            cards_studied    INT NOT NULL DEFAULT 0,
            cards_known      INT NOT NULL DEFAULT 0,
            cards_learning   INT NOT NULL DEFAULT 0,
            xp_earned        INT NOT NULL DEFAULT 0,
            duration_seconds INT NOT NULL DEFAULT 0,
            completed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (user_id),
            INDEX idx_deck (deck_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        'flashcard_card_progress' => "CREATE TABLE IF NOT EXISTS flashcard_card_progress (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            card_id     INT NOT NULL,
            confidence  TINYINT NOT NULL DEFAULT 0,
            times_seen  INT NOT NULL DEFAULT 0,
            last_seen   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_user_card (user_id, card_id),
            INDEX idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    ];
    foreach ($tables as $name => $ddl) {
        try { $db->query("SELECT id FROM $name LIMIT 1"); }
        catch (Exception $e) { try { $db->exec($ddl); } catch (Exception $e2) {} }
    }
})();

/* Card side text from request data; tolerates non-string input */
function cardText($c, $key) {
    if (!is_array($c) || !is_scalar($c[$key] ?? null)) return '';
    return trim(strip_tags((string)$c[$key]));
}

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

switch ($action) {
    case 'decks':           listDecks();              break;
    case 'my_decks':        myDecks();                break;
    case 'deck_detail':     deckDetail();             break;
    case 'create_deck':     createDeck($body);        break;
    case 'update_deck':     updateDeck($body);        break;
    case 'delete_deck':     deleteDeck($body);        break;
    case 'add_cards':       addCards($body);          break;
    case 'update_card':     updateCard($body);        break;
    case 'delete_card':     deleteCard($body);        break;
    case 'study_start':     studyStart();             break;
    case 'study_complete':  studyComplete($body);     break;
    case 'card_progress':   saveCardProgress($body);  break;
    case 'stats':           userStats();              break;
    default: jsonError('Unknown action');
}

/* ══════════════════════════════════════════════════════════════
   DECK LISTING
   ══════════════════════════════════════════════════════════════ */

function listDecks() {
    $subject = sanitize($_GET['subject'] ?? '');
    $search  = sanitize($_GET['q'] ?? '');
    $sort    = sanitize($_GET['sort'] ?? 'popular');
    $tab     = sanitize($_GET['tab'] ?? 'all');

    try {
        $pdo    = getDB();
        $where  = [];
        $params = [];

        if ($tab === 'official') {
            $where[] = 'd.is_official = 1';
        } elseif ($tab === 'community') {
            $where[] = 'd.is_official = 0 AND d.visibility = "public"';
        } else {
            $where[] = '(d.is_official = 1 OR d.visibility = "public")';
        }

        if ($subject) {
            $where[] = 's.slug = ?';
            $params[] = $subject;
        }
        if ($search) {
            $where[] = '(d.title LIKE ? OR d.description LIKE ?)';
            $like = "%$search%";
            $params[] = $like;
            $params[] = $like;
        }

        $orderBy = 'd.times_studied DESC, d.created_at DESC';
        if ($sort === 'newest') $orderBy = 'd.created_at DESC';
        elseif ($sort === 'cards')  $orderBy = 'd.card_count DESC';

        $sql = "SELECT d.*, s.name as subject_name, s.slug as subject_slug, s.icon as subject_icon, s.color as subject_color,
                       u.username as creator_username, u.first_name as creator_first_name, u.last_name as creator_last_name,
                       u.avatar_url as creator_avatar
                FROM flashcard_decks d
                LEFT JOIN subjects s ON d.subject_id = s.id
                JOIN users u ON d.creator_id = u.id
                WHERE " . implode(' AND ', $where) . "
                ORDER BY $orderBy
                LIMIT 60";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonSuccess($stmt->fetchAll());
    } catch (Exception $e) {
        jsonError('Failed to load decks');
    }
}

function myDecks() {
    $user = requireAuth();
    try {
        $stmt = getDB()->prepare(
            'SELECT d.*, s.name as subject_name, s.slug as subject_slug, s.icon as subject_icon, s.color as subject_color
             FROM flashcard_decks d
             LEFT JOIN subjects s ON d.subject_id = s.id
             WHERE d.creator_id = ?
             ORDER BY d.updated_at DESC'
        );
        $stmt->execute([$user['id']]);
        jsonSuccess($stmt->fetchAll());
    } catch (Exception $e) {
        jsonError('Failed to load your decks');
    }
}

/* ══════════════════════════════════════════════════════════════
   DECK DETAIL (with cards)
   ══════════════════════════════════════════════════════════════ */

function deckDetail() {
    $deckId = intval($_GET['id'] ?? 0);
    if (!$deckId) jsonError('Deck ID required');

    $user = getAuthUser(); // nullable

    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare(
            'SELECT d.*, s.name as subject_name, s.slug as subject_slug, s.icon as subject_icon, s.color as subject_color,
                    u.username as creator_username, u.first_name as creator_first_name, u.last_name as creator_last_name,
                    u.avatar_url as creator_avatar
             FROM flashcard_decks d
             LEFT JOIN subjects s ON d.subject_id = s.id
             JOIN users u ON d.creator_id = u.id
             WHERE d.id = ?'
        );
        $stmt->execute([$deckId]);
        $deck = $stmt->fetch();
        if (!$deck) jsonError('Deck not found', 404);

        // Access check
        if ($deck['visibility'] === 'private' && (!$user || intval($deck['creator_id']) !== intval($user['id']))) {
            jsonError('This deck is private', 403);
        }

        // Get cards
        $cardStmt = $pdo->prepare(
            'SELECT id, front, back, sort_order FROM flashcard_cards WHERE deck_id = ? ORDER BY sort_order, id'
        );
        $cardStmt->execute([$deckId]);
        $cards = $cardStmt->fetchAll();

        // Get user progress if authenticated
        $progress = [];
        if ($user) {
            $progStmt = $pdo->prepare(
                'SELECT card_id, confidence, times_seen FROM flashcard_card_progress
                 WHERE user_id = ? AND card_id IN (SELECT id FROM flashcard_cards WHERE deck_id = ?)'
            );
            $progStmt->execute([$user['id'], $deckId]);
            foreach ($progStmt->fetchAll() as $p) {
                $progress[intval($p['card_id'])] = $p;
            }
        }

        // Study session count for this user
        $studyCount = 0;
        if ($user) {
            $scStmt = $pdo->prepare('SELECT COUNT(*) FROM flashcard_study_sessions WHERE user_id = ? AND deck_id = ?');
            $scStmt->execute([$user['id'], $deckId]);
            $studyCount = intval($scStmt->fetchColumn());
        }

        $deck['cards']        = $cards;
        $deck['progress']     = $progress;
        $deck['user_studies'] = $studyCount;
        jsonSuccess($deck);
    } catch (Exception $e) {
        jsonError('Failed to load deck');
    }
}

/* ══════════════════════════════════════════════════════════════
   CREATE / UPDATE / DELETE DECK
   ══════════════════════════════════════════════════════════════ */

function createDeck($data) {
    $user       = requireAuth();
    $title      = trim(sanitize($data['title'] ?? ''));
    $desc       = trim(sanitize($data['description'] ?? ''));
    $subjectId  = intval($data['subject_id'] ?? 0) ?: null;
    $visibility = in_array($data['visibility'] ?? '', ['public','private'], true) ? $data['visibility'] : 'private';
    $cards      = $data['cards'] ?? [];
    if (!is_array($cards)) $cards = [];

    if (!$title) jsonError('Title is required');
    if (strlen($title) > 200) jsonError('Title too long (max 200 chars)');
    if (count($cards) < 1) jsonError('Add at least 1 card');
    if (count($cards) > 200) jsonError('Maximum 200 cards per deck');

    try {
        $pdo = getDB();
        $pdo->beginTransaction();

        $pdo->prepare(
            'INSERT INTO flashcard_decks (creator_id, subject_id, title, description, visibility, card_count)
             VALUES (?, ?, ?, ?, ?, 0)'
        )->execute([$user['id'], $subjectId, $title, $desc, $visibility]);
        $deckId = intval($pdo->lastInsertId());

        $cardStmt = $pdo->prepare(
            'INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES (?, ?, ?, ?)'
        );
        $added = 0;
        foreach ($cards as $c) {
            $front = cardText($c, 'front');
            $back  = cardText($c, 'back');
            if ($front === '' || $back === '') continue;
            $cardStmt->execute([$deckId, $front, $back, $added]);
            $added++;
        }
        if ($added < 1) { $pdo->rollBack(); jsonError('Add at least 1 card with front and back'); }

        // card_count reflects only the cards actually stored (blank rows are skipped)
        $pdo->prepare('UPDATE flashcard_decks SET card_count = ? WHERE id = ?')->execute([$added, $deckId]);
        $pdo->commit();

        // Award XP for creating a public deck
        $xp = 0;
        if ($visibility === 'public' && $added >= 5) {
            $xp = 15;
            $pdo->prepare('UPDATE users SET xp = xp + ? WHERE id = ?')->execute([$xp, $user['id']]);
        }

        try { $pdo->prepare('UPDATE users SET last_active = NOW() WHERE id = ?')->execute([$user['id']]); } catch (Exception $e) {}

        jsonSuccess(['deck_id' => $deckId, 'xp_earned' => $xp]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        jsonError('Failed to create deck');
    }
}

function updateDeck($data) {
    $user   = requireAuth();
    $deckId = intval($data['deck_id'] ?? 0);
    if (!$deckId) jsonError('Deck ID required');

    try {
        $pdo  = getDB();
        $deck = $pdo->prepare('SELECT * FROM flashcard_decks WHERE id = ? AND creator_id = ?');
        $deck->execute([$deckId, $user['id']]);
        if (!$deck->fetch()) jsonError('Deck not found or not yours', 403);

        $sets = [];
        $params = [];

        if (isset($data['title'])) {
            $title = trim(sanitize($data['title']));
            if (!$title) jsonError('Title required');
            $sets[] = 'title = ?'; $params[] = $title;
        }
        if (isset($data['description'])) {
            $sets[] = 'description = ?'; $params[] = trim(sanitize($data['description']));
        }
        if (isset($data['visibility']) && in_array($data['visibility'], ['public','private'], true)) {
            $sets[] = 'visibility = ?'; $params[] = $data['visibility'];
        }
        if (isset($data['subject_id'])) {
            $sets[] = 'subject_id = ?'; $params[] = intval($data['subject_id']) ?: null;
        }

        if (!empty($sets)) {
            $params[] = $deckId;
            $pdo->prepare('UPDATE flashcard_decks SET ' . implode(',', $sets) . ' WHERE id = ?')->execute($params);
        }

        jsonSuccess(['updated' => true]);
    } catch (Exception $e) {
        jsonError('Update failed');
    }
}

function deleteDeck($data) {
    $user   = requireAuth();
    $deckId = intval($data['deck_id'] ?? 0);
    if (!$deckId) jsonError('Deck ID required');

    try {
        $pdo = getDB();
        $stmt = $pdo->prepare('DELETE FROM flashcard_decks WHERE id = ? AND creator_id = ?');
        $stmt->execute([$deckId, $user['id']]);
        if ($stmt->rowCount() === 0) jsonError('Deck not found or not yours', 403);
        jsonSuccess(['deleted' => true]);
    } catch (Exception $e) {
        jsonError('Delete failed');
    }
}

/* ══════════════════════════════════════════════════════════════
   CARD CRUD
   ══════════════════════════════════════════════════════════════ */

function addCards($data) {
    $user   = requireAuth();
    $deckId = intval($data['deck_id'] ?? 0);
    $cards  = $data['cards'] ?? [];
    if (!is_array($cards)) $cards = [];
    if (!$deckId || empty($cards)) jsonError('Deck ID and cards required');

    try {
        $pdo = getDB();
        // Verify ownership
        $own = $pdo->prepare('SELECT id FROM flashcard_decks WHERE id = ? AND creator_id = ?');
        $own->execute([$deckId, $user['id']]);
        if (!$own->fetch()) jsonError('Not your deck', 403);

        $mo = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) FROM flashcard_cards WHERE deck_id = ?');
        $mo->execute([$deckId]);
        $maxOrder = intval($mo->fetchColumn());

        $stmt = $pdo->prepare('INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES (?, ?, ?, ?)');
        $added = 0;
        if (count($cards) > 200) jsonError('Maximum 200 cards per request');
        foreach ($cards as $c) {
            $front = cardText($c, 'front');
            $back  = cardText($c, 'back');
            if ($front === '' || $back === '') continue;
            $maxOrder++;
            $stmt->execute([$deckId, $front, $back, $maxOrder]);
            $added++;
        }

        // Update card count
        $pdo->prepare('UPDATE flashcard_decks SET card_count = (SELECT COUNT(*) FROM flashcard_cards WHERE deck_id = ?) WHERE id = ?')
            ->execute([$deckId, $deckId]);

        jsonSuccess(['added' => $added]);
    } catch (Exception $e) {
        jsonError('Failed to add cards');
    }
}

function updateCard($data) {
    $user   = requireAuth();
    $cardId = intval($data['card_id'] ?? 0);
    if (!$cardId) jsonError('Card ID required');

    try {
        $pdo = getDB();
        $stmt = $pdo->prepare(
            'SELECT c.id FROM flashcard_cards c JOIN flashcard_decks d ON c.deck_id = d.id WHERE c.id = ? AND d.creator_id = ?'
        );
        $stmt->execute([$cardId, $user['id']]);
        if (!$stmt->fetch()) jsonError('Card not found or not yours', 403);

        $front = cardText($data, 'front');
        $back  = cardText($data, 'back');
        if ($front === '' || $back === '') jsonError('Front and back required');

        $pdo->prepare('UPDATE flashcard_cards SET front = ?, back = ? WHERE id = ?')
            ->execute([$front, $back, $cardId]);
        jsonSuccess(['updated' => true]);
    } catch (Exception $e) {
        jsonError('Update failed');
    }
}

function deleteCard($data) {
    $user   = requireAuth();
    $cardId = intval($data['card_id'] ?? 0);
    if (!$cardId) jsonError('Card ID required');

    try {
        $pdo = getDB();
        $stmt = $pdo->prepare(
            'SELECT c.id, c.deck_id FROM flashcard_cards c JOIN flashcard_decks d ON c.deck_id = d.id WHERE c.id = ? AND d.creator_id = ?'
        );
        $stmt->execute([$cardId, $user['id']]);
        $card = $stmt->fetch();
        if (!$card) jsonError('Card not found or not yours', 403);

        $pdo->prepare('DELETE FROM flashcard_cards WHERE id = ?')->execute([$cardId]);
        $pdo->prepare('UPDATE flashcard_decks SET card_count = (SELECT COUNT(*) FROM flashcard_cards WHERE deck_id = ?) WHERE id = ?')
            ->execute([$card['deck_id'], $card['deck_id']]);
        jsonSuccess(['deleted' => true]);
    } catch (Exception $e) {
        jsonError('Delete failed');
    }
}

/* ══════════════════════════════════════════════════════════════
   STUDY SESSION TRACKING
   ══════════════════════════════════════════════════════════════ */

function studyStart() {
    $deckId = intval($_GET['id'] ?? 0);
    if (!$deckId) jsonError('Deck ID required');

    try {
        $pdo = getDB();
        // Increment times_studied
        $pdo->prepare('UPDATE flashcard_decks SET times_studied = times_studied + 1 WHERE id = ?')
            ->execute([$deckId]);
        jsonSuccess(['started' => true]);
    } catch (Exception $e) {
        jsonError('Failed');
    }
}

function studyComplete($data) {
    $user     = requireAuth();
    $deckId   = intval($data['deck_id'] ?? 0);
    $studied  = intval($data['cards_studied'] ?? 0);
    $known    = intval($data['cards_known'] ?? 0);
    $learning = intval($data['cards_learning'] ?? 0);
    $duration = intval($data['duration_seconds'] ?? 0);

    if (!$deckId || $studied <= 0) jsonError('Invalid session data');

    try {
        $pdo = getDB();
        $dc  = $pdo->prepare('SELECT card_count FROM flashcard_decks WHERE id = ?');
        $dc->execute([$deckId]);
        $cardCount = $dc->fetchColumn();
        if ($cardCount === false) jsonError('Deck not found', 404);

        // Clamp client-reported numbers to the deck size so XP can't be inflated
        $studied  = min($studied, max(0, intval($cardCount)));
        $known    = max(0, min($known, $studied));
        $learning = max(0, min($learning, $studied - $known));
        $duration = max(0, min($duration, 86400));
        if ($studied <= 0) jsonError('Invalid session data');

        // XP: 1 XP per card studied, bonus for mastery
        $xp = $studied;
        if ($known === $studied) $xp += 5; // perfect run bonus

        $pdo->prepare(
            'INSERT INTO flashcard_study_sessions (user_id, deck_id, cards_studied, cards_known, cards_learning, xp_earned, duration_seconds)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([$user['id'], $deckId, $studied, $known, $learning, $xp, $duration]);

        if ($xp > 0) {
            $pdo->prepare('UPDATE users SET xp = xp + ? WHERE id = ?')->execute([$xp, $user['id']]);
        }
        try { $pdo->prepare('UPDATE users SET last_active = NOW() WHERE id = ?')->execute([$user['id']]); } catch (Exception $e) {}

        jsonSuccess(['xp_earned' => $xp]);
    } catch (Exception $e) {
        jsonError('Failed to save study session');
    }
}

function saveCardProgress($data) {
    $user       = requireAuth();
    $cardId     = intval($data['card_id'] ?? 0);
    $confidence = intval($data['confidence'] ?? 0);
    if (!$cardId) jsonError('Card ID required');
    if ($confidence < 0 || $confidence > 3) $confidence = 0;

    try {
        $pdo = getDB();
        $pdo->prepare(
            'INSERT INTO flashcard_card_progress (user_id, card_id, confidence, times_seen, last_seen)
             VALUES (?, ?, ?, 1, NOW())
             ON DUPLICATE KEY UPDATE confidence = VALUES(confidence), times_seen = times_seen + 1, last_seen = NOW()'
        )->execute([$user['id'], $cardId, $confidence]);
        jsonSuccess(['saved' => true]);
    } catch (Exception $e) {
        jsonError('Failed to save progress');
    }
}

/* ══════════════════════════════════════════════════════════════
   USER STATS
   ══════════════════════════════════════════════════════════════ */

function userStats() {
    $user = requireAuth();
    try {
        $pdo = getDB();

        $all = $pdo->prepare(
            'SELECT COUNT(*) as total_sessions, COALESCE(SUM(cards_studied),0) as total_cards,
                    COALESCE(SUM(xp_earned),0) as total_xp, COUNT(DISTINCT deck_id) as decks_studied
             FROM flashcard_study_sessions WHERE user_id = ?'
        );
        $all->execute([$user['id']]);
        $allTime = $all->fetch();

        $today = $pdo->prepare(
            'SELECT COUNT(*) as sessions, COALESCE(SUM(cards_studied),0) as cards
             FROM flashcard_study_sessions WHERE user_id = ? AND DATE(completed_at) = CURDATE()'
        );
        $today->execute([$user['id']]);
        $todayData = $today->fetch();

        $decksCreated = $pdo->prepare('SELECT COUNT(*) FROM flashcard_decks WHERE creator_id = ?');
        $decksCreated->execute([$user['id']]);

        jsonSuccess([
            'all_time' => [
                'total_sessions' => intval($allTime['total_sessions']),
                'total_cards'    => intval($allTime['total_cards']),
                'total_xp'       => intval($allTime['total_xp']),
                'decks_studied'  => intval($allTime['decks_studied']),
            ],
            'today' => [
                'sessions' => intval($todayData['sessions']),
                'cards'    => intval($todayData['cards']),
            ],
            'decks_created' => intval($decksCreated->fetchColumn()),
        ]);
    } catch (Exception $e) {
        jsonError('Failed to load stats');
    }
}
