<?php
require 'config.php';
require 'mailer.php';

$action = $_GET['action'] ?? '';
$body   = getJsonBody();

// Lazy migration: email verification + password-reset + social login columns
(function() {
    $db   = getDB();
    $cols = [
        'email_verified'      => 'ADD COLUMN email_verified      TINYINT(1)   NOT NULL DEFAULT 0',
        'verify_code'         => 'ADD COLUMN verify_code         VARCHAR(10)  DEFAULT NULL',
        'verify_code_expires' => 'ADD COLUMN verify_code_expires DATETIME     DEFAULT NULL',
        'reset_code'          => 'ADD COLUMN reset_code          VARCHAR(10)  DEFAULT NULL',
        'reset_code_expires'  => 'ADD COLUMN reset_code_expires  DATETIME     DEFAULT NULL',
        'google_id'           => 'ADD COLUMN google_id           VARCHAR(100) DEFAULT NULL',
        'telegram_id'         => 'ADD COLUMN telegram_id         BIGINT       DEFAULT NULL',
        'role'                => "ADD COLUMN role                VARCHAR(50)  NOT NULL DEFAULT 'student'",
        'approved_subjects'   => 'ADD COLUMN approved_subjects   TEXT         DEFAULT NULL',
        'public_bio'          => 'ADD COLUMN public_bio          TEXT         DEFAULT NULL',
        'current_status'      => 'ADD COLUMN current_status      VARCHAR(100) DEFAULT NULL',
        'standardized_tests'  => 'ADD COLUMN standardized_tests  TEXT         DEFAULT NULL',
        'test_subjects'       => 'ADD COLUMN test_subjects        TEXT         DEFAULT NULL',
        'last_active'         => 'ADD COLUMN last_active         DATETIME     DEFAULT NULL',
        'guest_ip'            => 'ADD COLUMN guest_ip            VARCHAR(45)  DEFAULT NULL',
    ];
    foreach ($cols as $col => $ddl) {
        try { $db->query("SELECT $col FROM users LIMIT 1"); }
        catch (Exception $e) {
            try { $db->exec("ALTER TABLE users $ddl"); } catch (Exception $e2) {}
        }
    }
    // Make password_hash and email nullable (needed for social-only accounts)
    try { $db->exec("ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL DEFAULT NULL"); } catch (Exception $e) {}
    try { $db->exec("ALTER TABLE users MODIFY COLUMN email         VARCHAR(150) NULL DEFAULT NULL"); } catch (Exception $e) {}

    // Bootstrap admin user (Learnora / abdulloh008) — idempotent
    try {
        $existing = $db->query("SELECT id FROM users WHERE username='Learnora' LIMIT 1")->fetch();
        if (!$existing) {
            $hash = password_hash('abdulloh008', PASSWORD_BCRYPT);
            $db->prepare(
                "INSERT INTO users (first_name,last_name,username,email,password_hash,grade,xp,level,email_verified,role,created_at)
                 VALUES ('Admin','Learnora','Learnora','admin@learnora.uz',?,12,0,1,1,'admin',NOW())"
            )->execute([$hash]);
        } else {
            // Ensure existing Learnora account has admin role
            $db->exec("UPDATE users SET role='admin' WHERE username='Learnora' AND (role IS NULL OR role='student')");
        }
    } catch (Exception $e) {}
})();

switch ($action) {
    case 'register':         register($body);         break;
    case 'verify_email':     verifyEmail($body);      break;
    case 'resend_code':      resendCode($body);       break;
    case 'login':            login($body);            break;
    case 'forgot_password':  forgotPassword($body);   break;
    case 'reset_password':   resetPassword($body);    break;
    case 'google_oauth':     googleOAuth($body);      break;
    case 'telegram_oauth':   telegramOAuth($body);    break;
    case 'social_config':    socialConfig();          break;
    case 'logout':           logout();                break;
    case 'me':               me();                    break;
    case 'guest':            guestLogin();            break;
    default: jsonError('Unknown action');
}

