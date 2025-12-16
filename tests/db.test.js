// Mock Global Utils (since db.js assumes global utils)
global.utils = {
    convertToINR: (val, curr) => curr === 'INR' ? val : val * 83.5,
    formatCurrency: (val) => val
};

// Mock Firebase
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockAdd = jest.fn();
const mockListen = jest.fn();
const mockRef = { update: jest.fn() };

const mockFirestore = {
    collection: mockCollection,
    doc: mockDoc,
    FieldValue: {
        serverTimestamp: () => 'MOCK_TIMESTAMP'
    }
};

const mockAuth = {
    currentUser: { uid: 'test-user-id' }
};

global.firebase = {
    firestore: () => mockFirestore,
    auth: () => mockAuth
};
// Add global reference to firestore object methods for deeper mocking
global.firebase.firestore.FieldValue = mockFirestore.FieldValue;


const db = require('../public/js/db');

describe('DB Asset Logic', () => {

    // --- Pure Logic Tests ---

    test('calculateNetWorth should sum up all assets', () => {
        const assets = [
            { quantity: 10, buyPrice: 100, currency: 'INR' }, // 1000
            { quantity: 1, buyPrice: 10, currency: 'USD' }   // 10 * 83.5 = 835
        ];

        const total = db.calculateNetWorth(assets);
        expect(total).toBe(1835);
    });

    test('calculateNetWorth should return 0 for empty/null', () => {
        expect(db.calculateNetWorth([])).toBe(0);
        expect(db.calculateNetWorth(null)).toBe(0);
    });

    test('groupAssetsByType should group correctly', () => {
        const assets = [
            { type: 'STOCK', quantity: 10, buyPrice: 100, currency: 'INR' },
            { type: 'STOCK', quantity: 10, buyPrice: 100, currency: 'INR' },
            { type: 'GOLD', quantity: 5, buyPrice: 1000, currency: 'INR' }
        ];

        const grouped = db.groupAssetsByType(assets);

        expect(grouped['STOCK']).toBe(2000);
        expect(grouped['GOLD']).toBe(5000);
        expect(grouped['MF']).toBeUndefined();
    });

    // --- Async / Firebase Tests ---

    test('addAsset should convert USD to INR automatically', async () => {
        const asset = {
            ticker: 'GOOGL',
            quantity: 10,
            buyPrice: 100,
            currency: 'USD'
        };

        mockFirestore.collection.mockReturnValue({ doc: () => ({ collection: () => ({ where: () => ({ get: () => ({ empty: true }) }), add: mockAdd }) }) });

        await db.addAsset(asset);

        expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
            currency: 'INR',
            buyPrice: 8350 // 100 * 83.5
        }));
    });

    test('addAsset should deduplicate and average price', async () => {
        const newAsset = {
            ticker: 'AAPL',
            quantity: 10,
            buyPrice: 150, // New Price
            currency: 'INR'
        };

        // Mock Existing Asset: 10 units @ 100
        const existingData = { quantity: 10, buyPrice: 100, ticker: 'AAPL' };
        const mockUpdate = jest.fn();

        // Mock Finding Existing
        const mockWhere = jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'doc-1',
                    data: () => existingData,
                    ref: { update: mockUpdate }
                }]
            })
        });

        mockFirestore.collection.mockReturnValue({
            doc: () => ({
                collection: () => ({
                    where: mockWhere,
                    add: mockAdd
                })
            })
        });

        await db.addAsset(newAsset);

        // Expected:
        // Total Qty: 20
        // Total Val: (10*100) + (10*150) = 1000 + 1500 = 2500
        // Avg Price: 2500 / 20 = 125
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            quantity: 20,
            buyPrice: 125
        }));
    });

    test('updateAsset should update correct doc and convert currency', async () => {
        const updateData = {
            quantity: 50,
            buyPrice: 200,
            currency: 'USD',
            ticker: ' msft ' // Should standardize
        };

        const mockUpdate = jest.fn();

        // Mock chain: users -> doc(uid) -> collection(assets) -> doc(id) -> update
        mockFirestore.collection.mockReturnValue({
            doc: () => ({
                collection: () => ({
                    doc: (id) => {
                        if (id === 'test-doc-id') return { update: mockUpdate };
                        return {};
                    }
                })
            })
        });

        await db.updateAsset('test-doc-id', updateData);

        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            currency: 'INR',
            buyPrice: 16700, // 200 * 83.5
            ticker: 'MSFT',
            updatedAt: 'MOCK_TIMESTAMP'
        }));
    });

    test('addAsset should create new document if ticker does not exist', async () => {
        const newAsset = {
            ticker: 'TSLA',
            quantity: 5,
            buyPrice: 800,
            currency: 'USD'
        };

        // Mock empty snapshot (Ticker not found)
        mockFirestore.collection.mockReturnValue({
            doc: () => ({
                collection: () => ({
                    where: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue({ empty: true })
                    }),
                    add: mockAdd
                })
            })
        });

        await db.addAsset(newAsset);

        expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
            ticker: 'TSLA',
            currency: 'INR',
            buyPrice: 66800, // 800 * 83.5
            createdAt: 'MOCK_TIMESTAMP'
        }));
    });

    test('deleteAsset should call delete on valid doc ref', async () => {
        const mockDelete = jest.fn();

        mockFirestore.collection.mockReturnValue({
            doc: (uid) => ({
                collection: () => ({
                    doc: (id) => {
                        if (uid === 'test-user-id' && id === 'target-id') {
                            return { delete: mockDelete };
                        }
                        return {};
                    }
                })
            })
        });

        await db.deleteAsset('target-id');
        expect(mockDelete).toHaveBeenCalled();
    });

    test('Operations should throw/fail if user not authenticated', async () => {
        // Temporarily nullify currentUser
        const originalUser = mockAuth.currentUser;
        mockAuth.currentUser = null;

        await expect(db.addAsset({})).rejects.toThrow('User not authenticated');
        await expect(db.updateAsset('id', {})).rejects.toThrow('User not authenticated');

        // Restore user
        mockAuth.currentUser = originalUser;
    });

    test('calculateInvestedValue should strictly use buyPrice', () => {
        const assets = [
            { quantity: 10, buyPrice: 100, currentPrice: 200, currency: 'INR' }, // Invested: 1000
            { quantity: 1, buyPrice: 10, currentPrice: 50, currency: 'USD' }     // Invested: 835 (currentPrice ignored)
        ];

        const total = db.calculateInvestedValue(assets);
        expect(total).toBe(1835);
    });

    test('calculateNetWorth should prefer currentPrice over buyPrice', () => {
        const assets = [
            { quantity: 10, buyPrice: 100, currentPrice: 200, currency: 'INR' }, // Value: 2000
            { quantity: 1, buyPrice: 10, currentPrice: 20, currency: 'USD' }     // Value: 20 * 83.5 = 1670
        ];

        const total = db.calculateNetWorth(assets);
        expect(total).toBe(3670);
    });

    test('addAsset should save currentPrice', async () => {
        const asset = {
            ticker: 'NVDA',
            quantity: 1,
            buyPrice: 100,
            currentPrice: 150,
            currency: 'USD'
        };

        mockFirestore.collection.mockReturnValue({ doc: () => ({ collection: () => ({ where: () => ({ get: () => ({ empty: true }) }), add: mockAdd }) }) });

        await db.addAsset(asset);

        expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
            currency: 'INR',
            buyPrice: 8350,   // 100 * 83.5
            currentPrice: 12525 // 150 * 83.5
        }));
    });

    test('addAsset (deduplication) should update currentPrice to LATEST', async () => {
        const newAsset = {
            ticker: 'AAPL',
            quantity: 5,
            buyPrice: 200,
            currentPrice: 210, // Latest market price
            currency: 'INR'
        };

        // Existing: 10 units @ 100, Current Price was 110 (old)
        const existingData = { quantity: 10, buyPrice: 100, currentPrice: 110, ticker: 'AAPL' };
        const mockUpdate = jest.fn();

        const mockWhere = jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'doc-1',
                    data: () => existingData,
                    ref: { update: mockUpdate }
                }]
            })
        });

        mockFirestore.collection.mockReturnValue({
            doc: () => ({
                collection: () => ({
                    where: mockWhere,
                    add: mockAdd
                })
            })
        });

        await db.addAsset(newAsset);

        // Expected:
        // Buy Price (Avg): ((10*100) + (5*200)) / 15 = 2000 / 15 = 133.333...
        // Current Price: Should strictly be the NEW 210
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            quantity: 15,
            buyPrice: expect.closeTo(133.33, 2),
            currentPrice: 210
        }));
    });

});
