<?php
require 'config.php';

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

switch ($action) {
    case 'list':          listQuizzes();          break;
    case 'my':            myQuizzes();            break;
    case 'create':        createQuiz($body);      break;
    case 'get':           getQuiz();              break;
    case 'delete':        deleteQuiz($body);      break;
    case 'host':          hostGame($body);        break;
    case 'join':          joinGame($body);        break;
    case 'lobby':         getLobby();             break;
    case 'start_game':    startGame($body);       break;
    case 'next_question': nextQuestion($body);    break;
    case 'answer':        submitAnswer($body);    break;
    case 'game_state':    getGameState();         break;
    case 'finish_game':   finishGame($body);      break;
    default: jsonError('Unknown action');
}

/* ── List public community quizzes ── */
function listQuizzes() {
    try {
        $pdo  = getDB();
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = 24;
        $offset = ($page - 1) * $limit;
        $subject = sanitize($_GET['subject'] ?? '');
        $search  = sanitize($_GET['q'] ?? '');

        $where = ['cq.is_public = 1'];
        $params = [];
        if ($subject) { $where[] = '(s.slug = ? OR cq.subject_tag = ?)'; $params[] = $subject; $params[] = $subject; }
        if ($search)  { $where[] = '(cq.title LIKE ? OR cq.description LIKE ?)'; $params[] = "%$search%"; $params[] = "%$search%"; }

        $sql = 'SELECT cq.id, cq.title, cq.description, cq.difficulty, cq.play_count, cq.created_at,
                       cq.subject_tag, s.name AS subject_name, s.color, s.icon,
                       u.first_name, u.last_name, u.username, u.avatar_url,
                       (SELECT COUNT(*) FROM community_questions qq WHERE qq.quiz_id = cq.id) AS question_count
                FROM community_quizzes cq
                LEFT JOIN subjects s ON cq.subject_id = s.id
                JOIN users u ON cq.creator_id = u.id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY cq.play_count DESC, cq.created_at DESC
                LIMIT ? OFFSET ?';
        $params[] = $limit;
        $params[] = $offset;
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonSuccess($stmt->fetchAll());
    } catch (Exception $e) { jsonError('Failed to load quizzes'); }
}

/* ── Current user's quizzes ── */
function myQuizzes() {
    $user = requireAuth();
    try {
        $stmt = getDB()->prepare(
            'SELECT cq.*, s.name AS subject_name, s.color,
                    (SELECT COUNT(*) FROM community_questions q WHERE q.quiz_id = cq.id) AS question_count
             FROM community_quizzes cq
             LEFT JOIN subjects s ON cq.subject_id = s.id
             WHERE cq.creator_id = ?
             ORDER BY cq.created_at DESC'
        );
        $stmt->execute([$user['id']]);
        jsonSuccess($stmt->fetchAll());
    } catch (Exception $e) { jsonError('Failed'); }
}