/* ── Register ──────────────────────────────────────────────── */
function register($data) {
    $pdo      = getDB();
    $required = ['first_name','last_name','username','email','grade','password'];
    foreach ($required as $f) {
        if (empty($data[$f])) jsonError("Field '$f' is required");
    }
    $firstName = sanitize($data['first_name']);
    $lastName  = sanitize($data['last_name']);
    $username  = sanitize($data['username']);
    $email     = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
    $grade     = sanitize($data['grade']);
    $password  = $data['password'];

    if (!$email)                         jsonError('Invalid email address');
    if (strlen($password) < 8)           jsonError('Password must be at least 8 characters');
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $username))
        jsonError('Username can only contain letters, numbers and underscores');

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email=? OR username=?');
    $stmt->execute([$email, $username]);
    if ($stmt->fetch()) jsonError('Email or username already taken');

    $hash    = password_hash($password, PASSWORD_BCRYPT);
    $code    = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    $stmt = $pdo->prepare(
        'INSERT INTO users
            (first_name,last_name,username,email,password_hash,grade,xp,level,streak,
             email_verified,verify_code,verify_code_expires,created_at)
         VALUES (?,?,?,?,?,?,0,1,0, 0,?,?,NOW())'
    );
    $stmt->execute([$firstName,$lastName,$username,$email,$hash,$grade,$code,$expires]);
    $userId = $pdo->lastInsertId();

    // Send verification email
    $html = emailTemplate('Verify your Learnora account', "
        <h2 style='margin:0 0 8px;font-size:1.4rem;color:#0D1B4B'>Verify your email</h2>
        <p style='color:#64748b;margin:0 0 24px'>Hi <strong>$firstName</strong>, welcome to Learnora! Enter the code below to activate your account.</p>
        <div style='text-align:center;margin:28px 0'>
          <div style='display:inline-block;background:#f0f9ff;border:2px dashed #29ABE2;border-radius:12px;padding:18px 36px'>
            <div style='font-size:2.4rem;font-weight:900;letter-spacing:0.18em;color:#0D1B4B'>$code</div>
            <div style='font-size:0.75rem;color:#94a3b8;margin-top:6px'>Expires in 15 minutes</div>
          </div>
        </div>
        <p style='color:#94a3b8;font-size:0.82rem;text-align:center'>If you did not create a Learnora account, please ignore this email.</p>
    ");
    sendMail($email, "$firstName $lastName", 'Your Learnora verification code', $html);

    jsonSuccess(['pending_verification' => true, 'email' => $email, 'user_id' => $userId], 200);
}

/* ── Verify Email ───────────────────────────────────────────── */
function verifyEmail($data) {
    $pdo    = getDB();
    $userId = intval($data['user_id'] ?? 0);
    $code   = sanitize($data['code'] ?? '');

    if (!$userId || !$code) jsonError('User ID and code are required');

    $stmt = $pdo->prepare(
        'SELECT id,first_name,last_name,username,email,verify_code,verify_code_expires,email_verified
         FROM users WHERE id=?'
    );
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user)                               jsonError('Account not found');
    if ($user['email_verified'])              jsonError('Email already verified');
    if ($user['verify_code'] !== $code)       jsonError('Invalid verification code');
    if (new DateTime() > new DateTime($user['verify_code_expires']))
        jsonError('Verification code has expired. Please request a new one.');

    $pdo->prepare('UPDATE users SET email_verified=1, verify_code=NULL, verify_code_expires=NULL WHERE id=?')
        ->execute([$userId]);

    // Create session
    $token   = generateToken();
    $expires = date('Y-m-d H:i:s', strtotime('+30 days'));
    $pdo->prepare('INSERT INTO sessions (user_id,token,expires_at,created_at) VALUES (?,?,?,NOW())')
        ->execute([$userId,$token,$expires]);

    $stmt = $pdo->prepare(
        'SELECT id,first_name,last_name,username,email,grade,xp,level,streak,bio,location,avatar_url,
                role,approved_subjects,public_bio,current_status,created_at
         FROM users WHERE id=?'
    );
    $stmt->execute([$userId]);
    jsonSuccess(['user' => $stmt->fetch(), 'token' => $token]);
}

