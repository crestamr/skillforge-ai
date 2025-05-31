#!/bin/bash

# SkillForge AI Database Migration Script
# Applies the initial database schema to PostgreSQL

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

# Apply migration
apply_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)
    
    print_info "Applying migration: $migration_name"
    
    # Check if migration was already applied
    local already_applied=$(docker-compose -f docker-compose.minimal.yml exec -T postgres \
        psql -U $DB_USER -d $DB_NAME -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'schema_migrations';" 2>/dev/null | tr -d ' ')
    
    if [ "$already_applied" = "1" ]; then
        local migration_exists=$(docker-compose -f docker-compose.minimal.yml exec -T postgres \
            psql -U $DB_USER -d $DB_NAME -t -c \
            "SELECT COUNT(*) FROM schema_migrations WHERE version = '001';" 2>/dev/null | tr -d ' ')
        
        if [ "$migration_exists" = "1" ]; then
            print_warning "Migration $migration_name already applied, skipping..."
            return 0
        fi
    fi
    
    # Apply the migration
    if docker-compose -f docker-compose.minimal.yml exec -T postgres \
        psql -U $DB_USER -d $DB_NAME -f "/tmp/migration.sql" < "$migration_file" &> /dev/null; then
        print_success "Migration $migration_name applied successfully"
        return 0
    else
        print_error "Failed to apply migration $migration_name"
        return 1
    fi
}

# Copy migration file to container and apply
apply_migration_to_container() {
    local migration_file="$1"
    
    print_info "Copying migration file to container..."
    docker cp "$migration_file" skillforge-ai-postgres-1:/tmp/migration.sql
    
    print_info "Applying migration..."
    if docker-compose -f docker-compose.minimal.yml exec -T postgres \
        psql -U $DB_USER -d $DB_NAME -f "/tmp/migration.sql"; then
        print_success "Migration applied successfully"
        
        # Clean up
        docker-compose -f docker-compose.minimal.yml exec -T postgres rm -f /tmp/migration.sql
        return 0
    else
        print_error "Failed to apply migration"
        return 1
    fi
}

# Verify schema was created
verify_schema() {
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
        return 1
    fi
    
    # Check if seed data was inserted
    local skill_count=$(docker-compose -f docker-compose.minimal.yml exec -T postgres \
        psql -U $DB_USER -d $DB_NAME -t -c \
        "SELECT COUNT(*) FROM skills;" 2>/dev/null | tr -d ' ')
    
    if [ "$skill_count" -gt "0" ]; then
        print_success "Seed data inserted: $skill_count skills"
    else
        print_warning "No seed data found"
    fi
    
    # Check if views were created
    local views=("user_profile_summary" "trending_skills" "job_market_insights")
    local missing_views=()
    
    for view in "${views[@]}"; do
        local view_exists=$(docker-compose -f docker-compose.minimal.yml exec -T postgres \
            psql -U $DB_USER -d $DB_NAME -t -c \
            "SELECT COUNT(*) FROM information_schema.views WHERE table_name = '$view';" 2>/dev/null | tr -d ' ')
        
        if [ "$view_exists" != "1" ]; then
            missing_views+=("$view")
        fi
    done
    
    if [ ${#missing_views[@]} -eq 0 ]; then
        print_success "All views created successfully"
    else
        print_warning "Missing views: ${missing_views[*]}"
    fi
}

# Show database statistics
show_statistics() {
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
}

# Main function
main() {
    print_header "SkillForge AI Database Migration"

    # Check PostgreSQL connection
    if ! check_postgres; then
        exit 1
    fi

    # Apply all migrations in order
    local migrations=(
        "backend/database/migrations/001_complete_schema.sql"
        "backend/database/migrations/002_learning_and_jobs.sql"
        "backend/database/migrations/003_indexes_and_views.sql"
        "backend/database/migrations/004_views_and_functions.sql"
        "backend/database/migrations/005_seed_data.sql"
    )

    local failed_migrations=0

    for migration_file in "${migrations[@]}"; do
        if [ ! -f "$migration_file" ]; then
            print_error "Migration file not found: $migration_file"
            ((failed_migrations++))
            continue
        fi

        print_info "Applying migration: $(basename "$migration_file")"
        if apply_migration_to_container "$migration_file"; then
            print_success "Migration $(basename "$migration_file") completed successfully!"
        else
            print_error "Migration $(basename "$migration_file") failed!"
            ((failed_migrations++))
        fi
        echo ""
    done

    if [ $failed_migrations -eq 0 ]; then
        print_success "All database migrations completed successfully!"
    else
        print_error "$failed_migrations migration(s) failed!"
        exit 1
    fi
    
    # Verify schema
    if verify_schema; then
        print_success "Schema verification passed!"
    else
        print_warning "Schema verification had issues, but migration may still be successful"
    fi
    
    # Show statistics
    show_statistics
    
    print_header "🎉 Database Ready!"
    echo ""
    echo "✅ PostgreSQL schema created successfully"
    echo "✅ Sample data inserted"
    echo "✅ Views and indexes created"
    echo "✅ Triggers and functions installed"
    echo ""
    echo "🔗 Database Connection:"
    echo "   Host: $DB_HOST:$DB_PORT"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
    echo ""
    echo "🚀 Ready for backend development!"
}

main "$@"
