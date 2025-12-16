#!/bin/bash

# 🔧 Firebase Configuration Management Script
# This script helps manage Firebase Functions configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display help
show_help() {
    echo "🔧 Firebase Configuration Management"
    echo ""
    echo "Usage: ./config.sh [command]"
    echo ""
    echo "Commands:"
    echo "  show          Show current Firebase Functions config"
    echo "  clear         Clear all Firebase Functions config"
    echo "  setup-dev     Setup development environment"
    echo "  setup-prod    Setup production environment"
    echo "  validate      Validate environment files"
    echo "  help          Show this help message"
    echo ""
}

# Function to show current config
show_config() {
    echo -e "${BLUE}📋 Current Firebase Functions Configuration:${NC}"
    firebase functions:config:get || echo "❌ No configuration found"
}

# Function to clear config
clear_config() {
    echo -e "${YELLOW}⚠️  This will clear ALL Firebase Functions configuration!${NC}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo "🧹 Clearing Firebase Functions config..."
        firebase functions:config:unset plaid fyers app
        echo -e "${GREEN}✅ Configuration cleared${NC}"
    else
        echo "❌ Operation cancelled"
    fi
}

# Function to validate environment files
validate_env() {
    echo -e "${BLUE}🔍 Validating environment files...${NC}"
    
    # Check .env.example
    if [ -f ".env.example" ]; then
        echo -e "${GREEN}✅ .env.example found${NC}"
    else
        echo -e "${RED}❌ .env.example missing${NC}"
    fi
    
    # Check .env
    if [ -f ".env" ]; then
        echo -e "${GREEN}✅ .env found (development)${NC}"
        source .env
        if [ -n "$PLAID_CLIENT_ID" ] && [ -n "$PLAID_SECRET" ]; then
            echo -e "${GREEN}  ✅ Plaid credentials configured${NC}"
        else
            echo -e "${RED}  ❌ Plaid credentials missing${NC}"
        fi
        if [ -n "$FYERS_APP_ID" ] && [ -n "$FYERS_APP_SECRET" ]; then
            echo -e "${GREEN}  ✅ Fyers credentials configured${NC}"
        else
            echo -e "${RED}  ❌ Fyers credentials missing${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  .env not found (development)${NC}"
    fi
    
    # Check .env.production
    if [ -f ".env.production" ]; then
        echo -e "${GREEN}✅ .env.production found${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.production not found${NC}"
    fi
}

# Function to setup development environment
setup_dev() {
    echo -e "${BLUE}🔧 Setting up development environment...${NC}"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo -e "${GREEN}✅ Created .env from .env.example${NC}"
            echo -e "${YELLOW}⚠️  Please edit .env with your development credentials${NC}"
        else
            echo -e "${RED}❌ .env.example not found${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ .env already exists${NC}"
    fi
    
    echo ""
    echo "📝 Next steps:"
    echo "1. Edit .env with your development credentials"
    echo "2. Run: ./deploy-dev.sh"
}

# Function to setup production environment
setup_prod() {
    echo -e "${BLUE}🔧 Setting up production environment...${NC}"
    
    if [ ! -f ".env.production" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.production
            echo -e "${GREEN}✅ Created .env.production from .env.example${NC}"
            echo -e "${YELLOW}⚠️  Please edit .env.production with your PRODUCTION credentials${NC}"
        else
            echo -e "${RED}❌ .env.example not found${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ .env.production already exists${NC}"
    fi
    
    echo ""
    echo "📝 Next steps:"
    echo "1. Edit .env.production with your PRODUCTION credentials"
    echo "2. Run: ./deploy-prod.sh"
}

# Main script logic
case "${1:-help}" in
    "show")
        show_config
        ;;
    "clear")
        clear_config
        ;;
    "setup-dev")
        setup_dev
        ;;
    "setup-prod")
        setup_prod
        ;;
    "validate")
        validate_env
        ;;
    "help"|*)
        show_help
        ;;
esac