/* ── Resend Verification Code ───────────────────────────────── */
function resendCode($data) {
    $pdo    = getDB();
    $userId = intval($data['user_id'] ?? 0);
    if (!$userId) jsonError('User ID required');

    $stmt = $pdo->prepare('SELECT id,first_name,last_name,email,email_verified FROM users WHERE id=?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user)              jsonError('Account not found');
    if ($user['email_verified']) jsonError('Email already verified');

    $code    = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));
    $pdo->prepare('UPDATE users SET verify_code=?, verify_code_expires=? WHERE id=?')
        ->execute([$code,$expires,$userId]);

    $firstName = $user['first_name'];
    $email     = $user['email'];
    $html = emailTemplate('Your new Learnora verification code', "
        <h2 style='margin:0 0 8px;font-size:1.4rem;color:#0D1B4B'>New verification code</h2>
        <p style='color:#64748b;margin:0 0 24px'>Hi <strong>$firstName</strong>, here is your new verification code.</p>
        <div style='text-align:center;margin:28px 0'>
          <div style='display:inline-block;background:#f0f9ff;border:2px dashed #29ABE2;border-radius:12px;padding:18px 36px'>
            <div style='font-size:2.4rem;font-weight:900;letter-spacing:0.18em;color:#0D1B4B'>$code</div>
            <div style='font-size:0.75rem;color:#94a3b8;margin-top:6px'>Expires in 15 minutes</div>
          </div>
        </div>
    ");
    sendMail($email, "$firstName {$user['last_name']}", 'Your new Learnora verification code', $html);
    jsonSuccess(['sent' => true]);
}

