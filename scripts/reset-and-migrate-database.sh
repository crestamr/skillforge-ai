#!/bin/bash

# SkillForge AI Database Reset and Migration Script
# Drops and recreates the database, then applies all migrations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Database connection parameters
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="skillforge_db"
DB_USER="skillforge_user"
DB_PASSWORD="skillforge_pass"

# Check if PostgreSQL is running
check_postgres() {
    print_info "Checking PostgreSQL connection..."
    
    if docker-compose -f docker-compose.minimal.yml exec -T postgres pg_isready -U $DB_USER -d $DB_NAME &> /dev/null; then
        print_success "PostgreSQL is ready"
        return 0
    else
        print_error "PostgreSQL is not ready. Please start the services first:"
        echo "  docker-compose -f docker-compose.minimal.yml up -d"
        return 1
    fi
}

# Reset database
reset_database() {
    print_info "Resetting database..."
    
    # Drop and recreate database
    docker-compose -f docker-compose.minimal.yml exec -T postgres \
        psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
    
    docker-compose -f docker-compose.minimal.yml exec -T postgres \
        psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    
    print_success "Database reset completed"
}

# Apply single migration file
apply_single_migration() {
    local migration_content="$1"
    local migration_name="$2"
    
    print_info "Applying $migration_name..."
    
    # Create temporary file with migration content
    echo "$migration_content" | docker-compose -f docker-compose.minimal.yml exec -T postgres \
        psql -U $DB_USER -d $DB_NAME
    
    if [ $? -eq 0 ]; then
        print_success "$migration_name applied successfully"
        return 0
    else
        print_error "$migration_name failed"
        return 1
    fi
}

# Create complete migration
create_complete_migration() {
    cat << 'EOF'
-- Complete SkillForge AI Database Schema
-- All-in-one migration to avoid transaction issues

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create migration tracking table
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

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
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_names CHECK (LENGTH(first_name) >= 1 AND LENGTH(last_name) >= 1)
);

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

-- Assessments: Skill evaluation tests
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    difficulty difficulty_level NOT NULL,
    time_limit INTEGER,
    passing_score INTEGER DEFAULT 70,
    total_questions INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_passing_score CHECK (passing_score >= 0 AND passing_score <= 100),
    CONSTRAINT valid_time_limit CHECK (time_limit > 0)
);

-- Learning paths: Structured skill development journeys
CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_duration INTEGER,
    difficulty difficulty_level NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_duration CHECK (estimated_duration > 0)
);

-- Job postings: Available positions in the market
CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    remote_type VARCHAR(50),
    employment_type VARCHAR(50) DEFAULT 'full_time',
    description TEXT,
    requirements JSONB,
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    salary_currency VARCHAR(3) DEFAULT 'USD',
    experience_min INTEGER DEFAULT 0,
    experience_max INTEGER,
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    source_url TEXT,
    source_platform VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_salary_range CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max),
    CONSTRAINT valid_experience_range CHECK (experience_min >= 0 AND (experience_max IS NULL OR experience_max >= experience_min))
);

-- Create basic indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_assessments_skill_id ON assessments(skill_id);
CREATE INDEX idx_learning_paths_featured ON learning_paths(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_job_postings_company ON job_postings(company);
CREATE INDEX idx_job_postings_location ON job_postings(location);

-- Record migration
INSERT INTO schema_migrations (version, description) VALUES ('001', 'Complete SkillForge AI database schema');
EOF
}

