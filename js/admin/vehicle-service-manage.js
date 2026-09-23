const SERVICE_BASE_URL = "http://localhost:8080/api/v1/service";
const CATEGORY_BASE_URL = "http://localhost:8080/api/v1/service-category";

let serviceModalObj;
let servicesDataList = [];
let currentUserRole = (localStorage.getItem("userRole") || "ADMIN").toUpperCase();

document.addEventListener("DOMContentLoaded", () => {
    // 1. Modal Initialization with Focus Fix
    const modalElem = document.getElementById('serviceModal');
    if (modalElem) {
        serviceModalObj = new bootstrap.Modal(modalElem);
        modalElem.addEventListener('hidden.bs.modal', () => {
            if (document.activeElement && modalElem.contains(document.activeElement)) {
                document.activeElement.blur();
            }
        });
    }

    setupRolePermissions();

    loadCategoryDropdown();
    loadAllServices();
    loadTotalServiceCount();

    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', handleFormSubmit);
    }
});

function getAuthHeader() {
    const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

function setupRolePermissions() {
    const addBtn = document.getElementById('addServiceBtn');
    if (currentUserRole !== "ADMIN" && addBtn) {
        addBtn.style.display = "none";
    }
}

async function loadTotalServiceCount() {
    try {
        const res = await fetch(`${SERVICE_BASE_URL}/count`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();

            // CommonResponse structure resolution (result.body or result.data)
            let countVal = 0;
            if (result && typeof result.body === 'number') {
                countVal = result.body;
            } else if (result && typeof result.data === 'number') {
                countVal = result.data;
            } else if (typeof result === 'number') {
                countVal = result;
            }

            const badgeElem = document.getElementById('totalServicesBadge');
            if (badgeElem) badgeElem.innerText = countVal;
        }
    } catch (err) {
        console.error("Error fetching service count:", err);
    }
}

async function loadCategoryDropdown() {
    try {
        const res = await fetch(`${CATEGORY_BASE_URL}/get-all`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            const categories = result.body || result.data || result || [];

            const filterSel = document.getElementById('adminCategoryFilter');
            const modalSel = document.getElementById('sCategoryCode');

            if (filterSel) filterSel.innerHTML = `<option value="ALL">All Categories</option>`;
            if (modalSel) modalSel.innerHTML = `<option value="" disabled selected>Select Category</option>`;

            categories.forEach(c => {
                const isCatActive = (c.dataStatus === "ACTIVE" || c.status === "ACTIVE");
                if (isCatActive) {
                    if (filterSel) filterSel.innerHTML += `<option value="${c.categoryCode}">${c.categoryName}</option>`;
                    if (modalSel) modalSel.innerHTML += `<option value="${c.categoryCode}">${c.categoryName}</option>`;
                }
            });
        }
    } catch (err) {
        console.error("Error loading categories:", err);
    }
}

async function loadAllServices() {
    const tbody = document.getElementById('serviceTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Loading services...</td></tr>`;
    }

    try {
        const res = await fetch(`${SERVICE_BASE_URL}/get-all`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();

            servicesDataList = Array.isArray(result.body)
                ? result.body
                : (Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []));

            renderServiceTable(servicesDataList);
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load services. Status: ${res.status}</td></tr>`;
        }
    } catch (err) {
        console.error("Error fetching services:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Network error. Check backend server.</td></tr>`;
    }
}

function renderServiceTable(services) {
    const tbody = document.getElementById('serviceTableBody');
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!Array.isArray(services) || services.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No vehicle services available.</td></tr>`;
        return;
    }

    services.forEach(s => {
        const isActive = s.dataStatus === "ACTIVE";
        const statusBadge = isActive
            ? `<span class="badge bg-success-subtle text-emerald border border-success px-2 py-1 fs-8">ACTIVE</span>`
            : `<span class="badge bg-danger-subtle text-danger border border-danger px-2 py-1 fs-8">INACTIVE</span>`;

        const safeData = JSON.stringify(s).replace(/'/g, "&apos;");

        const actionButtons = (currentUserRole === "ADMIN") ? `
            <button class="btn btn-sm btn-outline-custom me-1" onclick='openServiceModal("EDIT", ${safeData})' title="Edit">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-sm ${isActive ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="toggleServiceStatus('${s.serviceCode}', '${isActive ? 'INACTIVE' : 'ACTIVE'}')" title="Change Status">
                <i class="fa-solid ${isActive ? 'fa-ban' : 'fa-check'}"></i>
            </button>
        ` : `<span class="text-muted fs-8">View Only</span>`;

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-indigo">${s.serviceCode || '-'}</td>
                <td class="fw-semibold text-white">${s.serviceName || '-'}</td>
                <td class="text-muted fs-7">${s.categoryName || s.categoryCode || '-'}</td>
                <td class="fw-bold text-white">Rs. ${parseFloat(s.standardFee || 0).toFixed(2)}</td>
                <td class="text-muted fs-7"><i class="fa-regular fa-clock me-1"></i>${s.estimatedTimeMin || s.estimatedTimeMins || 0} mins</td>
                <td>${statusBadge}</td>
                <td class="text-end">${actionButtons}</td>
            </tr>
        `;
    });
}

