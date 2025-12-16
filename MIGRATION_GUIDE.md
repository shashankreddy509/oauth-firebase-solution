# 🔄 Migration Guide: Firebase Runtime Config to Environment Variables

## Overview

This document outlines the migration from Firebase Runtime Config (deprecated) to modern environment variables for Firebase Functions configuration.

## 🚨 Issues Resolved

### Problem
- Firebase Runtime Config API was experiencing service outages (HTTP 503 errors)
- The `firebase functions:config:set` command was failing during deployments
- Deprecated API causing deployment failures in both development and production

### Root Cause
- Firebase Runtime Config API (`runtimeconfig.googleapis.com`) is deprecated
- Service reliability issues with the legacy configuration system
- Outdated `firebase-functions` package (v6.3.2) with compatibility issues

## ✅ Solution Implemented

### 1. Package Updates
- **Upgraded `firebase-functions`**: `^6.3.2` → `^6.4.0`
- **Added `dotenv`**: For environment variable management

### 2. Code Changes

#### Before (Deprecated)
```javascript
// Get Firebase Functions configuration
const config = functions.config();

// Configure Plaid using Firebase Functions config
const plaidEnvironment = config.plaid?.environment === 'production' ? PlaidEnvironments.production : PlaidEnvironments.sandbox;

const configuration = new Configuration({
  basePath: plaidEnvironment,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": config.plaid?.client_id,
      "PLAID-SECRET": config.plaid?.secret,
    },
  },
});
```

#### After (Modern)
```javascript
// Load environment variables
require('dotenv').config();

// Configure Plaid using environment variables
const plaidEnvironment = process.env.PLAID_ENVIRONMENT === 'production' ? PlaidEnvironments.production : PlaidEnvironments.sandbox;

const configuration = new Configuration({
  basePath: plaidEnvironment,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});
```

### 3. Deployment Script Updates

#### Before (Deprecated)
```bash
firebase functions:config:set \
  plaid.client_id="$PLAID_CLIENT_ID" \
  plaid.secret="$PLAID_SECRET" \
  plaid.environment="production" \
  fyers.app_id="$FYERS_APP_ID" \
  fyers.app_secret="$FYERS_APP_SECRET" \
  app.environment="production"
```

#### After (Modern)
```bash
# Create .env file in functions directory for deployment
cat > .env << EOF
PLAID_CLIENT_ID=$PLAID_CLIENT_ID
PLAID_SECRET=$PLAID_SECRET
PLAID_ENVIRONMENT=production
FYERS_APP_ID=$FYERS_APP_ID
FYERS_APP_SECRET=$FYERS_APP_SECRET
APP_ENVIRONMENT=production
EOF
```

## 📁 Files Modified

### Core Files
- **`functions/index.js`**: Updated configuration loading
- **`functions/package.json`**: Added `dotenv` dependency
- **`functions/deploy-dev.sh`**: Updated deployment script
- **`functions/deploy-prod.sh`**: Updated deployment script

### Documentation
- **`TROUBLESHOOTING.md`**: Updated with resolution details
- **`MIGRATION_GUIDE.md`**: This document

## 🔧 Environment Variables

### Required Variables
```bash
# Plaid Configuration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENVIRONMENT=sandbox|production

# Fyers Configuration  
FYERS_APP_ID=your_fyers_app_id
FYERS_APP_SECRET=your_fyers_app_secret

# Application Environment
APP_ENVIRONMENT=development|production
```

### File Structure
```
functions/
├── .env                    # Created during deployment
├── .env.example           # Template file
└── .env.production        # Production credentials (not in repo)
```

## 🚀 Benefits of Migration

### 1. **Reliability**
- No dependency on deprecated Firebase Runtime Config API
- Eliminates service outage issues

### 2. **Modern Standards**
- Uses industry-standard environment variable approach
- Better compatibility with modern deployment practices

### 3. **Security**
- Environment variables are more secure
- No API calls required for configuration

### 4. **Performance**
- Faster function cold starts
- No network calls for configuration loading

### 5. **Maintainability**
- Easier to manage and debug
- Standard approach across platforms

## 🔍 Verification

### Check Deployment Status
```bash
firebase functions:list
```

### Expected Output
```
┌──────────┬─────────┬─────────┬─────────────┬────────┬──────────┐
│ Function │ Version │ Trigger │ Location    │ Memory │ Runtime  │
├──────────┼─────────┼─────────┼─────────────┼────────┼──────────┤
│ app      │ v2      │ https   │ us-central1 │ 256    │ nodejs20 │
└──────────┴─────────┴─────────┴─────────────┴────────┴──────────┘
```

## 📝 Next Steps

1. **Remove Legacy Config** (Optional)
   ```bash
   firebase functions:config:unset plaid fyers app
   ```

2. **Update Documentation**
   - Update any references to Firebase Runtime Config
   - Update deployment instructions

3. **Monitor Functions**
   ```bash
   firebase functions:log
   ```

## 🆘 Rollback Plan

If issues arise, you can temporarily rollback by:

1. Reverting the code changes in `functions/index.js`
2. Using the old deployment scripts
3. Setting Firebase Functions config manually

However, this is not recommended due to the deprecated API's reliability issues.

---

**Migration completed successfully on:** $(date)
**Status:** ✅ All systems operational