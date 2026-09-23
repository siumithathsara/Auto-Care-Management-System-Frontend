const API_BASE_URL = "http://localhost:8080/api/v1/job-card";
const USER_API_URL = "http://localhost:8080/api/v1/user";
let loadedJobCards = [];

let detailModalInstance = null;
let createModalInstance = null;
let addPartModalInstance = null;

document.addEventListener("DOMContentLoaded", function () {
    const userRole = localStorage.getItem("userRole") || "ADMIN";

    if (userRole === "ADVISOR") {
        document.querySelectorAll(".admin-advisor-only").forEach(el => el.classList.add("d-none"));
    }

    detailModalInstance = new bootstrap.Modal(document.getElementById("jobCardDetailModal"));
    createModalInstance = new bootstrap.Modal(document.getElementById("createJobCardModal"));
    addPartModalInstance = new bootstrap.Modal(document.getElementById("addPartsModal"));

    loadAllJobCards();
    loadActiveAdvisors();
});

function getAuthHeaders() {
    const token = localStorage.getItem("jwtToken") || localStorage.getItem("authToken");
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}

async function loadActiveAdvisors() {
    const advisorSelect = document.getElementById("reqAdvisorCode");
    if (!advisorSelect) return;

    try {
        const res = await fetch(`${USER_API_URL}/getAllActiveUsers`, { // Change endpoint path to match your backend route for fetching advisors
            method: "GET",
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (res.ok && (result.status === 200 || result.code === 200)) {
            const advisors = result.body || result.data || [];
            advisorSelect.innerHTML = `<option value="">Select Advisor</option>`;
            advisors.forEach(adv => {
                advisorSelect.innerHTML += `<option value="${adv.userCode || adv.code}">${adv.fullName || adv.name} (${adv.userCode || adv.code})</option>`;
            });
        }
    } catch (err) {
        console.error("Error loading advisors dropdown:", err);
    }
}

async function loadAllJobCards() {
    const tbody = document.getElementById("jobCardTableBody");
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted py-5 fs-7">
                <i class="fa-solid fa-circle-notch fa-spin me-2 text-primary-color"></i>Fetching Job Cards...
            </td>
        </tr>`;

    try {
        const res = await fetch(`${API_BASE_URL}/get-all`, {
            method: "GET",
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (res.ok && (result.status === 200 || result.code === 200)) {
            loadedJobCards = result.body || result.data || [];
            renderJobCardTable(loadedJobCards);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${result.message || 'Failed to load job cards.'}</td></tr>`;
        }
    } catch (err) {
        console.error("Error fetching job cards:", err);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Network error while connecting to server.</td></tr>`;
    }
}

function renderJobCardTable(list) {
    const tbody = document.getElementById("jobCardTableBody");
    const userRole = localStorage.getItem("userRole");
    tbody.innerHTML = "";

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No job cards found.</td></tr>`;
        return;
    }

    list.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <span class="fw-bold text-white cursor-pointer text-decoration-underline" onclick="openJobCardDetailModal('${item.jobCardCode}')">${item.jobCardCode}</span>
                <span class="d-block text-muted fs-7">Fuel: ${item.fuelLevel || '-'} | ${item.mileageIn || 0} KM</span>
            </td>
            <td>
                <span class="fw-semibold text-white">${item.licensePlate || 'N/A'}</span>
                <span class="d-block text-muted fs-7">${item.customerName || 'N/A'}</span>
            </td>
            <td><span class="text-muted fs-7">${item.advisorName || 'N/A'}</span></td>
            <td>
                <span class="d-block text-primary-color fs-7">${formatDate(item.estimatedCompletionTime)}</span>
            </td>
            <td>
                <span class="badge bg-primary-glow text-primary-color px-2 py-1">${item.status}</span>
            </td>
            <td class="fw-bold text-white">LKR ${item.estimatedTotalFee ? item.estimatedTotalFee.toLocaleString('en-US', {minimumFractionDigits:2}) : '0.00'}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-outline-light me-1" onclick="openJobCardDetailModal('${item.jobCardCode}')" title="View Details">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openAddPartModal('${item.jobCardCode}')" title="Add Spare Part">
                    <i class="fa-solid fa-wrench"></i>
                </button>
                ${(userRole !== 'MECHANIC' && item.status !== 'COMPLETED') ? `
                    <button class="btn btn-sm btn-success" onclick="changeStatus('${item.jobCardCode}', 'COMPLETED')" title="Mark Completed">
                        <i class="fa-solid fa-check"></i>
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function openJobCardDetailModal(code) {
    try {
        const res = await fetch(`${API_BASE_URL}/get-by-code/${code}`, {
            method: "GET",
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (res.ok && (result.status === 200 || result.code === 200)) {
            const item = result.body || result.data;

            document.getElementById("modalJobStatus").innerText = item.status;
            document.getElementById("modalJobCardCode").innerText = item.jobCardCode;
            document.getElementById("modalVehicle").innerText = `${item.vehicleCode || ''} (${item.licensePlate || 'N/A'})`;
            document.getElementById("modalCustomer").innerText = item.customerName || 'N/A';
            document.getElementById("modalAdvisor").innerText = item.advisorName || 'N/A';
            document.getElementById("modalAppointment").innerText = item.appointmentCode || 'N/A';
            document.getElementById("modalMileage").innerText = `${item.mileageIn || 0} KM`;
            document.getElementById("modalFuel").innerText = item.fuelLevel || '--';
            document.getElementById("modalCheckIn").innerText = formatDate(item.checkInTime);
            document.getElementById("modalEstCompletion").innerText = formatDate(item.estimatedCompletionTime);
            document.getElementById("modalCustomerNotes").innerText = item.customerNotes || 'None';
            document.getElementById("modalAdvisorNotes").innerText = item.advisorNotes || 'None';

            const servicesGroup = document.getElementById("modalServicesGroup");
            servicesGroup.innerHTML = "";
            if (item.services && item.services.length > 0) {
                item.services.forEach(srv => {
                    servicesGroup.innerHTML += `
                        <li class="list-group-item list-group-item-dark-custom d-flex justify-content-between">
                            <span>${srv.serviceName || srv.serviceCode}</span>
                            <strong>LKR ${srv.price ? srv.price.toLocaleString('en-US', {minimumFractionDigits:2}) : '0.00'}</strong>
                        </li>`;
                });
            } else {
                servicesGroup.innerHTML = `<li class="list-group-item list-group-item-dark-custom text-muted">No services assigned.</li>`;
            }

            const partsGroup = document.getElementById("modalPartsGroup");
            partsGroup.innerHTML = "";
            if (item.parts && item.parts.length > 0) {
                item.parts.forEach(prt => {
                    partsGroup.innerHTML += `
                        <li class="list-group-item list-group-item-dark-custom d-flex justify-content-between">
                            <span>${prt.partName || prt.partCode} (x${prt.quantity})</span>
                            <strong>LKR ${prt.subTotal ? prt.subTotal.toLocaleString('en-US', {minimumFractionDigits:2}) : '0.00'}</strong>
                        </li>`;
                });
            } else {
                partsGroup.innerHTML = `<li class="list-group-item list-group-item-dark-custom text-muted">No parts allocated.</li>`;
            }

            document.getElementById("modalServicesFee").innerText = `LKR ${item.totalServicesFee ? item.totalServicesFee.toLocaleString('en-US', {minimumFractionDigits:2}) : '0.00'}`;
            document.getElementById("modalPartsFee").innerText = `LKR ${item.totalPartsFee ? item.totalPartsFee.toLocaleString('en-US', {minimumFractionDigits:2}) : '0.00'}`;
            document.getElementById("modalGrandTotal").innerText = `LKR ${item.estimatedTotalFee ? item.estimatedTotalFee.toLocaleString('en-US', {minimumFractionDigits:2}) : '0.00'}`;

            detailModalInstance.show();
        } else {
            alert(result.message || "Failed to fetch job card details.");
        }
    } catch (err) {
        console.error("Error loading detail:", err);
        alert("Error connecting to server.");
    }
}

async function fetchVehicleDefaultDetails() {
    const vehicleCode = document.getElementById("reqVehicleCode").value.trim();
    if (!vehicleCode) return;

    try {
        const res = await fetch(`http://localhost:8080/api/v1/vehicle/get-by-code/${vehicleCode}`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (res.ok) {
            const result = await res.json();
            const data = result.body || result.data;

            if (data) {

                if (data.advisorUserCode || data.advisorCode) {
                    document.getElementById("reqAdvisorCode").value = data.advisorUserCode || data.advisorCode;
                }

                if (data.appointmentCode) {
                    document.getElementById("reqAppointmentCode").value = data.appointmentCode;
                }
                // Auto-fill service codes
                if (data.serviceCodes && Array.isArray(data.serviceCodes)) {
                    document.getElementById("reqServiceCodes").value = data.serviceCodes.join(", ");
                }
            }
        }
    } catch (err) {
        console.error("Error fetching auto-fill details for vehicle:", err);
    }
}

