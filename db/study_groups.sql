-- Study groups (api/study_groups.php also creates these lazily on first use)

CREATE TABLE IF NOT EXISTS study_groups (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    creator_id  INT UNSIGNED NOT NULL,
    name        VARCHAR(200) NOT NULL,
    description TEXT DEFAULT NULL,
    subject     VARCHAR(100) DEFAULT NULL,
    icon        VARCHAR(10) DEFAULT '📚',
    is_private  TINYINT(1) NOT NULL DEFAULT 0,
    member_count INT UNSIGNED NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_creator (creator_id),
    INDEX idx_subject (subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS study_group_members (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    group_id   INT UNSIGNED NOT NULL,
    user_id    INT UNSIGNED NOT NULL,
    role       ENUM('member','moderator','owner') NOT NULL DEFAULT 'member',
    joined_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_group_user (group_id, user_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS study_group_messages (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    group_id   INT UNSIGNED NOT NULL,
    user_id    INT UNSIGNED NOT NULL,
    content    TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_group (group_id, created_at),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Some older deployments lack users.last_active (auth.php/users.php also add it lazily)
-- ALTER TABLE users ADD COLUMN last_active DATETIME DEFAULT NULL;
