# Plaid API Endpoints Documentation

## Overview
The Plaid integration has been migrated from Firebase callable functions to Express API endpoints for better flexibility and consistency with the rest of the API structure.

## Authentication
All Plaid endpoints require Firebase Authentication. Include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

## Base URL
```
https://your-project.cloudfunctions.net/app
```

## Endpoints

### 1. Create Link Token
**Endpoint:** `POST /plaid/create-link-token`

Creates a link token for Plaid Link initialization.

**Request Body:**
```json
{
  "client_name": "Your App Name",           // Optional, defaults to "CMP Expense Tracker"
  "products": ["transactions"],             // Optional, defaults to ["transactions"]
  "country_codes": ["US"],                  // Optional, defaults to ["US"]
  "language": "en"                          // Optional, defaults to "en"
}
```

**Response:**
```json
{
  "success": true,
  "link_token": "link-sandbox-12345...",
  "expiration": "2024-01-01T12:00:00Z"
}
```

**Usage Example:**
```javascript
const response = await fetch('/plaid/create-link-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${firebaseIdToken}`
  },
  body: JSON.stringify({
    client_name: "My Banking App"
  })
});
```

### 2. Exchange Public Token
**Endpoint:** `POST /plaid/exchange-token`

Exchanges a public token from Plaid Link for an access token and stores it securely.

**Request Body:**
```json
{
  "public_token": "public-sandbox-12345..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token exchanged successfully",
  "itemId": "item_12345..."
}
```

**Usage Example:**
```javascript
const response = await fetch('/plaid/exchange-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${firebaseIdToken}`
  },
  body: JSON.stringify({
    public_token: publicToken
  })
});
```

### 3. Get Transactions
**Endpoint:** `POST /plaid/get-transactions`

Fetches bank transactions for a specified date range.

**Request Body:**
```json
{
  "startDate": "2024-01-01",               // Required: YYYY-MM-DD format
  "endDate": "2024-01-31",                 // Required: YYYY-MM-DD format
  "count": 100,                            // Optional: max 500, defaults to 100
  "offset": 0                              // Optional: for pagination, defaults to 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "transaction_id": "txn_12345...",
        "account_id": "acc_12345...",
        "amount": 25.99,
        "date": "2024-01-15",
        "name": "Coffee Shop",
        "category": ["Food and Drink", "Restaurants"],
        // ... other transaction fields
      }
    ],
    "total_transactions": 150,
    "count": 100,
    "offset": 0
  }
}
```

**Usage Example:**
```javascript
const response = await fetch('/plaid/get-transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${firebaseIdToken}`
  },
  body: JSON.stringify({
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    count: 50
  })
});
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Common Error Codes:
- **400**: Missing required fields or invalid request
- **401**: Missing or invalid authentication token
- **404**: User not found
- **500**: Internal server error

## Migration Notes

### Changes from Callable Functions:
1. **Authentication**: Now uses Authorization header instead of Firebase Auth context
2. **Request Format**: HTTP POST requests with JSON body instead of callable function data
3. **Response Format**: Consistent JSON responses with success/error structure
4. **Error Handling**: HTTP status codes instead of Firebase HttpsError

### Benefits:
- ✅ **Consistency**: Matches other API endpoints in the project
- ✅ **Flexibility**: Can be called from any HTTP client
- ✅ **Testing**: Easier to test with standard HTTP tools
- ✅ **Documentation**: Better API documentation support
- ✅ **Monitoring**: Standard HTTP monitoring and logging

### Frontend Integration:
Replace Firebase callable function calls:

**Before (Callable Functions):**
```javascript
const exchangeToken = firebase.functions().httpsCallable('exchangePublicToken');
const result = await exchangeToken({ public_token: token });
```

**After (API Endpoints):**
```javascript
const response = await fetch('/plaid/exchange-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${await user.getIdToken()}`
  },
  body: JSON.stringify({ public_token: token })
});
const result = await response.json();
```

## Security Features

1. **Firebase Authentication**: All endpoints require valid Firebase ID tokens
2. **Input Validation**: Required fields are validated before processing
3. **Secure Storage**: Access tokens are stored securely in Firestore
4. **Error Handling**: Sensitive information is not exposed in error messages
5. **Rate Limiting**: Built-in Plaid API rate limiting protection

## Database Collections

### `users` Collection
Stores Plaid access tokens and item IDs:
```json
{
  "accessToken": "access-sandbox-12345...",
  "itemId": "item_12345...",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

### `users/{userId}/transactions` Subcollection
Stores fetched transactions with metadata:
```json
{
  "transaction_id": "txn_12345...",
  "account_id": "acc_12345...",
  "amount": 25.99,
  "date": "2024-01-15",
  "name": "Coffee Shop",
  "fetchedAt": "2024-01-01T12:00:00Z",
  // ... other Plaid transaction fields
}
```