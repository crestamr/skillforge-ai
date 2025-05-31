#!/bin/bash

# SkillForge AI Development Environment Setup Script
# This script sets up the complete development environment

set -e  # Exit on any error

echo "🚀 Setting up SkillForge AI Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

# Check if Docker Compose is installed
check_docker_compose() {
    print_status "Checking Docker Compose installation..."
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker Compose is installed"
}

# Create environment file if it doesn't exist
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.example .env
        print_warning "Please edit .env file with your actual configuration values"
        print_warning "Especially update: HUGGINGFACE_API_TOKEN, PINECONE_API_KEY, and OAuth credentials"
    else
        print_success ".env file already exists"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p data/uploads
    mkdir -p data/models
    mkdir -p data/backups
    
    print_success "Directories created"
}

# Build and start services
start_services() {
    print_status "Building and starting services..."
    
    # Pull latest images
    docker-compose pull
    
    # Build custom images
    docker-compose build
    
    # Start services
    docker-compose up -d
    
    print_success "Services started"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    # Wait for PostgreSQL
    print_status "Waiting for PostgreSQL..."
    until docker-compose exec postgres pg_isready -U skillforge_user -d skillforge_db; do
        sleep 2
    done
    
    # Wait for MongoDB
    print_status "Waiting for MongoDB..."
    until docker-compose exec mongo mongosh --eval "db.adminCommand('ping')" &> /dev/null; do
        sleep 2
    done
    
    # Wait for Redis
    print_status "Waiting for Redis..."
    until docker-compose exec redis redis-cli ping &> /dev/null; do
        sleep 2
    done
    
    # Wait for backend API
    print_status "Waiting for Backend API..."
    until curl -f http://localhost:8000/health &> /dev/null; do
        sleep 5
    done
    
    # Wait for AI services
    print_status "Waiting for AI Services..."
    until curl -f http://localhost:8001/health &> /dev/null; do
        sleep 5
    done
    
    # Wait for frontend
    print_status "Waiting for Frontend..."
    until curl -f http://localhost:3000 &> /dev/null; do
        sleep 5
    done
    
    print_success "All services are healthy"
}

# Display service URLs
show_urls() {
    echo ""
    echo "🎉 SkillForge AI Development Environment is ready!"
    echo ""
    echo "📱 Application URLs:"
    echo "   Frontend:        http://localhost:3000"
    echo "   Backend API:     http://localhost:8000"
    echo "   API Docs:        http://localhost:8000/docs"
    echo "   AI Services:     http://localhost:8001"
    echo ""
    echo "🗄️  Database URLs:"
    echo "   PostgreSQL:      localhost:5432"
    echo "   MongoDB:         localhost:27017"
    echo "   Redis:           localhost:6379"
    echo ""
    echo "🔧 Monitoring URLs:"
    echo "   Flower (Celery): http://localhost:5555"
    echo "   MinIO Console:   http://localhost:9001"
    echo ""
    echo "📊 Default Credentials:"
    echo "   Flower:          admin / skillforge_flower_pass"
    echo "   MinIO:           skillforge_minio_user / skillforge_minio_pass"
    echo ""
    echo "⚠️  Important Notes:"
    echo "   - Update .env file with your API keys"
    echo "   - Check logs: docker-compose logs -f [service-name]"
    echo "   - Stop services: docker-compose down"
    echo "   - Restart services: docker-compose restart"
    echo ""
}

# Main execution
main() {
    echo "🎯 SkillForge AI - Intelligent Career Development Platform"
    echo "=================================================="
    echo ""
    
    check_docker
    check_docker_compose
    setup_environment
    create_directories
    start_services
    wait_for_services
    show_urls
}

# Run main function
main "$@"
