
const db = {
    // Collection References
    usersCol: () => firebase.firestore().collection('users'),

    // Add new asset (or update existing)
    addAsset: async (assetData) => {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('User not authenticated');

        // Automatic Currency Conversion (USD -> INR)
        let processedData = { ...assetData };
        if (processedData.currency === 'USD') {
            const rate = 83.5; // Fixed rate as per utils.js
            processedData.buyPrice = processedData.buyPrice * rate;
            processedData.currentPrice = (processedData.currentPrice || processedData.buyPrice) * rate;
            processedData.currency = 'INR';
        } else {
            // Ensure currentPrice is set even for INR
            processedData.currentPrice = processedData.currentPrice || processedData.buyPrice;
        }

        const assetsRef = db.usersCol().doc(user.uid).collection('assets');

        // Check if ticker exists (only for assets with tickers)
        if (processedData.ticker && processedData.ticker.trim() !== '') {
            const normalizedTicker = processedData.ticker.trim().toUpperCase();

            const snapshot = await assetsRef.where('ticker', '==', normalizedTicker).get();

            if (!snapshot.empty) {
                // Asset exists, update it
                const doc = snapshot.docs[0];
                const existing = doc.data();

                const totalQuantity = parseFloat(existing.quantity || 0) + parseFloat(processedData.quantity || 0);

                // Weighted Average Price for BUY PRICE
                // ((OldQty * OldPrice) + (NewQty * NewPrice)) / TotalQty
                const oldTotalValue = (parseFloat(existing.quantity || 0) * parseFloat(existing.buyPrice || 0));
                const newAddValue = (parseFloat(processedData.quantity || 0) * parseFloat(processedData.buyPrice || 0));

                const newAvgBuyPrice = (oldTotalValue + newAddValue) / totalQuantity;

                // For Current Price: Use the LATEST provided current price (from this new entry)
                // If the user didn't provide it explicitly, app.js defaulted it to buyPrice. 
                // We assume the new entry carries the latest market data.
                const newCurrentPrice = processedData.currentPrice;

                return await doc.ref.update({
                    quantity: totalQuantity,
                    buyPrice: newAvgBuyPrice,
                    currentPrice: newCurrentPrice,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        // Add new if not exists or no ticker
        const data = {
            ...processedData,
            ticker: processedData.ticker ? processedData.ticker.trim().toUpperCase() : null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        return await assetsRef.add(data);
    },

    // Update specific asset by ID
    updateAsset: async (docId, assetData) => {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('User not authenticated');

        // Automatic Currency Conversion (USD -> INR)
        let processedData = { ...assetData };
        if (processedData.currency === 'USD') {
            const rate = 83.5;
            processedData.buyPrice = processedData.buyPrice * rate;
            processedData.currentPrice = (processedData.currentPrice || processedData.buyPrice) * rate;
            processedData.currency = 'INR';
        } else {
            processedData.currentPrice = processedData.currentPrice || processedData.buyPrice;
        }

        processedData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

        // Ensure ticker is uppercase if present
        if (processedData.ticker) {
            processedData.ticker = processedData.ticker.trim().toUpperCase();
        }

        return await db.usersCol().doc(user.uid).collection('assets').doc(docId).update(processedData);
    },

    // Get all assets (Real-time listener)
    listenToAssets: (callback) => {
        const user = firebase.auth().currentUser;
        if (!user) return;

        return db.usersCol().doc(user.uid).collection('assets')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const assets = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(assets);
            }, error => {
                console.error("Error fetching assets:", error);
            });
    },

    // Delete asset
    deleteAsset: async (assetId) => {
        const user = firebase.auth().currentUser;
        if (!user) return;

        await db.usersCol().doc(user.uid).collection('assets').doc(assetId).delete();
    },

    // Get total net worth (calculated on client side for now)
    calculateNetWorth: (assets) => {
        if (!assets || !Array.isArray(assets)) return 0;
        return assets.reduce((total, asset) => {
            // Use Current Price if available, else Buy Price
            const price = asset.currentPrice || asset.buyPrice;
            const value = asset.quantity * price;
            const valueInINR = utils.convertToINR(value, asset.currency);
            return total + valueInINR;
        }, 0);
    },

    // Get total invested value (for P&L)
    calculateInvestedValue: (assets) => {
        if (!assets || !Array.isArray(assets)) return 0;
        return assets.reduce((total, asset) => {
            const value = asset.quantity * asset.buyPrice;
            const valueInINR = utils.convertToINR(value, asset.currency);
            return total + valueInINR;
        }, 0);
    },

    // Group assets by type
    groupAssetsByType: (assets) => {
        if (!assets || !Array.isArray(assets)) return {};
        return assets.reduce((acc, asset) => {
            const type = asset.type;
            const price = asset.currentPrice || asset.buyPrice;
            const value = asset.quantity * price;
            const valueInINR = utils.convertToINR(value, asset.currency);

            if (!acc[type]) acc[type] = 0;
            acc[type] += valueInINR;
            return acc;
        }, {});
    },

    // --- Wishlist Functions ---

    // Add to Wishlist
    addToWishlist: async (data) => {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('User not authenticated');

        const wishlistRef = db.usersCol().doc(user.uid).collection('wishlist');

        return await wishlistRef.add({
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    // Delete from Wishlist
    deleteFromWishlist: async (id) => {
        const user = firebase.auth().currentUser;
        if (!user) return;
        await db.usersCol().doc(user.uid).collection('wishlist').doc(id).delete();
    },

    // Listen to Wishlist
    listenToWishlist: (callback) => {
        const user = firebase.auth().currentUser;
        if (!user) return;

        return db.usersCol().doc(user.uid).collection('wishlist')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const items = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(items);
            }, error => {
                console.error("Error fetching wishlist:", error);
            });
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = db;
}
