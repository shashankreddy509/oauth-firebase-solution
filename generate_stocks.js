const fs = require('fs');
const path = require('path');

const bsePath = path.join(__dirname, 'Equity.csv');
const nsePath = path.join(__dirname, 'EQUITY_L.csv');
const outputPath = path.join(__dirname, 'public', 'js', 'stocks.json');

function parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        // Simple CSV parse, assuming no commas in quoted strings for simplicity 
        // given the file preview didn't show quoted strings with commas for Ticker/Name
        // If there are, this might need a regex splitter.
        // Let's use a slightly more robust split
        let row = [];
        let cleanLine = lines[i].trim();
        if (!cleanLine) continue;

        let inQuote = false;
        let currentField = '';
        for (let char of cleanLine) {
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                row.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        row.push(currentField);

        if (row.length > 1) { // Basic validation
            let obj = {};
            headers.forEach((h, index) => {
                obj[h] = row[index] ? row[index].trim() : '';
            });
            data.push(obj);
        }
    }
    return data;
}

try {
    const stocks = [];
    const seenISINs = new Set();
    const seenTickers = new Set();

    // 1. Process NSE (Priority for Tickers)
    // Headers: SYMBOL,NAME OF COMPANY, SERIES, ...
    if (fs.existsSync(nsePath)) {
        console.log('Reading NSE data...');
        const nseData = parseCSV(fs.readFileSync(nsePath, 'utf8'));
        nseData.forEach(row => {
            // Filter for Equity series 'EQ' or 'BE' (often equity)
            if (['EQ', 'BE', 'BZ'].includes(row['SERIES'])) {
                const item = {
                    ticker: row['SYMBOL'],
                    name: row['NAME OF COMPANY'],
                    exchange: 'NSE'
                };
                if (item.ticker && !seenTickers.has(item.ticker)) {
                    stocks.push(item);
                    seenTickers.add(item.ticker);
                }
            }
        });
    }

    // 2. Process BSE
    // Headers: Security Code,Issuer Name,Security Id,Security Name, ...
    if (fs.existsSync(bsePath)) {
        console.log('Reading BSE data...');
        const bseData = parseCSV(fs.readFileSync(bsePath, 'utf8'));
        bseData.forEach(row => {
            // Columns: Security Code, Issuer Name, Security Id
            // Use Security Id as ticker if available and not numeric
            const ticker = row['Security Id'];
            const name = row['Security Name'];

            if (ticker && !seenTickers.has(ticker)) {
                stocks.push({
                    ticker: ticker,
                    name: name,
                    exchange: 'BSE'
                });
                seenTickers.add(ticker);
            }
        });
    }

    // Sort by Ticker
    stocks.sort((a, b) => a.ticker.localeCompare(b.ticker));

    console.log(`Total unique stocks: ${stocks.length}`);

    fs.writeFileSync(outputPath, JSON.stringify(stocks)); // No formatting to save space
    console.log('Successfully wrote to ' + outputPath);

} catch (err) {
    console.error('Error:', err);
}
