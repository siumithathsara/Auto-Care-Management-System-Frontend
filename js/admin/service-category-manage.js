const BASE_URL = "http://localhost:8080/api/v1/service-category";
let categoryModalObj;
let allCategoriesList = [];

document.addEventListener("DOMContentLoaded", () => {
    categoryModalObj = new bootstrap.Modal(document.getElementById('categoryModal'));
    loadAllCategories();
});

function getAuthHeader() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

async function loadAllCategories() {
    try {
        const res = await fetch(`${BASE_URL}/get-all`, { headers: getAuthHeader() });
        if (res.ok) {
            const responseData = await res.json();
            allCategoriesList = responseData.data || [];
            renderTable(allCategoriesList);
        }
    } catch (err) {
        console.error("Error loading categories:", err);
    }
}

function renderTable(categories) {
    const tbody = document.getElementById('categoryTableBody');
    tbody.innerHTML = "";

    if (categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No categories found.</td></tr>`;
        return;
    }

    categories.forEach(cat => {
        const isStatusActive = cat.status === "ACTIVE";
        const statusBadge = isStatusActive
            ? `<span class="badge bg-success-subtle text-success border border-success px-2 py-1 fs-8">ACTIVE</span>`
            : `<span class="badge bg-danger-subtle text-danger border border-danger px-2 py-1 fs-8">INACTIVE</span>`;

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-indigo">${cat.categoryCode}</td>
                <td class="fw-semibold text-white">${cat.categoryName}</td>
                <td class="text-muted fs-7">${cat.description || '-'}</td>
                <td>${statusBadge}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-custom me-1" onclick='openCategoryModal("EDIT", ${JSON.stringify(cat)})'>
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-sm ${isStatusActive ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="toggleCategoryStatus('${cat.categoryCode}', '${isStatusActive ? 'INACTIVE' : 'ACTIVE'}')">
                        <i class="fa-solid ${isStatusActive ? 'fa-ban' : 'fa-check'}"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function filterCategories() {
    const query = document.getElementById('searchCategoryInput').value.toLowerCase();
    const filtered = allCategoriesList.filter(c =>
        c.categoryName.toLowerCase().includes(query) ||
        c.categoryCode.toLowerCase().includes(query)
    );
    renderTable(filtered);
}

function openCategoryModal(action, data = null) {
    document.getElementById('categoryForm').reset();
    document.getElementById('formAction').value = action;

    if (action === "EDIT" && data) {
        document.getElementById('modalTitle').innerText = "Edit Service Category";
        document.getElementById('editCategoryCode').value = data.categoryCode;
        document.getElementById('catName').value = data.categoryName;
        document.getElementById('catDescription').value = data.description || '';
    } else {
        document.getElementById('modalTitle').innerText = "Add Service Category";
    }
    categoryModalObj.show();
}

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const action = document.getElementById('formAction').value;
    const categoryCode = document.getElementById('editCategoryCode').value;

    const payload = {
        categoryName: document.getElementById('catName').value,
        description: document.getElementById('catDescription').value
    };

    const url = action === "EDIT" ? `${BASE_URL}/update/${categoryCode}` : `${BASE_URL}/create-category`;
    const method = action === "EDIT" ? "PUT" : "POST";

    try {
        const res = await fetch(url, { method, headers: getAuthHeader(), body: JSON.stringify(payload) });
        if (res.ok) {
            categoryModalObj.hide();
            loadAllCategories();
        } else {
            alert("Action failed! Check permissions or data.");
        }
    } catch (err) {
        console.error("Save Error:", err);
    }
});

async function toggleCategoryStatus(categoryCode, newStatus) {
    if(!confirm(`Are you sure you want to set status to ${newStatus}?`)) return;

    try {
        const res = await fetch(`${BASE_URL}/change-status/${categoryCode}?status=${newStatus}`, {
            method: 'PATCH',
            headers: getAuthHeader()
        });
        if (res.ok) {
            loadAllCategories();
        }
    } catch (err) {
        console.error("Status Change Error:", err);
    }
}