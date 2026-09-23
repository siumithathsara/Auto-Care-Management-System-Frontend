const BASE_URL = "http://localhost:8080/api/v1/service-category";
let categoryModalObj;
let allCategoriesList = [];

document.addEventListener("DOMContentLoaded", () => {
    categoryModalObj = new bootstrap.Modal(document.getElementById('categoryModal'));
    loadAllCategories();

    const modalElem = document.getElementById('categoryModal');
    if (modalElem) {
        modalElem.addEventListener('hidden.bs.modal', () => {
            document.getElementById('categoryForm').reset();
            document.getElementById('editCategoryCode').value = '';
            document.getElementById('formAction').value = '';
        });
    }
});

// Helper for Auth Token Header
function getAuthHeader() {
    let token = localStorage.getItem("jwtToken") || localStorage.getItem("userToken") || localStorage.getItem("authToken");

    if (token) {
        token = token.replace(/^["'](.+)["']$/, '$1');
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
    }

    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function loadAllCategories() {
    const tbody = document.getElementById('categoryTableBody');
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin me-2"></i>Loading categories...</td></tr>`;

    try {
        const res = await fetch(`${BASE_URL}/get-all`, {
            method: 'GET',
            headers: getAuthHeader()
        });

        const responseData = await res.json();

        if (res.ok || responseData.code === 200) {
            allCategoriesList = responseData.data || responseData.body || (Array.isArray(responseData) ? responseData : []);
            renderTable(allCategoriesList);
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">${responseData.message || 'Failed to load categories.'}</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading categories:", err);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Server connection error.</td></tr>`;
    }
}

// Render Data to Table
function renderTable(categories) {
    const tbody = document.getElementById('categoryTableBody');
    tbody.innerHTML = "";

    if (!categories || categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No categories found.</td></tr>`;
        return;
    }

    categories.forEach(cat => {
        const isStatusActive = cat.status === "ACTIVE";
        const statusBadge = isStatusActive
            ? `<span class="badge bg-success-subtle text-success border border-success px-2 py-1 fs-8">ACTIVE</span>`
            : `<span class="badge bg-danger-subtle text-danger border border-danger px-2 py-1 fs-8">INACTIVE</span>`;


        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="fw-bold text-indigo">${cat.categoryCode}</td>
            <td class="fw-semibold text-white">${cat.categoryName}</td>
            <td class="text-muted fs-7">${cat.description || '-'}</td>
            <td>${statusBadge}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-custom me-1 edit-btn" title="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-sm ${isStatusActive ? 'btn-outline-danger' : 'btn-outline-success'}" 
                        onclick="toggleCategoryStatus('${cat.categoryCode}', '${isStatusActive ? 'INACTIVE' : 'ACTIVE'}')" 
                        title="${isStatusActive ? 'Deactivate' : 'Activate'}">
                    <i class="fa-solid ${isStatusActive ? 'fa-ban' : 'fa-check'}"></i>
                </button>
            </td>
        `;

        // Event listener for Edit button
        tr.querySelector('.edit-btn').addEventListener('click', () => {
            openCategoryModal("EDIT", cat);
        });

        tbody.appendChild(tr);
    });
}

function openCategoryModal(action, data = null) {
    document.getElementById('categoryForm').reset();
    document.getElementById('formAction').value = action;

    if (action === "EDIT" && data) {
        document.getElementById('modalTitle').innerText = "Edit Service Category";
        document.getElementById('editCategoryCode').value = data.categoryCode;
        document.getElementById('catName').value = data.categoryName || '';
        document.getElementById('catDescription').value = data.description || '';
    } else {
        document.getElementById('modalTitle').innerText = "Add Service Category";
        document.getElementById('editCategoryCode').value = '';
    }
    categoryModalObj.show();
}

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const action = document.getElementById('formAction').value;
    const categoryCode = document.getElementById('editCategoryCode').value;

    const payload = {
        categoryName: document.getElementById('catName').value.trim(),
        description: document.getElementById('catDescription').value.trim()
    };

    const url = action === "EDIT" ? `${BASE_URL}/update/${categoryCode}` : `${BASE_URL}/create-category`;
    const method = action === "EDIT" ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: getAuthHeader(),
            body: JSON.stringify(payload)
        });

        const responseData = await res.json();

        if (res.ok || responseData.code === 200 || responseData.code === 201) {
            alert(responseData.message || `Service Category ${action === "EDIT" ? 'updated' : 'created'} successfully!`);
            categoryModalObj.hide();
            loadAllCategories();
        } else {
            alert(responseData.message || "Action failed! Check permissions or data.");
        }
    } catch (err) {
        console.error("Save Error:", err);
        alert("Server error occurred while saving.");
    }
});

async function toggleCategoryStatus(categoryCode, newStatus) {
    if (!confirm(`Are you sure you want to set status to ${newStatus}?`)) return;

    try {
        const res = await fetch(`${BASE_URL}/change-status/${categoryCode}?status=${newStatus}`, {
            method: 'PATCH',
            headers: getAuthHeader()
        });

        const responseData = await res.json();

        if (res.ok || responseData.code === 200) {
            alert(responseData.message || "Category status changed successfully!");
            loadAllCategories();
        } else {
            alert(responseData.message || "Failed to change status.");
        }
    } catch (err) {
        console.error("Status Change Error:", err);
        alert("Server error while updating status.");
    }
}

// Local Search Filter Function
function filterCategories() {
    const query = document.getElementById('searchCategoryInput').value.toLowerCase().trim();
    const filtered = allCategoriesList.filter(c =>
        (c.categoryName && c.categoryName.toLowerCase().includes(query)) ||
        (c.categoryCode && c.categoryCode.toLowerCase().includes(query)) ||
        (c.description && c.description.toLowerCase().includes(query))
    );
    renderTable(filtered);
}