const utils = {
    // Format currency (INR/USD)
    formatCurrency: (amount, currency = 'INR') => {
        if (!amount && amount !== 0) return '₹ 0.00';

        const formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 2
        });
        return formatter.format(amount);
    },

    // Convert any currency to INR (Mock rate for now)
    convertToINR: (amount, fromCurrency) => {
        const RATES = {
            'USD': 83.5, // Mock rate
            'INR': 1
        };
        return amount * (RATES[fromCurrency] || 1);
    },

    // Format Date
    formatDate: (timestamp) => {
        if (!timestamp) return 'N/A';
        // Handle Firebase Timestamp
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        }).format(date);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = utils;
}