/* ── Create or update a community quiz ── */
function createQuiz($data) {
    $user  = requireAuth();
    $title = trim($data['title'] ?? '');
    $questions = $data['questions'] ?? [];
    if (!is_array($questions)) $questions = [];

    if (!$title) jsonError('Title is required');
    if (count($questions) < 2) jsonError('At least 2 questions required');
    if (count($questions) > 60) jsonError('Maximum 60 questions allowed');

    foreach ($questions as $i => $q) {
        if (empty($q['question_text'])) jsonError("Question " . ($i+1) . " is missing text");
        if (empty($q['option_a']) || empty($q['option_b'])) jsonError("Question " . ($i+1) . " needs at least 2 options");
        if (!in_array($q['correct_answer'] ?? '', ['a','b','c','d'])) jsonError("Question " . ($i+1) . " has no correct answer selected");
    }

    try {
        $pdo = getDB();
        $pdo->beginTransaction();

        // Resolve subject
        $subjectId  = null;
        $subjectTag = trim($data['subject_tag'] ?? '');
        if (!empty($data['subject_id'])) {
            $s = $pdo->prepare('SELECT id FROM subjects WHERE id = ?');
            $s->execute([intval($data['subject_id'])]);
            if ($s->fetch()) $subjectId = intval($data['subject_id']);
        }

        $quizId = intval($data['quiz_id'] ?? 0);
        if ($quizId) {
            // Update — only by owner
            $chk = $pdo->prepare('SELECT id FROM community_quizzes WHERE id = ? AND creator_id = ?');
            $chk->execute([$quizId, $user['id']]);
            if (!$chk->fetch()) { $pdo->rollBack(); jsonError('Not found or no permission', 403); }

            $pdo->prepare('UPDATE community_quizzes SET title=?,description=?,subject_id=?,subject_tag=?,difficulty=?,is_public=?,updated_at=NOW() WHERE id=?')
                ->execute([
                    $title,
                    trim($data['description'] ?? ''),
                    $subjectId,
                    $subjectTag,
                    $data['difficulty'] ?? 'medium',
                    isset($data['is_public']) ? (int)$data['is_public'] : 1,
                    $quizId
                ]);
            $pdo->prepare('DELETE FROM community_questions WHERE quiz_id = ?')->execute([$quizId]);
        } else {
            // Insert new
            $ins = $pdo->prepare('INSERT INTO community_quizzes (creator_id,title,description,subject_id,subject_tag,difficulty,is_public,created_at) VALUES (?,?,?,?,?,?,?,NOW())');
            $ins->execute([
                $user['id'],
                $title,
                trim($data['description'] ?? ''),
                $subjectId,
                $subjectTag,
                $data['difficulty'] ?? 'medium',
                isset($data['is_public']) ? (int)$data['is_public'] : 1,
            ]);
            $quizId = $pdo->lastInsertId();
        }

        // Insert questions
        $qStmt = $pdo->prepare('INSERT INTO community_questions (quiz_id,question_text,option_a,option_b,option_c,option_d,correct_answer,time_limit,order_num) VALUES (?,?,?,?,?,?,?,?,?)');
        foreach ($questions as $i => $q) {
            $qStmt->execute([
                $quizId,
                trim((string)($q['question_text'] ?? '')),
                trim((string)($q['option_a'] ?? '')),
                trim((string)($q['option_b'] ?? '')),
                trim($q['option_c'] ?? ''),
                trim($q['option_d'] ?? ''),
                $q['correct_answer'],
                intval($q['time_limit'] ?? 20),
                $i
            ]);
        }

        $pdo->commit();
        jsonSuccess(['quiz_id' => $quizId]);
    } catch (Exception $e) {
        try { $pdo->rollBack(); } catch (Exception $e2) {}
        jsonError('Failed to save quiz');
    }
}

/* ── Get a single quiz with questions ── */
function getQuiz() {
    $quizId = intval($_GET['id'] ?? 0);
    if (!$quizId) jsonError('ID required');
    try {
        $pdo = getDB();
        $stmt = $pdo->prepare(
            'SELECT cq.*, s.name AS subject_name, s.color, s.icon,
                    u.first_name, u.last_name, u.username, u.avatar_url
             FROM community_quizzes cq
             LEFT JOIN subjects s ON cq.subject_id = s.id
             JOIN users u ON cq.creator_id = u.id
             WHERE cq.id = ? AND cq.is_public = 1'
        );
        $stmt->execute([$quizId]);
        $quiz = $stmt->fetch();
        if (!$quiz) jsonError('Quiz not found', 404);

        $qStmt = $pdo->prepare('SELECT * FROM community_questions WHERE quiz_id = ? ORDER BY order_num');
        $qStmt->execute([$quizId]);
        $questions = $qStmt->fetchAll();

        // Increment play_count when explicitly starting a solo play session
        if (!empty($_GET['play'])) {
            $pdo->prepare('UPDATE community_quizzes SET play_count = play_count + 1 WHERE id = ?')
                ->execute([$quizId]);
        }

        jsonSuccess(['quiz' => $quiz, 'questions' => $questions]);
    } catch (Exception $e) { jsonError('Failed'); }
}

/* ── Delete a quiz (owner only) ── */
function deleteQuiz($data) {
    $user   = requireAuth();
    $quizId = intval($data['quiz_id'] ?? 0);
    if (!$quizId) jsonError('Quiz ID required');
    try {
        $pdo  = getDB();
        $chk  = $pdo->prepare('SELECT id FROM community_quizzes WHERE id = ? AND creator_id = ?');
        $chk->execute([$quizId, $user['id']]);
        if (!$chk->fetch()) jsonError('Not found', 404);
        $pdo->prepare('DELETE FROM community_quizzes WHERE id = ?')->execute([$quizId]);
        jsonSuccess(['deleted' => true]);
    } catch (Exception $e) { jsonError('Failed'); }
}

/* ── Live game helpers ── */

/* Server clock in milliseconds; question timing is measured against this */
function nowMs(): int {
    return (int) floor(microtime(true) * 1000);
}

