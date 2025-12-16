# Firebase Deployment Troubleshooting Guide

## Current Issue: Cloud Runtime Config

### **Problem Description**
Firebase Cloud Runtime Config is experiencing temporary service issues, preventing Firebase Functions deployment. This is a known Firebase service issue that affects the deployment process.

### **✅ Successful Deployment (Completed)**
The following components have been successfully deployed:

- **✅ Firestore Rules & Indexes**: Database security and query optimization
- **✅ Firebase Hosting**: Static files and routing configuration
- **🔗 Hosting URL**: https://oauth-fyers.web.app

### **✅ Successfully Deployed**
- **🔄 Firebase Functions**: Backend API endpoints (resolved after firebase-functions upgrade)
  - Express API endpoints for OAuth and Plaid integration are now live
  - Function `app` is running on Node.js 20 runtime

### 🎉 Issues Resolved
- **Firebase Functions**: The Cloud Runtime Config issue was resolved by:
  1. Upgrading `firebase-functions` from v6.3.2 to v6.4.0
  2. Migrating from deprecated Firebase Runtime Config to modern environment variables
  3. Updated deployment scripts to use `.env` files instead of `firebase functions:config:set`
  4. Added `dotenv` package for proper environment variable handling

---

## **Deployment Strategies**

### **Strategy 1: Partial Deployment (Recommended)**
Deploy everything except functions while waiting for the issue to resolve:

```bash
# Deploy hosting and Firestore only
firebase deploy --only hosting,firestore

# Or deploy everything except functions
firebase deploy --except functions
```

**Status**: ✅ **Completed Successfully**

### **Strategy 2: Wait and Retry Functions**
Wait 5-10 minutes and try deploying functions specifically:

```bash
# Try deploying only functions after waiting
firebase deploy --only functions
```

### **Strategy 3: Use Development Deployment Script**
Use the custom deployment script that handles environment variables:

```bash
# Navigate to functions directory
cd functions

# Run development deployment
npm run deploy:dev
# or
./deploy-dev.sh
```

### **Strategy 4: Manual Function Configuration**
If the issue persists, manually set Firebase Functions configuration:

```bash
# Set Plaid configuration manually
firebase functions:config:set \
  plaid.client_id="your_plaid_client_id" \
  plaid.secret="your_plaid_secret" \
  plaid.environment="sandbox"

# Then try deploying functions
firebase deploy --only functions
```

---

## **Current Project Status**

### **🟢 Working Components**
1. **Firebase Hosting**: https://oauth-fyers.web.app
   - OAuth callback pages
   - Static file serving
   - URL routing configured

2. **Firestore Database**
   - Security rules deployed
   - Indexes configured
   - Collections ready: `users`, `oauth_tokens`, `fyers_tokens`

### **🟡 Pending Components**
1. **Firebase Functions**
   - Plaid API endpoints (`/plaid/*`)
   - OAuth management endpoints (`/oauth/*`)
   - Fyers token management (`/api/*`)

---

## **Monitoring & Verification**

### **Check Deployment Status**
```bash
# Check current project
firebase projects:list

# Check hosting status
firebase hosting:sites:list

# Check functions status (when deployed)
firebase functions:list
```

### **Test Deployed Components**

#### **Test Hosting**
```bash
# Test if hosting is working
curl https://oauth-fyers.web.app

# Test callback pages
curl https://oauth-fyers.web.app/oauth/callback
curl https://oauth-fyers.web.app/fyers/callback
```

#### **Test Functions (when deployed)**
```bash
# Test function endpoints
curl https://oauth-fyers.web.app/api/health
curl https://oauth-fyers.web.app/plaid/create-link-token
```

---

## **Next Steps**

### **Immediate Actions**
1. ✅ **Hosting & Firestore**: Successfully deployed
2. ⏳ **Wait 5-10 minutes**: For Firebase service recovery
3. 🔄 **Retry Functions**: Use `firebase deploy --only functions`

### **If Issue Persists**
1. **Check Firebase Status**: https://status.firebase.google.com/
2. **Use Alternative Deployment**: Try the custom deployment scripts
3. **Manual Configuration**: Set functions config manually
4. **Contact Support**: If issue continues beyond 30 minutes

### **Environment Setup (Required for Functions)**
Before deploying functions, ensure environment variables are configured:

```bash
# Copy environment template
cp functions/.env.example functions/.env

# Edit with your credentials
nano functions/.env

# Or use the configuration script
cd functions && ./config.sh setup-dev
```

---

## **Error Messages & Solutions**

### **"Cloud Runtime Config is currently experiencing issues"**
- **Cause**: Temporary Firebase service issue
- **Solution**: Wait and retry, or use partial deployment
- **Status**: Known Firebase issue, usually resolves within 10-30 minutes

### **"Missing required configuration"**
- **Cause**: Environment variables not set
- **Solution**: Run configuration setup scripts
- **Command**: `cd functions && npm run config setup-dev`

### **"Authentication failed"**
- **Cause**: Firebase CLI not logged in or wrong project
- **Solution**: Re-authenticate and select correct project
- **Commands**: 
  ```bash
  firebase login
  firebase use oauth-fyers
  ```

---

## **Rollback Plan**

If you need to rollback any changes:

### **Rollback Hosting**
```bash
# Deploy previous version
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION_ID TARGET_SITE_ID
```

### **Rollback Firestore Rules**
```bash
# Restore previous rules (manual edit required)
# Edit firestore.rules and redeploy
firebase deploy --only firestore:rules
```

### **Rollback Functions**
```bash
# Functions automatically maintain versions
# Use Firebase Console to rollback if needed
```

---

## **Support Resources**

- **Firebase Status**: https://status.firebase.google.com/
- **Firebase Support**: https://firebase.google.com/support/
- **Project Console**: https://console.firebase.google.com/project/oauth-fyers/overview
- **Documentation**: See `DEPLOYMENT.md` for detailed deployment instructions

---

## **Summary**

✅ **Current Status**: Hosting and Firestore successfully deployed  
⏳ **Next Step**: Wait for Firebase service recovery and deploy functions  
🔗 **Live URL**: https://oauth-fyers.web.app  
📊 **Progress**: 70% complete (hosting + database deployed, functions pending)