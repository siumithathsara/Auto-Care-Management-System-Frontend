const BASE_URL = "http://localhost:8080/api/v1/job-card-part";

document.addEventListener("DOMContentLoaded", () => {
    applyRoleSecurity();
    loadPendingRequests();
});

// Role Isolation Logic (ADMIN vs ADVISOR)
function applyRoleSecurity() {
    const role = localStorage.getItem("userRole");
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

// GET /pending-requests (ADMIN ONLY)
async function loadPendingRequests() {
    document.getElementById("jobCardPartSearchInput").value = "";
    document.getElementById("jobCardCodeInput").value = "";

    const tbody = document.getElementById("jobCardPartTableBody");
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Loading pending part requests...</td></tr>`;

    try {
        const response = await fetch(`${BASE_URL}/pending-requests`, { headers: getAuthHeaders() });
        const result = await response.json();

        if (result.code === 200 && result.data) {
            document.getElementById("pendingRequestsCount").innerText = result.data.length;
            renderJobCardPartRows(result.data);
        } else {
            document.getElementById("pendingRequestsCount").innerText = "0";
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No pending part requests found.</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load requests from server.</td></tr>`;
    }
}

// GET /get-by-job-card/{jobCardCode} (ADMIN & ADVISOR)
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

        if (result.code === 200 && result.data) {
            renderJobCardPartRows(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No parts found for Job Card: ${code}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error fetching parts for specified Job Card.</td></tr>`;
    }
}

// Render Rows into Data Table
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
            <td class="text-end px-4">
                <div class="d-flex gap-1 justify-content-end">
                    ${item.issueStatus === 'PENDING' ? `
                        <button class="btn btn-action-issue" onclick="issuePart('${item.jobCardPartId || item.partCode}')" title="Issue & Auto Deduct Stock">
                            <i class="fa-solid fa-check me-1"></i>Issue
                        </button>
                        <button class="btn btn-action-reject" onclick="rejectPart('${item.jobCardPartId || item.partCode}')" title="Reject Request">
                            <i class="fa-solid fa-xmark me-1"></i>Reject
                        </button>
                    ` : ''}
                    
                    ${item.issueStatus === 'ISSUED' ? `
                        <button class="btn btn-action-return" onclick="returnPart('${item.jobCardPartId || item.partCode}')" title="Return & Auto Restore Stock">
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
        default:
            return `<span class="badge bg-info-subtle text-info border border-info-subtle">PENDING</span>`;
    }
}

// PATCH /issue/{jobCardPartId} (ADMIN ONLY)
async function issuePart(id) {
    if (!confirm("Confirm issuing this spare part? Stock will be automatically deducted.")) return;

    try {
        const response = await fetch(`${BASE_URL}/issue/${id}`, {
            method: "PATCH",
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (response.ok || result.code === 200) {
            loadPendingRequests();
        } else {
            alert(result.message || "Failed to issue part.");
        }
    } catch (e) {
        alert("Server error while issuing part.");
    }
}

// PATCH /return/{jobCardPartId} (ADMIN ONLY)
async function returnPart(id) {
    if (!confirm("Confirm returning this spare part? Stock will be automatically restored.")) return;

    try {
        const response = await fetch(`${BASE_URL}/return/${id}`, {
            method: "PATCH",
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (response.ok || result.code === 200) {
            loadPendingRequests();
        } else {
            alert(result.message || "Failed to return part.");
        }
    } catch (e) {
        alert("Server error while returning part.");
    }
}

// PATCH /reject/{jobCardPartId} (ADMIN ONLY)
async function rejectPart(id) {
    if (!confirm("Are you sure you want to reject this request?")) return;

    try {
        const response = await fetch(`${BASE_URL}/reject/${id}`, {
            method: "PATCH",
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (response.ok || result.code === 200) {
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
    loadPendingRequests();
}

// Universal Client Search Filter
function filterPartsLocally() {
    const query = document.getElementById("jobCardPartSearchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#jobCardPartTableBody tr");
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
    });
}