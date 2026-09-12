const APPOINTMENT_BASE_URL = "http://localhost:8080/api/v1/appointment";

document.addEventListener("DOMContentLoaded", () => {
    const userCode = localStorage.getItem("userCode") || "CUST001";
    loadCustomerAppointments(userCode);
});

function getAuthHeader() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

async function loadCustomerAppointments(userCode) {
    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/get-by-customer/${userCode}`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            renderTable(result.data || []);
        }
    } catch (err) {
        console.error("Error loading appointments:", err);
    }
}

function renderTable(appointments) {
    const tbody = document.getElementById('myAppointmentsBody');
    tbody.innerHTML = "";

    if (appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4 fs-7">No appointments found. <a href="appointment-booking.html" class="text-indigo">Book now</a></td></tr>`;
        return;
    }

    appointments.forEach(app => {
        const servicesList = app.selectedServices ? app.selectedServices.map(s => s.serviceName).join(", ") : "N/A";
        const isPending = app.status === 'PENDING';

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-white fs-7">${app.appointmentCode}</td>
                <td>
                    <div class="text-white fs-7 fw-bold">${app.licensePlate || 'N/A'}</div>
                    <div class="text-muted fs-8">${app.vehicleModel || ''}</div>
                </td>
                <td>
                    <div class="text-white fs-7">${app.appointmentDate}</div>
                    <div class="text-muted fs-8">${app.appointmentTime}</div>
                </td>
                <td class="fs-7 text-truncate" style="max-width: 220px;" title="${servicesList}">${servicesList}</td>
                <td class="fw-bold fs-7" style="color: var(--emerald);">LKR ${parseFloat(app.estimatedTotalFee).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td><span class="badge badge-status-${app.status} px-2 py-1 fs-8">${app.status}</span></td>
                <td class="text-end">
                    ${isPending ? `
                        <button class="btn btn-outline-danger btn-sm px-2 py-1 fs-8" onclick="cancelAppointment('${app.appointmentCode}')">
                            <i class="fa-solid fa-xmark me-1"></i>Cancel
                        </button>
                    ` : '<span class="text-muted fs-8">N/A</span>'}
                </td>
            </tr>
        `;
    });
}

async function cancelAppointment(appointmentCode) {
    if (!confirm(`Cancel appointment ${appointmentCode}?`)) return;

    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/change-status/${appointmentCode}?status=CANCELLED`, {
            method: 'PATCH',
            headers: getAuthHeader()
        });

        if (res.ok) {
            const userCode = localStorage.getItem("userCode") || "CUST001";
            loadCustomerAppointments(userCode);
        }
    } catch (err) {
        console.error("Cancellation error:", err);
    }
}