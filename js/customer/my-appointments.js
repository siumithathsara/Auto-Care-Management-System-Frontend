const APPOINTMENT_BASE_URL = "http://localhost:8080/api/v1/appointment";

document.addEventListener("DOMContentLoaded", () => {

    const userCode = localStorage.getItem("customerCode") || localStorage.getItem("userCode") || "";
    loadCustomerAppointments(userCode);
});

function getAuthHeader() {
    const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function loadCustomerAppointments(userCode) {
    const tbody = document.getElementById('myAppointmentsBody');
    if (!userCode) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-warning py-4">User code not found. Please login again.</td></tr>`;
        return;
    }

    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Loading appointments...</td></tr>`;
    }

    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/get-by-customer/${userCode}`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            const appointments = result.body || result.data || result || [];
            renderTable(appointments);
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load appointments. Status: ${res.status}</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading appointments:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Network error. Please check server connection.</td></tr>`;
    }
}

function renderTable(appointments) {
    const tbody = document.getElementById('myAppointmentsBody');
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!Array.isArray(appointments) || appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4 fs-7">No appointments found. <a href="appointment-booking.html" class="text-indigo fw-bold ms-1">Book now</a></td></tr>`;
        return;
    }

    appointments.forEach(app => {
        let servicesList = "N/A";
        if (Array.isArray(app.selectedServices) && app.selectedServices.length > 0) {
            servicesList = app.selectedServices.map(s => s.serviceName || s.serviceCode).join(", ");
        }

        const isPending = app.status === 'PENDING';
        const fee = parseFloat(app.estimatedTotalFee || 0).toLocaleString('en-US', {minimumFractionDigits: 2});

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-white fs-7">${app.appointmentCode || '-'}</td>
                <td>
                    <div class="text-white fs-7 fw-bold">${app.licensePlate || app.vehicleCode || 'N/A'}</div>
                    <div class="text-muted fs-8">${app.vehicleModel || ''}</div>
                </td>
                <td>
                    <div class="text-white fs-7">${app.appointmentDate || ''}</div>
                    <div class="text-muted fs-8">${app.appointmentTime || ''}</div>
                </td>
                <td class="fs-7 text-truncate" style="max-width: 220px;" title="${servicesList}">${servicesList}</td>
                <td class="fw-bold fs-7" style="color: var(--emerald, #10b981);">LKR ${fee}</td>
                <td><span class="badge badge-status-${app.status} px-2 py-1 fs-8">${app.status}</span></td>
                <td class="text-end">
                    ${isPending ? `
                        <button class="btn btn-outline-danger btn-sm px-2 py-1 fs-8" onclick="cancelAppointment('${app.appointmentCode}')">
                            <i class="fa-solid fa-xmark me-1"></i>Cancel
                        </button>
                    ` : '<span class="text-muted fs-8">-</span>'}
                </td>
            </tr>
        `;
    });
}

async function cancelAppointment(appointmentCode) {
    if (!confirm(`Are you sure you want to cancel appointment ${appointmentCode}?`)) return;

    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/change-status/${appointmentCode}?status=CANCELLED`, {
            method: 'PATCH',
            headers: getAuthHeader()
        });

        const result = await res.json();

        if (res.ok && (result.code === 200 || result.status === 200)) {
            alert(result.message || "Appointment cancelled successfully!");
            const userCode = localStorage.getItem("customerCode") || localStorage.getItem("userCode") || "";
            loadCustomerAppointments(userCode);
        } else {
            alert(result.message || "Failed to cancel appointment.");
        }
    } catch (err) {
        console.error("Cancellation error:", err);
        alert("Server error during cancellation!");
    }
}