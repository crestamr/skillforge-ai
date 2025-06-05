-- Migration 002: Learning Paths and Job Market Tables
-- Created: 2025-05-31
-- Description: Creates learning paths, job postings, and related tables

BEGIN;

INSERT INTO schema_migrations (version, description) 
VALUES ('002', 'Learning paths and job market tables')
ON CONFLICT (version) DO NOTHING;

-- ================================
-- Learning Paths and Resources
-- ================================

-- Learning paths: Structured skill development journeys
CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_duration INTEGER, -- in hours
    difficulty difficulty_level NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_duration CHECK (estimated_duration > 0)
);

-- Skills required for learning paths
CREATE TABLE learning_path_skills (
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    required_hours INTEGER DEFAULT 0,
    is_prerequisite BOOLEAN DEFAULT FALSE,
    
    PRIMARY KEY (learning_path_id, skill_id),
    CONSTRAINT valid_order CHECK (order_index >= 0),
    CONSTRAINT valid_required_hours CHECK (required_hours >= 0)
);

-- User progress on learning paths
CREATE TABLE user_learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) DEFAULT 0.0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, learning_path_id),
    CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT completed_after_started CHECK (completed_at IS NULL OR completed_at >= started_at)
);

-- Learning resources: External content for skill development
CREATE TABLE learning_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    resource_type resource_type NOT NULL,
    provider VARCHAR(255),
    duration INTEGER, -- in minutes
    difficulty difficulty_level,
    rating DECIMAL(3,2),
    review_count INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT TRUE,
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    learning_path_id UUID REFERENCES learning_paths(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_url CHECK (url ~* '^https?://'),
    CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5),
    CONSTRAINT valid_price CHECK (price >= 0)
);

-- User activity on learning resources
CREATE TABLE user_learning_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) DEFAULT 0.0,
    time_spent INTEGER DEFAULT 0, -- in minutes
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, resource_id),
    CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT valid_time_spent CHECK (time_spent >= 0)
);

-- ================================
-- Job Market and Career Tables
-- ================================

-- Job postings: Available positions in the market
CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    remote_type VARCHAR(50), -- 'remote', 'hybrid', 'onsite'
    employment_type VARCHAR(50) DEFAULT 'full_time', -- 'full_time', 'part_time', 'contract', 'internship'
    description TEXT,
    requirements JSONB, -- Structured requirements including skills, experience, education
    responsibilities JSONB, -- Job responsibilities and duties
    benefits JSONB, -- Benefits and perks
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    salary_currency VARCHAR(3) DEFAULT 'USD',
    experience_min INTEGER DEFAULT 0, -- minimum years of experience
    experience_max INTEGER, -- maximum years of experience
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    source_url TEXT,
    source_platform VARCHAR(100), -- 'linkedin', 'indeed', 'glassdoor', etc.
    is_active BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_salary_range CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max),
    CONSTRAINT valid_experience_range CHECK (experience_min >= 0 AND (experience_max IS NULL OR experience_max >= experience_min)),
    CONSTRAINT valid_posted_date CHECK (posted_at <= CURRENT_TIMESTAMP),
    CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > posted_at)
);

-- Skills required for job postings
CREATE TABLE job_posting_skills (
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,
    importance_score INTEGER DEFAULT 5, -- 1-10 scale
    years_required DECIMAL(3,1) DEFAULT 0,
    
    PRIMARY KEY (job_posting_id, skill_id),
    CONSTRAINT valid_importance CHECK (importance_score >= 1 AND importance_score <= 10),
    CONSTRAINT valid_years_required CHECK (years_required >= 0)
);

-- User interactions with job postings
CREATE TABLE user_job_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    interaction_type interaction_type NOT NULL,
    match_score DECIMAL(5,2), -- AI-calculated match score
    skill_gap_analysis JSONB, -- Detailed analysis of skill gaps
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT, -- User notes about the job
    
    CONSTRAINT valid_match_score CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100))
);

-- Industry trends and market intelligence
CREATE TABLE industry_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'technology', 'skill', 'company', 'role', etc.
    sentiment_score DECIMAL(5,2) NOT NULL, -- -100 to +100
    volume INTEGER DEFAULT 0, -- Number of mentions/occurrences
    growth_rate DECIMAL(5,2), -- Percentage growth rate
    geographic_region VARCHAR(100),
    industry_sector VARCHAR(100),
    data_source VARCHAR(100), -- 'twitter', 'linkedin', 'news', 'job_postings'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    validity_period INTERVAL DEFAULT INTERVAL '7 days',
    raw_data JSONB, -- Store raw data for analysis
    
    CONSTRAINT valid_sentiment CHECK (sentiment_score >= -100 AND sentiment_score <= 100),
    CONSTRAINT valid_volume CHECK (volume >= 0),
    CONSTRAINT valid_growth_rate CHECK (growth_rate >= -100)
);

COMMIT;
