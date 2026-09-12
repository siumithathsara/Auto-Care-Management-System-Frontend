const SUPPLIER_BASE_URL = "http://localhost:8080/api/v1/suppliers";

let allSuppliersCache = [];
let supplierModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    const modalElement = document.getElementById('supplierModal');
    if (modalElement) {
        supplierModalInstance = new bootstrap.Modal(modalElement);
    }

    loadAllSuppliers();
});

function getAuthHeader() {
    const token = localStorage.getItem("jwtToken");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// 1. Fetch All Suppliers & Automatically Calculate Counts
async function loadAllSuppliers() {
    const tbody = document.getElementById("supplierTableBody");
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted py-5 fs-7">
                <i class="fa-solid fa-circle-notch fa-spin me-2" style="color: var(--primary-color, #A78BFA);"></i>Loading supplier records...
            </td>
        </tr>`;

    try {
        const res = await fetch(`${SUPPLIER_BASE_URL}/get-all-suppliers`, {
            method: "GET",
            headers: getAuthHeader()
        });

        const result = await res.json();

        if (res.ok && result.code === 200) {
            allSuppliersCache = result.data || [];
            updateKPICards(allSuppliersCache); // Frontend math computation
            renderSupplierTable(allSuppliersCache);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${result.message || 'Failed to load suppliers.'}</td></tr>`;
        }
    } catch (err) {
        console.error("Error fetching suppliers:", err);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Unable to connect to server backend.</td></tr>`;
    }
}

// 2. Pure Frontend JS Count Calculation for Cards
function updateKPICards(suppliers) {
    const totalElem = document.getElementById("kpiTotalSuppliers");
    const activeElem = document.getElementById("kpiActiveSuppliers");

    // Total Count from Array Length
    if (totalElem) {
        totalElem.innerText = suppliers.length;
    }

    // Active Count using Boolean Filter (matches SupplierResponseDTO.isActive)
    if (activeElem) {
        const activeCount = suppliers.filter(s => s.active === true || s.isActive === true).length;
        activeElem.innerText = activeCount;
    }
}

// 3. Render Table
function renderSupplierTable(suppliers) {
    const tbody = document.getElementById("supplierTableBody");

    if (!suppliers || suppliers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5 fs-7">No suppliers found.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    suppliers.forEach(sup => {
        const isSupplierActive = sup.active !== undefined ? sup.active : sup.isActive;

        const statusBadge = isSupplierActive
            ? `<span class="badge-status-active">Active</span>`
            : `<span class="badge-status-inactive">Inactive</span>`;

        const toggleIcon = isSupplierActive ? "fa-toggle-on text-emerald" : "fa-toggle-off text-muted";

        tbody.innerHTML += `
            <tr>
                <td><span class="supplier-code-badge">${sup.supplierCode}</span></td>
                <td>
                    <div class="text-white fw-bold">${sup.companyName}</div>
                    <small class="text-muted fs-8">${sup.contactPerson ? 'Contact: ' + sup.contactPerson : 'No contact name'}</small>
                </td>
                <td>
                    <div class="text-light fs-7"><i class="fa-solid fa-phone me-2 text-muted fs-8"></i>${sup.phone}</div>
                    <small class="text-muted fs-8">${sup.email || '-'}</small>
                </td>
                <td class="text-light fw-semibold fs-7">${sup.brnNo || '<span class="text-muted">-</span>'}</td>
                <td class="text-muted fs-7">${sup.address}</td>
                <td>${statusBadge}</td>
                <td class="text-end">
                    <div class="d-flex gap-2 justify-content-end">
                        <button class="btn btn-action-icon" onclick="toggleSupplierStatus('${sup.supplierCode}')" title="Toggle Status">
                            <i class="fa-solid ${toggleIcon} fs-6"></i>
                        </button>
                        <button class="btn btn-action-icon" onclick="openEditModal('${sup.supplierCode}')" title="Edit Supplier">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// 4. Open Registration Modal
function openCreateModal() {
    document.getElementById("editSupplierCode").value = "";
    document.getElementById("supplierForm").reset();
    document.getElementById("modalTitle").innerText = "Register New Supplier";
    if (supplierModalInstance) supplierModalInstance.show();
}

// 5. Open Edit Modal
function openEditModal(supplierCode) {
    const sup = allSuppliersCache.find(s => s.supplierCode === supplierCode);
    if (!sup) return;

    document.getElementById("editSupplierCode").value = sup.supplierCode;
    document.getElementById("companyName").value = sup.companyName || "";
    document.getElementById("brnNo").value = sup.brnNo || "";
    document.getElementById("contactPerson").value = sup.contactPerson || "";
    document.getElementById("phone").value = sup.phone || "";
    document.getElementById("email").value = sup.email || "";
    document.getElementById("address").value = sup.address || "";

    document.getElementById("modalTitle").innerText = `Edit Supplier (${sup.supplierCode})`;
    if (supplierModalInstance) supplierModalInstance.show();
}

// 6. Save or Update Supplier
async function saveSupplier() {
    const editCode = document.getElementById("editSupplierCode").value;
    const companyName = document.getElementById("companyName").value.trim();
    const brnNo = document.getElementById("brnNo").value.trim();
    const contactPerson = document.getElementById("contactPerson").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const address = document.getElementById("address").value.trim();

    if (!companyName || !phone || !address) {
        alert("Please fill in required fields: Company Name, Phone, and Address!");
        return;
    }

    const phoneRegex = /^(\+94|0)?[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
        alert("Invalid Sri Lankan phone number format! (e.g. 0771234567 or +94771234567)");
        return;
    }

    const payload = { companyName, contactPerson, phone, email, address, brnNo };
    const isEdit = editCode !== "";
    const url = isEdit
        ? `${SUPPLIER_BASE_URL}/update-supplier/${editCode}`
        : `${SUPPLIER_BASE_URL}/register-supplier`;
    const method = isEdit ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: getAuthHeader(),
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok && (result.code === 200 || result.code === 201)) {
            alert(result.message || "Supplier saved successfully!");
            if (supplierModalInstance) supplierModalInstance.hide();
            loadAllSuppliers();
        } else {
            alert(result.message || "Failed to save supplier details.");
        }
    } catch (err) {
        console.error("Error saving supplier:", err);
        alert("Network communication error.");
    }
}

// 7. Toggle Active Status via PATCH Endpoint
async function toggleSupplierStatus(supplierCode) {
    if (!confirm(`Are you sure you want to change status for supplier '${supplierCode}'?`)) return;

    try {
        const res = await fetch(`${SUPPLIER_BASE_URL}/${supplierCode}/toggle-status`, {
            method: "PATCH",
            headers: getAuthHeader()
        });

        const result = await res.json();

        if (res.ok && result.code === 200) {
            loadAllSuppliers();
        } else {
            alert(result.message || "Failed to toggle status.");
        }
    } catch (err) {
        console.error("Error toggling status:", err);
        alert("Network communication error.");
    }
}

// 8. Client-side Search Filter
function filterSuppliersLocally() {
    const query = document.getElementById("supplierSearchInput").value.toLowerCase();
    const filtered = allSuppliersCache.filter(s =>
        (s.supplierCode && s.supplierCode.toLowerCase().includes(query)) ||
        (s.companyName && s.companyName.toLowerCase().includes(query)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(query)) ||
        (s.brnNo && s.brnNo.toLowerCase().includes(query)) ||
        (s.phone && s.phone.includes(query))
    );
    renderSupplierTable(filtered);
}