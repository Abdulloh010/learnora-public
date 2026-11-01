-- USE your_database_name;
CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    first_name    VARCHAR(50)  NOT NULL,
    last_name     VARCHAR(50)  NOT NULL,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    grade         VARCHAR(20)  NOT NULL DEFAULT '10',
    bio           TEXT,
    location      VARCHAR(100),
    avatar_url    VARCHAR(255),
    xp            INT NOT NULL DEFAULT 0,
    level         INT NOT NULL DEFAULT 1,
    streak        INT NOT NULL DEFAULT 0,
    last_active   DATETIME,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_xp (xp),
    INDEX idx_grade (grade)
);

CREATE TABLE sessions (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT         NOT NULL,
    token      VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME    NOT NULL,
    created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token)
);

CREATE TABLE connections (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    receiver_id  INT NOT NULL,
    status       ENUM('pending','accepted','blocked') NOT NULL DEFAULT 'pending',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id)  REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_connection (requester_id, receiver_id),
    INDEX idx_receiver (receiver_id)
);

CREATE TABLE posts (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL,
    title       VARCHAR(255) NOT NULL,
    content     TEXT         NOT NULL,
    post_type   ENUM('general','notes','question','resource','discussion') NOT NULL DEFAULT 'general',
    subject     VARCHAR(50),
    grade_range VARCHAR(20),
    upvotes     INT NOT NULL DEFAULT 0,
    downvotes   INT NOT NULL DEFAULT 0,
    views       INT NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_subject (subject),
    INDEX idx_post_type (post_type),
    INDEX idx_created (created_at)
);

CREATE TABLE post_votes (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    post_id    INT NOT NULL,
    user_id    INT NOT NULL,
    vote_type  ENUM('up','down') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id)  ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)  ON DELETE CASCADE,
    UNIQUE KEY uniq_vote (post_id, user_id)
);

CREATE TABLE comments (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    post_id    INT  NOT NULL,
    user_id    INT  NOT NULL,
    parent_id  INT  DEFAULT NULL,
    content    TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id)   REFERENCES posts(id)    ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL,
    INDEX idx_post (post_id)
);

CREATE TABLE messages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    sender_id   INT     NOT NULL,
    receiver_id INT     NOT NULL,
    content     TEXT    NOT NULL,
    is_read     TINYINT NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_thread (sender_id, receiver_id),
    INDEX idx_unread (receiver_id, is_read)
);

CREATE TABLE subjects (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(50)  NOT NULL UNIQUE,
    icon        VARCHAR(50),
    color       VARCHAR(20),
    description TEXT
);

CREATE TABLE quizzes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    subject_id  INT          NOT NULL,
    grade_range VARCHAR(20),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty  ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
    xp_reward   INT     NOT NULL DEFAULT 50,
    time_limit  INT     DEFAULT 300,
    is_active   TINYINT NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    INDEX idx_subject (subject_id),
    INDEX idx_grade (grade_range)
);

CREATE TABLE questions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id        INT  NOT NULL,
    question_text  TEXT NOT NULL,
    option_a       TEXT NOT NULL,
    option_b       TEXT NOT NULL,
    option_c       TEXT NOT NULL,
    option_d       TEXT NOT NULL,
    correct_answer ENUM('a','b','c','d') NOT NULL,
    explanation    TEXT,
    order_num      INT NOT NULL DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    INDEX idx_quiz (quiz_id)
);

CREATE TABLE quiz_attempts (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    quiz_id         INT NOT NULL,
    score           INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    xp_earned       INT NOT NULL DEFAULT 0,
    time_taken      INT DEFAULT NULL,
    completed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_quiz (quiz_id)
);

CREATE TABLE achievements (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    icon        VARCHAR(50),
    xp_required INT NOT NULL DEFAULT 0,
    badge_type  VARCHAR(50)
);

CREATE TABLE user_achievements (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    achievement_id INT NOT NULL,
    earned_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)        REFERENCES users(id)        ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_ua (user_id, achievement_id)
);

CREATE TABLE notifications (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    actor_id     INT DEFAULT NULL,
    type         VARCHAR(50) NOT NULL,
    reference_id INT DEFAULT NULL,
    content      TEXT,
    is_read      TINYINT NOT NULL DEFAULT 0,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read)
);

CREATE TABLE saved_posts (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    post_id    INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_saved (user_id, post_id)
);

-- ── Teacher platform & JaaS video sessions ─────────────────────

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role                VARCHAR(50)  NOT NULL DEFAULT 'student',
    ADD COLUMN IF NOT EXISTS approved_subjects   TEXT         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS public_bio          TEXT         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS current_status      VARCHAR(100) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS standardized_tests  TEXT         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS test_subjects       TEXT         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS preferred_timezone  VARCHAR(100) NOT NULL DEFAULT 'UTC';

CREATE TABLE IF NOT EXISTS teacher_applications (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    user_id            INT NOT NULL,
    full_name          VARCHAR(150) NOT NULL,
    age                INT,
    location           VARCHAR(150),
    public_bio         TEXT,
    current_status     VARCHAR(100),
    standardized_tests TEXT,
    test_subjects      TEXT,
    test_scores        TEXT,
    subjects_to_teach  TEXT,
    id_document_url    VARCHAR(1000),
    video_pitch_url    VARCHAR(1000),
    status             VARCHAR(30) NOT NULL DEFAULT 'pending',
    admin_notes        TEXT,
    submitted_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at        DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_user   (user_id)
);

