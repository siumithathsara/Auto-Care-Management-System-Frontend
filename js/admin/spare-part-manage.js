const BASE_URL = "http://localhost:8080/api/v1/spare-part";
let allPartsCache = [];

document.addEventListener("DOMContentLoaded", () => {
    applyRoleSecurity();
    loadAllSpareParts();

    const sparePartModal = document.getElementById("sparePartModal");
    if (sparePartModal) {
        sparePartModal.addEventListener("hidden.bs.modal", () => {
            document.getElementById("sparePartForm").reset();
            document.getElementById("editPartCode").value = "";
        });
    }
});

function applyRoleSecurity() {
    const role = localStorage.getItem("userRole") || "ADVISOR";
    if (role !== "ADMIN") {
        document.querySelectorAll('.admin-only-action').forEach(el => el.style.setProperty('display', 'none', 'important'));
    }
}

function getAuthHeaders() {
    let token = localStorage.getItem("jwtToken") || localStorage.getItem("userToken") || localStorage.getItem("authToken");

    if (token) {
        token = token.replace(/^["'](.+)["']$/, '$1');
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
    }

    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}

//  Get All Active Spare Parts
async function loadAllSpareParts() {
    setActiveFilter('btnFilterAll');
    const tbody = document.getElementById("sparePartTableBody");
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Loading inventory details...</td></tr>`;

    try {
        const response = await fetch(`${BASE_URL}/get-all`, { headers: getAuthHeaders() });
        const result = await response.json();

        const parts = result.data || result.body || (Array.isArray(result) ? result : []);

        if ((response.ok || result.code === 200) && parts.length > 0) {
            allPartsCache = parts;
            updateKpiStats(parts);
            renderSparePartRows(parts);
            populatePartsDropdowns(parts);
        } else {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No spare parts found.</td></tr>`;
        }
    } catch (e) {
        console.error("Error loading parts:", e);
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Failed to connect to server.</td></tr>`;
    }
}

// Get Low Stock Spare Parts (Admin Endpoint)
async function loadLowStockSpareParts() {
    setActiveFilter('btnFilterLowStock');
    const tbody = document.getElementById("sparePartTableBody");
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Fetching low stock alerts...</td></tr>`;

    try {
        const response = await fetch(`${BASE_URL}/get-low-stock`, { headers: getAuthHeaders() });
        const result = await response.json();

        const parts = result.data || result.body || (Array.isArray(result) ? result : []);

        if ((response.ok || result.code === 200) && parts.length > 0) {
            renderSparePartRows(parts);
        } else {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No low stock items currently!</td></tr>`;
        }
    } catch (e) {
        console.error("Error loading low stock:", e);
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Failed to fetch low stock alerts.</td></tr>`;
    }
}

// Table Render Function
function renderSparePartRows(parts) {
    const tbody = document.getElementById("sparePartTableBody");
    const isAdmin = (localStorage.getItem("userRole") || "").toUpperCase() === "ADMIN";

    if (!parts || parts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No spare parts available.</td></tr>`;
        return;
    }

    tbody.innerHTML = parts.map(part => {
        const isLow = part.quantityInStock <= part.reorderLevel;
        const costPrice = typeof part.costPrice === 'number' ? part.costPrice.toFixed(2) : '0.00';
        const unitPrice = typeof part.unitPrice === 'number' ? part.unitPrice.toFixed(2) : '0.00';

        return `
        <tr class="${isLow ? 'row-low-stock' : ''}">
            <td class="fw-bold text-white">${part.partCode}</td>
            <td><strong class="text-white">${part.partName}</strong></td>
            <td><span class="text-muted">${part.brand || 'N/A'}</span></td>
            <td><span class="badge badge-type-${part.partType}">${part.partType}</span></td>
            <td>LKR ${costPrice}</td>
            <td class="text-primary-color fw-semibold">LKR ${unitPrice}</td>
            <td class="${isLow ? 'text-danger fw-bold' : 'text-white'}">${part.quantityInStock}</td>
            <td class="text-muted">${part.reorderLevel}</td>
            <td>
                ${isLow
            ? `<span class="badge badge-low-stock"><i class="fa-solid fa-triangle-exclamation me-1"></i>LOW STOCK</span>`
            : `<span class="badge badge-normal-stock">NORMAL</span>`}
            </td>
            ${isAdmin ? `
            <td class="text-end px-4 admin-only-action">
                <button class="btn btn-sm btn-outline-warning me-1" onclick="openEditModal('${part.partCode}')" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteSparePart('${part.partCode}')" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>` : ''}
        </tr>
    `}).join('');
}

function populatePartsDropdowns(parts) {
    const issueSelect = document.getElementById("issuePartCode");
    const internalSelect = document.getElementById("internalPartCode");

    let options = `<option value="" selected disabled>Select Part Code</option>`;
    parts.forEach(p => {
        options += `<option value="${p.partCode}">${p.partName} (${p.partCode}) - Stock: ${p.quantityInStock}</option>`;
    });

    if (issueSelect) issueSelect.innerHTML = options;
    if (internalSelect) internalSelect.innerHTML = options;
}

// KPI Count Stats Updates
function updateKpiStats(parts) {
    const totalElem = document.getElementById("totalPartsCount");
    const lowElem = document.getElementById("lowStockCount");

    if (totalElem) totalElem.innerText = parts.length;
    if (lowElem) {
        const lowStockCount = parts.filter(p => p.quantityInStock <= p.reorderLevel).length;
        lowElem.innerText = lowStockCount;
    }
}

function openSaveSparePartModal() {
    document.getElementById("sparePartForm").reset();
    document.getElementById("editPartCode").value = "";
    document.getElementById("sparePartModalTitle").innerHTML = `<i class="fa-solid fa-box me-2 text-primary-color"></i>Add New Spare Part`;
    new bootstrap.Modal(document.getElementById("sparePartModal")).show();
}

async function openEditModal(partCode) {
    try {
        const res = await fetch(`${BASE_URL}/get-by-code/${partCode}`, { headers: getAuthHeaders() });
        const result = await res.json();
        const data = result.data || result.body || result;

        if ((res.ok || result.code === 200) && data) {
            document.getElementById("editPartCode").value = data.partCode;
            document.getElementById("partName").value = data.partName || "";
            document.getElementById("brand").value = data.brand || "";
            document.getElementById("partType").value = data.partType || "SPARE_PART";
            document.getElementById("costPrice").value = data.costPrice || 0;
            document.getElementById("unitPrice").value = data.unitPrice || 0;
            document.getElementById("quantityInStock").value = data.quantityInStock || 0;
            document.getElementById("reorderLevel").value = data.reorderLevel || 0;

            document.getElementById("sparePartModalTitle").innerHTML = `<i class="fa-solid fa-pen-to-square me-2 text-warning"></i>Edit Spare Part (${data.partCode})`;
            new bootstrap.Modal(document.getElementById("sparePartModal")).show();
        }
    } catch (e) {
        console.error("Error opening edit modal:", e);
        alert("Failed to load details for part: " + partCode);
    }
}

async function saveOrUpdateSparePart() {
    const editCode = document.getElementById("editPartCode").value;
    const payload = {
        partName: document.getElementById("partName").value.trim(),
        brand: document.getElementById("brand").value.trim(),
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
            alert(result.message || `Spare part ${isUpdate ? 'updated' : 'saved'} successfully!`);
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById("sparePartModal"));
            if (modalInstance) modalInstance.hide();
            loadAllSpareParts();
        } else {
            alert(result.message || "Action failed!");
        }
    } catch (e) {
        console.error("Save error:", e);
        alert("Error saving spare part details.");
    }
}

async function deleteSparePart(partCode) {
    if (!confirm(`Are you sure you want to delete part ${partCode}?`)) return;

    try {
        const res = await fetch(`${BASE_URL}/delete/${partCode}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (res.ok || result.code === 200) {
            alert(result.message || "Spare Part deleted successfully!");
            loadAllSpareParts();
        } else {
            alert(result.message || "Failed to delete spare part.");
        }
    } catch (e) {
        console.error("Delete error:", e);
        alert("Failed to delete spare part.");
    }
}

// Part Issue & Internal Stock Issue Modal Handlers
function openPartIssueModal() {
    document.getElementById("partIssueForm").reset();
    new bootstrap.Modal(document.getElementById("partIssueModal")).show();
}

function openInternalStockModal() {
    document.getElementById("internalStockForm").reset();
    new bootstrap.Modal(document.getElementById("internalStockModal")).show();
}

async function openPartIssueModal() {
    const container = document.getElementById("partIssueModalContent");

    const modal = new bootstrap.Modal(document.getElementById("partIssueModal"));
    modal.show();

    container.innerHTML = `
        <div class="p-5 text-center text-white">
            <i class="fa-solid fa-circle-notch fa-spin fa-2x mb-3 text-primary-color"></i>
            <p class="mb-0">Loading Job Card Parts Management...</p>
        </div>`;

    try {

        const response = await fetch("job-card-part-manage.html");
        if (response.ok) {
            const htmlText = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");
            const mainContent = doc.querySelector(".container-fluid") || doc.body;

            container.innerHTML = `
                <div class="modal-header border-bottom border-secondary p-3">
                    <h5 class="modal-title fw-bold text-white"><i class="fa-solid fa-gears me-2 text-primary-color"></i>Job Card Parts Management</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-3">
                    ${mainContent.innerHTML}
                </div>`;

            setTimeout(() => {
                if (typeof loadPendingRequests === "function") {
                    loadPendingRequests();
                } else if (typeof loadAllJobCardParts === "function") {
                    loadAllJobCardParts();
                } else {
                    console.error("Data loading function not found in job-card-part-manage.js!");
                }
            }, 100);

        } else {
            container.innerHTML = `<div class="p-4 text-center text-danger">Failed to load HTML file.</div>`;
        }
    } catch (error) {
        console.error("Error loading modal:", error);
        container.innerHTML = `<div class="p-4 text-center text-danger">Error fetching content.</div>`;
    }
}

async function openInternalStockModal() {
    const container = document.getElementById("internalStockModalContent");

    const modal = new bootstrap.Modal(document.getElementById("internalStockModal"));
    modal.show();

    container.innerHTML = `
        <div class="p-5 text-center text-white">
            <i class="fa-solid fa-circle-notch fa-spin fa-2x mb-3 text-primary-color"></i>
            <p class="mb-0">Loading Internal Stock Issue...</p>
        </div>`;

    try {
        const response = await fetch("internal-stock-issue.html");
        if (response.ok) {
            const htmlText = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");
            const mainContent = doc.querySelector(".container-fluid") || doc.body;

            container.innerHTML = `
                <div class="modal-header border-bottom border-secondary p-3">
                    <h5 class="modal-title fw-bold text-white"><i class="fa-solid fa-hand-holding-hand me-2 text-primary-color"></i>Internal Stock Issue</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-3">
                    ${mainContent.innerHTML}
                </div>`;

            setTimeout(() => {
                if (typeof loadAllInternalIssues === "function") {
                    loadAllInternalIssues();
                } else {
                    console.error("Data loading function not found in internal-stock-issue.js!");
                }
            }, 100);

        } else {
            container.innerHTML = `<div class="p-4 text-center text-danger">Failed to load HTML file.</div>`;
        }
    } catch (error) {
        console.error("Error loading modal:", error);
        container.innerHTML = `<div class="p-4 text-center text-danger">Error fetching content.</div>`;
    }
}

// Search and Filter Functions
function filterPartsLocally() {
    const query = document.getElementById("sparePartSearchInput").value.toLowerCase().trim();
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