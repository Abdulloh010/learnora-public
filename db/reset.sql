-- ============================================================
-- Learnora · reset.sql
-- Clears ALL user-generated data, keeps tables + structure.
-- Safe to run multiple times (idempotent).
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE notifications;
TRUNCATE TABLE saved_posts;
TRUNCATE TABLE user_achievements;
TRUNCATE TABLE quiz_attempts;
TRUNCATE TABLE post_votes;
TRUNCATE TABLE comments;
TRUNCATE TABLE messages;
TRUNCATE TABLE posts;
TRUNCATE TABLE connections;
TRUNCATE TABLE sessions;
TRUNCATE TABLE users;

-- Keep catalog tables (subjects, quizzes, questions, achievements)
-- so quizzes and badges still work right after reset.
-- Uncomment the lines below if you also want to wipe those:
-- TRUNCATE TABLE questions;
-- TRUNCATE TABLE quizzes;
-- TRUNCATE TABLE subjects;
-- TRUNCATE TABLE achievements;

SET FOREIGN_KEY_CHECKS = 1;

-- ── XP-only reset (keeps all accounts, just zeroes XP scores) ──
-- Uncomment and run this line alone if you only want to reset XP:
-- UPDATE users SET xp = 0;
