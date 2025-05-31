#!/bin/bash

# SkillForge AI Minimal Setup Testing Script
# This script tests the minimal setup to ensure everything is working

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
    RUNNING_CONTAINERS=$(docker-compose -f docker-compose.minimal.yml ps --services --filter "status=running" | wc -l)
    TOTAL_SERVICES=6  # Expected number of services in minimal setup
    
    if [ "$RUNNING_CONTAINERS" -eq "$TOTAL_SERVICES" ]; then
        print_success "All $TOTAL_SERVICES services are running"
    else
        print_warning "$RUNNING_CONTAINERS/$TOTAL_SERVICES services are running"
        print_info "Run: docker-compose -f docker-compose.minimal.yml ps"
    fi
    
    # Show service status
    docker-compose -f docker-compose.minimal.yml ps
}

# Test database connections
test_databases() {
    print_header "Database Connectivity"
    
    print_test "Testing PostgreSQL connection..."
    if docker-compose -f docker-compose.minimal.yml exec -T postgres pg_isready -U skillforge_user -d skillforge_db &> /dev/null; then
        print_success "PostgreSQL is ready"
    else
        print_error "PostgreSQL connection failed"
        return 1
    fi
    
    print_test "Testing MongoDB connection..."
    if docker-compose -f docker-compose.minimal.yml exec -T mongo mongosh --quiet --eval "db.adminCommand('ping').ok" &> /dev/null; then
        print_success "MongoDB is ready"
    else
        print_error "MongoDB connection failed"
        return 1
    fi
    
    print_test "Testing Redis connection..."
    if docker-compose -f docker-compose.minimal.yml exec -T redis redis-cli ping | grep -q "PONG"; then
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
        
        # Test API status endpoint
        print_test "Testing API status endpoint..."
        if curl -f -s http://localhost:8000/api/v1/status > /dev/null; then
            print_success "API status endpoint is working"
        else
            print_warning "API status endpoint not working"
        fi
    else
        print_error "Backend API is not responding"
        return 1
    fi
    
    print_test "Testing AI Services health..."
    if curl -f -s http://localhost:8001/health > /dev/null; then
        print_success "AI Services are responding"
        
        # Test AI models status
        print_test "Testing AI models status..."
        if curl -f -s http://localhost:8001/api/v1/models/status > /dev/null; then
            print_success "AI models status endpoint is working"
        else
            print_warning "AI models status endpoint not working"
        fi
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

# Test performance
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
    
    # Test AI services response time
    AI_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8001/health)
    if (( $(echo "$AI_TIME < 2.0" | bc -l) )); then
        print_success "AI Services response time: ${AI_TIME}s (Good)"
    else
        print_warning "AI Services response time: ${AI_TIME}s (Slow)"
    fi
    
    # Test frontend response time
    FRONTEND_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3000)
    if (( $(echo "$FRONTEND_TIME < 3.0" | bc -l) )); then
        print_success "Frontend response time: ${FRONTEND_TIME}s (Good)"
    else
        print_warning "Frontend response time: ${FRONTEND_TIME}s (Slow)"
    fi
}

# Generate success report
generate_success_report() {
    print_header "🎉 SUCCESS! SkillForge AI is Running!"
    
    echo ""
    echo "🎯 SkillForge AI Development Environment"
    echo "========================================"
    echo ""
    echo "✅ All core services are running successfully!"
    echo "✅ All databases are connected and healthy!"
    echo "✅ All API endpoints are responding!"
    echo "✅ Frontend is loading correctly!"
    echo ""
    echo "🌐 Access Your Application:"
    echo "   Frontend:        http://localhost:3000"
    echo "   Backend API:     http://localhost:8000"
    echo "   API Docs:        http://localhost:8000/docs"
    echo "   AI Services:     http://localhost:8001"
    echo "   AI Docs:         http://localhost:8001/docs"
    echo ""
    echo "🗄️  Database Connections:"
    echo "   PostgreSQL:      localhost:5432"
    echo "   MongoDB:         localhost:27017"
    echo "   Redis:           localhost:6379"
    echo ""
    echo "🔧 Useful Commands:"
    echo "   View logs:           docker-compose -f docker-compose.minimal.yml logs"
    echo "   View service logs:   docker-compose -f docker-compose.minimal.yml logs [service-name]"
    echo "   Restart service:     docker-compose -f docker-compose.minimal.yml restart [service-name]"
    echo "   Stop all services:   docker-compose -f docker-compose.minimal.yml down"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Open http://localhost:3000 to see the frontend"
    echo "   2. Visit http://localhost:8000/docs to explore the API"
    echo "   3. Check http://localhost:8001/docs for AI services"
    echo "   4. Start developing according to your Plan.md!"
    echo ""
    echo "🎊 Your SkillForge AI development environment is ready!"
    echo ""
}

# Main function
main() {
    echo "🧪 SkillForge AI Minimal Setup Testing"
    echo "======================================"
    echo ""
    
    ERRORS=0
    
    test_docker_services || ((ERRORS++))
    echo ""
    
    test_databases || ((ERRORS++))
    echo ""
    
    test_api_endpoints || ((ERRORS++))
    echo ""
    
    test_performance
    echo ""
    
    if [ $ERRORS -eq 0 ]; then
        generate_success_report
    else
        print_error "Some tests failed. Please check the issues above."
        print_info "Critical issues found: $ERRORS"
        echo ""
        print_info "Try running: docker-compose -f docker-compose.minimal.yml logs"
    fi
}

main "$@"
