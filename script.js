document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const loginForm = document.getElementById('login-form');
    const masterKeyInput = document.getElementById('master-key-input');
    const unlockBtn = document.getElementById('unlock-btn');
    const loginError = document.getElementById('login-error');
    const vaultDial = document.querySelector('.vault-dial');
    const logoutBtn = document.getElementById('logout-btn');
    
    const createUserForm = document.getElementById('create-user-form');
    const newUsernameInput = document.getElementById('new-username');
    const createUserError = document.getElementById('create-user-error');
    const usersList = document.getElementById('users-list');
    
    const welcomeView = document.getElementById('welcome-view');
    const userVaultView = document.getElementById('user-vault-view');
    const activeVaultUsername = document.getElementById('active-vault-username');
    const activeVaultCreated = document.getElementById('active-vault-created');
    const deleteUserBtn = document.getElementById('delete-user-btn');
    const encryptedSidebar = document.getElementById('encrypted-sidebar');
    const encryptedRecordsContainer = document.getElementById('encrypted-records-container');
    
    const addRecordForm = document.getElementById('add-record-form');
    const recordTitleInput = document.getElementById('record-title');
    const recordDataInput = document.getElementById('record-data');
    const addRecordError = document.getElementById('add-record-error');
    const recordsContainer = document.getElementById('records-container');
    const recordsCount = document.getElementById('records-count');
    
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    
    let activeConfirmCallback = null;
    let activeUserId = null;
    let activeUsername = null;

    async function checkSession() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            if (data.unlocked) {
                showDashboard();
            } else {
                showLogin();
            }
        } catch (e) {
            showLogin();
        }
    }

    function showLogin() {
        dashboardScreen.classList.remove('active');
        loginScreen.classList.add('active');
        vaultDial.classList.remove('unlocked');
        masterKeyInput.value = '';
    }

    function showDashboard() {
        loginScreen.classList.remove('active');
        dashboardScreen.classList.add('active');
        loadUsers();
        showView('welcome');
    }

    function showView(view) {
        if (view === 'welcome') {
            userVaultView.classList.remove('active-view');
            welcomeView.classList.add('active-view');
            encryptedSidebar.classList.remove('active');
        } else {
            welcomeView.classList.remove('active-view');
            userVaultView.classList.add('active-view');
            encryptedSidebar.classList.add('active');
        }
    }

    function showConfirmModal(title, message, onConfirm) {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        activeConfirmCallback = onConfirm;
        confirmModal.classList.add('active');
    }

    function hideConfirmModal() {
        confirmModal.classList.remove('active');
        activeConfirmCallback = null;
    }

    confirmCancelBtn.addEventListener('click', hideConfirmModal);
    
    confirmOkBtn.addEventListener('click', () => {
        if (activeConfirmCallback) {
            activeConfirmCallback();
        }
        hideConfirmModal();
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        unlockBtn.disabled = true;
        const key = masterKeyInput.value.trim();
        
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ master_key: key })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                vaultDial.classList.add('unlocked');
                setTimeout(() => {
                    showDashboard();
                    unlockBtn.disabled = false;
                }, 1500);
            } else {
                loginError.textContent = data.error || 'Invalid Key';
                unlockBtn.disabled = false;
            }
        } catch (err) {
            loginError.textContent = 'Connection Error';
            unlockBtn.disabled = false;
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            showLogin();
        } catch (e) {
            showLogin();
        }
    });

    async function loadUsers() {
        try {
            const res = await fetch('/api/users');
            if (!res.ok) throw new Error();
            const users = await res.json();
            
            usersList.innerHTML = '';
            users.forEach(user => {
                const li = document.createElement('li');
                li.className = `user-item ${activeUserId === user.id ? 'active' : ''}`;
                li.innerHTML = `
                    <div class="user-name-wrapper">
                        <div class="user-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                        </div>
                        <span class="user-name">${escapeHTML(user.username)}</span>
                    </div>
                    <div class="user-arrow">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                        </svg>
                    </div>
                `;
                li.addEventListener('click', () => selectUser(user));
                usersList.appendChild(li);
            });
        } catch (err) {
            usersList.innerHTML = '<li class="error-msg" style="padding: 10px;">Failed to load users</li>';
        }
    }

    createUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        createUserError.textContent = '';
        const username = newUsernameInput.value.trim();
        if (!username) return;

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                newUsernameInput.value = '';
                await loadUsers();
                selectUser(data.user);
            } else {
                createUserError.textContent = data.error || 'Failed to create user';
            }
        } catch (err) {
            createUserError.textContent = 'Connection Error';
        }
    });

    function selectUser(user) {
        activeUserId = user.id;
        activeUsername = user.username;
        
        document.querySelectorAll('.user-item').forEach(item => {
            item.classList.remove('active');
            if (item.querySelector('.user-name').textContent === user.username) {
                item.classList.add('active');
            }
        });

        activeVaultUsername.textContent = user.username.toUpperCase();
        activeVaultCreated.textContent = user.created_at ? `Registered: ${formatDate(user.created_at)}` : 'Registered: Just Now';
        
        recordTitleInput.value = '';
        recordDataInput.value = '';
        addRecordError.textContent = '';
        
        showView('vault');
        loadRecords();
    }

    async function loadRecords() {
        if (!activeUserId) return;
        
        try {
            const res = await fetch(`/api/users/${activeUserId}/records`);
            if (!res.ok) throw new Error();
            const records = await res.json();
            
            recordsCount.textContent = `${records.length} RECORD${records.length === 1 ? '' : 'S'}`;
            recordsContainer.innerHTML = '';
            encryptedRecordsContainer.innerHTML = '';
            
            if (records.length === 0) {
                recordsContainer.innerHTML = `
                    <div style="text-align: center; padding: 48px 24px; color: var(--text-secondary);">
                        <svg viewBox="0 0 24 24" width="48" height="48" style="margin-bottom: 12px; opacity: 0.3;">
                            <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                        <p style="font-size: 12px;">NO SECURED RECORDS FOUND FOR THIS USER</p>
                    </div>
                `;
                encryptedRecordsContainer.innerHTML = `
                    <div style="text-align: center; padding: 48px 24px; color: var(--text-secondary);">
                        <svg viewBox="0 0 24 24" width="48" height="48" style="margin-bottom: 12px; opacity: 0.2; color: var(--accent);">
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        <p style="font-size: 11px; letter-spacing: 1px;">VAULT DATABASE IS EMPTY</p>
                    </div>
                `;
                return;
            }

            records.forEach(record => {
                const card = document.createElement('div');
                card.className = 'record-card';
                card.innerHTML = `
                    <div class="record-top">
                        <div class="record-title-box">
                            <span class="record-lock-status">
                                <svg viewBox="0 0 24 24" width="14" height="14">
                                    <path fill="currentColor" d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                                </svg>
                            </span>
                            <span class="record-title">${escapeHTML(record.title)}</span>
                        </div>
                        <button class="btn-delete-record" data-id="${record.id}">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="record-body">
                        <pre class="record-content">${escapeHTML(record.data)}</pre>
                        <span class="record-date">ENCRYPTED AT: ${formatDate(record.created_at)}</span>
                    </div>
                `;
                
                card.querySelector('.btn-delete-record').addEventListener('click', () => deleteRecord(record.id));
                recordsContainer.appendChild(card);

                const encCard = document.createElement('div');
                encCard.className = 'enc-card';
                encCard.innerHTML = `
                    <div class="enc-card-header">
                        <span>AES BLOCK SECURED</span>
                        <svg viewBox="0 0 24 24" width="12" height="12">
                            <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                    </div>
                    <div class="enc-label">ENCRYPTED TITLE:</div>
                    <div class="enc-value">${escapeHTML(record.enc_title)}</div>
                    <div class="enc-label">ENCRYPTED DATA BLOCKS:</div>
                    <div class="enc-value">${escapeHTML(record.enc_data)}</div>
                `;
                encryptedRecordsContainer.appendChild(encCard);
            });
        } catch (err) {
            recordsContainer.innerHTML = '<div class="error-msg" style="padding: 20px;">Failed to load records</div>';
        }
    }

    addRecordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activeUserId) return;
        addRecordError.textContent = '';

        const title = recordTitleInput.value.trim();
        const data = recordDataInput.value.trim();

        if (!title || !data) return;

        try {
            const res = await fetch(`/api/users/${activeUserId}/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, data })
            });
            const resData = await res.json();
            
            if (res.ok && resData.success) {
                recordTitleInput.value = '';
                recordDataInput.value = '';
                await loadRecords();
            } else {
                addRecordError.textContent = resData.error || 'Failed to save record';
            }
        } catch (err) {
            addRecordError.textContent = 'Connection Error';
        }
    });

    async function deleteRecord(recordId) {
        showConfirmModal(
            'DELETE RECORD',
            'Are you sure you want to delete this encrypted record permanently from the database?',
            async () => {
                try {
                    const res = await fetch(`/api/records/${recordId}`, { method: 'DELETE' });
                    if (res.ok) {
                        await loadRecords();
                    } else {
                        alert('Failed to delete record');
                    }
                } catch (e) {
                    alert('Connection Error');
                }
            }
        );
    }

    deleteUserBtn.addEventListener('click', () => {
        if (!activeUserId) return;
        showConfirmModal(
            'DELETE USER PROFILE',
            `Are you sure you want to delete user "${activeUsername}" and all of their encrypted records? This action cannot be undone.`,
            async () => {
                try {
                    const res = await fetch(`/api/users/${activeUserId}`, { method: 'DELETE' });
                    if (res.ok) {
                        activeUserId = null;
                        activeUsername = null;
                        await loadUsers();
                        showView('welcome');
                    } else {
                        alert('Failed to delete user');
                    }
                } catch (e) {
                    alert('Connection Error');
                }
            }
        );
    });

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        try {
            const t = dateStr.split(/[- :]/);
            const d = new Date(Date.UTC(t[0], t[1]-1, t[2], t[3]||0, t[4]||0, t[5]||0));
            return d.toLocaleString();
        } catch (e) {
            return dateStr;
        }
    }

    checkSession();
});
