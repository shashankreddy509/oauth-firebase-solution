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

});
