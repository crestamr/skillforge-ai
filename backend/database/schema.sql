-- SkillForge AI PostgreSQL Database Schema
-- Comprehensive schema for intelligent career development platform
-- Created: 2025-05-31

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

-- ================================
-- Performance Indexes
-- ================================

-- User table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login);

-- User social auth indexes
CREATE INDEX idx_user_social_auth_user_id ON user_social_auth(user_id);
CREATE INDEX idx_user_social_auth_provider ON user_social_auth(provider, provider_user_id);

-- Skills indexes
CREATE INDEX idx_skills_name ON skills USING gin(name gin_trgm_ops);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_trending_score ON skills(trending_score DESC);
CREATE INDEX idx_skills_demand_score ON skills(demand_score DESC);
CREATE INDEX idx_skills_active ON skills(is_active) WHERE is_active = TRUE;

-- User skills indexes
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_user_skills_verified_rating ON user_skills(verified_rating DESC);
CREATE INDEX idx_user_skills_last_assessed ON user_skills(last_assessed);

-- Assessment indexes
CREATE INDEX idx_assessments_skill_id ON assessments(skill_id);
CREATE INDEX idx_assessments_difficulty ON assessments(difficulty);
CREATE INDEX idx_assessments_active ON assessments(is_active) WHERE is_active = TRUE;

-- Assessment questions indexes
CREATE INDEX idx_assessment_questions_assessment_id ON assessment_questions(assessment_id);
CREATE INDEX idx_assessment_questions_order ON assessment_questions(assessment_id, order_index);

-- User assessments indexes
CREATE INDEX idx_user_assessments_user_id ON user_assessments(user_id);
CREATE INDEX idx_user_assessments_assessment_id ON user_assessments(assessment_id);
CREATE INDEX idx_user_assessments_completed_at ON user_assessments(completed_at);
CREATE INDEX idx_user_assessments_score ON user_assessments(percentage DESC);

