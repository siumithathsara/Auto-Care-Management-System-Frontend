const BASE_URL = "http://localhost:8080/api/v1/job-section";
let currentSelectedStatus = 'PENDING';

document.addEventListener("DOMContentLoaded", () => {
    loadJobSectionsByStatus('PENDING');

    const assignModalElem = document.getElementById("assignSectionModal");
    if (assignModalElem) {
        assignModalElem.addEventListener("hidden.bs.modal", () => {
            resetAssignForm();
        });
    }
});

function getAuthHeaders() {
    return {
        "Authorization": `Bearer ${localStorage.getItem("userToken") || localStorage.getItem("jwtToken")}`,
        "Content-Type": "application/json"
    };
}

async function loadInProgressJobCards() {
    const jobCardSelect = document.getElementById("assignJobCardCode");
    if (!jobCardSelect) return;

    jobCardSelect.innerHTML = `<option value="" selected disabled>Loading in-progress job cards...</option>`;

    try {
        const response = await fetch("http://localhost:8080/api/v1/job-card/get-all", {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        let jobCards = result.data || result.body || (Array.isArray(result) ? result : []);

        const inProgressCards = jobCards.filter(card =>
            card.status === "IN_PROGRESS" || card.status === "IN PROGRESS"
        );

        jobCardSelect.innerHTML = `<option value="" selected disabled>Select In-Progress Job Card</option>`;

        if (inProgressCards.length > 0) {
            inProgressCards.forEach(card => {
                jobCardSelect.innerHTML += `
                    <option value="${card.jobCardCode}">
                        ${card.jobCardCode} ${card.vehicleLicensePlate ? `(${card.vehicleLicensePlate})` : ''}
                    </option>`;
            });
        } else {
            jobCardSelect.innerHTML += `<option value="" disabled>No In-Progress Job Cards available</option>`;
        }
    } catch (error) {
        console.error("Error loading job cards:", error);
        jobCardSelect.innerHTML = `<option value="" disabled>Failed to load Job Cards</option>`;
    }
}

function openAssignModal() {
    resetAssignForm();
    loadInProgressJobCards();
    new bootstrap.Modal(document.getElementById("assignSectionModal")).show();
}

function resetAssignForm() {
    const form = document.getElementById("assignSectionForm");
    if (form) form.reset();

    const jobCardSelect = document.getElementById("assignJobCardCode");
    if (jobCardSelect) {
        jobCardSelect.innerHTML = `<option value="" selected disabled>Select In-Progress Job Card</option>`;
    }
}

async function loadJobSectionsByStatus(status) {
    currentSelectedStatus = status;
    const tbody = document.getElementById("jobSectionsTableBody");
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Loading job sections...</td></tr>`;

    try {
        const response = await fetch(`${BASE_URL}/get-by-status/${status}`, { headers: getAuthHeaders() });
        const result = await response.json();

        const items = result.data || result.body || (Array.isArray(result) ? result : []);

        if ((response.ok || result.code === 200) && items.length > 0) {
            renderTableRows(items);
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No job sections found for status: ${status}.</td></tr>`;
        }
    } catch (error) {
        console.error("Error loading sections:", error);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load sections from server.</td></tr>`;
    }
}

function loadAllJobSections() {
    loadJobSectionsByStatus(currentSelectedStatus);
}

function filterByStatus(status, buttonElement) {
    document.querySelectorAll('#statusFilterContainer button').forEach(btn => btn.classList.remove('active-filter'));
    buttonElement.classList.add('active-filter');

    if (status === 'ALL') {
        fetchAllStatusesCombined();
    } else {
        loadJobSectionsByStatus(status);
    }
}

async function fetchAllStatusesCombined() {
    const tbody = document.getElementById("jobSectionsTableBody");
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Loading all sections...</td></tr>`;

    try {
        const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
        let allItems = [];

        for (const st of statuses) {
            const res = await fetch(`${BASE_URL}/get-by-status/${st}`, { headers: getAuthHeaders() });
            const resJson = await res.json();
            const data = resJson.data || resJson.body || (Array.isArray(resJson) ? resJson : []);
            if (res.ok && data.length > 0) {
                allItems = allItems.concat(data);
            }
        }

        if (allItems.length > 0) {
            renderTableRows(allItems);
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No job sections found.</td></tr>`;
        }
    } catch (e) {
        console.error("Error fetching all statuses:", e);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load all sections.</td></tr>`;
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

async function submitAssignSection() {
    const jobCardVal = document.getElementById("assignJobCardCode").value;
    if (!jobCardVal) {
        alert("Please select an In-Progress Job Card.");
        return;
    }

    const payload = {
        jobCardCode: jobCardVal.trim(),
        assignedByUserId: parseInt(document.getElementById("assignUserId").value),
        mechanicEmployeeId: parseInt(document.getElementById("assignMechanicId").value),
        sectionName: document.getElementById("assignSectionName").value,
        remarks: document.getElementById("assignRemarks").value.trim()
    };

    try {
        const res = await fetch(`${BASE_URL}/assign`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.status === 201 || result.code === 201) {
            alert(result.message || "Job Section assigned successfully!");
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById("assignSectionModal"));
            if (modalInstance) modalInstance.hide();

            resetAssignForm();
            loadJobSectionsByStatus('PENDING');
        } else {
            alert(result.message || "Failed to assign job section.");
        }
    } catch (error) {
        console.error("Error assigning section:", error);
        alert("Server error while assigning job section.");
    }
}

async function startSection(sectionCode) {
    if (!confirm(`Are you sure you want to start section ${sectionCode}?`)) return;

    try {
        const res = await fetch(`${BASE_URL}/start/${sectionCode}`, {
            method: "PUT",
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (res.ok || result.code === 200) {
            alert(result.message || "Job Section started successfully!");
            loadAllJobSections();
        } else {
            alert(result.message || "Failed to start section.");
        }
    } catch (error) {
        console.error("Error starting section:", error);
        alert("Server error while starting section.");
    }
}

function openCompleteModal(sectionCode) {
    document.getElementById("completeTargetCode").value = sectionCode;
    document.getElementById("completeRemarks").value = "";
    new bootstrap.Modal(document.getElementById("completeSectionModal")).show();
}

async function submitCompleteSection() {
    const code = document.getElementById("completeTargetCode").value;
    const remarksValue = document.getElementById("completeRemarks").value.trim();

    let url = `${BASE_URL}/complete/${code}`;
    if (remarksValue) {
        url += `?remarks=${encodeURIComponent(remarksValue)}`;
    }

    try {
        const res = await fetch(url, {
            method: "PUT",
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (res.ok || result.code === 200) {
            alert(result.message || "Job Section completed successfully!");
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById("completeSectionModal"));
            if (modalInstance) modalInstance.hide();

            loadAllJobSections();
        } else {
            alert(result.message || "Failed to complete section.");
        }
    } catch (error) {
        console.error("Error completing section:", error);
        alert("Server error while completing section.");
    }
}

function filterSectionsLocally() {
    const query = document.getElementById("sectionSearchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#jobSectionsTableBody tr");
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
    });
}