function filterServices() {
    const query = (document.getElementById('searchServiceInput')?.value || '').toLowerCase();
    const catCode = document.getElementById('adminCategoryFilter')?.value || 'ALL';

    const filtered = servicesDataList.filter(s => {
        const nameMatch = (s.serviceName || '').toLowerCase().includes(query);
        const codeMatch = (s.serviceCode || '').toLowerCase().includes(query);
        const matchQuery = nameMatch || codeMatch;

        const matchCategory = (catCode === "ALL") || (s.categoryCode === catCode);
        return matchQuery && matchCategory;
    });

    renderServiceTable(filtered);
}

function openServiceModal(action, data = null) {
    const formElem = document.getElementById('serviceForm');
    if (formElem) formElem.reset();

    const actionElem = document.getElementById('formAction');
    if (actionElem) actionElem.value = action;

    if (action === "EDIT" && data) {
        setElementText('modalTitle', "Edit Service Details");
        setInputValue('editServiceCode', data.serviceCode);
        setInputValue('sCategoryCode', data.categoryCode);
        setInputValue('sServiceName', data.serviceName);
        setInputValue('sStandardFee', data.standardFee);
        setInputValue('sEstimatedTimeMins', data.estimatedTimeMin || data.estimatedTimeMins);
        setInputValue('sDescription', data.description || '');
    } else {
        setElementText('modalTitle', "Add Vehicle Service");
    }

    if (serviceModalObj) serviceModalObj.show();
}

function setInputValue(id, val) {
    const elem = document.getElementById(id);
    if (elem) elem.value = val !== undefined && val !== null ? val : '';
}

function setElementText(id, text) {
    const elem = document.getElementById(id);
    if (elem) elem.innerText = text;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const action = document.getElementById('formAction')?.value || 'ADD';
    const code = document.getElementById('editServiceCode')?.value;

    const payload = {
        serviceName: document.getElementById('sServiceName')?.value.trim() || '',
        description: document.getElementById('sDescription')?.value.trim() || '',
        standardFee: parseFloat(document.getElementById('sStandardFee')?.value) || 0,
        estimatedTimeMins: parseInt(document.getElementById('sEstimatedTimeMins')?.value) || 0,
        categoryCode: document.getElementById('sCategoryCode')?.value || ''
    };

    const url = action === "EDIT" ? `${SERVICE_BASE_URL}/update/${code}` : `${SERVICE_BASE_URL}/create-service`;
    const method = action === "EDIT" ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: getAuthHeader(),
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok && (result.code === 200 || result.code === 201 || result.status === 200 || result.status === 201)) {
            alert(result.message || "Operation successful!");
            if (serviceModalObj) serviceModalObj.hide();
            await loadAllServices();
            await loadTotalServiceCount();
        } else {
            alert(result.message || "Failed to save service details. Check inputs.");
        }
    } catch (err) {
        console.error("Error saving service:", err);
        alert("Server error occurred!");
    }
}

async function toggleServiceStatus(serviceCode, newStatus) {
    if (!confirm(`Change service status to ${newStatus}?`)) return;

    try {
        const res = await fetch(`${SERVICE_BASE_URL}/change-status/${serviceCode}?status=${newStatus}`, {
            method: 'PATCH',
            headers: getAuthHeader()
        });

        const result = await res.json();

        if (res.ok && (result.code === 200 || result.status === 200)) {
            await loadAllServices();
        } else {
            alert(result.message || "Failed to update status.");
        }
    } catch (err) {
        console.error("Error updating status:", err);
        alert("Server error occurred!");
    }
}