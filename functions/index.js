/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

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

// Validate required configuration
if (!config.plaid?.client_id || !config.plaid?.secret) {
  throw new Error('Missing required Plaid configuration. Run: firebase functions:config:set plaid.client_id="..." plaid.secret="..."');
}

const plaidClient = new PlaidApi(configuration);

// 🔄 Exchange public token for access token
exports.exchangePublicToken = functions.https.onCall(async (data, context) => {
  try {
    const { public_token } = data;
    const userId = context.auth.uid;

    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Store securely in Firestore
    await db.collection("users").doc(userId).set({
      accessToken,
      itemId,
    }, { merge: true });

    return { status: "success" };
  } catch (error) {
    console.error("Error exchanging token:", error);
    throw new functions.https.HttpsError("internal", "Unable to exchange token.");
  }
});

// 🔍 Fetch transactions for a date range
exports.getTransactions = functions.https.onCall(async (data, context) => {
  try {
    const { startDate, endDate } = data;
    const userId = context.auth.uid;

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found.");
    }

    const accessToken = userDoc.data().accessToken;

    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        count: 100,
        offset: 0,
      },
    });

    const transactions = response.data.transactions;

    // Optionally store in Firestore
    const batch = db.batch();
    const userTxnRef = db.collection("users").doc(userId).collection("transactions");
    transactions.forEach(txn => {
      batch.set(userTxnRef.doc(txn.transaction_id), txn, { merge: true });
    });
    await batch.commit();

    return { status: "success", transactions };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw new functions.https.HttpsError("internal", "Unable to fetch transactions.");
  }
});

