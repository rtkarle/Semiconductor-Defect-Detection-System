-- ============================================================
-- AI-Powered Semiconductor Defect Detection System
-- Production Schema for FreeSQLDatabase (MySQL 5.x compatible)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `full_name`       VARCHAR(150)    NOT NULL,
    `email`           VARCHAR(255)    NOT NULL,
    `hashed_password` VARCHAR(255)    NOT NULL,
    `role`            VARCHAR(20)     NOT NULL DEFAULT 'engineer',
    `company`         VARCHAR(200)    DEFAULT NULL,
    `department`      VARCHAR(200)    DEFAULT NULL,
    `phone`           VARCHAR(30)     DEFAULT NULL,
    `avatar_url`      VARCHAR(500)    DEFAULT NULL,
    `is_active`       TINYINT(1)      NOT NULL DEFAULT 1,
    `is_verified`     TINYINT(1)      NOT NULL DEFAULT 0,
    `reset_token`     VARCHAR(255)    DEFAULT NULL,
    `reset_token_exp` DATETIME        DEFAULT NULL,
    `last_login`      DATETIME        DEFAULT NULL,
    `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_email` (`email`),
    INDEX `idx_email`     (`email`),
    INDEX `idx_role`      (`role`),
    INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: scans
-- ============================================================
CREATE TABLE IF NOT EXISTS `scans` (
    `id`                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id`           INT UNSIGNED     NOT NULL,
    `scan_code`         VARCHAR(50)      NOT NULL,
    `image_filename`    VARCHAR(500)     NOT NULL,
    `image_path`        VARCHAR(1000)    NOT NULL,
    `image_size_kb`     DECIMAL(10,2)    DEFAULT NULL,
    `image_width`       INT              DEFAULT NULL,
    `image_height`      INT              DEFAULT NULL,
    `status`            VARCHAR(20)      NOT NULL DEFAULT 'pending',
    `processing_time_ms` INT            DEFAULT NULL,
    `notes`             TEXT             DEFAULT NULL,
    `created_at`        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_scan_code` (`scan_code`),
    INDEX `idx_user_id`    (`user_id`),
    INDEX `idx_scan_code`  (`scan_code`),
    INDEX `idx_status`     (`status`),
    INDEX `idx_created_at` (`created_at`),
    CONSTRAINT `fk_scans_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: defects
-- ============================================================
CREATE TABLE IF NOT EXISTS `defects` (
    `id`                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `scan_id`              INT UNSIGNED     NOT NULL,
    `defect_type`          VARCHAR(30)      NOT NULL,
    `confidence`           DECIMAL(5,4)     NOT NULL,
    `severity`             VARCHAR(20)      NOT NULL,
    `bbox_x`               INT              DEFAULT NULL,
    `bbox_y`               INT              DEFAULT NULL,
    `bbox_width`           INT              DEFAULT NULL,
    `bbox_height`          INT              DEFAULT NULL,
    `annotated_image_path` VARCHAR(1000)    DEFAULT NULL,
    `recommendation`       TEXT             DEFAULT NULL,
    `is_false_positive`    TINYINT(1)       NOT NULL DEFAULT 0,
    `reviewed_by`          INT UNSIGNED     DEFAULT NULL,
    `reviewed_at`          DATETIME         DEFAULT NULL,
    `created_at`           DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_scan_id`     (`scan_id`),
    INDEX `idx_defect_type` (`defect_type`),
    INDEX `idx_severity`    (`severity`),
    INDEX `idx_created_at`  (`created_at`),
    CONSTRAINT `fk_defects_scan`   FOREIGN KEY (`scan_id`)     REFERENCES `scans`(`id`)  ON DELETE CASCADE,
    CONSTRAINT `fk_defects_review` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: reports
-- ============================================================
CREATE TABLE IF NOT EXISTS `reports` (
    `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `scan_id`      INT UNSIGNED     NOT NULL,
    `user_id`      INT UNSIGNED     NOT NULL,
    `report_code`  VARCHAR(50)      NOT NULL,
    `report_type`  VARCHAR(20)      NOT NULL DEFAULT 'scan',
    `file_path`    VARCHAR(1000)    DEFAULT NULL,
    `file_size_kb` DECIMAL(10,2)   DEFAULT NULL,
    `status`       VARCHAR(20)      NOT NULL DEFAULT 'generating',
    `generated_at` DATETIME         DEFAULT NULL,
    `created_at`   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_report_code` (`report_code`),
    INDEX `idx_scan_id`     (`scan_id`),
    INDEX `idx_user_id`     (`user_id`),
    INDEX `idx_report_code` (`report_code`),
    INDEX `idx_status`      (`status`),
    CONSTRAINT `fk_reports_scan` FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS `notifications` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id`       INT UNSIGNED     NOT NULL,
    `scan_id`       INT UNSIGNED     DEFAULT NULL,
    `report_id`     INT UNSIGNED     DEFAULT NULL,
    `type`          VARCHAR(30)      NOT NULL,
    `subject`       VARCHAR(300)     NOT NULL,
    `message`       TEXT             NOT NULL,
    `channel`       VARCHAR(20)      NOT NULL DEFAULT 'both',
    `is_read`       TINYINT(1)       NOT NULL DEFAULT 0,
    `email_sent`    TINYINT(1)       NOT NULL DEFAULT 0,
    `email_sent_at` DATETIME         DEFAULT NULL,
    `created_at`    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_id`    (`user_id`),
    INDEX `idx_type`       (`type`),
    INDEX `idx_is_read`    (`is_read`),
    INDEX `idx_created_at` (`created_at`),
    CONSTRAINT `fk_notif_user`   FOREIGN KEY (`user_id`)   REFERENCES `users`(`id`)   ON DELETE CASCADE,
    CONSTRAINT `fk_notif_scan`   FOREIGN KEY (`scan_id`)   REFERENCES `scans`(`id`)   ON DELETE SET NULL,
    CONSTRAINT `fk_notif_report` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id`    INT UNSIGNED    DEFAULT NULL,
    `action`     VARCHAR(100)    NOT NULL,
    `entity`     VARCHAR(100)    DEFAULT NULL,
    `entity_id`  INT UNSIGNED    DEFAULT NULL,
    `ip_address` VARCHAR(50)     DEFAULT NULL,
    `user_agent` VARCHAR(500)    DEFAULT NULL,
    `details`    TEXT            DEFAULT NULL,
    `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_id`    (`user_id`),
    INDEX `idx_action`     (`action`),
    INDEX `idx_created_at` (`created_at`),
    CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SEED: Default admin user
-- Password: Admin@1234 (bcrypt hash)
-- ============================================================
INSERT IGNORE INTO `users`
    (`full_name`, `email`, `hashed_password`, `role`, `company`, `is_active`, `is_verified`)
VALUES
    ('System Administrator', 'admin@semiconductor-ai.com',
     '$2b$12$0DvDsfbbyP2T48uz3as9tOj/noYs.bYEzrR.kIlZfE3xZlSqMTt.m',
     'admin', 'SemiConductor AI Inc.', 1, 1),
    ('Alice Chen', 'alice@semiconductor-ai.com',
     '$2b$12$0DvDsfbbyP2T48uz3as9tOj/noYs.bYEzrR.kIlZfE3xZlSqMTt.m',
     'engineer', 'SemiConductor AI Inc.', 1, 1),
    ('Carol White', 'carol@semiconductor-ai.com',
     '$2b$12$0DvDsfbbyP2T48uz3as9tOj/noYs.bYEzrR.kIlZfE3xZlSqMTt.m',
     'viewer', 'SemiConductor AI Inc.', 1, 1);
