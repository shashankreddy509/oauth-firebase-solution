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

# Set Firebase Functions configuration for DEVELOPMENT
echo "🔧 Setting Firebase Functions config for DEVELOPMENT..."

firebase functions:config:set \
  plaid.client_id="$PLAID_CLIENT_ID" \
  plaid.secret="$PLAID_SECRET" \
  plaid.environment="sandbox" \
  fyers.app_id="$FYERS_APP_ID" \
  fyers.app_secret="$FYERS_APP_SECRET" \
  app.environment="development"

echo "✅ Firebase config set successfully"

# Deploy functions
echo "🚀 Deploying Firebase Functions..."
firebase deploy --only functions

echo "🎉 Development deployment completed successfully!"
echo "🔗 Your functions are available at:"
echo "   https://us-central1-oauth-fyers.cloudfunctions.net/app"