# Insert seed data
insert_seed_data() {
    cat << 'EOF'
-- Insert sample skills
INSERT INTO skills (name, description, category, level, trending_score, demand_score, salary_impact) VALUES
('Python', 'High-level programming language for web development, data science, and automation', 'technical', 'intermediate', 95.0, 90.0, 15000.00),
('JavaScript', 'Programming language for web development and full-stack applications', 'technical', 'intermediate', 92.0, 95.0, 12000.00),
('React', 'JavaScript library for building user interfaces', 'framework', 'intermediate', 88.0, 85.0, 10000.00),
('Node.js', 'JavaScript runtime for server-side development', 'framework', 'intermediate', 85.0, 80.0, 8000.00),
('PostgreSQL', 'Advanced open-source relational database', 'technical', 'intermediate', 75.0, 70.0, 7000.00),
('Docker', 'Containerization platform for application deployment', 'tool', 'intermediate', 80.0, 75.0, 9000.00),
('AWS', 'Amazon Web Services cloud computing platform', 'tool', 'advanced', 90.0, 88.0, 18000.00),
('Machine Learning', 'AI technique for building predictive models', 'technical', 'advanced', 98.0, 92.0, 25000.00),
('Communication', 'Ability to convey information effectively', 'soft', 'intermediate', 70.0, 95.0, 5000.00),
('Leadership', 'Ability to guide and motivate teams', 'soft', 'advanced', 75.0, 85.0, 12000.00);

-- Insert sample learning paths
INSERT INTO learning_paths (title, description, estimated_duration, difficulty, is_featured) VALUES
('Full-Stack Web Development', 'Complete journey from frontend to backend development', 120, 'intermediate', true),
('Data Science Fundamentals', 'Introduction to data analysis and machine learning', 80, 'intermediate', true),
('Cloud Architecture Mastery', 'Advanced cloud computing and architecture patterns', 100, 'advanced', true);

-- Insert sample assessments
INSERT INTO assessments (title, description, skill_id, difficulty, time_limit, passing_score) VALUES
('Python Fundamentals', 'Basic Python programming concepts and syntax', 
 (SELECT id FROM skills WHERE name = 'Python'), 'easy', 45, 70),
('JavaScript ES6+', 'Modern JavaScript features and best practices', 
 (SELECT id FROM skills WHERE name = 'JavaScript'), 'medium', 60, 75),
('React Component Development', 'Building reusable React components', 
 (SELECT id FROM skills WHERE name = 'React'), 'medium', 90, 80);

-- Record seed data migration
INSERT INTO schema_migrations (version, description) VALUES ('002', 'Initial seed data');
EOF
}

# Main function
main() {
    print_header "SkillForge AI Database Reset and Migration"
    
    # Check PostgreSQL connection
    if ! check_postgres; then
        exit 1
    fi
    
    # Reset database
    reset_database
    
    # Apply complete schema
    print_info "Creating complete database schema..."
    if apply_single_migration "$(create_complete_migration)" "Complete Schema"; then
        print_success "Database schema created successfully!"
    else
        print_error "Failed to create database schema!"
        exit 1
    fi
    
    # Insert seed data
    print_info "Inserting seed data..."
    if apply_single_migration "$(insert_seed_data)" "Seed Data"; then
        print_success "Seed data inserted successfully!"
    else
        print_error "Failed to insert seed data!"
        exit 1
    fi
    
    # Verify schema
    print_info "Verifying database schema..."
    
    # Check if key tables exist
    local tables=("users" "skills" "assessments" "job_postings" "learning_paths")
    local missing_tables=()
    
    for table in "${tables[@]}"; do
        local table_exists=$(docker-compose -f docker-compose.minimal.yml exec -T postgres \
            psql -U $DB_USER -d $DB_NAME -t -c \
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';" 2>/dev/null | tr -d ' ')
        
        if [ "$table_exists" != "1" ]; then
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -eq 0 ]; then
        print_success "All core tables created successfully"
    else
        print_error "Missing tables: ${missing_tables[*]}"
        exit 1
    fi
    
    # Show statistics
    print_header "Database Statistics"
    
    echo "Tables created:"
    docker-compose -f docker-compose.minimal.yml exec -T postgres \
        psql -U $DB_USER -d $DB_NAME -c \
        "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
    
    echo ""
    echo "Sample data counts:"
    docker-compose -f docker-compose.minimal.yml exec -T postgres \
        psql -U $DB_USER -d $DB_NAME -c \
        "SELECT 
            (SELECT COUNT(*) FROM skills) as skills,
            (SELECT COUNT(*) FROM learning_paths) as learning_paths,
            (SELECT COUNT(*) FROM assessments) as assessments;"
    
    print_header "🎉 Database Ready!"
    echo ""
    echo "✅ PostgreSQL schema created successfully"
    echo "✅ Sample data inserted"
    echo "✅ Basic indexes created"
    echo ""
    echo "🔗 Database Connection:"
    echo "   Host: $DB_HOST:$DB_PORT"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
    echo ""
    echo "🚀 Ready for backend development!"
}

main "$@"
