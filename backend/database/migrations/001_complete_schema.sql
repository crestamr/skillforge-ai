-- Migration 001: Complete SkillForge AI Database Schema
-- Created: 2025-05-31
-- Description: Creates the complete initial database schema for SkillForge AI

BEGIN;

-- Record migration
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_migrations (version, description) 
VALUES ('001', 'Complete SkillForge AI database schema')
ON CONFLICT (version) DO NOTHING;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom enum types
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE skill_category AS ENUM ('technical', 'soft', 'language', 'certification', 'tool', 'framework');
CREATE TYPE assessment_type AS ENUM ('multiple_choice', 'coding', 'practical', 'essay', 'matching');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard', 'expert');
CREATE TYPE question_type AS ENUM ('single_choice', 'multiple_choice', 'true_false', 'coding', 'essay', 'matching');
CREATE TYPE resource_type AS ENUM ('video', 'article', 'course', 'book', 'tutorial', 'documentation', 'podcast');
CREATE TYPE interaction_type AS ENUM ('viewed', 'saved', 'applied', 'shared', 'dismissed');
CREATE TYPE user_role AS ENUM ('user', 'admin', 'enterprise', 'coach');
CREATE TYPE provider_type AS ENUM ('github', 'linkedin', 'google');

-- ================================
-- Core User Management Tables
-- ================================

-- Users table: Core user information and authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    profile_image_url TEXT,
    bio TEXT,
    role user_role DEFAULT 'user',
    account_status account_status DEFAULT 'pending_verification',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_names CHECK (LENGTH(first_name) >= 1 AND LENGTH(last_name) >= 1)
);

-- User social authentication providers
CREATE TABLE user_social_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider provider_type NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one account per provider per user
    UNIQUE(user_id, provider),
    UNIQUE(provider, provider_user_id)
);

-- ================================
-- Skills Management Tables
-- ================================

-- Skills table: Master list of all skills in the platform
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category skill_category NOT NULL,
    level skill_level DEFAULT 'beginner',
    trending_score DECIMAL(5,2) DEFAULT 0.0,
    demand_score DECIMAL(5,2) DEFAULT 0.0,
    salary_impact DECIMAL(10,2) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_trending_score CHECK (trending_score >= 0 AND trending_score <= 100),
    CONSTRAINT valid_demand_score CHECK (demand_score >= 0 AND demand_score <= 100)
);

-- User skills: Relationship between users and their skills
CREATE TABLE user_skills (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    self_rating INTEGER CHECK (self_rating >= 1 AND self_rating <= 10),
    verified_rating INTEGER CHECK (verified_rating >= 1 AND verified_rating <= 10),
    confidence_score DECIMAL(5,2) DEFAULT 0.0,
    years_experience DECIMAL(4,1) DEFAULT 0.0,
    last_assessed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id, skill_id),
    CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- ================================
-- Assessment System Tables
-- ================================

-- Assessments: Skill evaluation tests
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    difficulty difficulty_level NOT NULL,
    time_limit INTEGER, -- in minutes
    passing_score INTEGER DEFAULT 70,
    total_questions INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_passing_score CHECK (passing_score >= 0 AND passing_score <= 100),
    CONSTRAINT valid_time_limit CHECK (time_limit > 0)
);

-- Assessment questions
CREATE TABLE assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    options JSONB, -- For multiple choice questions
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_points CHECK (points > 0),
    UNIQUE(assessment_id, order_index)
);

-- User assessment attempts and results
CREATE TABLE user_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((score::DECIMAL / max_score::DECIMAL) * 100, 2)) STORED,
    passed BOOLEAN GENERATED ALWAYS AS (percentage >= (SELECT passing_score FROM assessments WHERE id = assessment_id)) STORED,
    time_taken INTEGER, -- in seconds
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    answers JSONB, -- Store user answers for review
    
    CONSTRAINT valid_score CHECK (score >= 0 AND score <= max_score),
    CONSTRAINT valid_time_taken CHECK (time_taken > 0),
    CONSTRAINT completed_after_started CHECK (completed_at >= started_at)
);

COMMIT;
