const BASE_URL = "http://localhost:8080/api/v1/spare-part";

document.addEventListener("DOMContentLoaded", () => {
    applyRoleSecurity();
    loadAllSpareParts();
});

// Role-Based UI Elements Isolation
function applyRoleSecurity() {
    const role = localStorage.getItem("userRole"); // e.g., 'ADMIN', 'ADVISOR', 'MECHANIC'
    if (role !== "ADMIN") {
        document.querySelectorAll('.admin-only-action').forEach(el => el.style.setProperty('display', 'none', 'important'));
    }
}

function getAuthHeaders() {
    return {
        "Authorization": `Bearer ${localStorage.getItem("userToken")}`,
        "Content-Type": "application/json"
    };
}

// GET /get-all
async function loadAllSpareParts() {
    setActiveFilter('btnFilterAll');
    const tbody = document.getElementById("sparePartTableBody");
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Loading inventory details...</td></tr>`;

    try {
        const response = await fetch(`${BASE_URL}/get-all`, { headers: getAuthHeaders() });
        const result = await response.json();

        if (result.code === 200 && result.data) {
            updateKpiStats(result.data);
            renderSparePartRows(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No spare parts found.</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Failed to connect to server.</td></tr>`;
    }
}

// GET /get-low-stock (ADMIN Only Endpoint)
async function loadLowStockSpareParts() {
    setActiveFilter('btnFilterLowStock');
    const tbody = document.getElementById("sparePartTableBody");
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Fetching low stock alerts...</td></tr>`;

    try {
        const response = await fetch(`${BASE_URL}/get-low-stock`, { headers: getAuthHeaders() });
        const result = await response.json();

        if (result.code === 200 && result.data) {
            renderSparePartRows(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No low stock items currently!</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Failed to fetch low stock alerts.</td></tr>`;
    }
}

// Render Data Table Rows & Low Stock Alerts
function renderSparePartRows(parts) {
    const tbody = document.getElementById("sparePartTableBody");
    const isAdmin = localStorage.getItem("userRole") === "ADMIN";

    if (!parts || parts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No spare parts available.</td></tr>`;
        return;
    }

    tbody.innerHTML = parts.map(part => {
        const isLow = part.quantityInStock <= part.reorderLevel;
        return `
        <tr class="${isLow ? 'row-low-stock' : ''}">
            <td class="fw-bold text-white">${part.partCode}</td>
            <td><strong class="text-white">${part.partName}</strong></td>
            <td><span class="text-muted">${part.brand || 'N/A'}</span></td>
            <td><span class="badge badge-type-${part.partType}">${part.partType}</span></td>
            <td>Rs. ${part.costPrice.toFixed(2)}</td>
            <td class="text-primary-color fw-semibold">Rs. ${part.unitPrice.toFixed(2)}</td>
            <td class="${isLow ? 'text-danger fw-bold' : 'text-white'}">
                ${part.quantityInStock}
            </td>
            <td class="text-muted">${part.reorderLevel}</td>
            <td>
                ${isLow
            ? `<span class="badge badge-low-stock"><i class="fa-solid fa-triangle-exclamation me-1"></i>LOW STOCK</span>`
            : `<span class="badge badge-normal-stock">NORMAL</span>`}
            </td>
            ${isAdmin ? `
            <td class="text-end px-4 admin-only-action">
                <button class="btn btn-sm btn-outline-warning me-1" onclick="openEditModal('${part.partCode}')">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteSparePart('${part.partCode}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>` : ''}
        </tr>
    `}).join('');
}

// KPI Stats Calculation
function updateKpiStats(parts) {
    document.getElementById("totalPartsCount").innerText = parts.length;
    const lowStockCount = parts.filter(p => p.quantityInStock <= p.reorderLevel).length;
    document.getElementById("lowStockCount").innerText = lowStockCount;
}

// Modal Form Controls
function openSaveSparePartModal() {
    document.getElementById("sparePartForm").reset();
    document.getElementById("editPartCode").value = "";
    document.getElementById("sparePartModalTitle").innerHTML = `<i class="fa-solid fa-box me-2 text-primary-color"></i>Add New Spare Part`;
    new bootstrap.Modal(document.getElementById("sparePartModal")).show();
}

// GET /get-by-code/{partCode}
async function openEditModal(partCode) {
    try {
        const res = await fetch(`${BASE_URL}/get-by-code/${partCode}`, { headers: getAuthHeaders() });
        const result = await res.json();
        if (result.code === 200 && result.data) {
            const data = result.data;
            document.getElementById("editPartCode").value = data.partCode;
            document.getElementById("partName").value = data.partName;
            document.getElementById("brand").value = data.brand || "";
            document.getElementById("partType").value = data.partType;
            document.getElementById("costPrice").value = data.costPrice;
            document.getElementById("unitPrice").value = data.unitPrice;
            document.getElementById("quantityInStock").value = data.quantityInStock;
            document.getElementById("reorderLevel").value = data.reorderLevel;

            document.getElementById("sparePartModalTitle").innerHTML = `<i class="fa-solid fa-pen-to-square me-2 text-warning"></i>Edit Spare Part (${data.partCode})`;
            new bootstrap.Modal(document.getElementById("sparePartModal")).show();
        }
    } catch (e) {
        alert("Failed to load details for part: " + partCode);
    }
}

// POST /save & PUT /update/{partCode}
async function saveOrUpdateSparePart() {
    const editCode = document.getElementById("editPartCode").value;
    const payload = {
        partName: document.getElementById("partName").value,
        brand: document.getElementById("brand").value,
        costPrice: parseFloat(document.getElementById("costPrice").value),
        unitPrice: parseFloat(document.getElementById("unitPrice").value),
        quantityInStock: parseInt(document.getElementById("quantityInStock").value),
        reorderLevel: parseInt(document.getElementById("reorderLevel").value),
        partType: document.getElementById("partType").value
    };

    const isUpdate = editCode !== "";
    const endpoint = isUpdate ? `${BASE_URL}/update/${editCode}` : `${BASE_URL}/save`;
    const method = isUpdate ? "PUT" : "POST";

    try {
        const res = await fetch(endpoint, {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok || result.code === 200 || result.code === 201) {
            bootstrap.Modal.getInstance(document.getElementById("sparePartModal")).hide();
            loadAllSpareParts();
        } else {
            alert(result.message || "Action failed!");
        }
    } catch (e) {
        alert("Error saving spare part details.");
    }
}

// DELETE /delete/{partCode}
async function deleteSparePart(partCode) {
    if (!confirm(`Are you sure you want to delete part ${partCode}?`)) return;

    try {
        const res = await fetch(`${BASE_URL}/delete/${partCode}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        if (res.ok) {
            loadAllSpareParts();
        }
    } catch (e) {
        alert("Failed to delete spare part.");
    }
}

// Local Dynamic Search
function filterPartsLocally() {
    const query = document.getElementById("sparePartSearchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#sparePartTableBody tr");
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
    });
}

function setActiveFilter(btnId) {
    document.getElementById("btnFilterAll")?.classList.remove("active-filter");
    document.getElementById("btnFilterLowStock")?.classList.remove("active-filter");
    document.getElementById(btnId)?.classList.add("active-filter");
}