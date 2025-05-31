#!/bin/bash

# SkillForge AI Services Testing Script
# This script tests all services to ensure they're working correctly

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

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
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

# Test Docker services status
test_docker_services() {
    print_header "Docker Services Status"
    
    print_test "Checking running containers..."
    RUNNING_CONTAINERS=$(docker-compose ps --services --filter "status=running" | wc -l)
    TOTAL_SERVICES=11  # Expected number of services
    
    if [ "$RUNNING_CONTAINERS" -eq "$TOTAL_SERVICES" ]; then
        print_success "All $TOTAL_SERVICES services are running"
    else
        print_warning "$RUNNING_CONTAINERS/$TOTAL_SERVICES services are running"
        print_info "Run: docker-compose ps"
    fi
    
    # Show service status
    docker-compose ps
}

# Test database connections
test_databases() {
    print_header "Database Connectivity"
    
    print_test "Testing PostgreSQL connection..."
    if docker-compose exec -T postgres pg_isready -U skillforge_user -d skillforge_db &> /dev/null; then
        print_success "PostgreSQL is ready"
    else
        print_error "PostgreSQL connection failed"
        return 1
    fi
    
    print_test "Testing MongoDB connection..."
    if docker-compose exec -T mongo mongosh --quiet --eval "db.adminCommand('ping').ok" &> /dev/null; then
        print_success "MongoDB is ready"
    else
        print_error "MongoDB connection failed"
        return 1
    fi
    
    print_test "Testing Redis connection..."
    if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
        print_success "Redis is ready"
    else
        print_error "Redis connection failed"
        return 1
    fi
}

# Test API endpoints
test_api_endpoints() {
    print_header "API Endpoint Testing"
    
    print_test "Testing Backend API health..."
    if curl -f -s http://localhost:8000/health > /dev/null; then
        print_success "Backend API is responding"
        
        # Test API documentation
        print_test "Testing API documentation..."
        if curl -f -s http://localhost:8000/docs > /dev/null; then
            print_success "API documentation is accessible"
        else
            print_warning "API documentation not accessible"
        fi
    else
        print_error "Backend API is not responding"
        return 1
    fi
    
    print_test "Testing AI Services health..."
    if curl -f -s http://localhost:8001/health > /dev/null; then
        print_success "AI Services are responding"
    else
        print_error "AI Services are not responding"
        return 1
    fi
    
    print_test "Testing Frontend..."
    if curl -f -s http://localhost:3000 > /dev/null; then
        print_success "Frontend is responding"
    else
        print_error "Frontend is not responding"
        return 1
    fi
}

# Test monitoring services
test_monitoring() {
    print_header "Monitoring Services"
    
    print_test "Testing Flower (Celery monitoring)..."
    if curl -f -s http://localhost:5555 > /dev/null; then
        print_success "Flower is accessible"
    else
        print_warning "Flower is not accessible"
    fi
    
    print_test "Testing MinIO console..."
    if curl -f -s http://localhost:9001 > /dev/null; then
        print_success "MinIO console is accessible"
    else
        print_warning "MinIO console is not accessible"
    fi
}

# Test file uploads and storage
test_file_operations() {
    print_header "File Operations"
    
    print_test "Testing file upload capability..."
    
    # Create a test file
    echo "Test file for SkillForge AI" > /tmp/test_upload.txt
    
    # Test file upload to backend (this would need an actual endpoint)
    print_info "File upload testing requires API endpoints to be implemented"
    print_info "This will be tested once the backend endpoints are created"
    
    # Clean up
    rm -f /tmp/test_upload.txt
}

# Test environment configuration
test_environment() {
    print_header "Environment Configuration"
    
    print_test "Checking environment variables..."
    
    if [ -f .env ]; then
        print_success ".env file exists"
        
        # Check if critical variables are set (not default values)
        if grep -q "your-huggingface-api-token-here" .env; then
            print_warning "HuggingFace API token is still default value"
            print_info "Update HUGGINGFACE_API_TOKEN in .env file"
        else
            print_success "HuggingFace API token is configured"
        fi
        
        if grep -q "your-pinecone-api-key-here" .env; then
            print_warning "Pinecone API key is still default value"
            print_info "Update PINECONE_API_KEY in .env file"
        else
            print_success "Pinecone API key is configured"
        fi
    else
        print_error ".env file not found"
        return 1
    fi
}

