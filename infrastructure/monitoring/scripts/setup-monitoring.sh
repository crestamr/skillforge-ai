#!/bin/bash

# SkillForge AI - Monitoring Setup Script
# This script sets up comprehensive monitoring for the SkillForge AI platform

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="skillforge-ai-monitoring"
ENVIRONMENT="${ENVIRONMENT:-production}"
CLUSTER_NAME="${CLUSTER_NAME:-skillforge-ai-cluster}"

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists kubectl; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    if ! command_exists helm; then
        print_error "helm is not installed. Please install helm first."
        exit 1
    fi
    
    # Check if we can connect to the cluster
    if ! kubectl cluster-info >/dev/null 2>&1; then
        print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to create namespace
create_namespace() {
    print_status "Creating monitoring namespace..."
    
    if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        print_warning "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace "$NAMESPACE"
        kubectl label namespace "$NAMESPACE" name="$NAMESPACE"
        print_success "Created namespace $NAMESPACE"
    fi
}

# Function to create secrets
create_secrets() {
    print_status "Creating monitoring secrets..."
    
    # Check if secrets already exist
    if kubectl get secret datadog-secret -n "$NAMESPACE" >/dev/null 2>&1; then
        print_warning "Datadog secret already exists"
    else
        # Prompt for Datadog credentials
        read -p "Enter Datadog API Key: " -s DATADOG_API_KEY
        echo
        read -p "Enter Datadog App Key: " -s DATADOG_APP_KEY
        echo
        
        # Generate random token for cluster agent
        DATADOG_TOKEN=$(openssl rand -hex 32)
        
        kubectl create secret generic datadog-secret \
            --from-literal=api-key="$DATADOG_API_KEY" \
            --from-literal=app-key="$DATADOG_APP_KEY" \
            --from-literal=token="$DATADOG_TOKEN" \
            -n "$NAMESPACE"
        
        print_success "Created Datadog secret"
    fi
    
    # Create Grafana secret
    if kubectl get secret grafana-secret -n "$NAMESPACE" >/dev/null 2>&1; then
        print_warning "Grafana secret already exists"
    else
        read -p "Enter Grafana admin username [admin]: " GRAFANA_USER
        GRAFANA_USER=${GRAFANA_USER:-admin}
        
        read -p "Enter Grafana admin password: " -s GRAFANA_PASSWORD
        echo
        
        read -p "Enter SMTP user for alerts: " SMTP_USER
        read -p "Enter SMTP password: " -s SMTP_PASSWORD
        echo
        
        kubectl create secret generic grafana-secret \
            --from-literal=admin-user="$GRAFANA_USER" \
            --from-literal=admin-password="$GRAFANA_PASSWORD" \
            --from-literal=smtp-user="$SMTP_USER" \
            --from-literal=smtp-password="$SMTP_PASSWORD" \
            -n "$NAMESPACE"
        
        print_success "Created Grafana secret"
    fi
}

# Function to install Prometheus using Helm
install_prometheus() {
    print_status "Installing Prometheus..."
    
    # Add Prometheus Helm repository
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Install Prometheus
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace "$NAMESPACE" \
        --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
        --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false \
        --set prometheus.prometheusSpec.ruleSelectorNilUsesHelmValues=false \
        --set prometheus.prometheusSpec.retention=30d \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=gp3 \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
        --set grafana.enabled=false \
        --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.storageClassName=gp3 \
        --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.resources.requests.storage=10Gi \
        --wait
    
    print_success "Prometheus installed successfully"
}

# Function to deploy Datadog
deploy_datadog() {
    print_status "Deploying Datadog agents..."
    
    # Apply Datadog manifests
    kubectl apply -f ../datadog/datadog-cluster-agent.yaml
    kubectl apply -f ../datadog/datadog-agent.yaml
    
    # Wait for deployments to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/datadog-cluster-agent -n "$NAMESPACE"
    kubectl wait --for=condition=ready --timeout=300s daemonset/datadog-agent -n "$NAMESPACE"
    
    print_success "Datadog agents deployed successfully"
}

# Function to deploy Grafana
deploy_grafana() {
    print_status "Deploying Grafana..."
    
    # Apply Grafana manifests
    kubectl apply -f ../grafana/grafana-deployment.yaml
    
    # Wait for deployment to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/grafana -n "$NAMESPACE"
    
    print_success "Grafana deployed successfully"
}

# Function to configure dashboards
configure_dashboards() {
    print_status "Configuring dashboards..."
    
    # Create ConfigMap with Grafana dashboards
    kubectl create configmap grafana-dashboards \
        --from-file=../grafana/dashboards/ \
        -n "$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Import Datadog dashboards
    if command_exists curl; then
        print_status "Importing Datadog dashboards..."
        
        # You would typically use Datadog API to import dashboards
        # This is a placeholder for the actual implementation
        print_warning "Datadog dashboard import requires manual setup via Datadog UI"
    fi
    
    print_success "Dashboard configuration completed"
}

# Function to setup alerts
setup_alerts() {
    print_status "Setting up alerts..."
    
    # Apply Prometheus alert rules
    kubectl apply -f ../prometheus/prometheus-config.yaml
    
    # Configure Alertmanager
    kubectl create configmap alertmanager-config \
        --from-file=../alertmanager/alertmanager.yml \
        -n "$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    print_success "Alerts configured successfully"
}

# Function to verify installation
verify_installation() {
    print_status "Verifying monitoring installation..."
    
    # Check if all pods are running
    print_status "Checking pod status..."
    kubectl get pods -n "$NAMESPACE"
    
    # Check services
    print_status "Checking services..."
    kubectl get services -n "$NAMESPACE"
    
    # Get Grafana URL
    GRAFANA_URL=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "localhost")
    
    print_success "Monitoring stack deployed successfully!"
    echo
    echo "Access URLs:"
    echo "  Grafana: https://$GRAFANA_URL/grafana"
    echo "  Prometheus: https://$GRAFANA_URL/prometheus"
    echo "  Alertmanager: https://$GRAFANA_URL/alertmanager"
    echo
    echo "Default Grafana credentials:"
    echo "  Username: admin"
    echo "  Password: (as configured during setup)"
}

# Function to cleanup (for development/testing)
cleanup() {
    print_warning "This will remove all monitoring components. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up monitoring stack..."
        
        helm uninstall prometheus -n "$NAMESPACE" || true
        kubectl delete -f ../datadog/ || true
        kubectl delete -f ../grafana/ || true
        kubectl delete namespace "$NAMESPACE" || true
        
        print_success "Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Main function
main() {
    echo "SkillForge AI - Monitoring Setup"
    echo "================================"
    echo
    
    case "${1:-install}" in
        "install")
            check_prerequisites
            create_namespace
            create_secrets
            install_prometheus
            deploy_datadog
            deploy_grafana
            configure_dashboards
            setup_alerts
            verify_installation
            ;;
        "cleanup")
            cleanup
            ;;
        "verify")
            verify_installation
            ;;
        *)
            echo "Usage: $0 [install|cleanup|verify]"
            echo "  install  - Install complete monitoring stack (default)"
            echo "  cleanup  - Remove monitoring stack"
            echo "  verify   - Verify installation status"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
