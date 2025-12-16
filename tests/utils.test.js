const utils = require('../public/js/utils');

describe('Utils', () => {

    test('formatCurrency should format INR correctly', () => {
        expect(utils.formatCurrency(1000, 'INR')).toContain('1,000.00');
    });

    test('formatCurrency should format USD correctly', () => {
        const result = utils.formatCurrency(1000, 'USD');
        // Check for $ and 1,000.00 (exact string depends on locale, but these should exist)
        expect(result).toMatch(/\$/);
        expect(result).toMatch(/1,000\.00/);
    });

    test('formatCurrency should handle zero/null', () => {
        expect(utils.formatCurrency(0)).toContain('0.00');
        expect(utils.formatCurrency(null)).toContain('0.00');
    });

    test('convertToINR should use fixed rate of 83.5 for USD', () => {
        expect(utils.convertToINR(100, 'USD')).toBe(8350);
    });

    test('convertToINR should return same amount for INR', () => {
        expect(utils.convertToINR(100, 'INR')).toBe(100);
    });

});
