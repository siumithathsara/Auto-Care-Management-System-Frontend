const BASE_URL = "http://localhost:8080/api/v1/internal-stock-issue";
const SPARE_PART_API = "http://localhost:8080/api/v1/spare-part";

document.addEventListener("DOMContentLoaded", () => {
    applyRoleSecurity();
    loadTotalCount();
    loadAllInternalIssues();
});

// Role Isolation Logic (ADMIN vs ADVISOR / MECHANIC)
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

// Fetch total count endpoint
async function loadTotalCount() {
    try {
        const response = await fetch(`${BASE_URL}/count`, { headers: getAuthHeaders() });
        const result = await response.json();
        if (result.code === 200) {
            document.getElementById("totalIssuesCount").innerText = result.data;
        }
    } catch (e) {
        console.error("Failed to fetch total count", e);
    }
}

// Fetch all internal stock issues
async function loadAllInternalIssues() {
    document.getElementById("issueSearchInput").value = "";
    const tbody = document.getElementById("internalIssueTableBody");
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Loading internal stock issue records...</td></tr>`;

    try {
        const response = await fetch(`${BASE_URL}/get-all`, { headers: getAuthHeaders() });
        const result = await response.json();

        if (result.code === 200 && result.data) {
            renderIssueRows(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No internal stock issues found.</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Failed to connect to backend server.</td></tr>`;
    }
}

// Populate Table Rows
function renderIssueRows(issues) {
    const tbody = document.getElementById("internalIssueTableBody");

    if (!issues || issues.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No issue logs available.</td></tr>`;
        return;
    }

    tbody.innerHTML = issues.map(item => `
        <tr>
            <td class="fw-bold text-white">${item.internalPartCode || 'N/A'}</td>
            <td>
                <strong class="text-white d-block">${item.partName || 'Unknown Part'}</strong>
                <small class="text-muted">Code: ${item.partCode || 'N/A'}</small>
            </td>
            <td>
                <span class="text-white fw-semibold">${item.employeeName || 'N/A'}</span>
                <small class="text-muted d-block">${item.employeeCode}</small>
            </td>
            <td><span class="badge bg-secondary">${item.sectionName || item.sectionCode || 'N/A'}</span></td>
            <td class="fw-bold text-white">${item.quantity}</td>
            <td>Rs. ${(item.unitCost || 0).toFixed(2)}</td>
            <td class="text-primary-color fw-bold">Rs. ${(item.totalCost || 0).toFixed(2)}</td>
            <td><small class="text-muted">${item.issuedByUserName || item.userCode || 'System'}</small></td>
            <td><small class="text-muted">${item.issuedAt ? new Date(item.issuedAt).toLocaleString() : 'N/A'}</small></td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-outline-info" onclick="viewIssueDetail('${item.internalPartCode}')">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Open Form Modal & Populate Available Parts
async function openIssueStockModal() {
    document.getElementById("issueStockForm").reset();
    const partSelect = document.getElementById("partId");
    partSelect.innerHTML = `<option value="" selected disabled>Loading available spare parts...</option>`;

    new bootstrap.Modal(document.getElementById("issueStockModal")).show();

    try {
        const res = await fetch(`${SPARE_PART_API}/get-all`, { headers: getAuthHeaders() });
        const result = await res.json();
        if (result.code === 200 && result.data) {
            partSelect.innerHTML = `<option value="" selected disabled>Select Spare Part</option>` +
                result.data.map(p => `<option value="${p.partId}">${p.partName} (${p.partCode}) - Available Stock: ${p.quantityInStock}</option>`).join('');
        }
    } catch (e) {
        partSelect.innerHTML = `<option value="" selected disabled>Failed to load spare parts</option>`;
    }
}

// Submit Issue Request (ADMIN Action)
async function submitInternalStockIssue() {
    const payload = {
        partId: parseInt(document.getElementById("partId").value),
        employeeCode: document.getElementById("employeeCode").value.trim(),
        sectionCode: document.getElementById("sectionCode").value.trim() || null,
        quantity: parseInt(document.getElementById("quantity").value),
        usageReason: document.getElementById("usageReason").value.trim()
    };

    if (!payload.partId || !payload.employeeCode || !payload.quantity || !payload.usageReason) {
        alert("Please complete all required fields.");
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/issue`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok || result.code === 201) {
            bootstrap.Modal.getInstance(document.getElementById("issueStockModal")).hide();
            loadTotalCount();
            loadAllInternalIssues();
        } else {
            alert(result.message || "Failed to submit internal stock issue.");
        }
    } catch (e) {
        alert("Server error occurred while processing request.");
    }
}

// View Issue Detail Modal Functionality
async function viewIssueDetail(code) {
    try {
        const res = await fetch(`${BASE_URL}/get-by-code/${code}`, { headers: getAuthHeaders() });
        const result = await res.json();

        if (result.code === 200 && result.data) {
            const data = result.data;
            document.getElementById("viewDetailModalBody").innerHTML = `
                <div class="row g-3 fs-7">
                    <div class="col-6"><span class="text-muted d-block">Issue Code:</span><strong class="text-white">${data.internalPartCode}</strong></div>
                    <div class="col-6"><span class="text-muted d-block">Issued Date:</span><strong class="text-white">${data.issuedAt ? new Date(data.issuedAt).toLocaleString() : 'N/A'}</strong></div>
                    <div class="col-6"><span class="text-muted d-block">Part Name:</span><strong class="text-white">${data.partName} (${data.partCode})</strong></div>
                    <div class="col-6"><span class="text-muted d-block">Issued Quantity:</span><strong class="text-white">${data.quantity}</strong></div>
                    <div class="col-6"><span class="text-muted d-block">Employee:</span><strong class="text-white">${data.employeeName || 'N/A'} (${data.employeeCode})</strong></div>
                    <div class="col-6"><span class="text-muted d-block">Section:</span><strong class="text-white">${data.sectionName || data.sectionCode || 'N/A'}</strong></div>
                    <div class="col-6"><span class="text-muted d-block">Unit Cost:</span><strong class="text-white">Rs. ${(data.unitCost || 0).toFixed(2)}</strong></div>
                    <div class="col-6"><span class="text-muted d-block">Total Cost:</span><strong class="text-primary-color">Rs. ${(data.totalCost || 0).toFixed(2)}</strong></div>
                    <div class="col-12"><span class="text-muted d-block">Issued By:</span><strong class="text-white">${data.issuedByUserName || data.userCode}</strong></div>
                    <div class="col-12"><span class="text-muted d-block">Usage Reason:</span><p class="text-white bg-dark p-2 rounded mt-1 border border-secondary mb-0">${data.usageReason}</p></div>
                </div>
            `;
            new bootstrap.Modal(document.getElementById("viewDetailModal")).show();
        }
    } catch (e) {
        alert("Failed to fetch issue details.");
    }
}

// Single Universal Real-Time Client Filter
function filterIssuesLocally() {
    const query = document.getElementById("issueSearchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#internalIssueTableBody tr");
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
    });
}