CREATE TABLE IF NOT EXISTS teaching_sessions (
    id                       INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id               INT NOT NULL,
    title                    VARCHAR(255) NOT NULL,
    subject                  VARCHAR(100) NOT NULL,
    description              TEXT,
    scheduled_at             DATETIME NOT NULL,
    duration_minutes         INT NOT NULL DEFAULT 60,
    meeting_link             VARCHAR(1000),
    max_students             INT NOT NULL DEFAULT 20,
    status                   VARCHAR(30) NOT NULL DEFAULT 'upcoming',
    jitsi_room_id            VARCHAR(200) DEFAULT NULL,
    started_at               DATETIME DEFAULT NULL,
    ended_at                 DATETIME DEFAULT NULL,
    intro_question           TEXT DEFAULT NULL,
    attendance_reported_at   DATETIME DEFAULT NULL,
    session_timezone         VARCHAR(100) NOT NULL DEFAULT 'UTC',
    created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_teacher   (teacher_id),
    INDEX idx_status    (status),
    INDEX idx_scheduled (scheduled_at)
);

CREATE TABLE IF NOT EXISTS session_registrations (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    session_id    INT NOT NULL,
    student_id    INT NOT NULL,
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attended      TINYINT  NOT NULL DEFAULT 0,
    xp_awarded    TINYINT  NOT NULL DEFAULT 0,
    intro_answer  TEXT     DEFAULT NULL,
    reminder_sent TINYINT  NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES teaching_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id)             ON DELETE CASCADE,
    UNIQUE KEY uniq_reg (session_id, student_id)
);

CREATE TABLE IF NOT EXISTS session_feedback (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    session_id    INT NOT NULL,
    from_user_id  INT NOT NULL,
    to_user_id    INT NOT NULL,
    feedback_type VARCHAR(30) NOT NULL,
    rating        TINYINT DEFAULT NULL,
    review        TEXT,
    xp_awarded    TINYINT NOT NULL DEFAULT 0,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id)   REFERENCES teaching_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (from_user_id) REFERENCES users(id)              ON DELETE CASCADE,
    FOREIGN KEY (to_user_id)   REFERENCES users(id)              ON DELETE CASCADE,
    UNIQUE KEY uniq_feedback (session_id, from_user_id, feedback_type)
);

CREATE TABLE IF NOT EXISTS xp_transactions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    amount         INT NOT NULL,
    reason         VARCHAR(255) NOT NULL,
    reference_type VARCHAR(50) DEFAULT NULL,
    reference_id   INT         DEFAULT NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
);

-- ── Courses (multi-session series) ──────────────────────────────

CREATE TABLE IF NOT EXISTS courses (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id       INT NOT NULL,
    title            VARCHAR(255) NOT NULL,
    subject          VARCHAR(100) NOT NULL,
    description      TEXT,
    total_sessions   INT NOT NULL DEFAULT 1,
    max_students     INT NOT NULL DEFAULT 20,
    status           VARCHAR(30) NOT NULL DEFAULT 'upcoming',
    intro_question   TEXT DEFAULT NULL,
    session_timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_teacher (teacher_id),
    INDEX idx_status  (status)
);

CREATE TABLE IF NOT EXISTS course_registrations (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    course_id     INT NOT NULL,
    student_id    INT NOT NULL,
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    intro_answer  TEXT DEFAULT NULL,
    FOREIGN KEY (course_id)  REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id)   ON DELETE CASCADE,
    UNIQUE KEY uniq_course_reg (course_id, student_id)
);

-- ── Flashcard decks & cards ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS flashcard_decks (
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
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    INDEX idx_creator (creator_id),
    INDEX idx_visibility (visibility),
    INDEX idx_official (is_official),
    INDEX idx_subject (subject_id),
    INDEX idx_popular (times_studied)
);

CREATE TABLE IF NOT EXISTS flashcard_cards (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    deck_id    INT NOT NULL,
    front      TEXT NOT NULL,
    back       TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    INDEX idx_deck (deck_id)
);

CREATE TABLE IF NOT EXISTS flashcard_study_sessions (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    deck_id          INT NOT NULL,
    cards_studied    INT NOT NULL DEFAULT 0,
    cards_known      INT NOT NULL DEFAULT 0,
    cards_learning   INT NOT NULL DEFAULT 0,
    xp_earned        INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 0,
    completed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_deck (deck_id)
);

CREATE TABLE IF NOT EXISTS flashcard_card_progress (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    card_id     INT NOT NULL,
    confidence  TINYINT NOT NULL DEFAULT 0,
    times_seen  INT NOT NULL DEFAULT 0,
    last_seen   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES flashcard_cards(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_user_card (user_id, card_id),
    INDEX idx_user (user_id)
);

-- ── Pomodoro sessions ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 25,
    mode             ENUM('work','short_break','long_break') NOT NULL DEFAULT 'work',
    completed        TINYINT NOT NULL DEFAULT 1,
    xp_earned        INT NOT NULL DEFAULT 0,
    completed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_completed_at (completed_at)
);

-- ── Instant help queue (JaaS 1-on-1 video) ─────────────────────

CREATE TABLE IF NOT EXISTS help_requests (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    learner_id    INT NOT NULL,
    subject       VARCHAR(100) NOT NULL,
    topic         VARCHAR(200) NOT NULL,
    description   TEXT,
    status        ENUM('open','accepted','ended','expired') NOT NULL DEFAULT 'open',
    accepted_by   INT DEFAULT NULL,
    jitsi_room_id VARCHAR(200) DEFAULT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at   DATETIME DEFAULT NULL,
    ended_at      DATETIME DEFAULT NULL,
    FOREIGN KEY (learner_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status  (status),
    INDEX idx_created (created_at)
);