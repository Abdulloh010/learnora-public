-- ================================================================
-- Community Quizzes & Game Sessions Migration
-- Run this after schema.sql
-- ================================================================

-- User-created (community) quizzes
CREATE TABLE IF NOT EXISTS community_quizzes (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    creator_id    INT NOT NULL,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    subject_id    INT DEFAULT NULL,
    subject_tag   VARCHAR(80) DEFAULT NULL,  -- free-text tag if no subject match
    difficulty    ENUM('easy','medium','hard') DEFAULT 'medium',
    is_public     TINYINT(1) DEFAULT 1,
    play_count    INT DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    INDEX idx_creator (creator_id),
    INDEX idx_public  (is_public, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Questions for community quizzes
CREATE TABLE IF NOT EXISTS community_questions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id         INT NOT NULL,
    question_text   TEXT NOT NULL,
    option_a        VARCHAR(500) NOT NULL,
    option_b        VARCHAR(500) NOT NULL,
    option_c        VARCHAR(500) DEFAULT NULL,
    option_d        VARCHAR(500) DEFAULT NULL,
    correct_answer  ENUM('a','b','c','d') NOT NULL,
    time_limit      SMALLINT DEFAULT 20,  -- seconds per question for live games
    order_num       SMALLINT DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES community_quizzes(id) ON DELETE CASCADE,
    INDEX idx_quiz (quiz_id, order_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Live game sessions (like Blooket/Gimkit rooms)
CREATE TABLE IF NOT EXISTS game_sessions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id       INT NOT NULL,           -- community_quizzes.id
    host_id       INT NOT NULL,           -- users.id
    pin           VARCHAR(10) NOT NULL UNIQUE,
    game_mode     ENUM('classic','blitz','survival','team') DEFAULT 'classic',
    status        ENUM('lobby','active','finished') DEFAULT 'lobby',
    current_q     SMALLINT DEFAULT 0,
    started_at    DATETIME DEFAULT NULL,
    finished_at   DATETIME DEFAULT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id)  REFERENCES community_quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (host_id)  REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_pin    (pin),
    INDEX idx_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Players in a live game
CREATE TABLE IF NOT EXISTS game_participants (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    session_id  INT NOT NULL,
    user_id     INT DEFAULT NULL,       -- NULL = anonymous guest
    nickname    VARCHAR(60) NOT NULL,
    score       INT DEFAULT 0,
    streak      SMALLINT DEFAULT 0,
    correct     SMALLINT DEFAULT 0,
    total       SMALLINT DEFAULT 0,
    joined_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_session (session_id, score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-question answers in a live game (for analysis / answer reveals)
CREATE TABLE IF NOT EXISTS game_answers (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    session_id     INT NOT NULL,
    participant_id INT NOT NULL,
    question_id    INT NOT NULL,
    answer         ENUM('a','b','c','d') DEFAULT NULL,
    is_correct     TINYINT(1) DEFAULT 0,
    time_taken_ms  INT DEFAULT 0,
    answered_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id)     REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES game_participants(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id)    REFERENCES community_questions(id) ON DELETE CASCADE,
    UNIQUE KEY uq_answer (session_id, participant_id, question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