# Test logs and debugging
test_logs() {
    print_header "Service Logs Check"
    
    print_test "Checking for critical errors in logs..."
    
    # Check backend logs for errors
    BACKEND_ERRORS=$(docker-compose logs backend 2>&1 | grep -i "error\|exception\|failed" | wc -l)
    if [ "$BACKEND_ERRORS" -eq 0 ]; then
        print_success "No critical errors in backend logs"
    else
        print_warning "$BACKEND_ERRORS potential errors found in backend logs"
        print_info "Run: docker-compose logs backend"
    fi
    
    # Check AI services logs for errors
    AI_ERRORS=$(docker-compose logs ai-services 2>&1 | grep -i "error\|exception\|failed" | wc -l)
    if [ "$AI_ERRORS" -eq 0 ]; then
        print_success "No critical errors in AI services logs"
    else
        print_warning "$AI_ERRORS potential errors found in AI services logs"
        print_info "Run: docker-compose logs ai-services"
    fi
    
    # Check frontend logs for errors
    FRONTEND_ERRORS=$(docker-compose logs frontend 2>&1 | grep -i "error\|exception\|failed" | wc -l)
    if [ "$FRONTEND_ERRORS" -eq 0 ]; then
        print_success "No critical errors in frontend logs"
    else
        print_warning "$FRONTEND_ERRORS potential errors found in frontend logs"
        print_info "Run: docker-compose logs frontend"
    fi
}

# Performance check
test_performance() {
    print_header "Basic Performance Check"
    
    print_test "Testing API response times..."
    
    # Test backend response time
    BACKEND_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8000/health)
    if (( $(echo "$BACKEND_TIME < 2.0" | bc -l) )); then
        print_success "Backend response time: ${BACKEND_TIME}s (Good)"
    else
        print_warning "Backend response time: ${BACKEND_TIME}s (Slow)"
    fi
    
    # Test frontend response time
    FRONTEND_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3000)
    if (( $(echo "$FRONTEND_TIME < 3.0" | bc -l) )); then
        print_success "Frontend response time: ${FRONTEND_TIME}s (Good)"
    else
        print_warning "Frontend response time: ${FRONTEND_TIME}s (Slow)"
    fi
}

# Generate test report
generate_report() {
    print_header "Test Summary"
    
    echo "🎯 SkillForge AI Services Test Report"
    echo "Generated: $(date)"
    echo ""
    echo "📊 Service URLs:"
    echo "   Frontend:        http://localhost:3000"
    echo "   Backend API:     http://localhost:8000"
    echo "   API Docs:        http://localhost:8000/docs"
    echo "   AI Services:     http://localhost:8001"
    echo "   Flower:          http://localhost:5555"
    echo "   MinIO Console:   http://localhost:9001"
    echo ""
    echo "🔧 Useful Commands:"
    echo "   View all logs:       docker-compose logs"
    echo "   View service logs:   docker-compose logs [service-name]"
    echo "   Restart service:     docker-compose restart [service-name]"
    echo "   Stop all services:   docker-compose down"
    echo "   Rebuild service:     docker-compose build [service-name]"
    echo ""
    echo "🐛 Debugging Tips:"
    echo "   - Check service status: docker-compose ps"
    echo "   - View resource usage: docker stats"
    echo "   - Access service shell: docker-compose exec [service-name] bash"
    echo "   - Check environment: docker-compose config"
    echo ""
}

# Main function
main() {
    echo "🧪 SkillForge AI Services Testing"
    echo "================================="
    echo ""
    
    ERRORS=0
    
    test_docker_services || ((ERRORS++))
    echo ""
    
    test_databases || ((ERRORS++))
    echo ""
    
    test_api_endpoints || ((ERRORS++))
    echo ""
    
    test_monitoring
    echo ""
    
    test_environment || ((ERRORS++))
    echo ""
    
    test_logs
    echo ""
    
    test_performance
    echo ""
    
    generate_report
    
    if [ $ERRORS -eq 0 ]; then
        print_success "All critical tests passed! 🎉"
        print_info "Your SkillForge AI development environment is ready!"
    else
        print_error "Some tests failed. Please check the issues above."
        print_info "Critical issues found: $ERRORS"
    fi
}

main "$@"