-- Learning paths indexes
CREATE INDEX idx_learning_paths_difficulty ON learning_paths(difficulty);
CREATE INDEX idx_learning_paths_featured ON learning_paths(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_learning_paths_active ON learning_paths(is_active) WHERE is_active = TRUE;

-- Learning path skills indexes
CREATE INDEX idx_learning_path_skills_path_id ON learning_path_skills(learning_path_id);
CREATE INDEX idx_learning_path_skills_skill_id ON learning_path_skills(skill_id);
CREATE INDEX idx_learning_path_skills_order ON learning_path_skills(learning_path_id, order_index);

-- User learning paths indexes
CREATE INDEX idx_user_learning_paths_user_id ON user_learning_paths(user_id);
CREATE INDEX idx_user_learning_paths_path_id ON user_learning_paths(learning_path_id);
CREATE INDEX idx_user_learning_paths_progress ON user_learning_paths(progress_percentage);
CREATE INDEX idx_user_learning_paths_activity ON user_learning_paths(last_activity);

-- Learning resources indexes
CREATE INDEX idx_learning_resources_skill_id ON learning_resources(skill_id);
CREATE INDEX idx_learning_resources_path_id ON learning_resources(learning_path_id);
CREATE INDEX idx_learning_resources_type ON learning_resources(resource_type);
CREATE INDEX idx_learning_resources_rating ON learning_resources(rating DESC);
CREATE INDEX idx_learning_resources_active ON learning_resources(is_active) WHERE is_active = TRUE;

-- User learning activity indexes
CREATE INDEX idx_user_learning_activity_user_id ON user_learning_activity(user_id);
CREATE INDEX idx_user_learning_activity_resource_id ON user_learning_activity(resource_id);
CREATE INDEX idx_user_learning_activity_progress ON user_learning_activity(progress_percentage);
CREATE INDEX idx_user_learning_activity_accessed ON user_learning_activity(last_accessed);

-- Job postings indexes
CREATE INDEX idx_job_postings_title ON job_postings USING gin(title gin_trgm_ops);
CREATE INDEX idx_job_postings_company ON job_postings(company);
CREATE INDEX idx_job_postings_location ON job_postings(location);
CREATE INDEX idx_job_postings_remote_type ON job_postings(remote_type);
CREATE INDEX idx_job_postings_employment_type ON job_postings(employment_type);
CREATE INDEX idx_job_postings_posted_at ON job_postings(posted_at DESC);
CREATE INDEX idx_job_postings_salary_range ON job_postings(salary_min, salary_max);
CREATE INDEX idx_job_postings_experience ON job_postings(experience_min, experience_max);
CREATE INDEX idx_job_postings_active ON job_postings(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_job_postings_source ON job_postings(source_platform);

-- Job posting skills indexes
CREATE INDEX idx_job_posting_skills_job_id ON job_posting_skills(job_posting_id);
CREATE INDEX idx_job_posting_skills_skill_id ON job_posting_skills(skill_id);
CREATE INDEX idx_job_posting_skills_required ON job_posting_skills(is_required) WHERE is_required = TRUE;
CREATE INDEX idx_job_posting_skills_importance ON job_posting_skills(importance_score DESC);

-- User job interactions indexes
CREATE INDEX idx_user_job_interactions_user_id ON user_job_interactions(user_id);
CREATE INDEX idx_user_job_interactions_job_id ON user_job_interactions(job_posting_id);
CREATE INDEX idx_user_job_interactions_type ON user_job_interactions(interaction_type);
CREATE INDEX idx_user_job_interactions_timestamp ON user_job_interactions(timestamp DESC);
CREATE INDEX idx_user_job_interactions_match_score ON user_job_interactions(match_score DESC);

-- Industry trends indexes
CREATE INDEX idx_industry_trends_keyword ON industry_trends(keyword);
CREATE INDEX idx_industry_trends_category ON industry_trends(category);
CREATE INDEX idx_industry_trends_sentiment ON industry_trends(sentiment_score DESC);
CREATE INDEX idx_industry_trends_volume ON industry_trends(volume DESC);
CREATE INDEX idx_industry_trends_timestamp ON industry_trends(timestamp DESC);
CREATE INDEX idx_industry_trends_region ON industry_trends(geographic_region);
CREATE INDEX idx_industry_trends_sector ON industry_trends(industry_sector);
CREATE INDEX idx_industry_trends_source ON industry_trends(data_source);

-- Composite indexes for common queries
CREATE INDEX idx_user_skills_rating_assessed ON user_skills(user_id, verified_rating DESC, last_assessed DESC);
CREATE INDEX idx_job_postings_location_salary ON job_postings(location, salary_min DESC) WHERE is_active = TRUE;
CREATE INDEX idx_user_assessments_user_recent ON user_assessments(user_id, completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_learning_resources_skill_rating ON learning_resources(skill_id, rating DESC) WHERE is_active = TRUE;

-- ================================
-- Useful Views for Common Queries
-- ================================

-- User profile summary with skill counts and assessment stats
CREATE VIEW user_profile_summary AS
SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.account_status,
    u.created_at,
    u.last_login,
    COUNT(DISTINCT us.skill_id) as total_skills,
    COUNT(DISTINCT CASE WHEN us.verified_rating >= 7 THEN us.skill_id END) as expert_skills,
    COUNT(DISTINCT ua.assessment_id) as assessments_taken,
    COUNT(DISTINCT CASE WHEN ua.passed THEN ua.assessment_id END) as assessments_passed,
    AVG(ua.percentage) as avg_assessment_score,
    COUNT(DISTINCT ulp.learning_path_id) as learning_paths_enrolled,
    COUNT(DISTINCT CASE WHEN ulp.completed_at IS NOT NULL THEN ulp.learning_path_id END) as learning_paths_completed
FROM users u
LEFT JOIN user_skills us ON u.id = us.user_id
LEFT JOIN user_assessments ua ON u.id = ua.user_id AND ua.completed_at IS NOT NULL
LEFT JOIN user_learning_paths ulp ON u.id = ulp.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name, u.account_status, u.created_at, u.last_login;

-- Trending skills with market demand
CREATE VIEW trending_skills AS
SELECT
    s.id,
    s.name,
    s.category,
    s.trending_score,
    s.demand_score,
    s.salary_impact,
    COUNT(DISTINCT us.user_id) as users_with_skill,
    COUNT(DISTINCT jps.job_posting_id) as jobs_requiring_skill,
    AVG(us.verified_rating) as avg_user_rating,
    COUNT(DISTINCT a.id) as available_assessments
FROM skills s
LEFT JOIN user_skills us ON s.id = us.skill_id
LEFT JOIN job_posting_skills jps ON s.id = jps.skill_id
LEFT JOIN assessments a ON s.id = a.skill_id AND a.is_active = TRUE
WHERE s.is_active = TRUE
GROUP BY s.id, s.name, s.category, s.trending_score, s.demand_score, s.salary_impact
ORDER BY s.trending_score DESC, s.demand_score DESC;

-- Job market insights by location and skill
CREATE VIEW job_market_insights AS
SELECT
    jp.location,
    s.name as skill_name,
    s.category as skill_category,
    COUNT(DISTINCT jp.id) as job_count,
    AVG(jp.salary_min) as avg_salary_min,
    AVG(jp.salary_max) as avg_salary_max,
    AVG(jps.importance_score) as avg_importance,
    COUNT(DISTINCT CASE WHEN jps.is_required THEN jp.id END) as required_jobs,
    AVG(jp.experience_min) as avg_experience_required
FROM job_postings jp
JOIN job_posting_skills jps ON jp.id = jps.job_posting_id
JOIN skills s ON jps.skill_id = s.id
WHERE jp.is_active = TRUE AND jp.posted_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY jp.location, s.name, s.category
HAVING COUNT(DISTINCT jp.id) >= 5
ORDER BY jp.location, job_count DESC;

-- ================================
-- Functions and Triggers
-- ================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_social_auth_updated_at BEFORE UPDATE ON user_social_auth
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_skills_updated_at BEFORE UPDATE ON user_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON learning_paths
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_resources_updated_at BEFORE UPDATE ON learning_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON job_postings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update assessment question count
CREATE OR REPLACE FUNCTION update_assessment_question_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE assessments
        SET total_questions = total_questions + 1
        WHERE id = NEW.assessment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE assessments
        SET total_questions = total_questions - 1
        WHERE id = OLD.assessment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger to maintain assessment question count
CREATE TRIGGER update_assessment_question_count_trigger
    AFTER INSERT OR DELETE ON assessment_questions
    FOR EACH ROW EXECUTE FUNCTION update_assessment_question_count();

-- Function to update job posting view count
CREATE OR REPLACE FUNCTION increment_job_view_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.interaction_type = 'viewed' THEN
        UPDATE job_postings
        SET view_count = view_count + 1
        WHERE id = NEW.job_posting_id;
    ELSIF NEW.interaction_type = 'applied' THEN
        UPDATE job_postings
        SET application_count = application_count + 1
        WHERE id = NEW.job_posting_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update job posting statistics
CREATE TRIGGER increment_job_stats_trigger
    AFTER INSERT ON user_job_interactions
    FOR EACH ROW EXECUTE FUNCTION increment_job_view_count();
