const API_BASE_URL = "http://localhost:8080/api/v1/purchase-order";
let loadedOrders = [];

document.addEventListener("DOMContentLoaded", function () {
    const userRole = localStorage.getItem("userRole") || "CUSTOMER";

    // ADMIN හැර වෙනත් කිසිම Role එකකට Access නොදීම
    if (userRole !== "ADMIN") {
        alert("Access Denied! Only ADMIN users can access Purchase Orders console.");
        window.location.href = "../unauthorized.html";
        return;
    }

    loadAllPurchaseOrders();
    // Default Item row එකක් සාදයි
    addPoItemRow();
});

// 1. Get All Purchase Orders
function loadAllPurchaseOrders() {
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
            if (data.code === 200 && data.data) {
                loadedOrders = data.data;
                renderPoTable(loadedOrders);
            }
        })
        .catch(err => console.error("Error fetching purchase orders:", err));
}

function renderPoTable(list) {
    const tbody = document.getElementById("poTableBody");
    tbody.innerHTML = "";

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No Purchase Orders available.</td></tr>`;
        return;
    }

    list.forEach(po => {
        const tr = document.createElement("tr");

        // Status Badge Mapping
        let statusBadgeClass = "bg-primary-glow text-primary-color";
        if (po.status === "CANCELLED") statusBadgeClass = "bg-danger bg-opacity-25 text-danger";
        if (po.status === "RECEIVED") statusBadgeClass = "bg-success bg-opacity-25 text-success";

        tr.innerHTML = `
            <td>
                <span class="fw-bold text-white cursor-pointer text-decoration-underline" onclick="openViewPoModal('${po.poCode}')">${po.poCode}</span>
            </td>
            <td>
                <span class="fw-semibold text-white">${po.supplierName || 'N/A'}</span>
                <span class="d-block text-muted fs-7">${po.supplierCode}</span>
            </td>
            <td>
                <span class="text-white fs-7">${po.createdByUserName || 'N/A'}</span>
                <span class="d-block text-muted fs-7">${po.createdByUserCode || ''}</span>
            </td>
            <td class="fs-7 text-muted">${formatDate(po.orderDate)}</td>
            <td class="fs-7 text-primary-color">${formatDate(po.expectedDeliveryDate)}</td>
            <td class="fw-bold text-white">LKR ${po.totalAmount ? po.totalAmount.toLocaleString() : '0.00'}</td>
            <td><span class="badge ${statusBadgeClass} px-2 py-1">${po.status}</span></td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-outline-light me-1" onclick="openViewPoModal('${po.poCode}')" title="View Details">
                    <i class="fa-solid fa-eye"></i>
                </button>
                ${po.status === 'PENDING' ? `
                    <button class="btn btn-sm btn-success me-1" onclick="markAsReceived('${po.poCode}')" title="Mark Received & Stock Update">
                        <i class="fa-solid fa-truck-ramp-box"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="cancelPo('${po.poCode}')" title="Cancel Order">
                        <i class="fa-solid fa-ban"></i>
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 2. Add Dynamic PO Item Rows in Modal
function addPoItemRow() {
    const container = document.getElementById("poItemsContainer");
    const rowId = Date.now();

    const rowHtml = `
        <div class="row g-2 align-items-center mb-2 po-item-row" id="row-${rowId}">
            <div class="col-12 col-md-4">
                <input type="text" class="form-control custom-search-input po-part-code" placeholder="Part Code (e.g. PRT-101)" required>
            </div>
            <div class="col-6 col-md-3">
                <input type="number" class="form-control custom-search-input po-qty" placeholder="Qty" min="1" value="1" oninput="calculateRowTotals()" required>
            </div>
            <div class="col-6 col-md-4">
                <input type="number" step="0.01" class="form-control custom-search-input po-cost" placeholder="Unit Cost (LKR)" oninput="calculateRowTotals()" required>
            </div>
            <div class="col-12 col-md-1 text-end">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removePoItemRow('row-${rowId}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHtml);
}

function removePoItemRow(rowId) {
    const rows = document.querySelectorAll('.po-item-row');
    if (rows.length > 1) {
        document.getElementById(rowId).remove();
        calculateRowTotals();
    } else {
        alert("Minimum one item is required.");
    }
}

function calculateRowTotals() {
    let grandTotal = 0;
    document.querySelectorAll('.po-item-row').forEach(row => {
        const qty = parseFloat(row.querySelector('.po-qty').value) || 0;
        const cost = parseFloat(row.querySelector('.po-cost').value) || 0;
        grandTotal += (qty * cost);
    });
    document.getElementById("poGrandTotalLabel").innerText = `LKR ${grandTotal.toLocaleString()}`;
}

// 3. Submit Create Purchase Order
function submitCreatePo() {
    const token = localStorage.getItem("authToken");

    const items = [];
    document.querySelectorAll('.po-item-row').forEach(row => {
        items.push({
            partCode: row.querySelector('.po-part-code').value.trim(),
            orderedQty: parseInt(row.querySelector('.po-qty').value),
            unitCost: parseFloat(row.querySelector('.po-cost').value)
        });
    });

    const payload = {
        supplierCode: document.getElementById("poSupplierCode").value.trim(),
        expectedDeliveryDate: document.getElementById("poExpectedDate").value,
        items: items
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
                bootstrap.Modal.getInstance(document.getElementById("createPoModal")).hide();
                document.getElementById("createPoForm").reset();
                loadAllPurchaseOrders();
            } else {
                alert(data.message || "Failed to create Purchase Order.");
            }
        })
        .catch(err => console.error("Error creating PO:", err));
}

