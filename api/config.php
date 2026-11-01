<?php
/* ─────────────────────────────────────────────────────────────
   Learnora – Configuration
   Passwords and keys live in api/secrets.php on the server (never in git);
   copy api/secrets.example.php to api/secrets.php and fill it in.
   Environment variables with the same names override both.
   ───────────────────────────────────────────────────────────── */

$GLOBALS['LEARNORA_SECRETS'] = is_file(__DIR__ . '/secrets.php') ? (array) require __DIR__ . '/secrets.php' : [];

/* A setting from the environment, then api/secrets.php, then $default */
function cfg(string $key, string $default = ''): string {
    $env = getenv($key);
    if ($env !== false && $env !== '') return $env;
    $val = $GLOBALS['LEARNORA_SECRETS'][$key] ?? null;
    return ($val !== null && $val !== '') ? (string) $val : $default;
}

define('DB_HOST',    cfg('DB_HOST', 'localhost'));
define('DB_NAME',    cfg('DB_NAME'));
define('DB_USER',    cfg('DB_USER'));
define('DB_PASS',    cfg('DB_PASS'));
define('DB_CHARSET', 'utf8mb4');
define('APP_SECRET',   cfg('APP_SECRET'));
define('CRON_SECRET',  cfg('CRON_SECRET', 'learnora-cron-' . md5(APP_SECRET)));

/* ── Social Login ─────────────────────────────────────────────
   Google: create a project at console.cloud.google.com
     → APIs & Services → Credentials → OAuth 2.0 Client ID (Web)
     → Add your domain to Authorized JavaScript Origins
   Telegram: message @BotFather → /newbot → /setdomain
     → paste your site domain (e.g. learnora.uz)
   ─────────────────────────────────────────────────────────── */
/* ── Uploadcare – file hosting & video pitch storage ──────────
   Public key  → used in browser upload widget
   Secret key  → used server-side for file deletion (on approval)
   ─────────────────────────────────────────────────────────── */
define('UPLOADCARE_PUB_KEY',    cfg('UPLOADCARE_PUB_KEY'));
define('UPLOADCARE_SECRET_KEY', cfg('UPLOADCARE_SECRET_KEY'));

/* ── Jitsi as a Service (JaaS) ────────────────────────────────
   Credentials are read from environment variables first.
   If not set, the hardcoded defaults below are used.

   To configure via env:
     JAAS_APP_ID         — from jaas.8x8.vc → Overview
     JAAS_API_KEY_ID     — from jaas.8x8.vc → API Keys (format: vpaas-.../keyId)
     JAAS_PRIVATE_KEY_FILE — path to the .pk file downloaded from JaaS console
     JAAS_PRIVATE_KEY    — alternatively, paste the full key contents inline
   ─────────────────────────────────────────────────────────── */
define('JAAS_APP_ID',     cfg('JAAS_APP_ID'));
define('JAAS_API_KEY_ID', cfg('JAAS_API_KEY_ID'));

(function () {
    $keyFile   = cfg('JAAS_PRIVATE_KEY_FILE');
    $keyInline = cfg('JAAS_PRIVATE_KEY');
    if ($keyFile && file_exists($keyFile)) {
        define('JAAS_PRIVATE_KEY', file_get_contents($keyFile));
    } elseif ($keyInline) {
        define('JAAS_PRIVATE_KEY', $keyInline);
    } else {
        define('JAAS_PRIVATE_KEY', '');
    }
})();

define('GOOGLE_CLIENT_ID',   cfg('GOOGLE_CLIENT_ID'));
define('TELEGRAM_BOT_TOKEN', cfg('TELEGRAM_BOT_TOKEN'));
define('TELEGRAM_BOT_NAME',  cfg('TELEGRAM_BOT_NAME', 'learnorabot'));

$_allowedOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
// Allow same-origin requests and any subdomain of learnora.uz; fall back to * for local dev
$_isAllowed = (empty($_allowedOrigin)
    || preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $_allowedOrigin)
    || preg_match('#^https://([a-z0-9-]+\.)?learnora\.uz$#', $_allowedOrigin));
