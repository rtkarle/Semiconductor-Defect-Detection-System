-- ============================================================
-- Seed / Demo Data
-- ============================================================
USE semiconductor_defect_db;

-- Demo engineer user  (password: Engineer@1234)
INSERT INTO users (full_name, email, hashed_password, role, company, department, is_active, is_verified)
VALUES
('Alice Chen',   'alice@semiconductor-ai.com',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewdnKQ.RNVNkC3ti', 'engineer', 'SemiConductor AI Inc.', 'Quality Control', 1, 1),
('Bob Martinez', 'bob@semiconductor-ai.com',    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewdnKQ.RNVNkC3ti', 'engineer', 'SemiConductor AI Inc.', 'Fabrication',     1, 1),
('Carol White',  'carol@semiconductor-ai.com',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewdnKQ.RNVNkC3ti', 'viewer',   'SemiConductor AI Inc.', 'Management',      1, 1);

-- Demo scans
INSERT INTO scans (user_id, scan_code, image_filename, image_path, image_size_kb, image_width, image_height, status, processing_time_ms)
VALUES
(2, 'SCAN-20240610-0001', 'wafer_001.jpg', 'uploads/wafer_001.jpg', 245.50, 1024, 1024, 'completed', 1230),
(2, 'SCAN-20240611-0002', 'wafer_002.jpg', 'uploads/wafer_002.jpg', 312.80, 1024, 1024, 'completed', 980),
(2, 'SCAN-20240612-0003', 'chip_003.jpg',  'uploads/chip_003.jpg',  198.20, 512,  512,  'completed', 760),
(3, 'SCAN-20240613-0004', 'wafer_004.jpg', 'uploads/wafer_004.jpg', 289.10, 1024, 1024, 'completed', 1100),
(3, 'SCAN-20240614-0005', 'chip_005.jpg',  'uploads/chip_005.jpg',  156.40, 512,  512,  'completed', 690),
(2, 'SCAN-20240615-0006', 'wafer_006.jpg', 'uploads/wafer_006.jpg', 401.30, 2048, 2048, 'completed', 1850),
(2, 'SCAN-20240616-0007', 'chip_007.jpg',  'uploads/chip_007.jpg',  178.90, 512,  512,  'failed',    NULL),
(3, 'SCAN-20240617-0008', 'wafer_008.jpg', 'uploads/wafer_008.jpg', 334.60, 1024, 1024, 'completed', 1420);

-- Demo defects
INSERT INTO defects (scan_id, defect_type, confidence, severity, bbox_x, bbox_y, bbox_width, bbox_height, recommendation)
VALUES
(1, 'scratch',         0.9210, 'medium',   120, 340, 80,  15,  'Inspect stylus pressure and reduce contact force on wafer surface.'),
(1, 'contamination',   0.8750, 'high',     200, 150, 60,  60,  'Clean inspection chamber and production line immediately.'),
(2, 'crack',           0.9540, 'critical', 500, 600, 100, 90,  'Remove wafer from production. Schedule equipment maintenance.'),
(3, 'surface_defect',  0.7830, 'low',      80,  90,  40,  40,  'Monitor this area. Re-inspect after cleaning.'),
(4, 'missing_pattern', 0.9120, 'high',     300, 280, 70,  70,  'Lithography mask alignment check required. Halt batch.'),
(5, 'scratch',         0.8460, 'medium',   60,  120, 55,  12,  'Check handler robot calibration to reduce mechanical scratching.'),
(6, 'contamination',   0.9670, 'critical', 900, 800, 120, 110, 'CRITICAL: Full production line shutdown for deep clean required.'),
(6, 'crack',           0.8910, 'high',     400, 350, 95,  80,  'Remove wafer from production. Schedule equipment maintenance.'),
(8, 'other',           0.7210, 'low',      200, 200, 50,  50,  'Unclassified defect detected. Manual review recommended.');

-- Demo reports
INSERT INTO reports (scan_id, user_id, report_code, report_type, status, generated_at)
VALUES
(1, 2, 'RPT-20240610-0001', 'scan', 'ready', '2024-06-10 10:35:00'),
(2, 2, 'RPT-20240611-0002', 'scan', 'ready', '2024-06-11 14:22:00'),
(4, 3, 'RPT-20240613-0003', 'scan', 'ready', '2024-06-13 09:15:00');

-- Demo notifications
INSERT INTO notifications (user_id, scan_id, type, subject, message, channel, is_read, email_sent)
VALUES
(2, 2, 'critical_defect', 'CRITICAL Defect Detected – SCAN-20240611-0002',
    'A critical crack was detected in scan SCAN-20240611-0002 with 95.4% confidence. Immediate action required.',
    'both', 1, 1),
(2, 6, 'critical_defect', 'CRITICAL Defect Detected – SCAN-20240615-0006',
    'A critical contamination was detected in scan SCAN-20240615-0006 with 96.7% confidence. Full line shutdown recommended.',
    'both', 0, 1),
(2, 1, 'report_ready', 'Report RPT-20240610-0001 is Ready',
    'Your inspection report for scan SCAN-20240610-0001 has been generated and is ready for download.',
    'both', 1, 1),
(3, 4, 'critical_defect', 'HIGH Defect Detected – SCAN-20240613-0004',
    'A high-severity missing pattern defect was detected in scan SCAN-20240613-0004. Batch halt recommended.',
    'both', 0, 0);
