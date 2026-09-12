const APPOINTMENT_BASE_URL = "http://localhost:8080/api/v1/appointment";
let rawAppointmentsList = [];
let appointmentModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    appointmentModalInstance = new bootstrap.Modal(document.getElementById('adminAppointmentModal'));
    loadAppointmentCount();
    loadAllAppointments();
});

function getAuthHeader() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

async function loadAppointmentCount() {
    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/count`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            document.getElementById('adminTotalCount').innerText = result.data || 0;
        }
    } catch (err) {
        console.error("Count fetch error:", err);
    }
}

async function loadAllAppointments() {
    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/get-all`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            rawAppointmentsList = result.data || [];
            renderAdminTable(rawAppointmentsList);
        }
    } catch (err) {
        console.error("Error loading appointments:", err);
        showEmptyTable("Failed to load appointments from server.");
    }
}

function renderAdminTable(appointments) {
    const tbody = document.getElementById('adminAppointmentsBody');
    tbody.innerHTML = "";

    if (!appointments || appointments.length === 0) {
        showEmptyTable("No appointments found.");
        return;
    }

    appointments.forEach(app => {
        const services = app.selectedServices
            ? app.selectedServices.map(s => s.serviceName || s).join(", ")
            : "N/A";

        const formattedFee = app.estimatedTotalFee
            ? parseFloat(app.estimatedTotalFee).toLocaleString('en-US', { minimumFractionDigits: 2 })
            : "0.00";

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-white fs-7">${app.appointmentCode}</td>
                <td>
                    <div class="fw-bold text-white fs-7">${app.customerName || 'N/A'}</div>
                    <div class="text-muted fs-8">${app.customerPhone || app.userCode || ''}</div>
                </td>
                <td>
                    <div class="text-white fs-7 fw-bold">${app.licensePlate || 'N/A'}</div>
                    <div class="text-muted fs-8">${app.vehicleModel || app.vehicleCode || ''}</div>
                </td>
                <td>
                    <div class="text-white fs-7">${app.appointmentDate}</div>
                    <div class="text-muted fs-8">${app.appointmentTime}</div>
                </td>
                <td class="fs-7 text-truncate" style="max-width: 170px;" title="${services}">${services}</td>
                <td class="fw-bold fs-7" style="color: var(--emerald);">LKR ${formattedFee}</td>
                <td>
                    ${getStatusBadgeMarkup(app.status)}
                </td>
                <td class="text-end px-4">
                    <div class="d-inline-flex align-items-center gap-2">
                        <!-- Edit Button -->
                        <button class="btn btn-outline-custom btn-sm px-2 py-1" title="Edit Appointment" onclick="openEditModal('${app.appointmentCode}')">
                            <i class="fa-solid fa-pen-to-square text-indigo"></i>
                        </button>
                        
                        <!-- Status Quick Action Buttons -->
                        ${getStatusActionButtons(app.appointmentCode, app.status)}
                    </div>
                </td>
            </tr>
        `;
    });
}

// Custom Badge for status displaying
function getStatusBadgeMarkup(status) {
    const statusMap = {
        'PENDING': '<span class="badge bg-warning text-dark px-2 py-1 fs-8"><i class="fa-solid fa-hourglass-start me-1"></i>PENDING</span>',
        'CONFIRMED': '<span class="badge bg-info text-dark px-2 py-1 fs-8"><i class="fa-solid fa-circle-check me-1"></i>CONFIRMED</span>',
        'COMPLETED': '<span class="badge bg-success text-white px-2 py-1 fs-8"><i class="fa-solid fa-check-double me-1"></i>COMPLETED</span>',
        'CANCELLED': '<span class="badge bg-danger text-white px-2 py-1 fs-8"><i class="fa-solid fa-ban me-1"></i>CANCELLED</span>'
    };
    return statusMap[status] || `<span class="badge bg-secondary px-2 py-1 fs-8">${status}</span>`;
}

// Dynamic Action Buttons for Status Transitioning with proper gaps
function getStatusActionButtons(code, currentStatus) {
    let buttonsHtml = '';

    if (currentStatus === 'PENDING') {
        buttonsHtml += `
            <button class="btn btn-sm btn-outline-info px-2 py-1 fs-8" title="Confirm" onclick="changeStatus('${code}', 'CONFIRMED')">
                <i class="fa-solid fa-check me-1"></i>Confirm
            </button>
            <button class="btn btn-sm btn-outline-danger px-2 py-1 fs-8" title="Cancel" onclick="changeStatus('${code}', 'CANCELLED')">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
    } else if (currentStatus === 'CONFIRMED') {
        buttonsHtml += `
            <button class="btn btn-sm btn-outline-success px-2 py-1 fs-8" title="Mark Completed" onclick="changeStatus('${code}', 'COMPLETED')">
                <i class="fa-solid fa-check-double me-1"></i>Complete
            </button>
            <button class="btn btn-sm btn-outline-danger px-2 py-1 fs-8" title="Cancel" onclick="changeStatus('${code}', 'CANCELLED')">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
    } else {
        buttonsHtml += `<span class="text-muted fs-8">No Actions</span>`;
    }

    return buttonsHtml;
}

// Filter Status via API or local tab
async function filterByStatus(status, btnElement) {
    document.querySelectorAll('#statusFilterContainer .btn').forEach(b => b.classList.remove('btn-primary-custom'));
    btnElement.classList.add('btn-primary-custom');

    if (status === 'ALL') {
        loadAllAppointments();
        return;
    }

    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/get-by-status/${status}`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            renderAdminTable(result.data || []);
        }
    } catch (err) {
        console.error("Filter error:", err);
    }
}

