const BASE_URL = "http://localhost:8080/api/v1/vehicle";
let vehicleModalObj;

let currentUserRole = (localStorage.getItem("userRole") || "ADMIN").toUpperCase();

document.addEventListener("DOMContentLoaded", () => {
    // 1. Modal Initialization Fix
    const modalElement = document.getElementById('vehicleModal');
    if (modalElement) {
        vehicleModalObj = new bootstrap.Modal(modalElement);

        modalElement.addEventListener('hidden.bs.modal', () => {
            if (document.activeElement && modalElement.contains(document.activeElement)) {
                document.activeElement.blur();
            }
        });
    }

    // 2. Display Role
    const roleElem = document.getElementById('loggedUserRole');
    if (roleElem) roleElem.innerText = currentUserRole;

    // 3. Load Data
    loadTotalCount();
    loadAllVehicles();

    // 4. Form Submit Handler
    const vehicleForm = document.getElementById('vehicleForm');
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', handleFormSubmit);
    }
});

// Auth Header Helper
function getAuthHeader() {
    const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Total Count Fetching Fix
async function loadTotalCount() {
    try {
        const res = await fetch(`${BASE_URL}/count`, {
            method: 'GET',
            headers: getAuthHeader()
        });

        if (res.ok) {
            const result = await res.json();

            // Backend එකෙන් result.body හෝ result.data ලෙස එන අගය ලබා ගැනීම
            let countVal = 0;
            if (result && typeof result.body === 'number') {
                countVal = result.body;
            } else if (result && typeof result.data === 'number') {
                countVal = result.data;
            } else if (typeof result === 'number') {
                countVal = result;
            }

            const countElem = document.getElementById('statTotalVehicles') || document.querySelector('.card-body h2');
            if (countElem) {
                countElem.innerText = countVal;
            }
        } else {
            console.warn("Count API Error Status:", res.status);
        }
    } catch (error) {
        console.error("Error loading total count:", error);
    }
}

// Fetch All Vehicles Logic Fix
async function loadAllVehicles() {
    const tbody = document.getElementById('vehicleTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Loading vehicles...</td></tr>`;

    try {
        const res = await fetch(`${BASE_URL}/get-all`, {
            method: 'GET',
            headers: getAuthHeader()
        });

        if (res.ok) {
            const result = await res.json();
            console.log("Backend Response Data:", result);

            // Backend response structure එක අනුව result.body හෝ result.data පරීක්ෂා කිරීම
            const vehicleList = Array.isArray(result.body)
                ? result.body
                : (Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []));

            renderTable(vehicleList);
        } else if (res.status === 403) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Access Denied! (403 Forbidden) Check JWT Token & Roles.</td></tr>`;
        } else if (res.status === 401) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-warning py-4">Unauthorized! Please log in again.</td></tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Failed to load vehicle data. Status: ${res.status}</td></tr>`;
        }
    } catch (error) {
        console.error("Error loading vehicles:", error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Network error. Please check backend server.</td></tr>`;
    }
}

// Render Table Function
function renderTable(vehicles) {
    const tbody = document.getElementById('vehicleTableBody');
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No registered vehicles found.</td></tr>`;
        return;
    }

    vehicles.forEach(v => {
        const deleteBtn = (currentUserRole === "ADMIN" || currentUserRole === "ADVISOR")
            ? `<button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteVehicle('${v.vehicleCode}')" title="Delete"><i class="fa-solid fa-trash"></i></button>`
            : ``;

        const safeData = JSON.stringify(v).replace(/'/g, "&apos;");

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold" style="color: var(--primary-color, #0d6efd);">${v.licensePlate || 'N/A'}</td>
                <td>
                    <div class="fw-bold text-white">${v.brand || ''} ${v.model || ''}</div>
                    <small class="text-muted">${v.manufactureYear || 'N/A'} | ${v.color || 'N/A'}</small>
                </td>
                <td>
                    <div class="fw-bold text-white">${v.customerUsername || v.customerName || 'N/A'}</div>
                    <small class="text-muted">${v.customerUserCode || v.customerCode || ''}</small>
                </td>
                <td>
                    <span class="badge bg-secondary me-1">${v.transmissionType || 'N/A'}</span> 
                    <span class="badge bg-info text-dark">${v.fuelType || 'N/A'}</span>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-custom" onclick='openVehicleModal("EDIT", ${safeData})' title="Edit"><i class="fa-solid fa-pen"></i></button>
                    ${deleteBtn}
                </td>
            </tr>
        `;
    });
}

// Modal Helpers & Form Submit Handlers
function openVehicleModal(action, data = null) {
    const formElem = document.getElementById('vehicleForm');
    if (formElem) formElem.reset();

    const actionElem = document.getElementById('formAction');
    if (actionElem) actionElem.value = action;

    if (action === "EDIT" && data) {
        setElementText('modalTitle', "Edit Vehicle");
        setInputValue('editVehicleCode', data.vehicleCode);
        setInputValue('vLicense', data.licensePlate);
        setInputValue('vCustomer', data.customerUserCode || data.customerCode);
        setInputValue('vBrand', data.brand);
        setInputValue('vModel', data.model);
        setInputValue('vYear', data.manufactureYear);
        setInputValue('vFuel', data.fuelType || 'PETROL');
        setInputValue('vTrans', data.transmissionType || 'AUTO');
        setInputValue('vColor', data.color);
        setInputValue('vChassis', data.chassisNumber);
        setInputValue('vEngine', data.engineNumber);
    } else {
        setElementText('modalTitle', "Register Vehicle");
    }

    if (vehicleModalObj) vehicleModalObj.show();
}

function setInputValue(id, val) {
    const elem = document.getElementById(id);
    if (elem) elem.value = val || '';
}

function setElementText(id, text) {
    const elem = document.getElementById(id);
    if (elem) elem.innerText = text;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const action = document.getElementById('formAction')?.value || 'REGISTER';
    const yearVal = parseInt(document.getElementById('vYear')?.value);

    const payload = {
        licensePlate: document.getElementById('vLicense')?.value.trim() || '',
        customerUserCode: document.getElementById('vCustomer')?.value.trim() || '',
        brand: document.getElementById('vBrand')?.value.trim() || '',
        model: document.getElementById('vModel')?.value.trim() || '',
        manufactureYear: isNaN(yearVal) ? 0 : yearVal,
        fuelType: document.getElementById('vFuel')?.value || 'PETROL',
        transmissionType: document.getElementById('vTrans')?.value || 'AUTO',
        color: document.getElementById('vColor')?.value.trim() || '',
        chassisNumber: document.getElementById('vChassis')?.value.trim() || '',
        engineNumber: document.getElementById('vEngine')?.value.trim() || ''
    };

    const url = action === "EDIT"
        ? `${BASE_URL}/update/${document.getElementById('editVehicleCode')?.value}`
        : `${BASE_URL}/register-vehicle`;

    const method = action === "EDIT" ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: getAuthHeader(),
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok && (result.code === 200 || result.code === 201 || result.status === 200 || result.status === 201)) {
            alert(result.message || "Operation Successful!");
            if (vehicleModalObj) vehicleModalObj.hide();
            await loadAllVehicles();
            await loadTotalCount();
        } else {
            alert(result.message || "Failed to save vehicle.");
        }
    } catch (error) {
        console.error("Error submitting form:", error);
        alert("Server error occurred!");
    }
}

async function deleteVehicle(code) {
    if (!confirm(`Are you sure you want to delete vehicle (${code})?`)) return;

    try {
        const res = await fetch(`${BASE_URL}/delete/${code}`, {
            method: 'DELETE',
            headers: getAuthHeader()
        });

        const result = await res.json();

        if (res.ok && (result.code === 200 || result.status === 200)) {
            alert("Vehicle deleted successfully!");
            await loadAllVehicles();
            await loadTotalCount();
        } else {
            alert(result.message || "Failed to delete vehicle.");
        }
    } catch (error) {
        console.error("Error deleting vehicle:", error);
        alert("Server error occurred!");
    }
}