#!/bin/bash
set -e

# =============================================================================
# Heady™ Developer Setup Script
# Version: 1.0.0
# Purpose: Bootstrap a developer environment from zero to running in < 5 minutes
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REQUIRED_NODE_VERSION=20
REQUIRED_PNPM_VERSION=10.6.0
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="${REPO_ROOT}/setup-dev.log"

# Initialize log
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo -e "${BLUE}┌──────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│  Heady™ Developer Environment Setup                          │${NC}"
echo -e "${BLUE}│  Version: 4.0.0                                              │${NC}"
echo -e "${BLUE}└──────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo "Starting setup at $(date '+%Y-%m-%d %H:%M:%S')"
echo "Repository root: $REPO_ROOT"
echo "Log file: $LOG_FILE"
echo ""

# =============================================================================
# Helper Functions
# =============================================================================

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

print_step() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

die() {
  print_error "$1"
  echo ""
  echo -e "${RED}Setup failed. Check $LOG_FILE for details.${NC}"
  exit 1
}

# =============================================================================
# Step 1: Check Node.js Installation and Version
# =============================================================================

print_step "Step 1: Verifying Node.js Installation"

if ! command -v node &> /dev/null; then
  die "Node.js is not installed. Please install Node.js $REQUIRED_NODE_VERSION or later from https://nodejs.org"
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
NODE_FULL_VERSION=$(node -v)

if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
  die "Node.js version $NODE_FULL_VERSION is too old. Required: $REQUIRED_NODE_VERSION or later. Please upgrade from https://nodejs.org"
fi

print_success "Node.js $NODE_FULL_VERSION detected"

# =============================================================================
# Step 2: Check Docker Installation
# =============================================================================

print_step "Step 2: Verifying Docker Installation"

if ! command -v docker &> /dev/null; then
  print_warning "Docker is not installed"
  print_info "Docker is optional but recommended for running services locally"
  print_info "Install from: https://docs.docker.com/get-docker"
  DOCKER_AVAILABLE=false
else
  DOCKER_VERSION=$(docker --version)
  print_success "$DOCKER_VERSION"
  DOCKER_AVAILABLE=true
fi

if [ "$DOCKER_AVAILABLE" = true ] && ! command -v docker-compose &> /dev/null; then
  print_warning "docker-compose is not installed"
  print_info "Attempting to use 'docker compose' (modern syntax)..."
  if ! docker compose version &> /dev/null; then
    print_warning "Neither 'docker-compose' nor 'docker compose' found"
    print_info "Install from: https://docs.docker.com/compose/install"
  else
    print_success "Docker Compose available via 'docker compose'"
    DOCKER_COMPOSE_CMD="docker compose"
  fi
else
  DOCKER_COMPOSE_CMD="docker-compose"
  print_success "docker-compose is available"
fi

# =============================================================================
# Step 3: Check gcloud CLI Installation
# =============================================================================

print_step "Step 3: Verifying Google Cloud CLI"

if ! command -v gcloud &> /dev/null; then
  print_warning "gcloud CLI is not installed"
  print_info "gcloud is optional but recommended for GCP deployment"
  print_info "Install from: https://cloud.google.com/sdk/docs/install"
  GCLOUD_AVAILABLE=false
else
  GCLOUD_VERSION=$(gcloud --version | head -1)
  print_success "$GCLOUD_VERSION"
  GCLOUD_AVAILABLE=true
fi

# =============================================================================
# Step 4: Check or Create .env File
# =============================================================================

print_step "Step 4: Setting Up Environment Configuration"

if [ -f "$REPO_ROOT/.env" ]; then
  print_success ".env file already exists"
else
  print_info "Creating .env from .env.example..."
  if [ ! -f "$REPO_ROOT/.env.example" ]; then
    die ".env.example not found in repository root"
  fi

  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
  print_success ".env file created from template"
  print_warning "Please review and update .env with your credentials"
fi

# =============================================================================
# Step 5: Check pnpm Installation and Version
# =============================================================================

print_step "Step 5: Setting Up Package Manager"

if ! command -v pnpm &> /dev/null; then
  print_info "pnpm is not installed. Installing pnpm $REQUIRED_PNPM_VERSION..."
  npm install -g "pnpm@$REQUIRED_PNPM_VERSION"
  print_success "pnpm installed globally"
else
  PNPM_VERSION=$(pnpm --version)
  print_success "pnpm $PNPM_VERSION is available"
fi

# =============================================================================
# Step 6: Install Root Dependencies
# =============================================================================

print_step "Step 6: Installing Root Dependencies"

