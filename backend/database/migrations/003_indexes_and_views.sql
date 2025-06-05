-- Migration 003: Indexes, Views, and Functions
-- Created: 2025-05-31
-- Description: Creates performance indexes, useful views, and database functions

BEGIN;

INSERT INTO schema_migrations (version, description) 
VALUES ('003', 'Indexes, views, and database functions')
ON CONFLICT (version) DO NOTHING;

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

COMMIT;