async function submitCreateJobCard() {
    const rawServices = document.getElementById("reqServiceCodes").value;
    const serviceCodesArray = rawServices ? rawServices.split(",").map(s => s.trim()).filter(s => s.length > 0) : [];

    const payload = {
        vehicleCode: document.getElementById("reqVehicleCode").value,
        advisorUserCode: document.getElementById("reqAdvisorCode").value,
        appointmentCode: document.getElementById("reqAppointmentCode").value || null,
        mileageIn: parseInt(document.getElementById("reqMileage").value) || 0,
        fuelLevel: document.getElementById("reqFuelLevel").value,
        customerNotes: document.getElementById("reqCustomerNotes").value,
        advisorNotes: document.getElementById("reqAdvisorNotes").value,
        estimatedCompletionTime: document.getElementById("reqEstTime").value,
        serviceCodes: serviceCodesArray
    };

    if (!payload.vehicleCode || !payload.advisorUserCode || !payload.estimatedCompletionTime || serviceCodesArray.length === 0) {
        alert("Please fill in all required fields (*)!");
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/create`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok && (result.status === 201 || result.code === 201)) {
            alert(result.message || "Job Card created successfully!");
            createModalInstance.hide();
            document.getElementById("createJobCardForm").reset();
            loadAllJobCards();
        } else {
            alert(result.message || "Failed to create Job Card.");
        }
    } catch (err) {
        console.error("Create Job Card Error:", err);
        alert("Server error occurred while creating job card.");
    }
}

function openAddPartModal(code) {
    document.getElementById("addPartJobCardCode").value = code;
    document.getElementById("partItemCode").value = "";
    document.getElementById("partQuantity").value = "1";

    const loggedUserCode = localStorage.getItem("userCode") || "";
    if (document.getElementById("partUserCode")) {
        document.getElementById("partUserCode").value = loggedUserCode;
    }

    addPartModalInstance.show();
}

async function submitAddPart() {
    const code = document.getElementById("addPartJobCardCode").value;
    const partCode = document.getElementById("partItemCode").value;
    const userCode = document.getElementById("partUserCode") ? document.getElementById("partUserCode").value : (localStorage.getItem("userCode") || "USR-001");
    const qty = parseInt(document.getElementById("partQuantity").value) || 1;

    if (!partCode || !userCode) {
        alert("Part Code and Requested User Code are required!");
        return;
    }

    const payload = [{
        partCode: partCode,
        requestedByUserCode: userCode,
        quantity: qty
    }];

    try {
        const res = await fetch(`${API_BASE_URL}/${code}/add-parts`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok && (result.status === 200 || result.code === 200)) {
            alert(result.message || "Parts added successfully!");
            addPartModalInstance.hide();
            loadAllJobCards();
        } else {
            alert(result.message || "Failed to add spare parts.");
        }
    } catch (err) {
        console.error("Add Parts Error:", err);
        alert("Server error while adding parts.");
    }
}

async function changeStatus(code, newStatus) {
    if (!confirm(`Are you sure you want to change status of ${code} to ${newStatus}?`)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/change-status/${code}?status=${newStatus}`, {
            method: "PATCH",
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (res.ok && (result.status === 200 || result.code === 200)) {
            alert(result.message || "Status updated successfully!");
            loadAllJobCards();
        } else {
            alert(result.message || "Failed to update status.");
        }
    } catch (err) {
        console.error("Change Status Error:", err);
        alert("Server error while updating status.");
    }
}

function filterJobCardsLocally() {
    const term = document.getElementById("universalJobCardSearch").value.toLowerCase();
    const filtered = loadedJobCards.filter(item =>
        (item.jobCardCode && item.jobCardCode.toLowerCase().includes(term)) ||
        (item.licensePlate && item.licensePlate.toLowerCase().includes(term)) ||
        (item.customerName && item.customerName.toLowerCase().includes(term)) ||
        (item.vehicleCode && item.vehicleCode.toLowerCase().includes(term))
    );
    renderJobCardTable(filtered);
}

function formatDate(dtStr) {
    if (!dtStr) return '--';
    return new Date(dtStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}