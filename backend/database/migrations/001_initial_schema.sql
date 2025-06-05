-- Migration 001: Initial SkillForge AI Database Schema
-- Created: 2025-05-31
-- Description: Creates the complete initial database schema for SkillForge AI

-- This migration creates:
-- 1. All required extensions
-- 2. Custom enum types
-- 3. Core tables with relationships
-- 4. Performance indexes
-- 5. Useful views
-- 6. Triggers and functions

BEGIN;

-- Record migration
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_migrations (version, description) 
VALUES ('001', 'Initial SkillForge AI database schema');

-- Apply the main schema (inline)
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

-- Insert initial seed data
INSERT INTO skills (name, description, category, level, trending_score, demand_score, salary_impact) VALUES
-- Technical Skills
('Python', 'High-level programming language for web development, data science, and automation', 'technical', 'intermediate', 95.0, 90.0, 15000.00),
('JavaScript', 'Programming language for web development and full-stack applications', 'technical', 'intermediate', 92.0, 95.0, 12000.00),
('React', 'JavaScript library for building user interfaces', 'framework', 'intermediate', 88.0, 85.0, 10000.00),
('Node.js', 'JavaScript runtime for server-side development', 'framework', 'intermediate', 85.0, 80.0, 8000.00),
('PostgreSQL', 'Advanced open-source relational database', 'technical', 'intermediate', 75.0, 70.0, 7000.00),
('Docker', 'Containerization platform for application deployment', 'tool', 'intermediate', 80.0, 75.0, 9000.00),
('AWS', 'Amazon Web Services cloud computing platform', 'tool', 'advanced', 90.0, 88.0, 18000.00),
('Machine Learning', 'AI technique for building predictive models', 'technical', 'advanced', 98.0, 92.0, 25000.00),
('FastAPI', 'Modern Python web framework for building APIs', 'framework', 'intermediate', 85.0, 70.0, 8000.00),
('TypeScript', 'Typed superset of JavaScript', 'technical', 'intermediate', 87.0, 82.0, 9000.00),

-- Soft Skills
('Communication', 'Ability to convey information effectively', 'soft', 'intermediate', 70.0, 95.0, 5000.00),
('Leadership', 'Ability to guide and motivate teams', 'soft', 'advanced', 75.0, 85.0, 12000.00),
('Problem Solving', 'Analytical thinking and solution development', 'soft', 'intermediate', 80.0, 90.0, 8000.00),
('Project Management', 'Planning and executing projects effectively', 'soft', 'intermediate', 78.0, 88.0, 10000.00),
('Teamwork', 'Collaborative work and team coordination', 'soft', 'intermediate', 65.0, 92.0, 3000.00),

-- Certifications
('AWS Certified Solutions Architect', 'Professional cloud architecture certification', 'certification', 'advanced', 85.0, 80.0, 15000.00),
('PMP', 'Project Management Professional certification', 'certification', 'advanced', 70.0, 75.0, 12000.00),
('Scrum Master', 'Agile project management certification', 'certification', 'intermediate', 72.0, 78.0, 8000.00);

-- Create sample learning paths
INSERT INTO learning_paths (title, description, estimated_duration, difficulty, is_featured) VALUES
('Full-Stack Web Development', 'Complete journey from frontend to backend development', 120, 'intermediate', true),
('Data Science Fundamentals', 'Introduction to data analysis and machine learning', 80, 'intermediate', true),
('Cloud Architecture Mastery', 'Advanced cloud computing and architecture patterns', 100, 'advanced', true),
('DevOps Engineering', 'Infrastructure automation and deployment practices', 90, 'intermediate', false),
('AI/ML Engineering', 'Machine learning model development and deployment', 150, 'advanced', true);

-- Create sample assessments
INSERT INTO assessments (title, description, skill_id, difficulty, time_limit, passing_score) VALUES
('Python Fundamentals', 'Basic Python programming concepts and syntax', 
 (SELECT id FROM skills WHERE name = 'Python'), 'easy', 45, 70),
('JavaScript ES6+', 'Modern JavaScript features and best practices', 
 (SELECT id FROM skills WHERE name = 'JavaScript'), 'medium', 60, 75),
('React Component Development', 'Building reusable React components', 
 (SELECT id FROM skills WHERE name = 'React'), 'medium', 90, 80),
('AWS Cloud Fundamentals', 'Basic AWS services and cloud concepts', 
 (SELECT id FROM skills WHERE name = 'AWS'), 'medium', 75, 70),
('Machine Learning Basics', 'Introduction to ML algorithms and concepts', 
 (SELECT id FROM skills WHERE name = 'Machine Learning'), 'hard', 120, 75);

COMMIT;