cd "$REPO_ROOT"

if [ -f "pnpm-lock.yaml" ]; then
  print_info "Using pnpm-lock.yaml for reproducible builds..."
  pnpm install --frozen-lockfile || die "Failed to install root dependencies"
else
  print_info "No lock file found, installing latest versions..."
  pnpm install || die "Failed to install root dependencies"
fi

print_success "Root dependencies installed"

# =============================================================================
# Step 7: Install Service Dependencies
# =============================================================================

print_step "Step 7: Installing Service Dependencies"

SERVICES_INSTALLED=0

# Install packages directory dependencies
if [ -d "$REPO_ROOT/packages" ]; then
  for package_dir in "$REPO_ROOT/packages"/*; do
    if [ -d "$package_dir" ] && [ -f "$package_dir/package.json" ]; then
      package_name=$(basename "$package_dir")
      print_info "Processing packages/$package_name..."
      SERVICES_INSTALLED=$((SERVICES_INSTALLED + 1))
    fi
  done
fi

# Install services directory dependencies
if [ -d "$REPO_ROOT/services" ]; then
  for service_dir in "$REPO_ROOT/services"/*; do
    if [ -d "$service_dir" ] && [ -f "$service_dir/package.json" ]; then
      service_name=$(basename "$service_dir")
      print_info "Processing services/$service_name..."
      SERVICES_INSTALLED=$((SERVICES_INSTALLED + 1))
    fi
  done
fi

if [ "$SERVICES_INSTALLED" -gt 0 ]; then
  print_info "Installing dependencies for $SERVICES_INSTALLED services..."
  pnpm install --recursive || die "Failed to install service dependencies"
  print_success "All service dependencies installed"
else
  print_warning "No service packages found to install"
fi

# =============================================================================
# Step 8: Verify TypeScript Configuration
# =============================================================================

print_step "Step 8: Verifying TypeScript Configuration"

if [ -f "$REPO_ROOT/tsconfig.json" ]; then
  print_success "tsconfig.json found"
else
  print_warning "tsconfig.json not found in repository root"
fi

if [ -f "$REPO_ROOT/tsconfig.base.json" ]; then
  print_success "tsconfig.base.json found"
else
  print_warning "tsconfig.base.json not found"
fi

# =============================================================================
# Step 9: Verify Build System
# =============================================================================

print_step "Step 9: Verifying Build System"

if [ -f "$REPO_ROOT/turbo.json" ]; then
  print_success "turbo.json found - Turborepo configured"
else
  print_warning "turbo.json not found"
fi

# =============================================================================
# Step 10: Optional - Start Docker Containers (if available)
# =============================================================================

if [ "$DOCKER_AVAILABLE" = true ]; then
  print_step "Step 10: Docker Services (Optional)"

  print_info "To start local services (PostgreSQL, Redis, etc.), run:"
  echo -e "  ${BLUE}$DOCKER_COMPOSE_CMD up -d${NC}"

  print_info "To view service logs, run:"
  echo -e "  ${BLUE}$DOCKER_COMPOSE_CMD logs -f${NC}"

  print_info "To stop services, run:"
  echo -e "  ${BLUE}$DOCKER_COMPOSE_CMD down${NC}"
fi

# =============================================================================
# Summary and Next Steps
# =============================================================================

print_step "Setup Complete!"

echo ""
echo -e "${GREEN}✓ Developer environment is ready!${NC}"
echo ""
echo "📋 Next Steps:"
echo ""

if [ ! -f "$REPO_ROOT/.env" ] || grep -q "your_key_here" "$REPO_ROOT/.env"; then
  echo "1. ${YELLOW}Configure Environment${NC}"
  echo "   Edit .env and fill in API keys and credentials:"
  echo "   ${BLUE}nano .env${NC}"
  echo ""
fi

echo "2. ${YELLOW}Start Development Server${NC}"
echo "   Run the development environment:"
echo "   ${BLUE}pnpm dev${NC}"
echo ""

echo "3. ${YELLOW}Run Tests${NC}"
echo "   Execute the test suite:"
echo "   ${BLUE}pnpm test${NC}"
echo ""

echo "4. ${YELLOW}Build for Production${NC}"
echo "   Create an optimized production build:"
echo "   ${BLUE}pnpm build:production${NC}"
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
  echo "5. ${YELLOW}Start Backend Services (Optional)${NC}"
  echo "   Start PostgreSQL, Redis, and other services:"
  echo "   ${BLUE}$DOCKER_COMPOSE_CMD up -d${NC}"
  echo ""
fi

echo "📚 Additional Resources:"
echo "  • Documentation: $REPO_ROOT/docs"
echo "  • Setup Guide: $REPO_ROOT/SETUP_GUIDE.md"
echo "  • Contributing: $REPO_ROOT/CONTRIBUTING.md"
echo ""

echo "🔗 Available Commands:"
echo "  ${BLUE}pnpm build${NC}           - Build all packages"
echo "  ${BLUE}pnpm dev${NC}             - Start dev servers"
echo "  ${BLUE}pnpm test${NC}            - Run all tests"
echo "  ${BLUE}pnpm lint${NC}            - Run linter"
echo "  ${BLUE}pnpm typecheck${NC}       - Run TypeScript checks"
echo "  ${BLUE}pnpm clean${NC}           - Clean build artifacts"
echo ""

echo "📊 Project Info:"
echo "  Repository: $(git remote get-url origin 2>/dev/null || echo 'Not a git repo')"
echo "  Branch: $(git branch --show-current 2>/dev/null || echo 'Unknown')"
echo "  Setup completed: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

print_success "All checks passed! Happy coding 🚀"
echo ""

exit 0
set -euo pipefail

HEADY_MIN_NODE=20
HEADY_MIN_NPM=10

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗"
echo "  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝"
echo "  ███████║█████╗  ███████║██║  ██║ ╚████╔╝ "
echo "  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝  "
echo "  ██║  ██║███████╗██║  ██║██████╔╝   ██║   "
echo "  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝   "
echo -e "${NC}"
echo "  ∞ Sacred Geometry · φ-Scaled · CSL-Gated"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

errors=0

# ─── Check Node.js ────────────────────────────────────────────────
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js not found${NC} — install v${HEADY_MIN_NODE}+ from https://nodejs.org"
        ((errors++))
        return
    fi
    local ver=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$ver" -ge "$HEADY_MIN_NODE" ]; then
        echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
    else
        echo -e "${RED}✗ Node.js $(node -v) — need v${HEADY_MIN_NODE}+${NC}"
        ((errors++))
    fi
}

# ─── Check npm ────────────────────────────────────────────────────
check_npm() {
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}✗ npm not found${NC}"
        ((errors++))
        return
    fi
    local ver=$(npm -v | cut -d. -f1)
    if [ "$ver" -ge "$HEADY_MIN_NPM" ]; then
        echo -e "${GREEN}✓ npm $(npm -v)${NC}"
    else
        echo -e "${YELLOW}⚠ npm $(npm -v) — recommend v${HEADY_MIN_NPM}+${NC}"
    fi
}

# ─── Check Docker ─────────────────────────────────────────────────
check_docker() {
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓ Docker $(docker --version | grep -oP '\d+\.\d+\.\d+')${NC}"
    else
        echo -e "${YELLOW}⚠ Docker not found — optional for local services${NC}"
    fi
}

# ─── Check gcloud CLI ─────────────────────────────────────────────
check_gcloud() {
    if command -v gcloud &> /dev/null; then
        local proj=$(gcloud config get-value project 2>/dev/null || echo "none")
        echo -e "${GREEN}✓ gcloud CLI — project: ${proj}${NC}"
    else
        echo -e "${YELLOW}⚠ gcloud CLI not found — needed for Cloud Run deployment${NC}"
    fi
}

# ─── Check .env ───────────────────────────────────────────────────
check_env() {
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓ .env file exists${NC}"
    elif [ -f ".env.example" ]; then
        echo -e "${YELLOW}⚠ No .env file — copying from .env.example${NC}"
        cp .env.example .env
        echo -e "${GREEN}  Created .env from .env.example — edit with your values${NC}"
    else
        echo -e "${YELLOW}⚠ No .env file — create one with required environment variables${NC}"
    fi
}

# ─── Run checks ───────────────────────────────────────────────────
echo "Checking prerequisites..."
echo ""
check_node
check_npm
check_docker
check_gcloud
check_env
echo ""

if [ "$errors" -gt 0 ]; then
    echo -e "${RED}✗ ${errors} critical issue(s) found — fix before continuing${NC}"
    exit 1
fi

# ─── Install dependencies ─────────────────────────────────────────
if [ "${1:-}" != "--check" ]; then
    echo "Installing dependencies..."
    npm install 2>&1 | tail -5
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "✓ Heady™ dev environment ready!"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  Start dev server:     npm run dev"
    echo "  Run tests:            npm test"
    echo "  Run pipeline:         node src/orchestration/hc-full-pipeline.js"
    echo "  Docker compose:       docker-compose up"
    echo ""
else
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "✓ All prerequisite checks passed!"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi
