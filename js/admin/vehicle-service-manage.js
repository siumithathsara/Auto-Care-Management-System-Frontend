const SERVICE_BASE_URL = "http://localhost:8080/api/v1/service";
const CATEGORY_BASE_URL = "http://localhost:8080/api/v1/service-category";
let serviceModalObj;
let servicesDataList = [];

document.addEventListener("DOMContentLoaded", () => {
    serviceModalObj = new bootstrap.Modal(document.getElementById('serviceModal'));
    loadCategoryDropdown();
    loadAllServices();
    loadTotalServiceCount();
});

function getAuthHeader() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

async function loadTotalServiceCount() {
    try {
        const res = await fetch(`${SERVICE_BASE_URL}/count`, { headers: getAuthHeader() });
        if (res.ok) {
            const data = await res.json();
            document.getElementById('totalServicesBadge').innerText = data.data || 0;
        }
    } catch (err) { console.error("Error fetching service count:", err); }
}

async function loadCategoryDropdown() {
    try {
        const res = await fetch(`${CATEGORY_BASE_URL}/get-all`, { headers: getAuthHeader() });
        if (res.ok) {
            const responseData = await res.json();
            const categories = responseData.data || [];

            const filterSel = document.getElementById('adminCategoryFilter');
            const modalSel = document.getElementById('sCategoryCode');

            filterSel.innerHTML = `<option value="ALL">All Categories</option>`;
            modalSel.innerHTML = `<option value="" disabled selected>Select Category</option>`;

            categories.forEach(c => {
                if(c.status === "ACTIVE") {
                    filterSel.innerHTML += `<option value="${c.categoryCode}">${c.categoryName}</option>`;
                    modalSel.innerHTML += `<option value="${c.categoryCode}">${c.categoryName}</option>`;
                }
            });
        }
    } catch (err) { console.error("Error loading categories:", err); }
}

async function loadAllServices() {
    try {
        const res = await fetch(`${SERVICE_BASE_URL}/get-all`, { headers: getAuthHeader() });
        if (res.ok) {
            const responseData = await res.json();
            servicesDataList = responseData.data || [];
            renderServiceTable(servicesDataList);
        }
    } catch (err) { console.error("Error fetching services:", err); }
}

function renderServiceTable(services) {
    const tbody = document.getElementById('serviceTableBody');
    tbody.innerHTML = "";

    if (!services || services.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No vehicle services available.</td></tr>`;
        return;
    }

    services.forEach(s => {
        const isActive = s.dataStatus === "ACTIVE";
        const statusBadge = isActive
            ? `<span class="badge bg-success-subtle text-emerald border border-success px-2 py-1 fs-8">ACTIVE</span>`
            : `<span class="badge bg-danger-subtle text-danger border border-danger px-2 py-1 fs-8">INACTIVE</span>`;

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-indigo">${s.serviceCode}</td>
                <td class="fw-semibold text-white">${s.serviceName}</td>
                <td class="text-muted fs-7">${s.categoryName || s.categoryCode || '-'}</td>
                <td class="fw-bold text-white">Rs. ${parseFloat(s.standardFee).toFixed(2)}</td>
                <td class="text-muted fs-7"><i class="fa-regular fa-clock me-1"></i>${s.estimatedTimeMin} mins</td>
                <td>${statusBadge}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-custom me-1" onclick='openServiceModal("EDIT", ${JSON.stringify(s)})'>
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-sm ${isActive ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="toggleServiceStatus('${s.serviceCode}', '${isActive ? 'INACTIVE' : 'ACTIVE'}')">
                        <i class="fa-solid ${isActive ? 'fa-ban' : 'fa-check'}"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function filterServices() {
    const query = document.getElementById('searchServiceInput').value.toLowerCase();
    const catCode = document.getElementById('adminCategoryFilter').value;

    const filtered = servicesDataList.filter(s => {
        const matchQuery = s.serviceName.toLowerCase().includes(query) || s.serviceCode.toLowerCase().includes(query);
        const matchCategory = (catCode === "ALL") || (s.categoryCode === catCode);
        return matchQuery && matchCategory;
    });

    renderServiceTable(filtered);
}

function openServiceModal(action, data = null) {
    document.getElementById('serviceForm').reset();
    document.getElementById('formAction').value = action;

    if (action === "EDIT" && data) {
        document.getElementById('modalTitle').innerText = "Edit Service Details";
        document.getElementById('editServiceCode').value = data.serviceCode;
        document.getElementById('sCategoryCode').value = data.categoryCode;
        document.getElementById('sServiceName').value = data.serviceName;
        document.getElementById('sStandardFee').value = data.standardFee;
        document.getElementById('sEstimatedTimeMins').value = data.estimatedTimeMin;
        document.getElementById('sDescription').value = data.description || '';
    } else {
        document.getElementById('modalTitle').innerText = "Add New Service";
    }
    serviceModalObj.show();
}

document.getElementById('serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const action = document.getElementById('formAction').value;
    const code = document.getElementById('editServiceCode').value;

    const payload = {
        serviceName: document.getElementById('sServiceName').value,
        description: document.getElementById('sDescription').value,
        standardFee: parseFloat(document.getElementById('sStandardFee').value),
        estimatedTimeMins: parseInt(document.getElementById('sEstimatedTimeMins').value),
        categoryCode: document.getElementById('sCategoryCode').value
    };

    const url = action === "EDIT" ? `${SERVICE_BASE_URL}/update/${code}` : `${SERVICE_BASE_URL}/create-service`;
    const method = action === "EDIT" ? "PUT" : "POST";

    try {
        const res = await fetch(url, { method, headers: getAuthHeader(), body: JSON.stringify(payload) });
        if (res.ok) {
            serviceModalObj.hide();
            loadAllServices();
            loadTotalServiceCount();
        } else {
            alert("Failed to save service details. Check parameters.");
        }
    } catch (err) { console.error("Error saving service:", err); }
});

async function toggleServiceStatus(serviceCode, newStatus) {
    if(!confirm(`Change service status to ${newStatus}?`)) return;
    try {
        const res = await fetch(`${SERVICE_BASE_URL}/change-status/${serviceCode}?status=${newStatus}`, {
            method: 'PATCH',
            headers: getAuthHeader()
        });
        if (res.ok) loadAllServices();
    } catch (err) { console.error("Error updating status:", err); }
}