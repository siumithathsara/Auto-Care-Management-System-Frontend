const BASE_URL = "http://localhost:8080/api/v1/job-card-part";

document.addEventListener("DOMContentLoaded", () => {
    applyRoleSecurity();
    const role = localStorage.getItem("userRole");

    if (role === "ADMIN") {
        loadPendingRequests();
    } else {
        document.getElementById("jobCardPartTableBody").innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-5 fs-7">
                    Please enter a Job Card Code above and click Search to view parts.
                </td>
            </tr>`;
    }
});

// Back to Spare Parts Inventory Function
function navigateToInventory() {

    const dynamicModal = document.getElementById("dynamicContainerModal");
    if (dynamicModal && bootstrap.Modal.getInstance(dynamicModal)) {
        bootstrap.Modal.getInstance(dynamicModal).hide();
    } else {
        window.location.href = "spare-part-manage.html";
    }
}

function applyRoleSecurity() {
    const role = localStorage.getItem("userRole");
    if (role !== "ADMIN") {
        document.querySelectorAll('.admin-only-action').forEach(el => el.style.setProperty('display', 'none', 'important'));
    }
}

function getAuthHeaders() {
    return {
        "Authorization": `Bearer ${localStorage.getItem("userToken") || localStorage.getItem("jwtToken")}`,
        "Content-Type": "application/json"
    };
}

async function loadPendingRequests() {
    document.getElementById("jobCardPartSearchInput").value = "";
    document.getElementById("jobCardCodeInput").value = "";

    const tbody = document.getElementById("jobCardPartTableBody");
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Loading pending part requests...</td></tr>`;

    try {
        const response = await fetch(`${BASE_URL}/pending-requests`, { headers: getAuthHeaders() });
        const result = await response.json();

        console.log("Pending Requests Response:", result);

        const items = result.body || result.data || (Array.isArray(result) ? result : (result.content || []));

        if (response.ok && items.length > 0) {
            document.getElementById("pendingRequestsCount").innerText = items.length;
            renderJobCardPartRows(items);
        } else {
            document.getElementById("pendingRequestsCount").innerText = "0";
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No pending part requests found.</td></tr>`;
        }
    } catch (e) {
        console.error("Error loading pending requests:", e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load requests from server.</td></tr>`;
    }
}

async function fetchPartsByJobCard() {
    const code = document.getElementById("jobCardCodeInput").value.trim();
    if (!code) {
        alert("Please enter a Job Card Code.");
        return;
    }

    const tbody = document.getElementById("jobCardPartTableBody");
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Fetching parts for Job Card ${code}...</td></tr>`;

    try {
        const response = await fetch(`${BASE_URL}/get-by-job-card/${code}`, { headers: getAuthHeaders() });
        const result = await response.json();

        console.log("Job Card Parts Response:", result);

        const items = result.body || result.data || (Array.isArray(result) ? result : (result.content || []));

        if (response.ok && items.length > 0) {
            renderJobCardPartRows(items);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No parts found for Job Card: ${code}</td></tr>`;
        }
    } catch (e) {
        console.error("Error fetching parts by job card:", e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error fetching parts for specified Job Card.</td></tr>`;
    }
}

function renderJobCardPartRows(items) {
    const tbody = document.getElementById("jobCardPartTableBody");
    const role = localStorage.getItem("userRole");

    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No record entries available.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => {
        const statusBadge = getStatusBadge(item.issueStatus);

        return `
        <tr>
            <td>
                <strong class="text-white d-block">${item.partName || 'Unknown Part'}</strong>
                <small class="text-muted">Code: ${item.partCode || 'N/A'}</small>
            </td>
            <td><span class="text-white fw-semibold">${item.requestedByName || 'N/A'}</span></td>
            <td class="fw-bold text-white">${item.quantity}</td>
            <td>Rs. ${(item.unitPrice || 0).toFixed(2)}</td>
            <td class="text-primary-color fw-bold">Rs. ${(item.subTotal || 0).toFixed(2)}</td>
            <td>${statusBadge}</td>
            ${role === 'ADMIN' ? `
            <td class="text-end px-4 admin-only-action">
                <div class="d-flex gap-1 justify-content-end">
                    ${item.issueStatus === 'REQUESTED' ? `
                        <button class="btn btn-action-issue btn-sm" onclick="issuePart('${item.jobCardPartId}')" title="Issue & Auto Deduct Stock">
                            <i class="fa-solid fa-check me-1"></i>Issue
                        </button>
                        <button class="btn btn-action-reject btn-sm" onclick="rejectPart('${item.jobCardPartId}')" title="Reject Request">
                            <i class="fa-solid fa-xmark me-1"></i>Reject
                        </button>
                    ` : ''}
                    
                    ${item.issueStatus === 'ISSUED' ? `
                        <button class="btn btn-action-return btn-sm" onclick="returnPart('${item.jobCardPartId}')" title="Return & Auto Restore Stock">
                            <i class="fa-solid fa-rotate-left me-1"></i>Return
                        </button>
                    ` : ''}
                </div>
            </td>` : ''}
        </tr>
    `}).join('');
}

// Status Badges
function getStatusBadge(status) {
    switch (status) {
        case 'ISSUED':
            return `<span class="badge bg-success-subtle text-success border border-success-subtle">ISSUED</span>`;
        case 'RETURNED':
            return `<span class="badge bg-warning-subtle text-warning border border-warning-subtle">RETURNED</span>`;
        case 'REJECTED':
            return `<span class="badge bg-danger-subtle text-danger border border-danger-subtle">REJECTED</span>`;
        case 'PENDING_SUPPLIER_ORDER':
            return `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">ORDER PENDING</span>`;
        default:
            return `<span class="badge bg-info-subtle text-info border border-info-subtle">REQUESTED</span>`;
    }
}

async function issuePart(id) {
    if (!confirm("Confirm issuing this spare part? Stock will be automatically deducted.")) return;

    try {
        const response = await fetch(`${BASE_URL}/issue/${id}`, {
            method: "PATCH",
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (response.ok) {
            alert(result.message || "Spare Part issued successfully!");
            loadPendingRequests();
        } else {
            alert(result.message || "Failed to issue part.");
        }
    } catch (e) {
        alert("Server error while issuing part.");
    }
}

async function returnPart(id) {
    if (!confirm("Confirm returning this spare part? Stock will be automatically restored.")) return;

    try {
        const response = await fetch(`${BASE_URL}/return/${id}`, {
            method: "PATCH",
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (response.ok) {
            alert(result.message || "Spare Part returned successfully!");
            loadPendingRequests();
        } else {
            alert(result.message || "Failed to return part.");
        }
    } catch (e) {
        alert("Server error while returning part.");
    }
}

async function rejectPart(id) {
    if (!confirm("Are you sure you want to reject this request?")) return;

    try {
        const response = await fetch(`${BASE_URL}/reject/${id}`, {
            method: "PATCH",
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (response.ok) {
            alert(result.message || "Spare Part request rejected!");
            loadPendingRequests();
        } else {
            alert(result.message || "Failed to reject part request.");
        }
    } catch (e) {
        alert("Server error while rejecting part request.");
    }
}

// Reset and Reload
function resetAndReload() {
    const role = localStorage.getItem("userRole");
    if (role === "ADMIN") {
        loadPendingRequests();
    } else {
        document.getElementById("jobCardCodeInput").value = "";
        document.getElementById("jobCardPartTableBody").innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Please search by Job Card Code.</td></tr>`;
    }
}

// Universal Client Search Filter
function filterPartsLocally() {
    const query = document.getElementById("jobCardPartSearchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#jobCardPartTableBody tr");
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
    });
}