/* Lazy migration for live-game columns added after the original schema */
function ensureGameColumns(): void {
    static $done = false;
    if ($done) return;
    $done = true;
    $db = getDB();
    $cols = [
        ['game_sessions', 'host_mode',    "ADD COLUMN host_mode VARCHAR(10) NOT NULL DEFAULT 'spectator'"],
        ['game_sessions', 'q_started_ms', 'ADD COLUMN q_started_ms BIGINT DEFAULT NULL'],
        ['game_answers',  'points',       'ADD COLUMN points INT NOT NULL DEFAULT 0'],
    ];
    foreach ($cols as [$table, $col, $ddl]) {
        try { $db->query("SELECT $col FROM $table LIMIT 1"); }
        catch (Exception $e) { try { $db->exec("ALTER TABLE $table $ddl"); } catch (Exception $e2) {} }
    }
}

/* Kahoot-style speed points: the time limit is split into 10 equal slices.
   Answering in the first slice earns 1000, each later slice 100 less (min 100). */
function speedPoints(int $elapsedMs, int $limitSec): int {
    $sliceMs = max(1, $limitSec * 1000 / 10);
    $slice   = (int) floor(max(0, $elapsedMs) / $sliceMs);
    return max(100, 1000 - 100 * $slice);
}

/* Bonus for consecutive correct answers: +100 per answer after the first, capped at +500 */
function streakBonus(int $streak): int {
    return $streak >= 2 ? min(500, 100 * ($streak - 1)) : 0;
}

/* Current question row (including correct_answer) for an active session */
function currentQuestion(array $session) {
    $offset = max(0, intval($session['current_q']));
    $q = getDB()->prepare("SELECT * FROM community_questions WHERE quiz_id = ? ORDER BY order_num, id LIMIT 1 OFFSET $offset");
    $q->execute([$session['quiz_id']]);
    return $q->fetch() ?: null;
}

/* ── Host: create a game room ── */
function hostGame($data) {
    $user     = requireAuth();
    ensureGameColumns();
    $quizId   = intval($data['quiz_id'] ?? 0);
    $mode     = in_array($data['game_mode'] ?? '', ['classic','blitz','survival','team'], true) ? $data['game_mode'] : 'classic';
    $hostMode = ($data['host_mode'] ?? '') === 'player' ? 'player' : 'spectator';
    if (!$quizId) jsonError('Quiz ID required');

    // Verify quiz is public or owned by host
    $pdo = getDB();
    $chk = $pdo->prepare('SELECT id FROM community_quizzes WHERE id = ? AND (is_public = 1 OR creator_id = ?)');
    $chk->execute([$quizId, $user['id']]);
    if (!$chk->fetch()) jsonError('Quiz not found', 404);

    // Check question count
    $cnt = $pdo->prepare('SELECT COUNT(*) FROM community_questions WHERE quiz_id = ?');
    $cnt->execute([$quizId]);
    if ($cnt->fetchColumn() < 2) jsonError('Quiz needs at least 2 questions');

    try {
        // Generate unique 6-char PIN
        $pin = '';
        do {
            $pin = strtoupper(substr(str_shuffle('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'), 0, 6));
            $exists = $pdo->prepare("SELECT id FROM game_sessions WHERE pin = ? AND status != 'finished'");
            $exists->execute([$pin]);
        } while ($exists->fetch());

        $ins = $pdo->prepare("INSERT INTO game_sessions (quiz_id,host_id,pin,game_mode,host_mode,status,created_at) VALUES (?,?,?,?,?,'lobby',NOW())");
        $ins->execute([$quizId, $user['id'], $pin, $mode, $hostMode]);
        $sessionId = intval($pdo->lastInsertId());

        // A playing host joins as a normal participant
        $participantId = null;
        if ($hostMode === 'player') {
            $nick = mb_substr(trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) ?: ($user['username'] ?? 'Host'), 0, 60);
            $pdo->prepare('INSERT INTO game_participants (session_id,user_id,nickname) VALUES (?,?,?)')
                ->execute([$sessionId, $user['id'], $nick]);
            $participantId = intval($pdo->lastInsertId());
        }

        jsonSuccess(['session_id' => $sessionId, 'pin' => $pin, 'game_mode' => $mode,
                     'host_mode' => $hostMode, 'participant_id' => $participantId]);
    } catch (Exception $e) { jsonError('Failed to create game'); }
}

