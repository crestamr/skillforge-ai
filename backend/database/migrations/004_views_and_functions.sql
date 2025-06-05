-- Migration 004: Views and Functions
-- Created: 2025-05-31
-- Description: Creates useful views and database functions

BEGIN;

INSERT INTO schema_migrations (version, description) 
VALUES ('004', 'Database views and functions')
ON CONFLICT (version) DO NOTHING;

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

COMMIT;
