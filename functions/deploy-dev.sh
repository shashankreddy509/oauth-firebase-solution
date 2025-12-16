#!/bin/bash

# 🚀 Development Deployment Script
# This script deploys to Firebase with development/sandbox configuration

set -e  # Exit on any error

echo "🔧 Setting up DEVELOPMENT environment..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "📋 Please copy .env.example to .env and fill in your credentials:"
    echo "   cp .env.example .env"
    exit 1
fi

# Load environment variables from .env file
source .env

# Validate required environment variables
if [ -z "$PLAID_CLIENT_ID" ] || [ -z "$PLAID_SECRET" ] || [ -z "$FYERS_APP_ID" ] || [ -z "$FYERS_APP_SECRET" ]; then
    echo "❌ Error: Missing required environment variables!"
    echo "📋 Please ensure your .env file contains:"
    echo "   PLAID_CLIENT_ID"
    echo "   PLAID_SECRET" 
    echo "   FYERS_APP_ID"
    echo "   FYERS_APP_SECRET"
    exit 1
fi

echo "✅ Environment variables loaded successfully"

# Create .env file for Firebase Functions deployment
echo "🔧 Setting up environment variables for DEVELOPMENT deployment..."

# Create .env file in functions directory for deployment
cat > .env << EOF
PLAID_CLIENT_ID=$PLAID_CLIENT_ID
PLAID_SECRET=$PLAID_SECRET
PLAID_ENVIRONMENT=sandbox
FYERS_APP_ID=$FYERS_APP_ID
FYERS_APP_SECRET=$FYERS_APP_SECRET
APP_ENVIRONMENT=development
EOF

echo "✅ Environment variables configured successfully"

# Deploy functions
echo "🚀 Deploying Firebase Functions..."
firebase deploy --only functions

echo "🎉 Development deployment completed successfully!"
echo "🔗 Your functions are available at:"
echo "   https://us-central1-oauth-fyers.cloudfunctions.net/app"