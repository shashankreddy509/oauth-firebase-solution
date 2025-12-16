const ui = {
    allAssets: [],
    currentFilter: 'ALL',

    // Filter Logic
    filterAssets: (type) => {
        ui.currentFilter = type;
        ui.renderAssets();
    },

    // Main Render Function
    renderAssets: () => {
        const assets = ui.allAssets;

        // 1. Filter for List
        let filtered = assets;
        if (ui.currentFilter !== 'ALL') {
            filtered = assets.filter(a => a.type === ui.currentFilter);
        }

        // 2. Update Stats (using FILTERED assets) & Global Chart
        ui.updateDashboardStats(filtered);
        ui.renderCharts(assets);

        const container = document.getElementById('assets-list');
        container.innerHTML = '';

        if (filtered.length === 0) {
            if (filtered.length === 0) {
                container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fa-solid fa-plus"></i>
                    </div>
                    <p>No assets found in this category.</p>
                    <button onclick="ui.showAddAssetModal('${ui.currentFilter !== 'ALL' ? ui.currentFilter : 'STOCK'}')" class="empty-action">Add your first asset</button>
                </div>
            `;
                return;
            }
            return;
        }

        filtered.forEach(asset => ui.createAssetCard(asset, container));
    },

    // Card Helper
    createAssetCard: (asset, container) => {
        const value = asset.quantity * asset.buyPrice;
        const iconClass = ui.getIconForType(asset.type);

        const card = document.createElement('div');
        card.className = 'asset-card fade-in';
        card.innerHTML = `
            <div class="asset-header">
                <div class="asset-icon-box">
                    <i class="${iconClass}"></i>
                </div>
                <div class="asset-info">
                    <div style="display: flex; justify-content: space-between;">
                        <div class="asset-name">${asset.name}</div>
                        <span class="tag">${asset.type}</span>
                    </div>
                    <div class="asset-sub">
                        ${asset.ticker || 'Global'}
                    </div>
                </div>
            </div>
            
            <div class="asset-stats">
                <div class="text-muted" style="font-size: 0.85rem;">
                    ${asset.quantity} units @ ${utils.formatCurrency(asset.buyPrice, asset.currency)}
                </div>
                <div class="asset-total">
                    ${utils.formatCurrency(value, asset.currency)}
                </div>
            </div>
            
            <div style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 15px;">
                 <button onclick="ui.editAsset('${asset.id}')" title="Edit Asset" style="background:none; border:none; color: var(--text-muted); cursor: pointer; font-size: 1rem; transition: color 0.2s;">
                    <i class="fa-regular fa-pen-to-square"></i>
                 </button>
                 <button onclick="db.deleteAsset('${asset.id}')" title="Delete Asset" style="background:none; border:none; color: var(--text-muted); cursor: pointer; font-size: 1rem; transition: color 0.2s;">
                    <i class="fa-regular fa-trash-can hover-red"></i>
                 </button>
            </div>
        `;
        container.appendChild(card);
    },

    getIconForType: (type) => {
        const map = {
            'STOCK': 'fa-solid fa-arrow-trend-up',
            'MF': 'fa-solid fa-shapes',
            'PROPERTY': 'fa-solid fa-house',
            'GOLD': 'fa-solid fa-coins',
            'CASH': 'fa-solid fa-money-bill-wave'
        };
        return map[type] || 'fa-solid fa-circle';
    },

    // Stats
    updateDashboardStats: (assets) => {
        const netWorth = db.calculateNetWorth(assets);
        const grouped = db.groupAssetsByType(assets);

        // Update Label
        const labelText = ui.currentFilter === 'ALL' ? 'Total Net Worth' : 'Total ' + ui.currentFilter.charAt(0) + ui.currentFilter.slice(1).toLowerCase() + ' Value';
        // Simple casing logic. Better: use map.
        const niceNames = {
            'ALL': 'Net Worth',
            'STOCK': 'Stocks Value',
            'MF': 'Mutual Funds Value',
            'PROPERTY': 'Property Value',
            'GOLD': 'Gold Value',
            'CASH': 'Cash Value'
        };
        const displayLabel = niceNames[ui.currentFilter] || 'Total Value';

        const labelEl = document.querySelector('.label-text');
        if (labelEl) labelEl.textContent = displayLabel;

        // Update Big Number
        document.querySelector('.net-worth-value').textContent = parseInt(netWorth).toLocaleString('en-IN');
        document.querySelector('.net-worth-short').textContent = '₹' + parseInt(netWorth).toLocaleString('en-IN');

        // Update Boxes
        document.getElementById('stat-stocks').textContent = utils.formatCurrency((grouped['STOCK'] || 0) + (grouped['MF'] || 0), 'INR');
        document.getElementById('stat-property').textContent = utils.formatCurrency(grouped['PROPERTY'] || 0, 'INR');
        document.getElementById('stat-gold').textContent = utils.formatCurrency(grouped['GOLD'] || 0, 'INR');
        if (document.getElementById('stat-cash')) {
            document.getElementById('stat-cash').textContent = utils.formatCurrency(grouped['CASH'] || 0, 'INR');
        }
    },

    // Chart
    renderCharts: (assets) => {
        console.log("RenderCharts called. Filter:", ui.currentFilter);
        let labels = [];
        let data = [];

        // If 'ALL', group by TYPE
        if (ui.currentFilter === 'ALL') {
            console.log("Grouping by TYPE");
            const grouped = db.groupAssetsByType(assets);
            labels = Object.keys(grouped);
            data = Object.values(grouped);
        } else {
            console.log("Grouping by TICKER/NAME");
            // If Specific Category, group by NAME/TICKER
            // We use the 'assets' array which is already filtered in renderAssets logic before passing here?
            // Actually renderAssets passes 'ui.allAssets' if we see previous code?
            // Wait, I updated renderAssets to pass 'assets' (which is allAssets) in step 756?
            // "ui.renderCharts(assets);" <-- this is using allAssets. 

            // Correction: I must filter it HERE again or rely on what's passed.
            // renderAssets currently does: ui.updateDashboardStats(filtered); ui.renderCharts(assets);
            // So 'assets' here is ALL assets. I need to filter inside here or change renderAssets.
            // Let's rely on ui.currentFilter to do the filtering here for safety.

            const filtered = assets.filter(a => a.type === ui.currentFilter);
            console.log("Filtered Assets for Chart:", filtered.length);

            // Group by Name or Ticker
            const grouped = filtered.reduce((acc, asset) => {
                const label = asset.ticker || asset.name;
                const value = asset.quantity * asset.buyPrice;
                const valueInINR = utils.convertToINR(value, asset.currency);

                if (!acc[label]) acc[label] = 0;
                acc[label] += valueInINR;
                return acc;
            }, {});

            labels = Object.keys(grouped);
            data = Object.values(grouped);
            console.log("Chart Labels:", labels);
        }

        const ctx = document.getElementById('allocationChart');
        if (!ctx) return;

        if (window.allocationChart instanceof Chart) {
            window.allocationChart.destroy();
        }

        window.allocationChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%', // Thinner ring
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20
                        }
                    }
                }
            }
        });
    },

    // Modals
    showAddAssetModal: (type = 'STOCK') => {
        document.getElementById('add-asset-modal').classList.remove('hidden');
        document.querySelector('.modal-header h3').textContent = 'Add New Asset';

        // Select the correct option in dropdown
        const select = document.querySelector('select[name="type"]');
        if (select) {
            select.value = type;
            ui.toggleAssetFields(type);
        }
    },

    editAsset: (id) => {
        const asset = ui.allAssets.find(a => a.id === id);
        if (!asset) return;

        document.getElementById('add-asset-modal').classList.remove('hidden');
        document.querySelector('.modal-header h3').textContent = 'Edit Asset';

        // Populate Form
        const form = document.getElementById('addAssetForm');
        form.assetId.value = asset.id;
        form.type.value = asset.type;
        form.name.value = asset.name;
        form.ticker.value = asset.ticker || '';
        form.quantity.value = asset.quantity;

        // Handle Price (Create was in INR mostly, but form allows currency selection)
        // For simplicity, we show the stored Buy Price and stored Currency
        form.buyPrice.value = asset.buyPrice;
        form.currency.value = asset.currency;

        ui.toggleAssetFields(asset.type);
    },

    hideModal: () => {
        document.getElementById('add-asset-modal').classList.add('hidden');
        const form = document.getElementById('addAssetForm');
        form.reset();
        form.assetId.value = ''; // Clear ID
    },

    toggleAssetFields: (type) => {
        const ticker = document.getElementById('ticker-field');
        if (ticker) ticker.style.display = (type === 'STOCK' || type === 'MF') ? 'block' : 'none';
    }
};
