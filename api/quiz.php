<?php
require 'config.php';

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

switch ($action) {
    case 'subjects':    subjects();          break;
    case 'quizzes':     quizzes();           break;
    case 'questions':   questions();         break;
    case 'submit':      submitQuiz($body);   break;
    case 'history':     history();           break;
    case 'leaderboard': quizLeaderboard();   break;
    default: jsonError('Unknown action');
}

function subjects() {
    try {
        jsonSuccess(getDB()->query('SELECT * FROM subjects ORDER BY name')->fetchAll());
    } catch(Exception $e) { jsonError('Failed'); }
}

function quizzes() {
    $slug  = sanitize($_GET['subject'] ?? '');
    $grade = sanitize($_GET['grade']   ?? '');
    try {
        $pdo   = getDB();
        $where = ['q.is_active=1']; $params = [];
        if ($slug)  { $where[]='s.slug=?';       $params[]=$slug; }
        if ($grade) { $where[]='q.grade_range=?'; $params[]=$grade; }
        $sql = 'SELECT q.*,s.name as subject_name,s.icon,s.color,
                (SELECT COUNT(*) FROM questions qn WHERE qn.quiz_id=q.id) as question_count
                FROM quizzes q JOIN subjects s ON q.subject_id=s.id
                WHERE '.implode(' AND ',$where).' ORDER BY q.created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonSuccess($stmt->fetchAll());
    } catch(Exception $e) { jsonError('Failed to load quizzes'); }
}

function questions() {
    $quizId = intval($_GET['quiz_id'] ?? 0);
    if (!$quizId) jsonError('Quiz ID required');
    try {
        $pdo  = getDB();
        $quiz = $pdo->prepare('SELECT q.*,s.name as subject_name,s.icon FROM quizzes q JOIN subjects s ON q.subject_id=s.id WHERE q.id=? AND q.is_active=1');
        $quiz->execute([$quizId]);
        $quizData = $quiz->fetch();
        if (!$quizData) jsonError('Quiz not found', 404);
        $stmt = $pdo->prepare('SELECT id,question_text,option_a,option_b,option_c,option_d,correct_answer,order_num FROM questions WHERE quiz_id=? ORDER BY order_num');
        $stmt->execute([$quizId]);
        jsonSuccess(['quiz'=>$quizData,'questions'=>$stmt->fetchAll()]);
    } catch(Exception $e) { jsonError('Failed'); }
}

function submitQuiz($data) {
    $user      = requireAuth();
    $quizId    = intval($data['quiz_id'] ?? 0);
    $answers   = $data['answers'] ?? [];
    if (!is_array($answers)) $answers = [];
    $timeSpent = intval($data['time_spent'] ?? 0); // seconds client reports
    if (!$quizId || empty($answers)) jsonError('Quiz ID and answers required');
    try {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT q.*,qz.xp_reward FROM questions q JOIN quizzes qz ON qz.id=q.quiz_id WHERE q.quiz_id=? ORDER BY q.order_num');
        $stmt->execute([$quizId]);
        $questions = $stmt->fetchAll();
        if (empty($questions)) jsonError('No questions found');
        $correct = 0;
        foreach ($questions as $i => $q) {
            if (strtolower($answers[$i] ?? '') === strtolower($q['correct_answer'] ?? '')) $correct++;
        }
        $total    = count($questions);
        $xpReward = intval($questions[0]['xp_reward'] ?? 50);
        $xpEarned = intval(($correct / $total) * $xpReward);

        // Only award XP if this score beats the user's previous best for this quiz
        $prev = $pdo->prepare('SELECT MAX(score) as best FROM quiz_attempts WHERE user_id=? AND quiz_id=?');
        $prev->execute([$user['id'], $quizId]);
        $prevBest  = intval($prev->fetch()['best'] ?? -1);
        $isRetry   = $prevBest >= 0;
        $prevXP    = $isRetry ? intval(($prevBest / $total) * $xpReward) : 0;
        $xpDelta   = max(0, $xpEarned - $prevXP); // bonus XP for improvement only

        $pdo->prepare('INSERT INTO quiz_attempts (user_id,quiz_id,score,total_questions,xp_earned,completed_at) VALUES (?,?,?,?,?,NOW())')->execute([$user['id'],$quizId,$correct,$total,$xpDelta]);
        if ($xpDelta > 0) $pdo->prepare('UPDATE users SET xp=xp+? WHERE id=?')->execute([$xpDelta,$user['id']]);
        try { $pdo->prepare('UPDATE users SET last_active=NOW() WHERE id=?')->execute([$user['id']]); } catch(Exception $e) {}
        // Speed Learner: finished in under 2 minutes with at least one correct answer
        $speedLearner = ($timeSpent > 0 && $timeSpent < 120 && $correct > 0);
        jsonSuccess(['correct'=>$correct,'total'=>$total,'xp_earned'=>$xpDelta,'percentage'=>intval(($correct/$total)*100),'speed_learner'=>$speedLearner,'is_retry'=>$isRetry,'prev_best'=>$prevBest]);
    } catch(Exception $e) { jsonError('Submit failed'); }
}

function history() {
    $me     = requireAuth();
    $userId = intval($_GET['user_id'] ?? 0);
    if (!$userId) jsonError('User ID required');
    // Only allow viewing own history unless the viewer is an admin
    if ($userId !== (int)$me['id'] && ($me['role'] ?? 'student') !== 'admin') {
        jsonError('Not authorized', 403);
    }
    try {
        $stmt = getDB()->prepare('SELECT qa.*,qz.title,s.name as subject_name,s.icon FROM quiz_attempts qa JOIN quizzes qz ON qa.quiz_id=qz.id JOIN subjects s ON qz.subject_id=s.id WHERE qa.user_id=? ORDER BY qa.completed_at DESC LIMIT 50');
        $stmt->execute([$userId]);
        jsonSuccess($stmt->fetchAll());
    } catch(Exception $e) { jsonError('Failed'); }
}

function quizLeaderboard() {
    $quizId = intval($_GET['quiz_id'] ?? 0);
    if (!$quizId) jsonError('Quiz ID required');
    try {
        $stmt = getDB()->prepare('SELECT u.first_name,u.last_name,u.username,MAX(qa.score) as best_score,MAX(qa.total_questions) as total_questions FROM quiz_attempts qa JOIN users u ON qa.user_id=u.id WHERE qa.quiz_id=? AND u.role != \'guest\' GROUP BY qa.user_id,u.first_name,u.last_name,u.username ORDER BY best_score DESC LIMIT 10');
        $stmt->execute([$quizId]);
        jsonSuccess($stmt->fetchAll());
    } catch(Exception $e) { jsonError('Failed'); }
}