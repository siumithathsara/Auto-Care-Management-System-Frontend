const BASE_URL = "http://localhost:8080/api/v1/job-section";

document.addEventListener("DOMContentLoaded", () => {
    loadAllJobSections();
});

// Helper for JWT Header
function getAuthHeaders() {
    return {
        "Authorization": `Bearer ${localStorage.getItem("userToken")}`,
        "Content-Type": "application/json"
    };
}

// Render Job Sections Table
async function loadAllJobSections() {
    const tbody = document.getElementById("jobSectionsTableBody");
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Loading...</td></tr>`;

    try {
        const response = await fetch(`${BASE_URL}/get-by-status/PENDING`, { headers: getAuthHeaders() });
        const result = await response.json();

        if (result.code === 200 && result.data) {
            renderTableRows(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No sections found.</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load sections from server.</td></tr>`;
    }
}

function renderTableRows(sections) {
    const tbody = document.getElementById("jobSectionsTableBody");
    if (!sections || sections.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No job sections found.</td></tr>`;
        return;
    }

    tbody.innerHTML = sections.map(sec => `
        <tr>
            <td class="fw-bold text-white">${sec.sectionCode}</td>
            <td><span class="badge bg-dark border border-secondary">${sec.jobCardCode}</span></td>
            <td>${sec.vehicleLicensePlate || '-'}</td>
            <td><strong class="text-primary-color">${sec.sectionName}</strong></td>
            <td>
                <div class="fs-7 fw-semibold">${sec.mechanicEmployeeName || 'N/A'}</div>
                <small class="text-muted">${sec.mechanicEmployeeCode || ''}</small>
            </td>
            <td><span class="badge badge-status-${sec.sectionStatus}">${sec.sectionStatus}</span></td>
            <td>
                <small class="d-block text-muted">Start: ${sec.startedAt ? sec.startedAt.replace('T', ' ') : '-'}</small>
                <small class="d-block text-muted">End: ${sec.completedAt ? sec.completedAt.replace('T', ' ') : '-'}</small>
            </td>
            <td class="text-end px-4">
                ${sec.sectionStatus === 'PENDING' ? `
                    <button class="btn btn-sm btn-outline-info me-1" onclick="startSection('${sec.sectionCode}')">
                        <i class="fa-solid fa-play me-1"></i>Start
                    </button>
                ` : ''}
                ${sec.sectionStatus === 'IN_PROGRESS' ? `
                    <button class="btn btn-sm btn-outline-success" onclick="openCompleteModal('${sec.sectionCode}')">
                        <i class="fa-solid fa-check me-1"></i>Complete
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// POST /assign
async function submitAssignSection() {
    const payload = {
        jobCardCode: document.getElementById("assignJobCardCode").value,
        assignedByUserId: parseInt(document.getElementById("assignUserId").value),
        mechanicEmployeeId: parseInt(document.getElementById("assignMechanicId").value),
        sectionName: document.getElementById("assignSectionName").value,
        remarks: document.getElementById("assignRemarks").value
    };

    const res = await fetch(`${BASE_URL}/assign`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.status === 201 || result.code === 201) {
        bootstrap.Modal.getInstance(document.getElementById("assignSectionModal")).hide();
        loadAllJobSections();
    }
}

// PUT /start/{sectionCode}
async function startSection(sectionCode) {
    const res = await fetch(`${BASE_URL}/start/${sectionCode}`, {
        method: "PUT",
        headers: getAuthHeaders()
    });
    if (res.ok) loadAllJobSections();
}

// PUT /complete/{sectionCode}
function openCompleteModal(sectionCode) {
    document.getElementById("completeTargetCode").value = sectionCode;
    new bootstrap.Modal(document.getElementById("completeSectionModal")).show();
}

async function submitCompleteSection() {
    const code = document.getElementById("completeTargetCode").value;
    const remarks = encodeURIComponent(document.getElementById("completeRemarks").value);

    const res = await fetch(`${BASE_URL}/complete/${code}?remarks=${remarks}`, {
        method: "PUT",
        headers: getAuthHeaders()
    });
    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById("completeSectionModal")).hide();
        loadAllJobSections();
    }
}

// Local Search Filter
function filterSectionsLocally() {
    const query = document.getElementById("sectionSearchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#jobSectionsTableBody tr");
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
    });
}