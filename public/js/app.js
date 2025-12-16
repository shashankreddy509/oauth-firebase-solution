
// Connect to Emulators if on localhost
const connectEmulators = () => {
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        console.log("Using Firebase Emulators");
        if (firebase.auth) firebase.auth().useEmulator("http://127.0.0.1:9099");
        if (firebase.firestore) firebase.firestore().useEmulator("127.0.0.1", 8080);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    connectEmulators();

    const authView = document.getElementById('auth-view');
    const appContent = document.getElementById('app-content');

    // 1. Auth Listener
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            console.log("Logged in");
            authView.classList.add('hidden');
            appContent.classList.remove('hidden');

            // Start Listeners
            db.listenToAssets((assets) => {
                // Pass all assets to UI, it handles internal filtering
                ui.allAssets = assets;
                ui.renderAssets();
            });

        } else {
            console.log("Logged out");
            authView.classList.remove('hidden');
            appContent.classList.add('hidden');
        }
    });

    // 2. Login
    const loginBtn = document.getElementById('googleLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider).catch(e => alert(e.message));
        });
    }

    // 3. Filter Tabs
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            // Add to clicked
            btn.classList.add('active');

            // Trigger Filter
            const filterType = btn.dataset.filter;
            ui.filterAssets(filterType);
        });
    });

    // 6. Add Asset Form Handler
    const addAssetForm = document.getElementById('addAssetForm');
    if (addAssetForm) {
        addAssetForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = addAssetForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            const formData = new FormData(e.target);
            const data = {
                type: formData.get('type'),
                name: formData.get('name'),
                name: formData.get('name'),
                ticker: addAssetForm.querySelector('[name="ticker"]').value, // Explicit read
                quantity: parseFloat(formData.get('quantity')),
                buyPrice: parseFloat(formData.get('buyPrice')),
                currency: formData.get('currency'),
                notes: ''
            };

            try {
                await db.addAsset(data);
                ui.hideModal();
                // Notification?
            } catch (error) {
                console.error(error);
                alert("Error adding asset: " + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Asset';
            }
        });
    }
});
