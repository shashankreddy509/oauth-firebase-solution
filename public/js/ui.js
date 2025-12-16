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

        // 1. Update Global Stats (using ALL assets)
        ui.updateDashboardStats(assets);
        ui.renderCharts(assets);

        // 2. Filter for List
        let filtered = assets;
        if (ui.currentFilter !== 'ALL') {
            filtered = assets.filter(a => a.type === ui.currentFilter);
        }

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
            
            <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                 <button onclick="db.deleteAsset('${asset.id}')" style="background:none; border:none; color: #ef4444; cursor: pointer; font-size: 0.8rem;">
                    Remove
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

        // Update Big Number
        document.querySelector('.net-worth-value').textContent = parseInt(netWorth).toLocaleString('en-IN');
        document.querySelector('.net-worth-short').textContent = '₹' + parseInt(netWorth).toLocaleString('en-IN');

        // Update Boxes
        document.getElementById('stat-stocks').textContent = utils.formatCurrency((grouped['STOCK'] || 0) + (grouped['MF'] || 0), 'INR');
        document.getElementById('stat-property').textContent = utils.formatCurrency(grouped['PROPERTY'] || 0, 'INR');
        document.getElementById('stat-gold').textContent = utils.formatCurrency(grouped['GOLD'] || 0, 'INR');
    },

    // Chart
    renderCharts: (assets) => {
        const grouped = db.groupAssetsByType(assets);
        const labels = Object.keys(grouped);
        const data = Object.values(grouped);

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

        // Select the correct option in dropdown
        const select = document.querySelector('select[name="type"]');
        if (select) {
            select.value = type;
            ui.toggleAssetFields(type);
        }
    },
    hideModal: () => {
        document.getElementById('add-asset-modal').classList.add('hidden');
        document.getElementById('addAssetForm').reset();
    },
    toggleAssetFields: (type) => {
        const ticker = document.getElementById('ticker-field');
        if (ticker) ticker.style.display = (type === 'STOCK' || type === 'MF') ? 'block' : 'none';
    }
};
