-- Migration 001: Initial Schema
-- Run after creating the database with schema.sql
-- This file is kept for Alembic-style tracking

-- Version: 1.0.0
-- Date: 2024-06-17
-- Description: Create all initial tables for the semiconductor defect detection system

-- Tables created:
--   users, scans, defects, reports, notifications, audit_logs

-- To apply: mysql -u root -p semiconductor_defect_db < 001_initial_schema.sql
-- (This migration is embedded in schema.sql — no separate DDL needed here)

SELECT 'Migration 001 applied successfully' AS status;
