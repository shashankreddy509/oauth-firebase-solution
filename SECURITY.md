# 🔐 Security Configuration Guide

## ⚠️ CRITICAL: Environment Variables Setup

This project requires sensitive API credentials that **MUST NEVER** be hardcoded in your source code.

### 🚨 Security Issues Fixed

The following hardcoded credentials have been removed:
- ✅ Plaid API credentials moved to environment variables
- ✅ Fyers API credentials removed from frontend (security risk!)
- ✅ Added proper .gitignore rules

### 📋 Required Environment Variables

#### For Firebase Functions (`functions/.env`):

```bash
# Plaid API Credentials
PLAID_CLIENT_ID=your_plaid_client_id_here
PLAID_SECRET=your_plaid_secret_here

# Fyers API Credentials  
FYERS_APP_ID=your_fyers_app_id_here
FYERS_APP_SECRET=your_fyers_app_secret_here

# Environment
PLAID_ENVIRONMENT=sandbox
```

### 🛠️ Setup Instructions

1. **Copy the example file:**
   ```bash
   cd functions
   cp .env.example .env
   ```

2. **Fill in your actual credentials:**
   - Get Plaid credentials from [Plaid Dashboard](https://dashboard.plaid.com/)
   - Get Fyers credentials from [Fyers API Portal](https://myapi.fyers.in/)

3. **Deploy with Firebase:**
   ```bash
   # Set environment variables for Firebase Functions
   firebase functions:config:set \
     plaid.client_id="your_plaid_client_id" \
     plaid.secret="your_plaid_secret" \
     fyers.app_id="your_fyers_app_id" \
     fyers.app_secret="your_fyers_app_secret"
   
   # Deploy
   firebase deploy --only functions
   ```

### 🚫 What NOT to Do

- ❌ **NEVER** commit `.env` files to git
- ❌ **NEVER** put API secrets in frontend JavaScript
- ❌ **NEVER** hardcode credentials in source code
- ❌ **NEVER** share credentials in chat/email/slack

### ✅ Best Practices

- ✅ Use environment variables for all secrets
- ✅ Keep credentials server-side only
- ✅ Use different credentials for dev/staging/prod
- ✅ Rotate credentials regularly
- ✅ Monitor for credential exposure

### 🔍 Security Checklist

- [ ] All hardcoded secrets removed
- [ ] Environment variables configured
- [ ] .env files added to .gitignore
- [ ] Firebase Functions config set
- [ ] Frontend doesn't contain any secrets
- [ ] Different credentials for each environment

### 🆘 If Credentials Are Compromised

1. **Immediately revoke** the exposed credentials
2. **Generate new** API keys/secrets
3. **Update** your environment variables
4. **Redeploy** your application
5. **Monitor** for unauthorized usage

---

**Remember: Security is not optional when handling financial data!**