header('Access-Control-Allow-Origin: ' . ($_isAllowed && $_allowedOrigin ? $_allowedOrigin : '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset='.DB_CHARSET;
        $opts = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try { $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts); }
        catch (PDOException $e) { jsonError('Database connection failed', 500); }
    }
    return $pdo;
}

/* Bearer token from the Authorization header ('' if none).
   getallheaders() is missing or drops Authorization under some PHP-FPM/FastCGI setups. */
function getBearerToken(): string {
    $auth = '';
    if (function_exists('getallheaders')) {
        foreach ((getallheaders() ?: []) as $name => $value) {
            if (strcasecmp((string)$name, 'Authorization') === 0) { $auth = (string)$value; break; }
        }
    }
    if (!$auth) $auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));
    return trim(preg_replace('/^Bearer\s+/i', '', trim($auth)));
}

function getAuthUser() {
    $token = getBearerToken();
    if (!$token) return null;
    try {
        $pdo = getDB();
        $stmt = $pdo->prepare(
            'SELECT u.* FROM users u
             JOIN sessions s ON u.id = s.user_id
             WHERE s.token = ? AND s.expires_at > NOW()'
        );
        $stmt->execute([$token]);
        return $stmt->fetch() ?: null;
    } catch (Exception $e) { return null; }
}

function requireAuth() {
    $user = getAuthUser();
    if (!$user) jsonError('Unauthorized', 401);
    if (($user['role'] ?? '') === 'guest' && !guestAllowed()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'guest_restricted' => true,
                          'error' => 'Create a free account to use this feature']);
        exit;
    }
    return $user;
}

/* ── Guest mode ───────────────────────────────────────────────
   Guests are temporary accounts (role 'guest', deleted after GUEST_TTL_HOURS).
   They may read anything a logged-in user can read, but may only write through
   the actions listed here, and never touch the blocked endpoints. */
const GUEST_TTL_HOURS = 24;
const GUEST_BLOCKED_SCRIPTS = ['messages.php', 'teacher.php', 'help_queue.php', 'admin.php', 'upload.php', 'study_groups.php'];
const GUEST_WRITE_ACTIONS = [
    'auth.php'           => ['logout'],
    'quiz.php'           => ['submit'],
    'community_quiz.php' => ['host', 'join', 'start_game', 'next_question', 'answer', 'finish_game'],
    'flashcards.php'     => ['study_complete', 'card_progress'],
    'pomodoro.php'       => ['save_session'],
];

function guestAllowed(): bool {
    $script = basename((string)($_SERVER['SCRIPT_NAME'] ?? ''));
    $action = (string)($_GET['action'] ?? '');
    if (in_array($script, GUEST_BLOCKED_SCRIPTS, true)) return false;
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') return true;
    return in_array($action, GUEST_WRITE_ACTIONS[$script] ?? [], true);
}

/* Delete expired guest accounts and the rows that don't cascade with them */
function cleanupGuests(int $limit = 100): void {
    try {
        $pdo = getDB();
        $ids = $pdo->query("SELECT id FROM users WHERE role = 'guest' AND created_at < DATE_SUB(NOW(), INTERVAL " . GUEST_TTL_HOURS . " HOUR) LIMIT " . intval($limit))
                   ->fetchAll(PDO::FETCH_COLUMN);
        if (!$ids) return;
        $in = implode(',', array_fill(0, count($ids), '?'));
        foreach (['sessions', 'pomodoro_sessions', 'flashcard_study_sessions', 'flashcard_card_progress', 'quiz_attempts'] as $table) {
            try { $pdo->prepare("DELETE FROM $table WHERE user_id IN ($in)")->execute($ids); } catch (Exception $e) {}
        }
        try { $pdo->prepare("DELETE FROM game_sessions WHERE host_id IN ($in)")->execute($ids); } catch (Exception $e) {}
        $pdo->prepare("DELETE FROM users WHERE role = 'guest' AND id IN ($in)")->execute($ids);
    } catch (Exception $e) { /* best effort */ }
}