/* ── Join a game via PIN ── */
function joinGame($data) {
    $user     = requireAuth();
    $pin      = strtoupper(trim((string)($data['pin'] ?? '')));
    $nickname = mb_substr(trim(sanitize($data['nickname'] ?? '')), 0, 60);
    if (!$pin) jsonError('PIN required');

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM game_sessions WHERE pin = ? AND status IN ('lobby','active')");
    $stmt->execute([$pin]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Game not found or already finished');

    // Check if already in game
    $chk = $pdo->prepare('SELECT id FROM game_participants WHERE session_id = ? AND user_id = ?');
    $chk->execute([$session['id'], $user['id']]);
    $existing = $chk->fetch();

    if ($existing) {
        jsonSuccess(['session_id' => $session['id'], 'participant_id' => $existing['id'], 'status' => $session['status'], 'game_mode' => $session['game_mode']]);
    }
    if (intval($session['host_id']) === intval($user['id'])) jsonError('You are hosting this game');

    if (!$nickname) $nickname = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
    if (!$nickname) $nickname = $user['username'] ?? 'Player';

    $ins = $pdo->prepare('INSERT INTO game_participants (session_id,user_id,nickname) VALUES (?,?,?)');
    $ins->execute([$session['id'], $user['id'], mb_substr($nickname, 0, 60)]);
    $participantId = $pdo->lastInsertId();

    jsonSuccess(['session_id' => $session['id'], 'participant_id' => $participantId, 'status' => $session['status'], 'game_mode' => $session['game_mode']]);
}

/* ── Get lobby state (players list) ── */
function getLobby() {
    ensureGameColumns();
    $sessionId = intval($_GET['session_id'] ?? 0);
    $pin       = strtoupper(trim($_GET['pin'] ?? ''));
    if (!$sessionId && !$pin) jsonError('Session ID or PIN required');

    $pdo = getDB();
    if ($pin) {
        $stmt = $pdo->prepare('SELECT * FROM game_sessions WHERE pin = ?');
        $stmt->execute([$pin]);
    } else {
        $stmt = $pdo->prepare('SELECT * FROM game_sessions WHERE id = ?');
        $stmt->execute([$sessionId]);
    }
    $session = $stmt->fetch();
    if (!$session) jsonError('Game not found', 404);

    // Get quiz info
    $qStmt = $pdo->prepare('SELECT cq.title, cq.description, (SELECT COUNT(*) FROM community_questions WHERE quiz_id=cq.id) AS q_count FROM community_quizzes cq WHERE cq.id = ?');
    $qStmt->execute([$session['quiz_id']]);
    $quiz = $qStmt->fetch();

    // Get players (a playing host is included and flagged)
    $pStmt = $pdo->prepare('SELECT gp.id, gp.nickname, gp.score, gp.correct, gp.total, u.avatar_url,
                                   (gp.user_id = ?) AS is_host
                            FROM game_participants gp LEFT JOIN users u ON gp.user_id = u.id
                            WHERE gp.session_id = ? ORDER BY gp.joined_at');
    $pStmt->execute([$session['host_id'], $session['id']]);
    $players = $pStmt->fetchAll();

    jsonSuccess([
        'session' => $session,
        'quiz'    => $quiz,
        'players' => $players,
    ]);
}

/* ── Host starts the game ── */
function startGame($data) {
    $user      = requireAuth();
    ensureGameColumns();
    $sessionId = intval($data['session_id'] ?? 0);
    if (!$sessionId) jsonError('Session ID required');

    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT * FROM game_sessions WHERE id = ? AND host_id = ? AND status = 'lobby'");
    $stmt->execute([$sessionId, $user['id']]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Not found or already started');

    $cnt = $pdo->prepare('SELECT COUNT(*) FROM game_participants WHERE session_id = ?');
    $cnt->execute([$sessionId]);
    if (intval($cnt->fetchColumn()) < 1) jsonError('Wait for at least one player to join');

    $pdo->prepare("UPDATE game_sessions SET status='active', current_q=0, q_started_ms=?, started_at=NOW() WHERE id=?")
        ->execute([nowMs(), $sessionId]);
    jsonSuccess(['started' => true, 'current_q' => 0]);
}

/* ── Host advances to next question ── */
function nextQuestion($data) {
    $user      = requireAuth();
    ensureGameColumns();
    $sessionId = intval($data['session_id'] ?? 0);
    if (!$sessionId) jsonError('Session ID required');

    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT gs.*, (SELECT COUNT(*) FROM community_questions WHERE quiz_id=gs.quiz_id) AS total_q FROM game_sessions gs WHERE gs.id = ? AND gs.host_id = ? AND gs.status = 'active'");
    $stmt->execute([$sessionId, $user['id']]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Not found');

    $nextQ = intval($session['current_q']) + 1;
    if ($nextQ >= intval($session['total_q'])) {
        // End game
        $pdo->prepare("UPDATE game_sessions SET status='finished', current_q=?, finished_at=NOW() WHERE id=?")->execute([$nextQ, $sessionId]);
        $pdo->prepare('UPDATE community_quizzes SET play_count = play_count + 1 WHERE id = ?')->execute([$session['quiz_id']]);
        jsonSuccess(['finished' => true]);
    } else {
        $pdo->prepare('UPDATE game_sessions SET current_q=?, q_started_ms=? WHERE id=?')->execute([$nextQ, nowMs(), $sessionId]);
        jsonSuccess(['current_q' => $nextQ]);
    }
}

/* ── Player submits an answer ── */
function submitAnswer($data) {
    $user          = requireAuth();
    ensureGameColumns();
    $sessionId     = intval($data['session_id'] ?? 0);
    $participantId = intval($data['participant_id'] ?? 0);
    $questionId    = intval($data['question_id'] ?? 0);
    $answer        = strtolower(trim((string)($data['answer'] ?? '')));
    $clientMs      = intval($data['time_taken_ms'] ?? 0);

    if (!$sessionId || !$participantId || !$questionId || !$answer) jsonError('Missing fields');
    if (!in_array($answer, ['a','b','c','d'], true)) jsonError('Invalid answer');

    $pdo = getDB();

    // Verify participant belongs to user
    $p = $pdo->prepare('SELECT * FROM game_participants WHERE id = ? AND user_id = ? AND session_id = ?');
    $p->execute([$participantId, $user['id'], $sessionId]);
    $participant = $p->fetch();
    if (!$participant) jsonError('Participant not found', 403);

    $s = $pdo->prepare("SELECT * FROM game_sessions WHERE id = ? AND status = 'active'");
    $s->execute([$sessionId]);
    $session = $s->fetch();
    if (!$session) jsonError('Game is not running');

    // Only the question currently on screen can be answered
    $question = currentQuestion($session);
    if (!$question || intval($question['id']) !== $questionId) jsonError('This question is over');

    // Timing: trust the client's measurement (it excludes polling delay) but never
    // faster than the server clock allows, minus a small latency allowance
    $limitSec  = max(5, intval($question['time_limit']));
    $serverMs  = $session['q_started_ms'] ? nowMs() - intval($session['q_started_ms']) : $clientMs;
    $elapsedMs = max(0, min($clientMs, $serverMs), $serverMs - 2500);
    if ($elapsedMs > $limitSec * 1000 + 1500) jsonError("Time's up!");

    $isCorrect = ($answer === $question['correct_answer']);
    $streak    = $isCorrect ? intval($participant['streak']) + 1 : 0;
    $points    = $isCorrect ? speedPoints($elapsedMs, $limitSec) + streakBonus($streak) : 0;

    try {
        $pdo->beginTransaction();
        // The unique key (session, participant, question) rejects a second answer
        $pdo->prepare('INSERT INTO game_answers (session_id,participant_id,question_id,answer,is_correct,time_taken_ms,points,answered_at) VALUES (?,?,?,?,?,?,?,NOW())')
            ->execute([$sessionId, $participantId, $questionId, $answer, $isCorrect ? 1 : 0, $elapsedMs, $points]);
        $pdo->prepare('UPDATE game_participants SET score=score+?,streak=?,correct=correct+?,total=total+1 WHERE id=?')
            ->execute([$points, $streak, $isCorrect ? 1 : 0, $participantId]);
        $pdo->commit();
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        jsonError('Already answered');
    }

    jsonSuccess([
        'is_correct'     => $isCorrect,
        'points_earned'  => $points,
        'streak'         => $streak,
        'time_taken_ms'  => $elapsedMs,
    ]);
}

/* ── Get current game state (for polling) ── */
function getGameState() {
    ensureGameColumns();
    $user          = getAuthUser();
    $sessionId     = intval($_GET['session_id'] ?? 0);
    $participantId = intval($_GET['participant_id'] ?? 0);
    if (!$sessionId) jsonError('Session ID required');

    $pdo = getDB();
    $stmt = $pdo->prepare('SELECT gs.*, (SELECT COUNT(*) FROM community_questions WHERE quiz_id=gs.quiz_id) AS total_q FROM game_sessions gs WHERE gs.id=?');
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch();
    if (!$session) jsonError('Session not found', 404);

    $playerCount = $pdo->prepare('SELECT COUNT(*) FROM game_participants WHERE session_id = ?');
    $playerCount->execute([$sessionId]);
    $playerCount = intval($playerCount->fetchColumn());

    $question = null; $reveal = false; $answeredCount = 0; $optionCounts = null; $mine = null;
    if ($session['status'] === 'active') {
        $question = currentQuestion($session);
        if ($question) {
            $qid = intval($question['id']);
            $ac  = $pdo->prepare('SELECT answer, COUNT(*) AS n FROM game_answers WHERE session_id = ? AND question_id = ? GROUP BY answer');
            $ac->execute([$sessionId, $qid]);
            $optionCounts = ['a' => 0, 'b' => 0, 'c' => 0, 'd' => 0];
            foreach ($ac->fetchAll() as $row) { $optionCounts[$row['answer']] = intval($row['n']); $answeredCount += intval($row['n']); }

            // Reveal once time is up or everyone has answered
            $limitMs   = max(5, intval($question['time_limit'])) * 1000;
            $elapsedMs = $session['q_started_ms'] ? nowMs() - intval($session['q_started_ms']) : 0;
            $reveal    = $elapsedMs >= $limitMs || ($playerCount > 0 && $answeredCount >= $playerCount);

            if ($participantId && $user) {
                $mineStmt = $pdo->prepare('SELECT ga.answer, ga.is_correct, ga.points, ga.time_taken_ms
                                           FROM game_answers ga JOIN game_participants gp ON gp.id = ga.participant_id
                                           WHERE ga.session_id = ? AND ga.participant_id = ? AND ga.question_id = ? AND gp.user_id = ?');
                $mineStmt->execute([$sessionId, $participantId, $qid, $user['id']]);
                $mine = $mineStmt->fetch() ?: null;
            }

            // Hide the correct answer and the live answer split until the reveal
            if (!$reveal) { unset($question['correct_answer']); $optionCounts = null; }
        }
    }

    // Leaderboard (a playing host is flagged)
    $lbStmt = $pdo->prepare('SELECT gp.id, gp.nickname, gp.score, gp.correct, gp.total, gp.streak, u.avatar_url, (gp.user_id = ?) AS is_host
                             FROM game_participants gp LEFT JOIN users u ON gp.user_id=u.id
                             WHERE gp.session_id=? ORDER BY gp.score DESC, gp.joined_at LIMIT 20');
    $lbStmt->execute([$session['host_id'], $sessionId]);
    $leaderboard = $lbStmt->fetchAll();

    jsonSuccess([
        'status'         => $session['status'],
        'current_q'      => intval($session['current_q']),
        'total_q'        => intval($session['total_q']),
        'game_mode'      => $session['game_mode'],
        'host_mode'      => $session['host_mode'] ?? 'spectator',
        'question'       => $question,
        'q_started_ms'   => $session['q_started_ms'] !== null ? intval($session['q_started_ms']) : null,
        'server_now_ms'  => nowMs(),
        'reveal'         => $reveal,
        'answered_count' => $answeredCount,
        'player_count'   => $playerCount,
        'option_counts'  => $optionCounts,
        'my_answer'      => $mine,
        'has_answered'   => (bool)$mine,
        'leaderboard'    => $leaderboard,
    ]);
}

/* ── Host finishes the game manually ── */
function finishGame($data) {
    $user      = requireAuth();
    $sessionId = intval($data['session_id'] ?? 0);
    if (!$sessionId) jsonError('Session ID required');

    $pdo = getDB();
    $upd = $pdo->prepare("UPDATE game_sessions SET status='finished', finished_at=NOW() WHERE id=? AND host_id=? AND status != 'finished'");
    $upd->execute([$sessionId, $user['id']]);
    if ($upd->rowCount() === 0) jsonSuccess(['finished' => true]); // already over (or not the host)

    // Increment play_count on the quiz for this game session
    try {
        $qr = $pdo->prepare('SELECT quiz_id FROM game_sessions WHERE id=?');
        $qr->execute([$sessionId]);
        $row = $qr->fetch();
        if ($row && $row['quiz_id']) {
            $pdo->prepare('UPDATE community_quizzes SET play_count = play_count + 1 WHERE id=?')
                ->execute([$row['quiz_id']]);
        }
    } catch (Exception $e) {}

    jsonSuccess(['finished' => true]);
}
