const BASE_URL = "http://localhost:8080/api/v1/user";

let userFormModal;
let userProfileModal;

document.addEventListener("DOMContentLoaded", function() {
    const userModalEl = document.getElementById('userFormModal');
    const profileModalEl = document.getElementById('userProfileModal');

    if (userModalEl) userFormModal = new bootstrap.Modal(userModalEl);
    if (profileModalEl) userProfileModal = new bootstrap.Modal(profileModalEl);

    loadTotalUsersCount();
    loadAllActiveUsers();
    loadLoggedInUserDetail();
});

function getAuthHeader() {
    const token = localStorage.getItem("jwtToken");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function loadTotalUsersCount() {
    try {
        const response = await fetch(`${BASE_URL}/count`, { headers: getAuthHeader() });
        const result = await response.json();
        if (response.ok && result.code === 200) {
            document.getElementById('statTotalUsers').innerText = result.data;
        }
    } catch (e) {
        console.error("Count fetch error:", e);
    }
}

async function loadAllActiveUsers() {
    try {
        const response = await fetch(`${BASE_URL}/getAllActiveUsers`, { headers: getAuthHeader() });
        const result = await response.json();
        if (response.ok && result.code === 200) {
            renderUserTable(result.data);
            document.getElementById('statActiveUsers').innerText = result.data.length;
        }
    } catch (e) {
        console.error("Active users fetch error:", e);
    }
}

function renderUserTable(users) {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = "";

    if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-secondary">No active users found.</td></tr>`;
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-indigo">${user.userCode || 'N/A'}</td>
            <td><div class="fw-bold text-white">${user.username}</div></td>
            <td>
                <div class="fs-7 text-white">${user.email}</div>
                <div class="fs-8 text-secondary">${user.phone}</div>
            </td>
            <td>${user.nicPassport || 'N/A'}</td>
            <td><span class="role-badge">${user.role}</span></td>
            <td><span class="badge bg-success-subtle text-success px-2 py-1">${user.status || 'ACTIVE'}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-dark-panel me-1" title="Edit" onclick="openEditUserModal('${user.userCode}', '${user.username}', '${user.email}', '${user.phone}', '${user.nicPassport}', '${user.role}', '${user.address}')">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="deleteUser('${user.userCode}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        loadAllActiveUsers();
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/filter-users?userName=${encodeURIComponent(query)}`, {
            headers: getAuthHeader()
        });
        const result = await response.json();
        if (response.ok && result.code === 200) {
            renderUserTable(result.data);
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
        document.getElementById('formRole').value = "MANAGER";
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
    document.getElementById('formNic').value = nic;
    document.getElementById('formRole').value = role;
    document.getElementById('formAddress').value = address;

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
        password: document.getElementById('formPassword').value || "123456",
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
        if (response.ok && (result.code === 200 || result.code === 201)) {
            if (userFormModal) userFormModal.hide();
            loadAllActiveUsers();
            loadTotalUsersCount();
            alert(result.message || "Operation successful!");
        } else {
            alert(result.message || "Operation failed!");
        }
    } catch (e) {
        alert("Server communication error!");
    }
});

async function deleteUser(userCode) {
    if (!confirm(`Are you sure you want to delete user ${userCode}?`)) return;

    try {
        const response = await fetch(`${BASE_URL}/delete-user/${userCode}`, {
            method: 'DELETE',
            headers: getAuthHeader()
        });

        const result = await response.json();
        if (response.ok && result.code === 200) {
            loadAllActiveUsers();
            loadTotalUsersCount();
            alert("User deleted successfully!");
        } else {
            alert(result.message || "Failed to delete user!");
        }
    } catch (e) {
        alert("Server error during deletion!");
    }
}

async function loadLoggedInUserDetail() {
    const loggedInUsername = localStorage.getItem("loggedInUsername") || "admin";

    try {
        const response = await fetch(`${BASE_URL}/get-user/${loggedInUsername}`, { headers: getAuthHeader() });
        const result = await response.json();
        if (response.ok && result.code === 200) {
            const u = result.data;
            document.getElementById('navUsername').innerText = u.username;
            document.getElementById('navUserRole').innerText = u.role;

            document.getElementById('profileUsername').innerText = u.username;
            document.getElementById('profileRole').innerText = u.role;
            document.getElementById('profileCode').innerText = u.userCode || 'N/A';
            document.getElementById('profileEmail').innerText = u.email || 'N/A';
            document.getElementById('profilePhone').innerText = u.phone || 'N/A';
            document.getElementById('profileNic').innerText = u.nicPassport || 'N/A';
            document.getElementById('profileAddress').innerText = u.address || 'N/A';
        }
    } catch (e) {
        console.error("Profile detail fetch error:", e);
    }
}

function openLoggedUserProfile() {
    if (userProfileModal) userProfileModal.show();
}