// 🧷 Generate a link_token for Plaid Link
exports.createLinkToken = functions.https.onCall(async (data, context) => {
  try {
    const userId = context.auth.uid;

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: userId,
      },
      client_name: "CMP Expense Tracker",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
      redirect_uri: "", // Optional for OAuth flows
    });

    return {
      link_token: response.data.link_token,
    };
  } catch (error) {
    console.error("Error creating link token:", error.response?.data || error);
    throw new functions.https.HttpsError("internal", "Unable to create link token.");
  }
});

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Helper function to generate app ID hash (matching your Swift implementation)
function generateAppIdHash(appId, appSecret) {
    // This should match your Swift generateAppIdHash() function
    // Typically it's SHA256 hash of appId:appSecret
    const data = `${appId}:${appSecret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Helper function to validate required fields
function validateRequiredFields(body, requiredFields) {
    const missing = requiredFields.filter(field => !body[field]);
    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
}


// Helper function to generate user ID from auth code or user info
function generateUserId(authCode, userInfo = null) {
    if (userInfo && userInfo.userId) {
        return userInfo.userId;
    }
    // Generate a hash from auth code as fallback
    return crypto.createHash('md5').update(authCode).digest('hex');
}

// Helper function to check if a user is already registered
async function isUserRegistered(userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    return userDoc.exists;
}

// Endpoint 1: Exchange auth code for token and save to Firestore
app.post('/oauth/exchange-token', async (req, res) => {
    try {
        const { code, appId, appSecret, userId } = req.body;
        
        // Validate required fields
        validateRequiredFields(req.body, ['code', 'appId', 'appSecret']);
        
        console.log('Token exchange request:', { code: code.substring(0, 10) + '...', appId });
        
        // Generate app ID hash
        const appIdHash = generateAppIdHash(appId, appSecret);
        
        // Call Fyers API to exchange code for token
        const fyersResponse = await fetch('https://api-t1.fyers.in/api/v3/validate-authcode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                appIdHash: appIdHash,
                code: code
            })
        });
        
        if (!fyersResponse.ok) {
            const errorText = await fyersResponse.text();
            throw new Error(`Fyers API error: ${fyersResponse.status} - ${errorText}`);
        }
        
        const tokenData = await fyersResponse.json();
        
        if (!tokenData.access_token) {
            throw new Error('No access token received from Fyers API');
        }
        
        // Generate user ID if not provided
        const finalUserId = userId || generateUserId(code);
        
        // Prepare data for Firestore
        const tokenRecord = {
            userId: finalUserId,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            tokenType: tokenData.token_type || 'Bearer',
            expiresIn: tokenData.expires_in || null,
            scope: tokenData.scope || null,
            appId: appId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            isActive: true,
            source: 'oauth_exchange'
        };
        
        // Save to Firestore
        const docRef = await db.collection('oauth_tokens').add(tokenRecord);
        
        console.log('Token saved successfully:', docRef.id);
        
        // Return success response (without sensitive token data)
        res.status(200).json({
            success: true,
            message: 'Token exchanged and saved successfully',
            tokenId: docRef.id,
            userId: finalUserId,
            expiresIn: tokenData.expires_in,
            tokenType: tokenData.token_type
        });
        
    } catch (error) {
        console.error('Token exchange error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});


// Endpoint 2: Save token data directly (for when you already have the token)
app.post('/oauth/save-token', async (req, res) => {
    try {
        const { 
            userId, 
            accessToken, 
            refreshToken, 
            tokenType, 
            expiresIn, 
            scope, 
            appId 
        } = req.body;
        
        // Validate required fields
        validateRequiredFields(req.body, ['userId', 'accessToken', 'appId']);
        
        console.log('Direct token save request:', { userId, appId });
        
        // Check if token already exists for this user and app
        const existingTokenQuery = await db.collection('oauth_tokens')
            .where('userId', '==', userId)
            .where('appId', '==', appId)
            .where('isActive', '==', true)
            .get();
        
        // Deactivate existing tokens for this user/app combination
        const batch = db.batch();
        existingTokenQuery.forEach(doc => {
            batch.update(doc.ref, { 
                isActive: false, 
                deactivatedAt: admin.firestore.FieldValue.serverTimestamp() 
            });
        });
        
        // Prepare new token record
        const tokenRecord = {
            userId: userId,
            accessToken: accessToken,
            refreshToken: refreshToken || null,
            tokenType: tokenType || 'Bearer',
            expiresIn: expiresIn || null,
            scope: scope || null,
            appId: appId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            isActive: true,
            source: 'direct_save'
        };
        
        // Add new token to batch
        const newTokenRef = db.collection('oauth_tokens').doc();
        batch.set(newTokenRef, tokenRecord);
        
        // Execute batch write
        await batch.commit();
        
        console.log('Token saved successfully:', newTokenRef.id);
        
        res.status(200).json({
            success: true,
            message: 'Token saved successfully',
            tokenId: newTokenRef.id,
            userId: userId,
            replacedTokens: existingTokenQuery.size
        });
        
    } catch (error) {
        console.error('Token save error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint 3: Get user's active token
app.get('/oauth/get-token/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { appId } = req.query;
        
        if (!userId) {
            throw new Error('User ID is required');
        }
        
        let query = db.collection('oauth_tokens')
            .where('userId', '==', userId)
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(1);
        
        if (appId) {
            query = query.where('appId', '==', appId);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            return res.status(404).json({
                success: false,
                message: 'No active token found for user'
            });
        }
        
        const tokenDoc = snapshot.docs[0];
        const tokenData = tokenDoc.data();
        
        // Return token data (be careful with sensitive information)
        res.status(200).json({
            success: true,
            tokenId: tokenDoc.id,
            userId: tokenData.userId,
            tokenType: tokenData.tokenType,
            expiresIn: tokenData.expiresIn,
            scope: tokenData.scope,
            appId: tokenData.appId,
            createdAt: tokenData.createdAt,
            // Only return access token if explicitly requested
            ...(req.query.includeToken === 'true' && { accessToken: tokenData.accessToken })
        });
        
    } catch (error) {
        console.error('Get token error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint 4: Revoke/deactivate token
app.post('/oauth/revoke-token', async (req, res) => {
    try {
        const { userId, tokenId, appId } = req.body;
        
        if (!userId && !tokenId) {
            throw new Error('Either userId or tokenId is required');
        }
        
        let query;
        if (tokenId) {
            // Revoke specific token
            const tokenRef = db.collection('oauth_tokens').doc(tokenId);
            await tokenRef.update({
                isActive: false,
                revokedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            res.status(200).json({
                success: true,
                message: 'Token revoked successfully',
                tokenId: tokenId
            });
        } else {
            // Revoke all tokens for user/app
            query = db.collection('oauth_tokens')
                .where('userId', '==', userId)
                .where('isActive', '==', true);
            
            if (appId) {
                query = query.where('appId', '==', appId);
            }
            
            const snapshot = await query.get();
            const batch = db.batch();
            
            snapshot.forEach(doc => {
                batch.update(doc.ref, {
                    isActive: false,
                    revokedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            
            res.status(200).json({
                success: true,
                message: `${snapshot.size} token(s) revoked successfully`,
                revokedCount: snapshot.size
            });
        }
        
    } catch (error) {
        console.error('Token revoke error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint to save token data
app.post('/api/save-token', async (req, res) => {
    try {
        const tokenData = req.body;
        
        // Validate the required fields
        if (!tokenData.code || !tokenData.access_token || !tokenData.refresh_token) {
            throw new Error('Missing required fields: code, access_token, or refresh_token');
        }

        // Prepare data for Firestore
        const tokenRecord = {
            code: tokenData.code,
            status: tokenData.s,
            refresh_token: tokenData.refresh_token,
            access_token: tokenData.access_token,
            message: tokenData.message,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Save to Firestore
        const docRef = await db.collection('fyers_tokens').doc(tokenData.user_id).set(tokenRecord);

        console.log('Token data saved successfully:', docRef.id);

        res.status(200).json({
            success: true,
            message: 'Token data saved successfully',
            tokenId: docRef.id
        });

    } catch (error) {
        console.error('Error saving token data:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint to fetch token data
app.get('/api/get-token/:tokenId', async (req, res) => {
    try {
        const { tokenId } = req.params;

        // Validate tokenId
        if (!tokenId) {
            throw new Error('Token ID is required');
        }

        // Fetch token from Firestore
        const tokenDoc = await db.collection('fyers_tokens').doc(tokenId).get();

        if (!tokenDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Token not found'
            });
        }

        const tokenData = tokenDoc.data();

        res.status(200).json({
            success: true,
            data: {
                code: tokenData.code,
                status: tokenData.status,
                refresh_token: tokenData.refresh_token,
                access_token: tokenData.access_token,
                message: tokenData.message,
                createdAt: tokenData.createdAt,
                updatedAt: tokenData.updatedAt
            }
        });

    } catch (error) {
        console.error('Error fetching token data:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get all tokens
app.get('/api/get-tokens', async (req, res) => {
    try {
        // Fetch all tokens from Firestore
        const tokensSnapshot = await db.collection('fyers_tokens')
            .orderBy('createdAt', 'desc')
            .get();

        const tokens = [];
        tokensSnapshot.forEach(doc => {
            tokens.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            success: true,
            data: tokens
        });

    } catch (error) {
        console.error('Error fetching tokens:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

exports.app = functions.https.onRequest(app);
