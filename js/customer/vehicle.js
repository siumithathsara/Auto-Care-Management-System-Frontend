const BASE_URL = "http://localhost:8080/api/v1/vehicle";
let vehicleModalObj;

const loggedInCustomerCode = localStorage.getItem("customerCode") ||
    localStorage.getItem("userCode") ||
    localStorage.getItem("customerUserCode");

document.addEventListener("DOMContentLoaded", () => {
    const modalElem = document.getElementById('vehicleModal');
    if (modalElem) {
        vehicleModalObj = new bootstrap.Modal(modalElem);
    }

    if (!loggedInCustomerCode) {
        console.warn("No logged in customer user code found in localStorage.");
    }

    loadMyVehicles();
});

function getAuthHeader() {
    const token = localStorage.getItem("jwtToken") || localStorage.getItem("token") || "";
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function loadMyVehicles() {
    const grid = document.getElementById('customerVehicleGrid');
    if (!grid) return;

    if (!loggedInCustomerCode) {
        grid.innerHTML = `<div class="col-12 text-center text-warning py-5 fs-6">Customer session not found. Please log in again.</div>`;
        return;
    }

    grid.innerHTML = `
        <div class="col-12 text-center text-muted py-5">
            <i class="fa-solid fa-circle-notch fa-spin me-2 fs-5 text-primary"></i>Loading your garage...
        </div>`;

    try {
        const res = await fetch(`${BASE_URL}/get-by-customer/${loggedInCustomerCode}`, {
            method: "GET",
            headers: getAuthHeader()
        });

        if (res.ok) {
            const responseData = await res.json();
            const vehicles = responseData.data || responseData.body || [];
            renderGrid(vehicles);
        } else {
            grid.innerHTML = `<div class="col-12 text-center text-danger py-5 fs-6">Failed to load vehicles. Server responded with status ${res.status}.</div>`;
        }
    } catch (err) {
        console.error("Error loading vehicles:", err);
        grid.innerHTML = `<div class="col-12 text-center text-danger py-5 fs-6">Network error. Unable to connect to server.</div>`;
    }
}

function renderGrid(vehicles) {
    const grid = document.getElementById('customerVehicleGrid');
    if (!grid) return;

    grid.innerHTML = "";

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center text-muted py-5 fs-6">No vehicles found. Click "Add Vehicle" to register your first vehicle!</div>`;
        return;
    }

    vehicles.forEach(v => {
        const serializedVehicle = JSON.stringify(v).replace(/'/g, "&apos;");

        grid.innerHTML += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="vehicle-card d-flex flex-column h-100">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="v-plate"><i class="fa-solid fa-car me-2"></i>${v.licensePlate || 'N/A'}</div>
                        <button class="btn btn-sm btn-outline-primary" onclick='openVehicleModal("EDIT", ${serializedVehicle})'>
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                    </div>
                    <div class="fw-bold fs-5 text-white mb-1">${v.brand || ''} ${v.model || ''}</div>
                    <div class="text-muted fs-7 mb-3">
                        <i class="fa-solid fa-gas-pump me-1"></i> ${v.fuelType || 'N/A'} &nbsp;&bull;&nbsp; 
                        <i class="fa-solid fa-gear me-1"></i> ${v.transmissionType || 'N/A'}
                        ${v.manufactureYear ? `&nbsp;&bull;&nbsp; <i class="fa-solid fa-calendar me-1"></i> ${v.manufactureYear}` : ''}
                    </div>
                    ${v.color ? `<div class="fs-7 text-secondary mt-auto"><i class="fa-solid fa-palette me-1"></i> Color: ${v.color}</div>` : ''}
                </div>
            </div>
        `;
    });
}

function openVehicleModal(action, data = null) {
    const form = document.getElementById('vehicleForm');
    if (form) form.reset();

    document.getElementById('formAction').value = action;
    const modalTitle = document.getElementById('modalTitle');

    if (action === "EDIT" && data) {
        if (modalTitle) modalTitle.innerText = "Edit Vehicle Details";
        document.getElementById('editVehicleCode').value = data.vehicleCode || "";
        document.getElementById('vLicense').value = data.licensePlate || "";
        document.getElementById('vBrand').value = data.brand || "";
        document.getElementById('vModel').value = data.model || "";
        document.getElementById('vYear').value = data.manufactureYear || "";
        document.getElementById('vFuel').value = data.fuelType || "PETROL";
        document.getElementById('vTrans').value = data.transmissionType || "AUTO";
        document.getElementById('vColor').value = data.color || "";
        document.getElementById('vChassis').value = data.chassisNumber || "";
        document.getElementById('vEngine').value = data.engineNumber || "";
    } else {
        if (modalTitle) modalTitle.innerText = "Register New Vehicle";
    }

    if (vehicleModalObj) vehicleModalObj.show();
}

const vehicleForm = document.getElementById('vehicleForm');
if (vehicleForm) {
    vehicleForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const action = document.getElementById('formAction').value;
        const yearInput = document.getElementById('vYear').value;

        const payload = {
            licensePlate: document.getElementById('vLicense').value.trim(),
            brand: document.getElementById('vBrand').value.trim(),
            model: document.getElementById('vModel').value.trim(),
            manufactureYear: yearInput ? parseInt(yearInput, 10) : 0,
            chassisNumber: document.getElementById('vChassis').value.trim(),
            engineNumber: document.getElementById('vEngine').value.trim(),
            fuelType: document.getElementById('vFuel').value,
            transmissionType: document.getElementById('vTrans').value,
            color: document.getElementById('vColor').value.trim(),
            customerUserCode: loggedInCustomerCode
        };

        const isEdit = action === "EDIT";
        const vehicleCode = document.getElementById('editVehicleCode').value;
        const url = isEdit ? `${BASE_URL}/update/${vehicleCode}` : `${BASE_URL}/register-vehicle`;
        const method = isEdit ? "PUT" : "POST";

        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Saving...`;
        }

        try {
            const res = await fetch(url, {
                method: method,
                headers: getAuthHeader(),
                body: JSON.stringify(payload)
            });

            const resData = await res.json();

            if (res.ok) {
                if (vehicleModalObj) vehicleModalObj.hide();
                loadMyVehicles();
            } else {
                alert(resData.message || "Failed to save vehicle. Please check inputs.");
            }
        } catch (err) {
            console.error("Error saving vehicle:", err);
            alert("Network error. Failed to send request to the server.");
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = `Save Vehicle`;
            }
        }
    });
}