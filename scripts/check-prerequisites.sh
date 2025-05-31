#!/bin/bash

# SkillForge AI Prerequisites Checker
# This script checks if your system is ready for development

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

print_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
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

# Check system requirements
check_system() {
    print_header "System Requirements"
    
    # Check OS
    print_check "Operating System..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_success "Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        print_success "macOS detected"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        print_success "Windows detected"
    else
        print_warning "Unknown OS: $OSTYPE"
    fi
    
    # Check available memory
    print_check "Available memory..."
    if command -v free &> /dev/null; then
        MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
        if [ "$MEMORY_GB" -ge 8 ]; then
            print_success "Memory: ${MEMORY_GB}GB (Recommended: 8GB+)"
        else
            print_warning "Memory: ${MEMORY_GB}GB (Recommended: 8GB+)"
        fi
    elif command -v vm_stat &> /dev/null; then
        # macOS
        MEMORY_BYTES=$(sysctl -n hw.memsize)
        MEMORY_GB=$((MEMORY_BYTES / 1024 / 1024 / 1024))
        if [ "$MEMORY_GB" -ge 8 ]; then
            print_success "Memory: ${MEMORY_GB}GB (Recommended: 8GB+)"
        else
            print_warning "Memory: ${MEMORY_GB}GB (Recommended: 8GB+)"
        fi
    else
        print_info "Could not detect memory. Ensure you have at least 8GB RAM"
    fi
    
    # Check disk space
    print_check "Available disk space..."
    DISK_SPACE=$(df -h . | awk 'NR==2{print $4}')
    print_info "Available space: $DISK_SPACE (Recommended: 10GB+)"
}

# Check Docker installation
check_docker() {
    print_header "Docker Requirements"
    
    print_check "Docker installation..."
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker installed: $DOCKER_VERSION"
        
        print_check "Docker daemon status..."
        if docker info &> /dev/null; then
            print_success "Docker daemon is running"
        else
            print_error "Docker daemon is not running"
            print_info "Please start Docker Desktop or Docker service"
            return 1
        fi
    else
        print_error "Docker is not installed"
        print_info "Install from: https://docs.docker.com/get-docker/"
        return 1
    fi
    
    print_check "Docker Compose installation..."
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker Compose installed: $COMPOSE_VERSION"
    else
        print_error "Docker Compose is not installed"
        print_info "Install from: https://docs.docker.com/compose/install/"
        return 1
    fi
}

# Check development tools
check_dev_tools() {
    print_header "Development Tools"
    
    print_check "Git installation..."
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        print_success "Git installed: $GIT_VERSION"
    else
        print_warning "Git is not installed (recommended for version control)"
    fi
    
    print_check "curl installation..."
    if command -v curl &> /dev/null; then
        print_success "curl is available"
    else
        print_warning "curl is not installed (needed for health checks)"
    fi
    
    print_check "Node.js installation (optional for local development)..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_info "Node.js not installed (optional - Docker will handle this)"
    fi
    
    print_check "Python installation (optional for local development)..."
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        print_success "Python installed: $PYTHON_VERSION"
    else
        print_info "Python not installed (optional - Docker will handle this)"
    fi
}

# Check API requirements
check_api_requirements() {
    print_header "API Requirements"
    
    print_info "You will need the following API keys:"
    echo ""
    echo "🤗 HuggingFace (Required for AI models):"
    echo "   - Sign up: https://huggingface.co/join"
    echo "   - Get token: https://huggingface.co/settings/tokens"
    echo ""
    echo "🌲 Pinecone (Required for vector database):"
    echo "   - Sign up: https://app.pinecone.io/"
    echo "   - Get API key from dashboard"
    echo ""
    echo "🔐 OAuth Providers (Optional for social login):"
    echo "   - GitHub: https://github.com/settings/applications/new"
    echo "   - LinkedIn: https://www.linkedin.com/developers/apps"
    echo ""
    echo "📊 Monitoring (Optional):"
    echo "   - Datadog: https://app.datadoghq.com/account/settings#api"
    echo "   - Sentry: https://sentry.io/settings/account/api/auth-tokens/"
    echo ""
}

# Check environment file
check_environment() {
    print_header "Environment Configuration"
    
    if [ -f .env ]; then
        print_success ".env file exists"
        
        # Check for required variables
        print_check "Checking required environment variables..."
        
        if grep -q "HUGGINGFACE_API_TOKEN=your-huggingface-api-token-here" .env; then
            print_warning "HuggingFace API token not configured"
        else
            print_success "HuggingFace API token configured"
        fi
        
        if grep -q "PINECONE_API_KEY=your-pinecone-api-key-here" .env; then
            print_warning "Pinecone API key not configured"
        else
            print_success "Pinecone API key configured"
        fi
    else
        print_warning ".env file does not exist"
        print_info "Run: cp .env.example .env"
    fi
}

# Main function
main() {
    echo "🎯 SkillForge AI Prerequisites Checker"
    echo "======================================"
    echo ""
    
    ERRORS=0
    
    check_system || ((ERRORS++))
    echo ""
    
    check_docker || ((ERRORS++))
    echo ""
    
    check_dev_tools
    echo ""
    
    check_api_requirements
    echo ""
    
    check_environment
    echo ""
    
    print_header "Summary"
    
    if [ $ERRORS -eq 0 ]; then
        print_success "All critical requirements are met!"
        print_info "You can proceed with: ./scripts/setup-dev.sh"
    else
        print_error "Please fix the issues above before proceeding"
        print_info "Critical issues found: $ERRORS"
    fi
    
    echo ""
    print_info "Next steps:"
    echo "1. Fix any critical issues above"
    echo "2. Copy .env.example to .env: cp .env.example .env"
    echo "3. Edit .env with your API keys"
    echo "4. Run setup: ./scripts/setup-dev.sh"
}

main "$@"
