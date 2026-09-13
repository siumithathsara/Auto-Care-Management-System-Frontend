const API_BASE_URL = "http://localhost:8080/api/v1/job-card";
let loadedJobCards = [];

document.addEventListener("DOMContentLoaded", function () {
    const userRole = localStorage.getItem("userRole") || "ADMIN";

    // Hide create button for MECHANIC role
    if (userRole === "MECHANIC") {
        document.querySelectorAll(".admin-advisor-only").forEach(el => el.classList.add("d-none"));
    }

    loadAllJobCards();
});

function loadAllJobCards() {
    const token = localStorage.getItem("authToken");

    fetch(`${API_BASE_URL}/get-all`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.code === 200) {
                loadedJobCards = data.data;
                renderJobCardTable(loadedJobCards);
            }
        })
        .catch(err => console.error("Error fetching job cards:", err));
}

function renderJobCardTable(list) {
    const tbody = document.getElementById("jobCardTableBody");
    const userRole = localStorage.getItem("userRole");
    tbody.innerHTML = "";

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No active job cards found.</td></tr>`;
        return;
    }

    list.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <span class="fw-bold text-white cursor-pointer text-decoration-underline" onclick="openJobCardDetailModal('${item.jobCardCode}')">${item.jobCardCode}</span>
                <span class="d-block text-muted fs-7">Fuel: ${item.fuelLevel} | ${item.mileageIn} KM</span>
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
            <td class="fw-bold text-white">LKR ${item.estimatedTotalFee ? item.estimatedTotalFee.toLocaleString() : '0.00'}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-outline-light me-1" onclick="openJobCardDetailModal('${item.jobCardCode}')" title="View Full Details">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openAddPartModal('${item.jobCardCode}')" title="Add Part">
                    <i class="fa-solid fa-wrench"></i>
                </button>
                ${userRole !== 'MECHANIC' ? `
                    <button class="btn btn-sm btn-success" onclick="changeStatus('${item.jobCardCode}', 'COMPLETED')" title="Mark Completed">
                        <i class="fa-solid fa-check"></i>
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openJobCardDetailModal(code) {
    const item = loadedJobCards.find(jc => jc.jobCardCode === code);
    if (!item) return;

    document.getElementById("modalJobStatus").innerText = item.status;
    document.getElementById("modalJobCardCode").innerText = item.jobCardCode;
    document.getElementById("modalVehicle").innerText = `${item.vehicleCode} (${item.licensePlate || 'N/A'})`;
    document.getElementById("modalCustomer").innerText = item.customerName || 'N/A';
    document.getElementById("modalAdvisor").innerText = item.advisorName || 'N/A';
    document.getElementById("modalAppointment").innerText = item.appointmentCode || 'N/A';
    document.getElementById("modalMileage").innerText = `${item.mileageIn} KM`;
    document.getElementById("modalFuel").innerText = item.fuelLevel;
    document.getElementById("modalCheckIn").innerText = formatDate(item.checkInTime);
    document.getElementById("modalEstCompletion").innerText = formatDate(item.estimatedCompletionTime);
    document.getElementById("modalCustomerNotes").innerText = item.customerNotes || 'None';
    document.getElementById("modalAdvisorNotes").innerText = item.advisorNotes || 'None';

    const servicesGroup = document.getElementById("modalServicesGroup");
    servicesGroup.innerHTML = "";
    if (item.services && item.services.length > 0) {
        item.services.forEach(srv => {
            servicesGroup.innerHTML += `<li class="list-group-item list-group-item-dark-custom d-flex justify-content-between">
                <span>${srv.serviceName || srv.serviceCode}</span>
                <strong>LKR ${srv.price ? srv.price.toLocaleString() : '0.00'}</strong>
            </li>`;
        });
    } else {
        servicesGroup.innerHTML = `<li class="list-group-item list-group-item-dark-custom text-muted">No services assigned.</li>`;
    }

    const partsGroup = document.getElementById("modalPartsGroup");
    partsGroup.innerHTML = "";
    if (item.parts && item.parts.length > 0) {
        item.parts.forEach(prt => {
            partsGroup.innerHTML += `<li class="list-group-item list-group-item-dark-custom d-flex justify-content-between">
                <span>${prt.partName || prt.itemCode} (x${prt.quantity})</span>
                <strong>LKR ${prt.subTotal ? prt.subTotal.toLocaleString() : '0.00'}</strong>
            </li>`;
        });
    } else {
        partsGroup.innerHTML = `<li class="list-group-item list-group-item-dark-custom text-muted">No parts allocated yet.</li>`;
    }

    document.getElementById("modalServicesFee").innerText = `LKR ${item.totalServicesFee ? item.totalServicesFee.toLocaleString() : '0.00'}`;
    document.getElementById("modalPartsFee").innerText = `LKR ${item.totalPartsFee ? item.totalPartsFee.toLocaleString() : '0.00'}`;
    document.getElementById("modalGrandTotal").innerText = `LKR ${item.estimatedTotalFee ? item.estimatedTotalFee.toLocaleString() : '0.00'}`;

    new bootstrap.Modal(document.getElementById("jobCardDetailModal")).show();
}

function submitCreateJobCard() {
    const token = localStorage.getItem("authToken");

    const payload = {
        vehicleCode: document.getElementById("reqVehicleCode").value,
        advisorUserCode: document.getElementById("reqAdvisorCode").value,
        appointmentCode: document.getElementById("reqAppointmentCode").value || null,
        mileageIn: parseInt(document.getElementById("reqMileage").value),
        fuelLevel: document.getElementById("reqFuelLevel").value,
        customerNotes: document.getElementById("reqCustomerNotes").value,
        advisorNotes: document.getElementById("reqAdvisorNotes").value,
        estimatedCompletionTime: document.getElementById("reqEstTime").value,
        serviceCodes: document.getElementById("reqServiceCodes").value.split(",").map(s => s.trim())
    };

    fetch(`${API_BASE_URL}/create`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            if (data.code === 201) {
                bootstrap.Modal.getInstance(document.getElementById("createJobCardModal")).hide();
                loadAllJobCards();
            }
        });
}

function openAddPartModal(code) {
    document.getElementById("addPartJobCardCode").value = code;
    new bootstrap.Modal(document.getElementById("addPartsModal")).show();
}

function submitAddPart() {
    const token = localStorage.getItem("authToken");
    const code = document.getElementById("addPartJobCardCode").value;

    const payload = [{
        itemCode: document.getElementById("partItemCode").value,
        quantity: parseInt(document.getElementById("partQuantity").value)
    }];

    fetch(`${API_BASE_URL}/${code}/add-parts`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            if (data.code === 200) {
                bootstrap.Modal.getInstance(document.getElementById("addPartsModal")).hide();
                loadAllJobCards();
            }
        });
}

function changeStatus(code, newStatus) {
    const token = localStorage.getItem("authToken");

    fetch(`${API_BASE_URL}/change-status/${code}?status=${newStatus}`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.code === 200) {
                loadAllJobCards();
            }
        });
}

function filterJobCardsLocally() {
    const term = document.getElementById("universalJobCardSearch").value.toLowerCase();
    const filtered = loadedJobCards.filter(item =>
        item.jobCardCode.toLowerCase().includes(term) ||
        (item.licensePlate && item.licensePlate.toLowerCase().includes(term)) ||
        (item.customerName && item.customerName.toLowerCase().includes(term))
    );
    renderJobCardTable(filtered);
}

function formatDate(dtStr) {
    if (!dtStr) return '--';
    return new Date(dtStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}