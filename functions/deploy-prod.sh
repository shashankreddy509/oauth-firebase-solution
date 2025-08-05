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

# Set Firebase Functions configuration for PRODUCTION
echo "🔧 Setting Firebase Functions config for PRODUCTION..."

firebase functions:config:set \
  plaid.client_id="$PLAID_CLIENT_ID" \
  plaid.secret="$PLAID_SECRET" \
  plaid.environment="production" \
  fyers.app_id="$FYERS_APP_ID" \
  fyers.app_secret="$FYERS_APP_SECRET" \
  app.environment="production"

echo "✅ Firebase config set successfully"

# Deploy functions
echo "🚀 Deploying Firebase Functions to PRODUCTION..."
firebase deploy --only functions

echo "🎉 Production deployment completed successfully!"
echo "🔗 Your functions are available at:"
echo "   https://us-central1-oauth-fyers.cloudfunctions.net/app"
echo ""
echo "🔍 Monitor your deployment:"
echo "   firebase functions:log"