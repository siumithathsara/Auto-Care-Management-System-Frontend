const APPOINTMENT_BASE_URL = "http://localhost:8080/api/v1/appointment";
const VEHICLE_BASE_URL = "http://localhost:8080/api/v1/vehicle";
const SERVICE_BASE_URL = "http://localhost:8080/api/v1/service"; // Backend Service API endpoint

let rawAppointmentsList = [];
let availableServicesList = [];
let appointmentModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Modal Instance
    const modalEl = document.getElementById('adminAppointmentModal');
    if (modalEl) {
        appointmentModalInstance = new bootstrap.Modal(modalEl);
    }

    // Load initial data on page load
    loadAppointmentCount();
    loadAllAppointments();
    fetchAllServices(); // Page load aynappude services fetch avutayi
});

function getAuthHeader() {
    const token = localStorage.getItem("jwtToken");
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function fetchAllServices() {
    try {
        const res = await fetch(`${SERVICE_BASE_URL}/get-all`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            availableServicesList = result.body || result.data || [];
            renderServicesCheckboxes([]);
        } else {
            document.getElementById('servicesCheckboxContainer').innerHTML = '<div class="text-danger fs-8">Failed to load services</div>';
        }
    } catch (err) {
        console.error("Error fetching services:", err);
        document.getElementById('servicesCheckboxContainer').innerHTML = '<div class="text-danger fs-8">Error loading services</div>';
    }
}

function renderServicesCheckboxes(selectedCodes = []) {
    const container = document.getElementById('servicesCheckboxContainer');
    if (!container) return;

    if (!Array.isArray(availableServicesList) || availableServicesList.length === 0) {
        container.innerHTML = '<div class="text-muted fs-8">No services available.</div>';
        return;
    }

    let html = '<div class="row g-2">';
    availableServicesList.forEach(srv => {
        const code = srv.serviceCode || srv.code || srv.id;
        const name = srv.serviceName || srv.name || 'Unnamed Service';
        const price = srv.price ? ` - LKR ${parseFloat(srv.price).toFixed(2)}` : '';
        const isChecked = selectedCodes.includes(code) ? 'checked' : '';

        html += `
            <div class="col-md-6">
                <div class="form-check">
                    <input class="form-check-input service-checkbox" type="checkbox" value="${code}" id="srv_${code}" ${isChecked}>
                    <label class="form-check-label text-white fs-7" for="srv_${code}">
                        <span class="fw-bold">${name}</span> <span class="text-muted fs-8">(${code}${price})</span>
                    </label>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

async function fetchVehiclesByCustomerCode() {
    const userCodeInput = document.getElementById('adminUserCode');
    const vehicleSelect = document.getElementById('adminVehicleCode');

    if (!userCodeInput || !vehicleSelect) return;

    const userCode = userCodeInput.value.trim();
    vehicleSelect.innerHTML = '<option value="">-- Select Vehicle --</option>';

    if (!userCode) return;

    try {
        const res = await fetch(`${VEHICLE_BASE_URL}/get-by-customer/${userCode}`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            const vehicleList = result.body || result.data || [];

            if (Array.isArray(vehicleList) && vehicleList.length > 0) {
                vehicleList.forEach(vehicle => {
                    const option = document.createElement('option');
                    option.value = vehicle.vehicleCode || vehicle.id;

                    const plate = vehicle.licensePlate || vehicle.vehicleNumber || 'No Plate';
                    const brand = vehicle.brand || '';
                    const model = vehicle.model || '';
                    option.textContent = `${plate} (${brand} ${model})`.trim();

                    vehicleSelect.appendChild(option);
                });
            } else {
                vehicleSelect.innerHTML = '<option value="">No vehicles found for this customer</option>';
            }
        } else {
            vehicleSelect.innerHTML = '<option value="">Failed to fetch vehicles</option>';
        }
    } catch (err) {
        console.error("Error fetching vehicles by customer code:", err);
        vehicleSelect.innerHTML = '<option value="">Error loading vehicles</option>';
    }
}

async function loadAppointmentCount() {
    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/count`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            const countElement = document.getElementById('adminTotalCount');
            if (countElement) {
                const count = result.body !== undefined ? result.body : (result.data !== undefined ? result.data : 0);
                countElement.innerText = count;
            }
        }
    } catch (err) {
        console.error("Count fetch error:", err);
    }
}

async function loadAllAppointments() {
    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/get-all`, { headers: getAuthHeader() });
        const result = await res.json();

        const appointmentsList = result.body || result.data || [];

        if (res.ok && Array.isArray(appointmentsList) && appointmentsList.length > 0) {
            rawAppointmentsList = appointmentsList;
            renderAdminTable(rawAppointmentsList);
        } else if (res.ok && appointmentsList.length === 0) {
            showEmptyTable("No appointments found.");
        } else {
            showEmptyTable(result.message || "Failed to fetch appointments.");
        }
    } catch (err) {
        console.error("Error loading appointments:", err);
        showEmptyTable("Unable to connect to the server.");
    }
}

function renderAdminTable(appointments) {
    const tbody = document.getElementById('adminAppointmentsBody');
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!Array.isArray(appointments) || appointments.length === 0) {
        showEmptyTable("No appointments found.");
        return;
    }

    appointments.forEach(app => {
        const custName = app.customerName || (app.user ? app.user.username : 'N/A');
        const custContact = app.customerPhone || app.customerEmail || (app.user ? (app.user.phone || app.user.email) : '');

        const plate = app.licensePlate || (app.vehicle ? app.vehicle.licensePlate : 'N/A');
        const vehicleInfo = app.vehicleModel || app.vehicleCode || (app.vehicle ? `${app.vehicle.brand || ''} ${app.vehicle.model || ''}`.trim() : '');

        let services = "N/A";
        if (app.selectedServices && Array.isArray(app.selectedServices) && app.selectedServices.length > 0) {
            services = app.selectedServices
                .map(s => (typeof s === 'object' ? (s.serviceName || s.serviceCode) : s))
                .filter(Boolean)
                .join(", ");
        }

        const formattedFee = app.estimatedTotalFee !== undefined && app.estimatedTotalFee !== null
            ? parseFloat(app.estimatedTotalFee).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : "0.00";

        const formattedTime = app.appointmentTime ? app.appointmentTime.toString().substring(0, 5) : '';

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-white fs-7">${app.appointmentCode || 'N/A'}</td>
                <td>
                    <div class="fw-bold text-white fs-7">${custName}</div>
                    <div class="text-muted fs-8">${custContact}</div>
                </td>
                <td>
                    <div class="text-white fs-7 fw-bold">${plate}</div>
                    <div class="text-muted fs-8">${vehicleInfo}</div>
                </td>
                <td>
                    <div class="text-white fs-7">${app.appointmentDate || ''}</div>
                    <div class="text-muted fs-8">${formattedTime}</div>
                </td>
                <td class="fs-7 text-truncate" style="max-width: 170px;" title="${services}">${services}</td>
                <td class="fw-bold fs-7" style="color: #10b981;">LKR ${formattedFee}</td>
                <td>
                    ${getStatusBadgeMarkup(app.status)}
                </td>
                <td class="text-end px-4">
                    <div class="d-inline-flex align-items-center gap-2">
                        <button class="btn btn-outline-custom btn-sm px-2 py-1" title="Edit Appointment" onclick="openEditModal('${app.appointmentCode}')">
                            <i class="fa-solid fa-pen-to-square text-indigo"></i>
                        </button>
                        ${getStatusActionButtons(app.appointmentCode, app.status)}
                    </div>
                </td>
            </tr>
        `;
    });
}

