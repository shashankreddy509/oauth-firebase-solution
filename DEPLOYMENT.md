# 🚀 Deployment Guide

## 📋 Overview

This project now includes automated deployment scripts that handle environment configuration for both development and production environments safely and securely.

## 🛠️ Available Scripts

### NPM Scripts (from functions directory)
```bash
npm run deploy:dev      # Deploy to development
npm run deploy:prod     # Deploy to production  
npm run config          # Manage configuration
npm run config:show     # Show current config
npm run config:validate # Validate environment files
```

### Direct Shell Scripts
```bash
./deploy-dev.sh         # Deploy to development
./deploy-prod.sh        # Deploy to production
./config.sh             # Configuration management
```

## 🔧 Initial Setup

### 1. Setup Development Environment
```bash
cd functions
npm run config setup-dev
# This creates .env from .env.example
```

### 2. Configure Development Credentials
Edit the `.env` file with your development/sandbox credentials:
```bash
# Development credentials
PLAID_CLIENT_ID=your_dev_plaid_client_id
PLAID_SECRET=your_dev_plaid_secret
FYERS_APP_ID=your_dev_fyers_app_id
FYERS_APP_SECRET=your_dev_fyers_app_secret
```

### 3. Setup Production Environment
```bash
npm run config setup-prod
# This creates .env.production from .env.example
```

### 4. Configure Production Credentials
Edit the `.env.production` file with your production credentials:
```bash
# Production credentials
PLAID_CLIENT_ID=your_prod_plaid_client_id
PLAID_SECRET=your_prod_plaid_secret
FYERS_APP_ID=your_prod_fyers_app_id
FYERS_APP_SECRET=your_prod_fyers_app_secret
```

## 🚀 Deployment

### Development Deployment
```bash
cd functions
npm run deploy:dev
```

This will:
- ✅ Load credentials from `.env`
- ✅ Set Firebase config for sandbox/development
- ✅ Deploy functions with development settings
- ✅ Use Plaid sandbox environment

### Production Deployment
```bash
cd functions
npm run deploy:prod
```

This will:
- ⚠️  Show safety warning
- ✅ Load credentials from `.env.production`
- ✅ Set Firebase config for production
- ✅ Deploy functions with production settings
- ✅ Use Plaid production environment

## 🔍 Configuration Management

### View Current Configuration
```bash
npm run config:show
```

### Validate Environment Files
```bash
npm run config:validate
```

### Clear All Configuration
```bash
./config.sh clear
```

## 🔐 Security Features

### ✅ What's Secure Now:
- 🔒 No hardcoded credentials in source code
- 🔒 Separate environment files for dev/prod
- 🔒 Environment files are gitignored
- 🔒 Production deployment requires confirmation
- 🔒 Automatic environment validation
- 🔒 Uses Firebase Functions config system

### 🚫 What to Avoid:
- ❌ Never commit `.env` or `.env.production` files
- ❌ Never share credentials in chat/email
- ❌ Never use production credentials in development
- ❌ Never hardcode credentials in source code

## 🔄 Environment Differences

| Feature | Development | Production |
|---------|-------------|------------|
| Plaid Environment | Sandbox | Production |
| Error Logging | Verbose | Minimal |
| Rate Limits | Relaxed | Strict |
| Data | Test Data | Real Data |

## 🆘 Troubleshooting

### Missing Environment Variables
```bash
npm run config:validate
# Shows which variables are missing
```

### Configuration Issues
```bash
npm run config:show
# Shows current Firebase Functions config
```

### Reset Configuration
```bash
./config.sh clear
# Clears all Firebase Functions config
```

### Permission Issues
```bash
chmod +x *.sh
# Makes scripts executable
```

## 📝 Quick Start Checklist

- [ ] Run `npm run config setup-dev`
- [ ] Edit `.env` with development credentials
- [ ] Run `npm run config:validate`
- [ ] Run `npm run deploy:dev`
- [ ] Test development deployment
- [ ] Run `npm run config setup-prod`
- [ ] Edit `.env.production` with production credentials
- [ ] Run `npm run deploy:prod` (when ready)

## 🔗 Useful Commands

```bash
# View function logs
npm run logs

# Start local emulator
npm run serve

# Deploy everything (hosting + functions)
firebase deploy

# Deploy only functions
npm run deploy:dev  # or deploy:prod
```

---

**🎉 Your deployment is now secure and automated!**