function jsonSuccess($data, $code = 200) {
    http_response_code($code);
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

function jsonError($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

/* strip_tags removes HTML — do NOT use htmlspecialchars here
   (would corrupt text stored in DB and shown in form inputs) */
function sanitize($s) { return is_scalar($s) ? trim(strip_tags((string)$s)) : ''; }
/* Decoded JSON request body; always an array (scalar/invalid JSON → []) */
function getJsonBody(): array {
    $data = json_decode((string)file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}
function generateToken() { return bin2hex(random_bytes(32)); }

/**
 * Insert a notification row for a user.
 * Silently skips if the notifications table doesn't exist yet or on any DB error.
 *
 * @param int    $userId    Recipient user ID
 * @param int    $actorId   The user who triggered the action (0 = system)
 * @param string $type      Notification type: 'comment','connection','session','message','general', etc.
 * @param string $content   Human-readable notification text
 * @param int    $refId     Optional reference ID (post_id, session_id, etc.)
 */
function pushNotif(int $userId, int $actorId, string $type, string $content, int $refId = 0): void {
    if ($userId <= 0 || $userId === $actorId) return; // never notify yourself
    try {
        getDB()->prepare(
            'INSERT INTO notifications (user_id,actor_id,type,content,reference_id,is_read,created_at)
             VALUES (?,?,?,?,?,0,NOW())'
        )->execute([$userId, $actorId ?: null, $type, $content, $refId ?: null]);
    } catch (Exception $e) { /* notifications are non-critical — silently skip */ }
}

/** Base64URL-encode (RFC 4648 §5 — no padding, URL-safe chars). */
function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Generate a signed RS256 JWT for a JaaS (8x8.vc) room.
 * Returns '' if credentials are missing/invalid — callers must handle
 * this case; JaaS will refuse unauthenticated joins.
 */
function generateJaaSToken(
    string $userId,
    string $name,
    string $email,
    bool   $isModerator,
    string $avatarUrl = '',
    string $room      = '*'
): string {
    $privateKey = defined('JAAS_PRIVATE_KEY') ? JAAS_PRIVATE_KEY : '';
    $appId      = defined('JAAS_APP_ID')      ? JAAS_APP_ID      : '';
    $keyId      = defined('JAAS_API_KEY_ID')  ? JAAS_API_KEY_ID  : '';

    // Bail out gracefully if credentials are placeholder/empty
    if (!$privateKey || !$appId || !$keyId
        || strpos($privateKey, 'REPLACE_WITH') !== false
        || strpos($keyId,      'REPLACE_WITH') !== false) {
        return '';
    }

    $now = time();

    $header = base64url_encode(json_encode([
        'alg' => 'RS256',
        'typ' => 'JWT',
        'kid' => $keyId,
    ], JSON_UNESCAPED_SLASHES));

    $payload = base64url_encode(json_encode([
        'iss'  => 'chat',
        'aud'  => 'jitsi',
        'iat'  => $now,
        'nbf'  => $now - 10,
        'exp'  => $now + 86400,   // 24 h — covers any session length
        'sub'  => $appId,
        'room' => $room,
        'context' => [
            'user' => [
                'id'        => (string) $userId,
                'name'      => $name,
                'email'     => $email,
                'moderator' => $isModerator ? 'true' : 'false',
                'avatar'    => $avatarUrl,
            ],
            'features' => [
                'recording'      => false,
                'livestreaming'  => false,
                'transcription'  => false,
                'outbound-call'  => false,
            ],
        ],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

    $signingInput = $header . '.' . $payload;
    $signature    = '';
    if (!openssl_sign($signingInput, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
        return ''; // private key is invalid
    }

    return $signingInput . '.' . base64url_encode($signature);
}