// Client-side quick search filter
function filterAppointmentsLocally() {
    const term = document.getElementById('adminSearchInput').value.toLowerCase();
    const filtered = rawAppointmentsList.filter(app =>
        (app.appointmentCode && app.appointmentCode.toLowerCase().includes(term)) ||
        (app.customerName && app.customerName.toLowerCase().includes(term)) ||
        (app.licensePlate && app.licensePlate.toLowerCase().includes(term))
    );
    renderAdminTable(filtered);
}

// Change Status Request
async function changeStatus(appointmentCode, newStatus) {
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/change-status/${appointmentCode}?status=${newStatus}`, {
            method: 'PATCH',
            headers: getAuthHeader()
        });

        if (res.ok) {
            loadAllAppointments();
            loadAppointmentCount();
        } else {
            const errData = await res.json();
            alert(errData.message || "Failed to update status.");
        }
    } catch (err) {
        console.error("Status update error:", err);
    }
}

// Create Modal Opening
function openCreateModal() {
    document.getElementById('modalTitle').innerText = "Create New Appointment";
    document.getElementById('editAppointmentCode').value = "";
    document.getElementById('adminAppForm').reset();
    appointmentModalInstance.show();
}

// Edit Modal Opening & Pre-filling Data
async function openEditModal(code) {
    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/get-by-code/${code}`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            const data = result.data;

            document.getElementById('modalTitle').innerText = `Edit Appointment (${code})`;
            document.getElementById('editAppointmentCode').value = data.appointmentCode;
            document.getElementById('adminUserCode').value = data.userCode || '';
            document.getElementById('adminVehicleCode').value = data.vehicleCode || '';
            document.getElementById('adminDate').value = data.appointmentDate || '';
            document.getElementById('adminTime').value = data.appointmentTime ? data.appointmentTime.substring(0, 5) : '';

            const serviceCodes = data.selectedServices ? data.selectedServices.map(s => s.serviceCode || s).join(", ") : "";
            document.getElementById('adminServiceCodes').value = serviceCodes;
            document.getElementById('adminSpecialNotes').value = data.specialNotes || '';

            appointmentModalInstance.show();
        }
    } catch (err) {
        console.error("Fetch single appointment error:", err);
    }
}

// Save or Update Appointment API Call
async function saveAppointmentFromAdmin() {
    const editCode = document.getElementById('editAppointmentCode').value;
    const servicesInput = document.getElementById('adminServiceCodes').value;
    const serviceList = servicesInput.split(',').map(s => s.trim()).filter(s => s !== "");

    const payload = {
        userCode: document.getElementById('adminUserCode').value,
        vehicleCode: document.getElementById('adminVehicleCode').value,
        appointmentDate: document.getElementById('adminDate').value,
        appointmentTime: document.getElementById('adminTime').value + ":00",
        serviceCodes: serviceList,
        specialNotes: document.getElementById('adminSpecialNotes').value
    };

    const isEdit = editCode !== "";
    const endpoint = isEdit ? `${APPOINTMENT_BASE_URL}/update/${editCode}` : `${APPOINTMENT_BASE_URL}/create`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(endpoint, {
            method: method,
            headers: getAuthHeader(),
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok) {
            alert(result.message || "Saved successfully!");
            appointmentModalInstance.hide();
            loadAllAppointments();
            loadAppointmentCount();
        } else {
            alert(result.message || "Failed to save appointment.");
        }
    } catch (err) {
        console.error("Save appointment error:", err);
    }
}

function showEmptyTable(message) {
    const tbody = document.getElementById('adminAppointmentsBody');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4 fs-7">${message}</td></tr>`;
}