function getStatusBadgeMarkup(status) {
    const statusMap = {
        'PENDING': '<span class="badge bg-warning text-dark px-2 py-1 fs-8"><i class="fa-solid fa-hourglass-start me-1"></i>PENDING</span>',
        'CONFIRMED': '<span class="badge bg-info text-dark px-2 py-1 fs-8"><i class="fa-solid fa-circle-check me-1"></i>CONFIRMED</span>',
        'IN_PROGRESS': '<span class="badge bg-primary text-white px-2 py-1 fs-8"><i class="fa-solid fa-spinner me-1"></i>IN PROGRESS</span>',
        'COMPLETED': '<span class="badge bg-success text-white px-2 py-1 fs-8"><i class="fa-solid fa-check-double me-1"></i>COMPLETED</span>',
        'CANCELLED': '<span class="badge bg-danger text-white px-2 py-1 fs-8"><i class="fa-solid fa-ban me-1"></i>CANCELLED</span>'
    };
    return statusMap[status] || `<span class="badge bg-secondary px-2 py-1 fs-8">${status || 'UNKNOWN'}</span>`;
}

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

async function filterByStatus(status, btnElement) {
    if (btnElement) {
        document.querySelectorAll('#statusFilterContainer .btn').forEach(b => b.classList.remove('btn-primary-custom'));
        btnElement.classList.add('btn-primary-custom');
    }

    if (status === 'ALL') {
        loadAllAppointments();
        return;
    }

    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/get-by-status/${status}`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            const list = result.body || result.data || [];
            renderAdminTable(list);
        } else {
            showEmptyTable(`Failed to load appointments with status: ${status}`);
        }
    } catch (err) {
        console.error("Filter error:", err);
    }
}

function filterAppointmentsLocally() {
    const searchInput = document.getElementById('appointmentSearchInput');
    if (!searchInput) return;

    const term = searchInput.value.toLowerCase().trim();
    const filtered = rawAppointmentsList.filter(app => {
        const code = app.appointmentCode ? app.appointmentCode.toLowerCase() : '';
        const name = (app.customerName || (app.user ? app.user.username : '')).toLowerCase();
        const plate = (app.licensePlate || (app.vehicle ? app.vehicle.licensePlate : '')).toLowerCase();

        return code.includes(term) || name.includes(term) || plate.includes(term);
    });

    renderAdminTable(filtered);
}

async function changeStatus(appointmentCode, newStatus) {
    if (!confirm(`Are you sure you want to change the status of this appointment to ${newStatus}?`)) return;

    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/change-status/${appointmentCode}?status=${newStatus}`, {
            method: 'PATCH',
            headers: getAuthHeader()
        });

        const result = await res.json();

        if (res.ok) {
            alert(result.message || "Status updated successfully!");
            loadAllAppointments();
            loadAppointmentCount();
        } else {
            alert(result.message || "Failed to update status.");
        }
    } catch (err) {
        console.error("Status update error:", err);
        alert("An error occurred while updating the status.");
    }
}

