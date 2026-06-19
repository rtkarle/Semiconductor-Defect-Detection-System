-- ============================================================
-- AI-Powered Semiconductor Defect Detection System
-- MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS semiconductor_defect_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE semiconductor_defect_db;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(150)        NOT NULL,
    email           VARCHAR(255)        NOT NULL UNIQUE,
    hashed_password VARCHAR(255)        NOT NULL,
    role            ENUM('admin','engineer','viewer') NOT NULL DEFAULT 'engineer',
    company         VARCHAR(200)        DEFAULT NULL,
    department      VARCHAR(200)        DEFAULT NULL,
    phone           VARCHAR(30)         DEFAULT NULL,
    avatar_url      VARCHAR(500)        DEFAULT NULL,
    is_active       TINYINT(1)          NOT NULL DEFAULT 1,
    is_verified     TINYINT(1)          NOT NULL DEFAULT 0,
    reset_token     VARCHAR(255)        DEFAULT NULL,
    reset_token_exp DATETIME            DEFAULT NULL,
    last_login      DATETIME            DEFAULT NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email        (email),
    INDEX idx_role         (role),
    INDEX idx_is_active    (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: scans
-- ============================================================
CREATE TABLE IF NOT EXISTS scans (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED        NOT NULL,
    scan_code       VARCHAR(50)         NOT NULL UNIQUE,   -- e.g. SCAN-20240617-0001
    image_filename  VARCHAR(500)        NOT NULL,
    image_path      VARCHAR(1000)       NOT NULL,
    image_size_kb   DECIMAL(10,2)       DEFAULT NULL,
    image_width     INT                 DEFAULT NULL,
    image_height    INT                 DEFAULT NULL,
    status          ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
    processing_time_ms INT             DEFAULT NULL,
    notes           TEXT                DEFAULT NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id      (user_id),
    INDEX idx_scan_code    (scan_code),
    INDEX idx_status       (status),
    INDEX idx_created_at   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: defects
-- ============================================================
CREATE TABLE IF NOT EXISTS defects (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    scan_id         INT UNSIGNED        NOT NULL,
    defect_type     ENUM(
                        'scratch',
                        'crack',
                        'contamination',
                        'missing_pattern',
                        'surface_defect',
                        'other'
                    ) NOT NULL,
    confidence      DECIMAL(5,4)        NOT NULL,           -- 0.0000 – 1.0000
    severity        ENUM('low','medium','high','critical') NOT NULL,
    bbox_x          INT                 DEFAULT NULL,       -- bounding box top-left x
    bbox_y          INT                 DEFAULT NULL,       -- bounding box top-left y
    bbox_width      INT                 DEFAULT NULL,
    bbox_height     INT                 DEFAULT NULL,
    annotated_image_path VARCHAR(1000)  DEFAULT NULL,       -- image with drawn bbox
    recommendation  TEXT                DEFAULT NULL,
    is_false_positive TINYINT(1)        NOT NULL DEFAULT 0,
    reviewed_by     INT UNSIGNED        DEFAULT NULL,
    reviewed_at     DATETIME            DEFAULT NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id)     REFERENCES scans(id)  ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id)  ON DELETE SET NULL,
    INDEX idx_scan_id      (scan_id),
    INDEX idx_defect_type  (defect_type),
    INDEX idx_severity     (severity),
    INDEX idx_confidence   (confidence),
    INDEX idx_created_at   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: reports
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    scan_id         INT UNSIGNED        NOT NULL,
    user_id         INT UNSIGNED        NOT NULL,
    report_code     VARCHAR(50)         NOT NULL UNIQUE,    -- e.g. RPT-20240617-0001
    report_type     ENUM('scan','weekly','monthly','custom') NOT NULL DEFAULT 'scan',
    file_path       VARCHAR(1000)       DEFAULT NULL,       -- path to generated PDF
    file_size_kb    DECIMAL(10,2)       DEFAULT NULL,
    status          ENUM('generating','ready','failed') NOT NULL DEFAULT 'generating',
    generated_at    DATETIME            DEFAULT NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id)  REFERENCES scans(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_scan_id      (scan_id),
    INDEX idx_user_id      (user_id),
    INDEX idx_report_code  (report_code),
    INDEX idx_status       (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED        NOT NULL,
    scan_id         INT UNSIGNED        DEFAULT NULL,
    report_id       INT UNSIGNED        DEFAULT NULL,
    type            ENUM('critical_defect','report_ready','system','info') NOT NULL,
    subject         VARCHAR(300)        NOT NULL,
    message         TEXT                NOT NULL,
    channel         ENUM('email','in_app','both') NOT NULL DEFAULT 'both',
    is_read         TINYINT(1)          NOT NULL DEFAULT 0,
    email_sent      TINYINT(1)          NOT NULL DEFAULT 0,
    email_sent_at   DATETIME            DEFAULT NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (scan_id)   REFERENCES scans(id)    ON DELETE SET NULL,
    FOREIGN KEY (report_id) REFERENCES reports(id)  ON DELETE SET NULL,
    INDEX idx_user_id      (user_id),
    INDEX idx_type         (type),
    INDEX idx_is_read      (is_read),
    INDEX idx_created_at   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: audit_logs  (optional but production-worthy)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED        DEFAULT NULL,
    action          VARCHAR(100)        NOT NULL,  -- e.g. LOGIN, UPLOAD, DELETE
    entity          VARCHAR(100)        DEFAULT NULL,
    entity_id       INT UNSIGNED        DEFAULT NULL,
    ip_address      VARCHAR(50)         DEFAULT NULL,
    user_agent      VARCHAR(500)        DEFAULT NULL,
    details         JSON                DEFAULT NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id    (user_id),
    INDEX idx_action     (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED: default admin user
-- Password: Admin@1234  (bcrypt hash — change in production!)
-- ============================================================
INSERT INTO users (full_name, email, hashed_password, role, company, is_active, is_verified)
VALUES (
    'System Administrator',
    'admin@semiconductor-ai.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewdnKQ.RNVNkC3ti',
    'admin',
    'SemiConductor AI Inc.',
    1,
    1
);
