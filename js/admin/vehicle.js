const BASE_URL = "http://localhost:8080/api/v1/vehicle";
let vehicleModalObj;
let currentUserRole = localStorage.getItem("userRole") || "ADMIN";

document.addEventListener("DOMContentLoaded", () => {
    vehicleModalObj = new bootstrap.Modal(document.getElementById('vehicleModal'));
    document.getElementById('loggedUserRole').innerText = currentUserRole;

    // Auth Check
    if(currentUserRole !== "ADMIN" && currentUserRole !== "ADVISOR") {
        window.location.href = "../shared/login.html";
        return;
    }

    loadTotalCount();
    loadAllVehicles();
});

function getAuthHeader() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

async function loadTotalCount() {
    const res = await fetch(`${BASE_URL}/count`, { headers: getAuthHeader() });
    if (res.ok) {
        const data = await res.json();
        document.getElementById('statTotalVehicles').innerText = data.data;
    }
}

async function loadAllVehicles() {
    const res = await fetch(`${BASE_URL}/get-all`, { headers: getAuthHeader() });
    if (res.ok) {
        const data = await res.json();
        renderTable(data.data);
    }
}

async function filterVehicles() {
    const plate = document.getElementById('searchLicensePlate').value.trim();
    if (!plate) return loadAllVehicles();

    const res = await fetch(`${BASE_URL}/filter?licensePlate=${plate}`, { headers: getAuthHeader() });
    if (res.ok) {
        const data = await res.json();
        renderTable(data.data);
    }
}

function renderTable(vehicles) {
    const tbody = document.getElementById('vehicleTableBody');
    tbody.innerHTML = "";

    vehicles.forEach(v => {
        // Hide delete button if role is ADVISOR
        const deleteBtn = currentUserRole === "ADMIN"
            ? `<button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteVehicle('${v.vehicleCode}')"><i class="fa-solid fa-trash"></i></button>`
            : ``;

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold" style="color: var(--primary-color)">${v.licensePlate}</td>
                <td><div class="fw-bold">${v.brand} ${v.model}</div><div class="fs-8 text-muted">${v.manufactureYear} | ${v.color}</div></td>
                <td><div class="fw-bold">${v.customerUsername || 'N/A'}</div><div class="fs-8 text-muted">${v.customerUserCode}</div></td>
                <td><span class="badge bg-secondary">${v.transmissionType}</span> <span class="badge" style="background: var(--primary-glow); color: var(--primary-color)">${v.fuelType}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-custom" onclick='openVehicleModal("EDIT", ${JSON.stringify(v)})'><i class="fa-solid fa-pen"></i></button>
                    ${deleteBtn}
                </td>
            </tr>
        `;
    });
}

function openVehicleModal(action, data = null) {
    document.getElementById('vehicleForm').reset();
    document.getElementById('formAction').value = action;

    if (action === "EDIT" && data) {
        document.getElementById('modalTitle').innerText = "Edit Vehicle";
        document.getElementById('editVehicleCode').value = data.vehicleCode;
        document.getElementById('vLicense').value = data.licensePlate;
        document.getElementById('vCustomer').value = data.customerUserCode;
        document.getElementById('vBrand').value = data.brand;
        document.getElementById('vModel').value = data.model;
        document.getElementById('vYear').value = data.manufactureYear;
        document.getElementById('vFuel').value = data.fuelType;
        document.getElementById('vTrans').value = data.transmissionType;
        document.getElementById('vColor').value = data.color;
        document.getElementById('vChassis').value = data.chassisNumber;
        document.getElementById('vEngine').value = data.engineNumber;
    } else {
        document.getElementById('modalTitle').innerText = "Register Vehicle";
    }
    vehicleModalObj.show();
}

document.getElementById('vehicleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const action = document.getElementById('formAction').value;
    const payload = {
        licensePlate: document.getElementById('vLicense').value,
        customerUserCode: document.getElementById('vCustomer').value,
        brand: document.getElementById('vBrand').value,
        model: document.getElementById('vModel').value,
        manufactureYear: document.getElementById('vYear').value || 0,
        fuelType: document.getElementById('vFuel').value,
        transmissionType: document.getElementById('vTrans').value,
        color: document.getElementById('vColor').value,
        chassisNumber: document.getElementById('vChassis').value,
        engineNumber: document.getElementById('vEngine').value
    };

    const url = action === "EDIT"
        ? `${BASE_URL}/update/${document.getElementById('editVehicleCode').value}`
        : `${BASE_URL}/register-vehicle`;

    const method = action === "EDIT" ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: getAuthHeader(), body: JSON.stringify(payload) });
    if (res.ok) {
        vehicleModalObj.hide();
        loadAllVehicles();
        loadTotalCount();
    } else {
        alert("Operation Failed!");
    }
});

async function deleteVehicle(code) {
    if(!confirm("Are you sure?")) return;
    const res = await fetch(`${BASE_URL}/delete/${code}`, { method: 'DELETE', headers: getAuthHeader() });
    if (res.ok) { loadAllVehicles(); loadTotalCount(); }
}