// 4. View PO Details
function openViewPoModal(poCode) {
    const token = localStorage.getItem("authToken");

    fetch(`${API_BASE_URL}/get-by-code/${poCode}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.code === 200 && data.data) {
                const po = data.data;
                document.getElementById("viewPoStatus").innerText = po.status;
                document.getElementById("viewPoCode").innerText = po.poCode;
                document.getElementById("viewSupplierCode").innerText = po.supplierCode;
                document.getElementById("viewSupplierName").innerText = po.supplierName || 'N/A';
                document.getElementById("viewCreatedBy").innerText = po.createdByUserName || po.createdByUserCode;
                document.getElementById("viewOrderDate").innerText = formatDate(po.orderDate);
                document.getElementById("viewExpectedDate").innerText = formatDate(po.expectedDeliveryDate);
                document.getElementById("viewPoTotalAmount").innerText = `LKR ${po.totalAmount ? po.totalAmount.toLocaleString() : '0.00'}`;

                const tbody = document.getElementById("viewPoItemsTableBody");
                tbody.innerHTML = "";
                if (po.items && po.items.length > 0) {
                    po.items.forEach(item => {
                        tbody.innerHTML += `
                        <tr>
                            <td class="fw-semibold text-white">${item.partCode}</td>
                            <td>${item.partName || 'N/A'}</td>
                            <td>${item.orderedQty}</td>
                            <td>${item.receivedQty}</td>
                            <td>LKR ${item.unitCost ? item.unitCost.toLocaleString() : '0.00'}</td>
                            <td class="text-end fw-bold text-white">LKR ${item.subTotal ? item.subTotal.toLocaleString() : '0.00'}</td>
                        </tr>
                    `;
                    });
                }

                new bootstrap.Modal(document.getElementById("viewPoModal")).show();
            }
        });
}

// 5. Mark as Received
function markAsReceived(poCode) {
    if (!confirm(`Are you sure you want to mark PO ${poCode} as RECEIVED and update inventory stock?`)) return;
    const token = localStorage.getItem("authToken");

    fetch(`${API_BASE_URL}/mark-as-received/${poCode}`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.code === 200) {
                loadAllPurchaseOrders();
            }
        });
}

// 6. Cancel Purchase Order
function cancelPo(poCode) {
    if (!confirm(`Are you sure you want to cancel PO ${poCode}?`)) return;
    const token = localStorage.getItem("authToken");

    fetch(`${API_BASE_URL}/cancel/${poCode}`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.code === 200) {
                loadAllPurchaseOrders();
            }
        });
}

// Filter Function
function filterOrdersLocally() {
    const term = document.getElementById("universalPoSearch").value.toLowerCase();
    const filtered = loadedOrders.filter(item =>
        item.poCode.toLowerCase().includes(term) ||
        (item.supplierName && item.supplierName.toLowerCase().includes(term)) ||
        (item.status && item.status.toLowerCase().includes(term))
    );
    renderPoTable(filtered);
}

function formatDate(dtStr) {
    if (!dtStr) return '--';
    return new Date(dtStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}