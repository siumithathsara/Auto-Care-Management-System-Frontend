const BASE_URL = "http://localhost:8080/api/v1/vehicle";
let vehicleModalObj;
const loggedInCustomerCode = localStorage.getItem("userCode"); // JWT/Login එකෙන් save කරගත්ත Customer Code එක

document.addEventListener("DOMContentLoaded", () => {
    vehicleModalObj = new bootstrap.Modal(document.getElementById('vehicleModal'));

    // if(localStorage.getItem("userRole") !== "CUSTOMER") {
    //     window.location.href = "../shared/login.html";
    //     return;
    // }
    loadMyVehicles();
});

function getAuthHeader() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

async function loadMyVehicles() {
    const res = await fetch(`${BASE_URL}/get-by-customer/${loggedInCustomerCode}`, { headers: getAuthHeader() });
    if (res.ok) {
        const data = await res.json();
        renderGrid(data.data);
    }
}

function renderGrid(vehicles) {
    const grid = document.getElementById('customerVehicleGrid');
    grid.innerHTML = "";

    if(vehicles.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center text-muted py-5">No vehicles found. Add your first vehicle!</div>`;
        return;
    }

    vehicles.forEach(v => {
        grid.innerHTML += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="vehicle-card">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="v-plate">${v.licensePlate}</div>
                        <button class="btn btn-sm btn-outline-custom" onclick='openVehicleModal("EDIT", ${JSON.stringify(v)})'><i class="fa-solid fa-pen"></i></button>
                    </div>
                    <div class="fw-bold fs-5 mb-1">${v.brand} ${v.model}</div>
                    <div class="text-muted fs-7 mb-3"><i class="fa-solid fa-gas-pump me-1"></i> ${v.fuelType} &nbsp;&bull;&nbsp; <i class="fa-solid fa-gear me-1"></i> ${v.transmissionType}</div>
                </div>
            </div>
        `;
    });
}

function openVehicleModal(action, data = null) {
    document.getElementById('vehicleForm').reset();
    document.getElementById('formAction').value = action;

    if (action === "EDIT" && data) {
        document.getElementById('editVehicleCode').value = data.vehicleCode;
        document.getElementById('vLicense').value = data.licensePlate;
        document.getElementById('vBrand').value = data.brand;
        document.getElementById('vModel').value = data.model;
        document.getElementById('vFuel').value = data.fuelType;
        document.getElementById('vTrans').value = data.transmissionType;
    }
    vehicleModalObj.show();
}

document.getElementById('vehicleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const action = document.getElementById('formAction').value;
    const payload = {
        licensePlate: document.getElementById('vLicense').value,
        customerUserCode: loggedInCustomerCode, // Automatic injection
        brand: document.getElementById('vBrand').value,
        model: document.getElementById('vModel').value,
        fuelType: document.getElementById('vFuel').value,
        transmissionType: document.getElementById('vTrans').value,
        manufactureYear: 0
    };

    const url = action === "EDIT" ? `${BASE_URL}/update/${document.getElementById('editVehicleCode').value}` : `${BASE_URL}/register-vehicle`;
    const method = action === "EDIT" ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: getAuthHeader(), body: JSON.stringify(payload) });
    if (res.ok) {
        vehicleModalObj.hide();
        loadMyVehicles();
    } else {
        alert("Failed to save vehicle.");
    }
});