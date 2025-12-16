
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
            processedData.currency = 'INR';
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

                // Weighted Average Price
                // ((OldQty * OldPrice) + (NewQty * NewPrice)) / TotalQty
                const oldTotalValue = (parseFloat(existing.quantity || 0) * parseFloat(existing.buyPrice || 0));
                const newAddValue = (parseFloat(processedData.quantity || 0) * parseFloat(processedData.buyPrice || 0));

                const newAvgPrice = (oldTotalValue + newAddValue) / totalQuantity;

                return await doc.ref.update({
                    quantity: totalQuantity,
                    buyPrice: newAvgPrice,
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
            processedData.currency = 'INR';
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
            const value = asset.quantity * asset.buyPrice; // Simple calculation (price * qty)
            // Ideally we fetch real-time price here. For now using buyPrice.
            const valueInINR = utils.convertToINR(value, asset.currency);
            return total + valueInINR;
        }, 0);
    },

    // Group assets by type
    groupAssetsByType: (assets) => {
        if (!assets || !Array.isArray(assets)) return {};
        return assets.reduce((acc, asset) => {
            const type = asset.type;
            const value = asset.quantity * asset.buyPrice;
            const valueInINR = utils.convertToINR(value, asset.currency);

            if (!acc[type]) acc[type] = 0;
            acc[type] += valueInINR;
            return acc;
        }, {});
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = db;
}
