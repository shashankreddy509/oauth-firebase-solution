#!/bin/bash

# 🚀 Production Deployment Script
# This script deploys to Firebase with production configuration

set -e  # Exit on any error

echo "🔧 Setting up PRODUCTION environment..."

# Check if .env.production file exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "📋 Please create .env.production with your production credentials:"
    echo "   cp .env.example .env.production"
    echo "   # Edit .env.production with PRODUCTION credentials"
    exit 1
fi

# Load environment variables from .env.production file
source .env.production

# Validate required environment variables
if [ -z "$PLAID_CLIENT_ID" ] || [ -z "$PLAID_SECRET" ] || [ -z "$FYERS_APP_ID" ] || [ -z "$FYERS_APP_SECRET" ]; then
    echo "❌ Error: Missing required environment variables!"
    echo "📋 Please ensure your .env.production file contains:"
    echo "   PLAID_CLIENT_ID"
    echo "   PLAID_SECRET" 
    echo "   FYERS_APP_ID"
    echo "   FYERS_APP_SECRET"
    exit 1
fi

# Production safety check
echo "⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️"
echo "You are about to deploy to PRODUCTION environment."
echo "This will affect live users and real financial data."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

echo "✅ Environment variables loaded successfully"

# Create .env file for Firebase Functions deployment
echo "🔧 Setting up environment variables for PRODUCTION deployment..."

# Create .env file in functions directory for deployment
cat > .env << EOF
PLAID_CLIENT_ID=$PLAID_CLIENT_ID
PLAID_SECRET=$PLAID_SECRET
PLAID_ENVIRONMENT=production
FYERS_APP_ID=$FYERS_APP_ID
FYERS_APP_SECRET=$FYERS_APP_SECRET
APP_ENVIRONMENT=production
EOF

echo "✅ Environment variables configured successfully"

# Deploy functions
echo "🚀 Deploying Firebase Functions to PRODUCTION..."
firebase deploy --only functions

echo "🎉 Production deployment completed successfully!"
echo "🔗 Your functions are available at:"
echo "   https://us-central1-oauth-fyers.cloudfunctions.net/app"
echo ""
echo "🔍 Monitor your deployment:"
echo "   firebase functions:log"