-- PostgreSQL Initialization Script for SkillForge AI
-- This script sets up the initial database structure and configurations

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE assessment_type AS ENUM ('multiple_choice', 'coding', 'essay', 'practical');
CREATE TYPE job_status AS ENUM ('active', 'closed', 'draft');
CREATE TYPE learning_status AS ENUM ('not_started', 'in_progress', 'completed', 'paused');

-- Create indexes for performance
-- These will be created when tables are added

-- Set up database configuration
ALTER DATABASE skillforge_db SET timezone TO 'UTC';

-- Create application user with limited privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'skillforge_app') THEN
        CREATE ROLE skillforge_app WITH LOGIN PASSWORD 'skillforge_app_pass';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE skillforge_db TO skillforge_app;
GRANT USAGE ON SCHEMA public TO skillforge_app;
GRANT CREATE ON SCHEMA public TO skillforge_app;

-- Create audit trigger function for tracking changes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_at = COALESCE(NEW.created_at, NOW());
        NEW.updated_at = NOW();
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Log successful initialization (commented out as pg_stat_statements_info may not exist)
-- INSERT INTO pg_stat_statements_info (dealloc) VALUES (0) ON CONFLICT DO NOTHING;

-- Create a simple health check table
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    status TEXT DEFAULT 'healthy',
    last_check TIMESTAMP DEFAULT NOW()
);

INSERT INTO health_check (status) VALUES ('initialized') ON CONFLICT DO NOTHING;