/* ── Login ─────────────────────────────────────────────────── */
function login($data) {
    $pdo        = getDB();
    $identifier = $data['email']    ?? '';
    $password   = $data['password'] ?? '';
    if (!$identifier || !$password) jsonError('Email and password are required');

    // Rate-limit: max 10 failed login attempts per IP per 15 minutes
    $ip       = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $ipHash   = hash('sha256', $ip); // don't store raw IPs
    try {
        // Lazy-create login_attempts table if missing
        $pdo->exec("CREATE TABLE IF NOT EXISTS login_attempts (
            id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            ip_hash    VARCHAR(64)  NOT NULL,
            attempted_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ip_time (ip_hash, attempted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Purge old attempts (older than 15 min)
        $pdo->prepare('DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)')
            ->execute();

        $cnt = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip_hash=?');
        $cnt->execute([$ipHash]);
        if ((int)$cnt->fetchColumn() >= 10) {
            http_response_code(429);
            echo json_encode(['success' => false, 'error' => 'Too many login attempts. Please wait 15 minutes and try again.']);
            exit;
        }
    } catch (Exception $e) {} // If rate-limit table fails, allow login (graceful degradation)

    $stmt = $pdo->prepare('SELECT * FROM users WHERE email=? OR username=?');
    $stmt->execute([$identifier,$identifier]);
    $user = $stmt->fetch();
    if (!$user || !$user['password_hash'] || !password_verify($password, $user['password_hash'])) {
        // Record failed attempt
        try { $pdo->prepare('INSERT INTO login_attempts (ip_hash) VALUES (?)')->execute([$ipHash]); } catch (Exception $e) {}
        jsonError('Invalid email or password');
    }

    // If email_verified column exists but is 0, block login
    if (array_key_exists('email_verified', $user) && !$user['email_verified']) {
        // Resend a fresh code
        $code    = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        $pdo->prepare('UPDATE users SET verify_code=?, verify_code_expires=? WHERE id=?')
            ->execute([$code,$expires,$user['id']]);
        $html = emailTemplate('Verify your Learnora account', "
            <h2 style='margin:0 0 8px;font-size:1.4rem;color:#0D1B4B'>Verify your email</h2>
            <p style='color:#64748b;margin:0 0 24px'>Hi <strong>{$user['first_name']}</strong>, your account needs email verification. Here is your code:</p>
            <div style='text-align:center;margin:28px 0'>
              <div style='display:inline-block;background:#f0f9ff;border:2px dashed #29ABE2;border-radius:12px;padding:18px 36px'>
                <div style='font-size:2.4rem;font-weight:900;letter-spacing:0.18em;color:#0D1B4B'>$code</div>
                <div style='font-size:0.75rem;color:#94a3b8;margin-top:6px'>Expires in 15 minutes</div>
              </div>
            </div>
        ");
        sendMail($user['email'], $user['first_name'].' '.$user['last_name'],
                 'Your Learnora verification code', $html);
        http_response_code(403);
        echo json_encode([
            'success'              => false,
            'error'                => 'Please verify your email to continue.',
            'pending_verification' => true,
            'user_id'              => $user['id'],
            'email'                => $user['email'],
        ]);
        exit;
    }

    try { $pdo->prepare('UPDATE users SET last_active=NOW() WHERE id=?')->execute([$user['id']]); }
    catch (Exception $e) {} // Column may not exist on older schemas
    $token   = generateToken();
    $expires = date('Y-m-d H:i:s', strtotime('+30 days'));
    $pdo->prepare('DELETE FROM sessions WHERE user_id=? AND expires_at<NOW()')->execute([$user['id']]);
    $pdo->prepare('INSERT INTO sessions (user_id,token,expires_at,created_at) VALUES (?,?,?,NOW())')
        ->execute([$user['id'],$token,$expires]);
    $user['has_password'] = !empty($user['password_hash']);
    unset($user['password_hash']);
    jsonSuccess(['user' => $user, 'token' => $token]);
}

/* ── Forgot Password ────────────────────────────────────────── */
function forgotPassword($data) {
    $pdo   = getDB();
    $email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
    if (!$email) jsonError('Valid email address required');

    $stmt = $pdo->prepare('SELECT id,first_name,last_name,email FROM users WHERE email=?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Always return success to prevent email enumeration
    if (!$user) { jsonSuccess(['sent' => true]); return; }

    $code    = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));
    $pdo->prepare('UPDATE users SET reset_code=?, reset_code_expires=? WHERE id=?')
        ->execute([$code, $expires, $user['id']]);

    $firstName = $user['first_name'];
    $html = emailTemplate('Reset your Learnora password', "
        <h2 style='margin:0 0 8px;font-size:1.4rem;color:#0D1B4B'>Reset your password</h2>
        <p style='color:#64748b;margin:0 0 24px'>Hi <strong>$firstName</strong>, use the code below to reset your Learnora password.</p>
        <div style='text-align:center;margin:28px 0'>
          <div style='display:inline-block;background:#fff7ed;border:2px dashed #f59e0b;border-radius:12px;padding:18px 36px'>
            <div style='font-size:2.4rem;font-weight:900;letter-spacing:0.18em;color:#0D1B4B'>$code</div>
            <div style='font-size:0.75rem;color:#94a3b8;margin-top:6px'>Expires in 15 minutes</div>
          </div>
        </div>
        <p style='color:#94a3b8;font-size:0.82rem;text-align:center'>If you did not request a password reset, please ignore this email.</p>
    ");
    sendMail($email, "$firstName {$user['last_name']}", 'Reset your Learnora password', $html);
    jsonSuccess(['sent' => true]);
}

/* ── Reset Password ─────────────────────────────────────────── */
function resetPassword($data) {
    $pdo      = getDB();
    $email    = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $code     = sanitize($data['code']        ?? '');
    $password = $data['new_password']          ?? '';

    if (!$email || !$code || !$password) jsonError('All fields are required');
    if (strlen($password) < 8) jsonError('Password must be at least 8 characters');

    $stmt = $pdo->prepare(
        'SELECT id,reset_code,reset_code_expires FROM users WHERE email=?'
    );
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user)                                jsonError('Account not found');
    if ($user['reset_code'] !== $code)         jsonError('Invalid reset code');
    if (!$user['reset_code_expires'] || new DateTime() > new DateTime($user['reset_code_expires']))
        jsonError('Reset code has expired. Please request a new one.');

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $pdo->prepare('UPDATE users SET password_hash=?, reset_code=NULL, reset_code_expires=NULL WHERE id=?')
        ->execute([$hash, $user['id']]);

    jsonSuccess(['reset' => true]);
}

/* ── Logout ─────────────────────────────────────────────────── */
function logout() {
    $token = getBearerToken();
    if ($token) {
        try { getDB()->prepare('DELETE FROM sessions WHERE token=?')->execute([$token]); }
        catch (Exception $e) {}
    }
    jsonSuccess(['message' => 'Logged out']);
}

/* ── Guest login: temporary account, nothing kept after GUEST_TTL_HOURS ── */
function guestLogin() {
    $pdo = getDB();
    cleanupGuests();

    // Light abuse guard: a handful of guest accounts per IP per hour
    $ip = substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
    try {
        $c = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'guest' AND guest_ip = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)");
        $c->execute([$ip]);
        if (intval($c->fetchColumn()) >= 10) jsonError('Too many guest sessions — please try again later', 429);
    } catch (Exception $e) {}

    $suffix   = substr(bin2hex(random_bytes(4)), 0, 6);
    $username = 'guest_' . $suffix;
    try {
        $pdo->prepare("INSERT INTO users (first_name,last_name,username,email,password_hash,role,email_verified,guest_ip,created_at)
                       VALUES ('Guest',?,?,NULL,NULL,'guest',1,?,NOW())")
            ->execute([strtoupper($suffix), $username, $ip]);
    } catch (Exception $e) {
        // Older schemas may lack email_verified
        $pdo->prepare("INSERT INTO users (first_name,last_name,username,email,password_hash,role,guest_ip,created_at)
                       VALUES ('Guest',?,?,NULL,NULL,'guest',?,NOW())")
            ->execute([strtoupper($suffix), $username, $ip]);
    }
    $userId = intval($pdo->lastInsertId());

    $token   = generateToken();
    $expires = date('Y-m-d H:i:s', strtotime('+' . GUEST_TTL_HOURS . ' hours'));
    $pdo->prepare('INSERT INTO sessions (user_id,token,expires_at,created_at) VALUES (?,?,?,NOW())')
        ->execute([$userId, $token, $expires]);

    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    unset($user['password_hash'], $user['guest_ip']);
    $user['has_password'] = false;
    jsonSuccess(['user' => $user, 'token' => $token]);
}

/* ── Me ─────────────────────────────────────────────────────── */
function me() {
    $user = requireAuth();
    $user['has_password'] = !empty($user['password_hash']);
    unset($user['password_hash'], $user['verify_code'], $user['reset_code'],
          $user['verify_code_expires'], $user['reset_code_expires']);
    // Append counts needed by achievement system
    try {
        $pdo = getDB();
        $uid = $user['id'];

        $r = $pdo->prepare('SELECT COUNT(*) FROM comments WHERE user_id=?');
        $r->execute([$uid]);
        $user['comments_count'] = (int)$r->fetchColumn();

        $r = $pdo->prepare('SELECT COUNT(*) FROM saved_posts WHERE user_id=?');
        $r->execute([$uid]);
        $user['saved_posts_count'] = (int)$r->fetchColumn();

        $r = $pdo->prepare('SELECT COALESCE(SUM(votes),0) FROM posts WHERE user_id=?');
        $r->execute([$uid]);
        $user['total_upvotes_received'] = (int)$r->fetchColumn();

        // Count distinct subjects where user has at least one quiz attempt
        $r = $pdo->prepare('SELECT COUNT(DISTINCT q.subject_id) FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id WHERE qa.user_id=?');
        $r->execute([$uid]);
        $user['subjects_completed'] = (int)$r->fetchColumn();

        // Leaderboard rank (by XP within same grade)
        $grade = $user['grade'] ?? '';
        $r = $pdo->prepare("SELECT COUNT(*)+1 FROM users WHERE grade=? AND xp > ? AND id!=? AND role != 'guest'");
        $r->execute([$grade, (int)($user['xp'] ?? 0), $uid]);
        $user['leaderboard_rank'] = (int)$r->fetchColumn();
    } catch (Exception $e) {}
    jsonSuccess($user);
}

/* ── Social Config (public — no secrets) ───────────────────── */
function socialConfig() {
    $googleId  = defined('GOOGLE_CLIENT_ID')   && GOOGLE_CLIENT_ID   !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
                 ? GOOGLE_CLIENT_ID   : null;
    $tgName    = defined('TELEGRAM_BOT_NAME')  && TELEGRAM_BOT_NAME  !== 'YourLearnoraBotUsername'
                 ? TELEGRAM_BOT_NAME  : null;
    // Extract numeric bot ID from token (safe to expose — it's the public part)
    $tgBotId = null;
    if (defined('TELEGRAM_BOT_TOKEN') && TELEGRAM_BOT_TOKEN !== 'YOUR_TELEGRAM_BOT_TOKEN') {
        $parts   = explode(':', TELEGRAM_BOT_TOKEN, 2);
        $tgBotId = intval($parts[0]) ?: null;
    }
    jsonSuccess(['google_client_id' => $googleId, 'telegram_bot_name' => $tgName, 'telegram_bot_id' => $tgBotId]);
}

/* ── Google OAuth ───────────────────────────────────────────── */
function googleOAuth($data) {
    $idToken = trim($data['id_token'] ?? '');
    if (!$idToken) jsonError('Google ID token required');

    if (!defined('GOOGLE_CLIENT_ID') || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com')
        jsonError('Google sign-in is not configured on this server');

    // Verify token with Google's tokeninfo endpoint
    $url  = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken);
    $ctx  = stream_context_create(['http' => ['timeout' => 10, 'ignore_errors' => true]]);
    $resp = @file_get_contents($url, false, $ctx);
    if (!$resp) jsonError('Could not reach Google to verify token');

    $payload = json_decode($resp, true);
    if (!$payload || !empty($payload['error']) || !empty($payload['error_description']))
        jsonError('Invalid Google token: ' . ($payload['error_description'] ?? 'unknown error'));

    // Verify the token was issued for our app
    if (($payload['aud'] ?? '') !== GOOGLE_CLIENT_ID)
        jsonError('Token audience mismatch — wrong Google Client ID');

    $googleId  = $payload['sub']          ?? '';
    $email     = $payload['email']        ?? null;
    $firstName = $payload['given_name']   ?? 'User';
    $lastName  = $payload['family_name']  ?? '';
    $avatarUrl = $payload['picture']      ?? null;
    if (!$googleId) jsonError('Could not extract user ID from Google token');

    $pdo = getDB();

    // 1) Find by google_id
    $stmt = $pdo->prepare('SELECT * FROM users WHERE google_id=?');
    $stmt->execute([$googleId]);
    $user = $stmt->fetch();

    // 2) Link google_id to existing email account
    if (!$user && $email) {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email=?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if ($user) {
            $pdo->prepare('UPDATE users SET google_id=? WHERE id=?')
                ->execute([$googleId, $user['id']]);
            $user['google_id'] = $googleId;
        }
    }

    // 3) Create new user
    if (!$user) {
        $username = generateSocialUsername($pdo, $email ? explode('@', $email)[0] : 'user');
        $pdo->prepare(
            'INSERT INTO users
             (first_name,last_name,username,email,password_hash,grade,xp,level,streak,
              google_id,avatar_url,email_verified,created_at)
             VALUES (?,?,?,?,NULL,?,0,1,0,?,?,1,NOW())'
        )->execute([$firstName, $lastName, $username, $email, '10', $googleId, $avatarUrl]);
        $stmt = $pdo->prepare('SELECT * FROM users WHERE id=?');
        $stmt->execute([$pdo->lastInsertId()]);
        $user = $stmt->fetch();
    }

    return createSessionAndReturn($pdo, $user);
}

/* ── Telegram OAuth ─────────────────────────────────────────── */
function telegramOAuth($data) {
    if (!defined('TELEGRAM_BOT_TOKEN') || TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN')
        jsonError('Telegram sign-in is not configured on this server');

    $hash = $data['hash'] ?? '';
    if (!$hash) jsonError('Missing Telegram auth hash');

    // Build check string (all fields except hash, sorted alphabetically)
    $check = $data;
    unset($check['hash']);
    ksort($check);
    $checkStr = implode("\n", array_map(fn($k,$v) => "$k=$v", array_keys($check), $check));

    // Verify HMAC-SHA256 using SHA256(bot_token) as key
    $secretKey    = hash('sha256', TELEGRAM_BOT_TOKEN, true);
    $expectedHash = hash_hmac('sha256', $checkStr, $secretKey);
    if (!hash_equals($expectedHash, $hash)) jsonError('Invalid Telegram signature');

    // Reject stale auth data (older than 24 h)
    if (abs(time() - intval($data['auth_date'] ?? 0)) > 86400)
        jsonError('Telegram auth data has expired. Please try again.');

    $telegramId = intval($data['id'] ?? 0);
    if (!$telegramId) jsonError('Invalid Telegram user ID');

    $firstName = sanitize($data['first_name'] ?? 'User');
    $lastName  = sanitize($data['last_name']  ?? '');
    $tgUser    = sanitize($data['username']   ?? '');
    $avatarUrl = $data['photo_url'] ?? null;

    $pdo = getDB();

    $stmt = $pdo->prepare('SELECT * FROM users WHERE telegram_id=?');
    $stmt->execute([$telegramId]);
    $user = $stmt->fetch();

    if (!$user) {
        $username = generateSocialUsername($pdo, $tgUser ?: 'user');
        $pdo->prepare(
            'INSERT INTO users
             (first_name,last_name,username,email,password_hash,grade,xp,level,streak,
              telegram_id,avatar_url,email_verified,created_at)
             VALUES (?,?,?,NULL,NULL,?,0,1,0,?,?,1,NOW())'
        )->execute([$firstName, $lastName, $username, '10', $telegramId, $avatarUrl]);
        $stmt = $pdo->prepare('SELECT * FROM users WHERE id=?');
        $stmt->execute([$pdo->lastInsertId()]);
        $user = $stmt->fetch();
    }

    return createSessionAndReturn($pdo, $user);
}

/* ── Shared helpers ─────────────────────────────────────────── */
function generateSocialUsername($pdo, $base) {
    $base = preg_replace('/[^a-zA-Z0-9_]/', '', strtolower($base));
    if (!$base) $base = 'user';
    $candidate = $base;
    for ($i = 1; $i <= 9999; $i++) {
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username=?');
        $stmt->execute([$candidate]);
        if (!$stmt->fetch()) return $candidate;
        $candidate = $base . $i;
    }
    return $base . '_' . substr(uniqid(), -4);
}

function createSessionAndReturn($pdo, $user) {
    $token   = generateToken();
    $expires = date('Y-m-d H:i:s', strtotime('+30 days'));
    $pdo->prepare('DELETE FROM sessions WHERE user_id=? AND expires_at<NOW()')->execute([$user['id']]);
    $pdo->prepare('INSERT INTO sessions (user_id,token,expires_at,created_at) VALUES (?,?,?,NOW())')
        ->execute([$user['id'], $token, $expires]);
    // Expose whether the account has a password so the frontend can
    // conditionally show/hide the "current password" field in settings.
    $user['has_password'] = !empty($user['password_hash']);
    unset($user['password_hash']);
    jsonSuccess(['user' => $user, 'token' => $token]);
}