const BASE_URL = "http://localhost:8080/api/v1/user";

let userFormModal;
let userProfileModal;
let currentStatus = "ACTIVE";

document.addEventListener("DOMContentLoaded", function() {

    const userModalEl = document.getElementById('userFormModal');
    const profileModalEl = document.getElementById('userProfileModal');

    if (userModalEl) userFormModal = new bootstrap.Modal(userModalEl);
    if (profileModalEl) userProfileModal = new bootstrap.Modal(profileModalEl);

    loadTotalUsersCount();
    loadUsersByStatus(currentStatus);
    loadLoggedInUserDetail();
});

function getAuthHeader() {
    const token = localStorage.getItem("jwtToken");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

function extractData(result) {
    if (!result) return null;

    if (result.body !== undefined) {
        return result.body;
    }
    if (result.data !== undefined) {
        return result.data;
    }
    return result;
}


async function loadTotalUsersCount() {
    try {
        const response = await fetch(`${BASE_URL}/count`, { headers: getAuthHeader() });
        const result = await response.json();

        if (response.ok) {
            let countVal = extractData(result);

            if (typeof countVal === 'object' && countVal !== null) {
                countVal = countVal.count || countVal.total || Object.values(countVal)[0] || 0;
            }

            document.getElementById('statTotalUsers').innerText = (countVal !== null && countVal !== undefined) ? countVal : 0;
        } else {
            console.warn("Count response info:", result);
            document.getElementById('statTotalUsers').innerText = 0;
        }
    } catch (e) {
        console.error("Count fetch error:", e);
        document.getElementById('statTotalUsers').innerText = 0;
    }
}

async function loadUsersByStatus(status) {
    currentStatus = status || 'ACTIVE';
    try {
        let endpoint = `${BASE_URL}/getUsersByStatus/${currentStatus}`;

        // Backward compatibility for ACTIVE users
        if (currentStatus === 'ACTIVE') {
            endpoint = `${BASE_URL}/getAllActiveUsers`;
        }

        const response = await fetch(endpoint, { headers: getAuthHeader() });
        const result = await response.json();

        console.log(`Users Response [Status: ${currentStatus}]:`, result);

        if (response.ok) {
            let userList = extractData(result);

            if (!Array.isArray(userList) && typeof userList === 'object' && userList !== null) {
                userList = userList.content || userList.list || Object.values(userList);
            }

            if (Array.isArray(userList)) {
                renderUserTable(userList);
                document.getElementById('statActiveUsers').innerText = userList.length;
            } else {
                renderUserTable([]);
                document.getElementById('statActiveUsers').innerText = 0;
            }
        } else {
            console.warn("Users fetch info:", result);
            renderUserTable([]);
            document.getElementById('statActiveUsers').innerText = 0;
        }
    } catch (e) {
        console.error("Users fetch error:", e);
        renderUserTable([]);
        document.getElementById('statActiveUsers').innerText = 0;
    }
}

function refreshConsole() {
    loadTotalUsersCount();
    loadUsersByStatus(currentStatus);
}

function renderUserTable(users) {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!users || !Array.isArray(users) || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-secondary">No ${currentStatus.toLowerCase()} users found.</td></tr>`;
        return;
    }

    users.forEach(user => {
        const code = user.userCode || user.user_code || user.code || 'N/A';
        const name = user.username || user.userName || user.name || 'N/A';
        const email = user.email || 'N/A';
        const phone = user.phone || 'N/A';
        const nic = user.nicPassport || user.nic || user.nic_passport || 'N/A';
        const role = user.role || 'ADVISOR';
        const status = user.status || 'ACTIVE';
        const address = user.address || '';

        const tr = document.createElement('tr');

        const safeCode = String(code).replace(/'/g, "\\'");
        const safeName = String(name).replace(/'/g, "\\'");
        const safeEmail = String(email).replace(/'/g, "\\'");
        const safePhone = String(phone).replace(/'/g, "\\'");
        const safeNic = String(nic).replace(/'/g, "\\'");
        const safeRole = String(role).replace(/'/g, "\\'");
        const safeAddr = String(address).replace(/'/g, "\\'");

        let statusBadge = `<span class="badge bg-success-subtle text-success px-2 py-1">ACTIVE</span>`;
        if (status === 'PENDING') {
            statusBadge = `<span class="badge bg-warning-subtle text-warning px-2 py-1">PENDING</span>`;
        } else if (status === 'INACTIVE') {
            statusBadge = `<span class="badge bg-danger-subtle text-danger px-2 py-1">INACTIVE</span>`;
        }

        tr.innerHTML = `
            <td class="fw-bold text-indigo">${code}</td>
            <td><div class="fw-bold text-white">${name}</div></td>
            <td>
                <div class="fs-7 text-white">${email}</div>
                <div class="fs-8 text-secondary">${phone}</div>
            </td>
            <td>${nic}</td>
            <td><span class="role-badge">${role}</span></td>
            <td>${statusBadge}</td>
            <td class="text-end">
                ${status === 'PENDING' ? `
                    <button class="btn btn-sm btn-success me-1" title="Approve & Activate Customer" onclick="activateCustomer('${safeCode}')">
                        <i class="fa-solid fa-user-check me-1"></i> Approve
                    </button>
                ` : ''}
                <button class="btn btn-sm btn-dark-panel me-1" title="Edit" 
                    onclick="openEditUserModal('${safeCode}', '${safeName}', '${safeEmail}', '${safePhone}', '${safeNic}', '${safeRole}', '${safeAddr}')">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="deleteUser('${safeCode}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function activateCustomer(userCode) {
    if (!userCode || userCode === 'N/A') {
        alert("Invalid User Code!");
        return;
    }

    if (!confirm(`Are you sure you want to approve and activate account ${userCode}?`)) return;

    try {
        const response = await fetch(`${BASE_URL}/activate-customer/${userCode}`, {
            method: 'PATCH',
            headers: getAuthHeader()
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message || "Customer account activated successfully!");
            loadUsersByStatus(currentStatus);
            loadTotalUsersCount();
        } else {
            alert(result.message || "Failed to activate customer account!");
        }
    } catch (e) {
        console.error("Activation error:", e);
        alert("Server communication error during activation!");
    }
}


async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        loadUsersByStatus(currentStatus);
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/filter-users?userName=${encodeURIComponent(query)}`, {
            headers: getAuthHeader()
        });
        const result = await response.json();

        if (response.ok) {
            const data = extractData(result);
            renderUserTable(Array.isArray(data) ? data : []);
        }
    } catch (e) {
        console.error("Filter error:", e);
    }
}

function openCreateUserModal(type) {
    document.getElementById('userModalForm').reset();
    document.getElementById('formActionType').value = "CREATE";
    document.getElementById('passwordContainer').style.display = "block";
    document.getElementById('formPassword').required = true;

    if (type === 'ADMIN') {
        document.getElementById('userModalTitle').innerText = "Create Admin Account";
        document.getElementById('formRole').value = "ADMIN";
    } else {
        document.getElementById('userModalTitle').innerText = "Create Staff Account";
        document.getElementById('formRole').value = "ADVISOR";
    }

    if (userFormModal) userFormModal.show();
}

function openEditUserModal(userCode, username, email, phone, nic, role, address) {
    document.getElementById('userModalForm').reset();
    document.getElementById('formActionType').value = "EDIT";
    document.getElementById('userModalTitle').innerText = `Update User (${userCode})`;
    document.getElementById('editUserCode').value = userCode;

    document.getElementById('formUsername').value = username;
    document.getElementById('formEmail').value = email;
    document.getElementById('formPhone').value = phone;
    document.getElementById('formNic').value = (nic && nic !== 'undefined' && nic !== 'null') ? nic : '';
    document.getElementById('formRole').value = role;
    document.getElementById('formAddress').value = (address && address !== 'undefined' && address !== 'null') ? address : '';

    document.getElementById('passwordContainer').style.display = "none";
    document.getElementById('formPassword').required = false;

    if (userFormModal) userFormModal.show();
}

document.getElementById('userModalForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const actionType = document.getElementById('formActionType').value;
    const role = document.getElementById('formRole').value;

    const requestData = {
        username: document.getElementById('formUsername').value,
        password: document.getElementById('formPassword').value || undefined,
        email: document.getElementById('formEmail').value,
        phone: document.getElementById('formPhone').value,
        nicPassport: document.getElementById('formNic').value,
        address: document.getElementById('formAddress').value,
        role: role
    };

    try {
        let endpoint = `${BASE_URL}/create-staff`;
        let method = "POST";

        if (actionType === "CREATE" && role === "ADMIN") {
            endpoint = `${BASE_URL}/create-admin`;
        } else if (actionType === "EDIT") {
            const userCode = document.getElementById('editUserCode').value;
            endpoint = `${BASE_URL}/update-user/${userCode}`;
            method = "PUT";
        }

        const response = await fetch(endpoint, {
            method: method,
            headers: getAuthHeader(),
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (response.ok) {
            if (userFormModal) userFormModal.hide();
            loadUsersByStatus(currentStatus);
            loadTotalUsersCount();
            alert(result.message || "Operation successful!");
        } else {
            alert(result.message || "Operation failed!");
        }
    } catch (e) {
        console.error("Save error:", e);
        alert("Server communication error!");
    }
});

async function deleteUser(userCode) {
    if (!userCode || userCode === 'N/A') {
        alert("Invalid User Code!");
        return;
    }

    if (!confirm(`Are you sure you want to delete user ${userCode}?`)) return;

    try {
        const response = await fetch(`${BASE_URL}/delete-user/${userCode}`, {
            method: 'DELETE',
            headers: getAuthHeader()
        });

        const result = await response.json();

        if (response.ok) {
            loadUsersByStatus(currentStatus);
            loadTotalUsersCount();
            alert("User deleted successfully!");
        } else {
            alert(result.message || "Failed to delete user!");
        }
    } catch (e) {
        console.error("Delete error:", e);
        alert("Server error during deletion!");
    }
}

async function loadLoggedInUserDetail() {
    const loggedInUsername = localStorage.getItem("loggedInUsername");

    if (!loggedInUsername) return;

    try {
        const response = await fetch(`${BASE_URL}/get-user/${loggedInUsername}`, { headers: getAuthHeader() });
        const result = await response.json();

        if (response.ok) {
            const u = extractData(result);
            if (u) {
                const name = u.username || u.userName || 'Admin';
                const role = u.role || 'ADMINISTRATOR';
                const code = u.userCode || u.user_code || 'N/A';
                const email = u.email || 'N/A';
                const phone = u.phone || 'N/A';
                const nic = u.nicPassport || u.nic || 'N/A';
                const address = u.address || 'N/A';

                if (document.getElementById('navUsername')) document.getElementById('navUsername').innerText = name;
                if (document.getElementById('navUserRole')) document.getElementById('navUserRole').innerText = role;

                if (document.getElementById('profileUsername')) document.getElementById('profileUsername').innerText = name;
                if (document.getElementById('profileRole')) document.getElementById('profileRole').innerText = role;
                if (document.getElementById('profileCode')) document.getElementById('profileCode').innerText = code;
                if (document.getElementById('profileEmail')) document.getElementById('profileEmail').innerText = email;
                if (document.getElementById('profilePhone')) document.getElementById('profilePhone').innerText = phone;
                if (document.getElementById('profileNic')) document.getElementById('profileNic').innerText = nic;
                if (document.getElementById('profileAddress')) document.getElementById('profileAddress').innerText = address;
            }
        }
    } catch (e) {
        console.error("Profile detail fetch error:", e);
    }
}

function openLoggedUserProfile() {
    if (userProfileModal) userProfileModal.show();
}