function openCreateModal() {
    const titleEl = document.getElementById('modalTitle');
    const codeEl = document.getElementById('editAppointmentCode');
    const formEl = document.getElementById('adminAppForm');

    if (titleEl) titleEl.innerText = "Create New Appointment";
    if (codeEl) codeEl.value = "";
    if (formEl) formEl.reset();

    document.getElementById('adminVehicleCode').innerHTML = '<option value="">-- Select Vehicle --</option>';
    renderServicesCheckboxes([]);

    if (appointmentModalInstance) appointmentModalInstance.show();
}

async function openEditModal(code) {
    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/get-by-code/${code}`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            const data = result.body || result.data || {};

            document.getElementById('modalTitle').innerText = `Edit Appointment (${code})`;
            document.getElementById('editAppointmentCode').value = data.appointmentCode || '';

            const userCode = data.userCode || (data.user ? data.user.userCode : '');
            const selectedVehicleCode = data.vehicleCode || (data.vehicle ? data.vehicle.vehicleCode : '');

            document.getElementById('adminUserCode').value = userCode;

            await fetchVehiclesByCustomerCode();
            document.getElementById('adminVehicleCode').value = selectedVehicleCode;

            document.getElementById('adminDate').value = data.appointmentDate || '';
            document.getElementById('adminTime').value = data.appointmentTime ? data.appointmentTime.toString().substring(0, 5) : '';

            let selectedServiceCodes = [];
            if (data.selectedServices && Array.isArray(data.selectedServices)) {
                selectedServiceCodes = data.selectedServices
                    .map(s => (typeof s === 'object' ? (s.serviceCode || s.code || s.id) : s))
                    .filter(Boolean);
            }
            renderServicesCheckboxes(selectedServiceCodes);

            document.getElementById('adminSpecialNotes').value = data.specialNotes || '';

            if (appointmentModalInstance) appointmentModalInstance.show();
        } else {
            alert("An error occurred while fetching appointment details.");
        }
    } catch (err) {
        console.error("Fetch single appointment error:", err);
    }
}

async function saveAppointmentFromAdmin() {
    const editCode = document.getElementById('editAppointmentCode').value;

    const checkedCheckboxes = document.querySelectorAll('.service-checkbox:checked');
    const serviceList = Array.from(checkedCheckboxes).map(cb => cb.value);

    const userCode = document.getElementById('adminUserCode').value.trim();
    const vehicleCode = document.getElementById('adminVehicleCode').value;
    const appDate = document.getElementById('adminDate').value;
    let appTime = document.getElementById('adminTime').value;

    if (!userCode || !vehicleCode || !appDate || !appTime || serviceList.length === 0) {
        alert("Please fill in all required (*) fields and select at least one service.");
        return;
    }

    if (appTime.length === 5) {
        appTime += ":00";
    }

    const payload = {
        userCode: userCode,
        vehicleCode: vehicleCode,
        appointmentDate: appDate,
        appointmentTime: appTime,
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
            if (appointmentModalInstance) appointmentModalInstance.hide();
            loadAllAppointments();
            loadAppointmentCount();
        } else {
            alert(result.message || "Failed to save.");
        }
    } catch (err) {
        console.error("Save appointment error:", err);
        alert("An error occurred while sending data to the server.");
    }
}

function showEmptyTable(message) {
    const tbody = document.getElementById('adminAppointmentsBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4 fs-7">${message}</td></tr>`;
    }
}