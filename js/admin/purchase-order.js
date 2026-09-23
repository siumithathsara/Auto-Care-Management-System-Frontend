const API_BASE_URL = "http://localhost:8080/api/v1/purchase-order";
let loadedOrders = [];
let availablePartsList = [];

document.addEventListener("DOMContentLoaded", function () {
    const userRole = localStorage.getItem("userRole") || "CUSTOMER";

    if (userRole !== "ADMIN") {
        alert("Access Denied! Only ADMIN users can access Purchase Orders console.");
        window.location.href = "../unauthorized.html";
        return;
    }

    loadAllPurchaseOrders();
    loadSuppliersDropdown();
    loadPartsDropdownList();

    const createPoModalElement = document.getElementById("createPoModal");
    if (createPoModalElement) {
        createPoModalElement.addEventListener("hidden.bs.modal", function () {
            resetCreatePoModal();
        });
    }
});

function getAuthHeaders() {
    let token = localStorage.getItem("jwtToken") || localStorage.getItem("userToken") || localStorage.getItem("authToken");

    if (token) {
        token = token.replace(/^["'](.+)["']$/, '$1');
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
    }

    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}

function resetCreatePoModal() {
    const form = document.getElementById("createPoForm");
    if (form) form.reset();

    const supplierSelect = document.getElementById("poSupplierCode");
    if (supplierSelect) supplierSelect.selectedIndex = 0;

    const expectedDate = document.getElementById("poExpectedDate");
    if (expectedDate) expectedDate.value = "";

    const container = document.getElementById("poItemsContainer");
    if (container) {
        container.innerHTML = "";
        addPoItemRow();
    }

    const totalLabel = document.getElementById("poGrandTotalLabel");
    if (totalLabel) totalLabel.innerText = "LKR 0.00";
}

function loadSuppliersDropdown() {
    fetch("http://localhost:8080/api/v1/suppliers/get-all-suppliers", {
        method: "GET",
        headers: getAuthHeaders()
    })
        .then(res => res.json())
        .then(data => {
            const supplierSelect = document.getElementById("poSupplierCode");
            if (!supplierSelect) return;

            supplierSelect.innerHTML = `<option value="" selected disabled>Select Supplier</option>`;

            let suppliers = [];
            if (Array.isArray(data)) suppliers = data;
            else if (data.body && Array.isArray(data.body)) suppliers = data.body;
            else if (data.data && Array.isArray(data.data)) suppliers = data.data;

            if (suppliers.length > 0) {
                suppliers.forEach(sup => {
                    const name = sup.companyName || sup.supplierName || 'Supplier';
                    supplierSelect.innerHTML += `<option value="${sup.supplierCode}">${name} (${sup.supplierCode})</option>`;
                });
            }
        })
        .catch(err => console.error("Error loading suppliers:", err));
}

function loadPartsDropdownList() {
    fetch("http://localhost:8080/api/v1/spare-part/get-all", {
        method: "GET",
        headers: getAuthHeaders()
    })
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) availablePartsList = data;
            else if (data.body && Array.isArray(data.body)) availablePartsList = data.body;
            else if (data.data && Array.isArray(data.data)) availablePartsList = data.data;
            else availablePartsList = [];

            const container = document.getElementById("poItemsContainer");
            if (container && container.children.length === 0) {
                addPoItemRow();
            }
        })
        .catch(err => {
            console.error("Error loading parts:", err);
            availablePartsList = [];
            const container = document.getElementById("poItemsContainer");
            if (container && container.children.length === 0) {
                addPoItemRow();
            }
        });
}

function addPoItemRow() {
    const container = document.getElementById("poItemsContainer");
    if (!container) return;

    const rowId = Date.now();

    let partOptions = `<option value="" selected disabled>Select Part Code</option>`;
    if (Array.isArray(availablePartsList)) {
        availablePartsList.forEach(part => {
            partOptions += `<option value="${part.partCode}">${part.partName || 'Part'} (${part.partCode})</option>`;
        });
    }

    const rowHtml = `
        <div class="row g-2 align-items-center mb-2 po-item-row" id="row-${rowId}">
            <div class="col-12 col-md-4">
                <select class="form-select custom-search-input po-part-code" onchange="autoFillUnitPrice(this)" required>
                    ${partOptions}
                </select>
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

function autoFillUnitPrice(selectElem) {
    const selectedPartCode = selectElem.value;
    const parentRow = selectElem.closest('.po-item-row');
    const costInput = parentRow.querySelector('.po-cost');

    const foundPart = availablePartsList.find(p => p.partCode === selectedPartCode);
    if (foundPart) {

        const price = foundPart.unitPrice || foundPart.unitCost || foundPart.price || foundPart.buyingPrice || 0;
        costInput.value = price;
    } else {
        costInput.value = "";
    }
    calculateRowTotals();
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
    const totalLabel = document.getElementById("poGrandTotalLabel");
    if (totalLabel) {
        totalLabel.innerText = `LKR ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function loadAllPurchaseOrders() {
    fetch(`${API_BASE_URL}/get-all`, {
        method: "GET",
        headers: getAuthHeaders()
    })
        .then(res => res.json())
        .then(data => {
            let ordersList = [];
            if (Array.isArray(data)) ordersList = data;
            else if (data.body && Array.isArray(data.body)) ordersList = data.body;
            else if (data.data && Array.isArray(data.data)) ordersList = data.data;

            loadedOrders = ordersList;
            renderPoTable(loadedOrders);
        })
        .catch(err => {
            console.error("Error fetching purchase orders:", err);
            renderPoTable([]);
        });
}

function renderPoTable(list) {
    const tbody = document.getElementById("poTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No Purchase Orders available.</td></tr>`;
        return;
    }

    list.forEach(po => {
        const tr = document.createElement("tr");

        let statusBadgeClass = "bg-primary-glow text-primary-color";
        if (po.status === "CANCELLED") statusBadgeClass = "bg-danger bg-opacity-25 text-danger";
        if (po.status === "RECEIVED" || po.status === "COMPLETED") statusBadgeClass = "bg-success bg-opacity-25 text-success";

        tr.innerHTML = `
            <td>
                <span class="fw-bold text-white cursor-pointer text-decoration-underline" onclick="openViewPoModal('${po.poCode}')">${po.poCode}</span>
            </td>
            <td>
                <span class="fw-semibold text-white">${po.supplierName || 'N/A'}</span>
                <span class="d-block text-muted fs-7">${po.supplierCode || ''}</span>
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
                ${po.status === 'CREATED' ? `
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

function submitCreatePo() {
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
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            if (data.code === 201 || data.code === 200 || data.status === 200) {
                const modalElem = document.getElementById("createPoModal");
                const modalInstance = bootstrap.Modal.getInstance(modalElem);
                if (modalInstance) modalInstance.hide();

                resetCreatePoModal();
                loadAllPurchaseOrders();
            } else {
                alert(data.message || "Failed to create Purchase Order.");
            }
        })
        .catch(err => console.error("Error creating PO:", err));
}

function openViewPoModal(poCode) {
    fetch(`${API_BASE_URL}/get-by-code/${poCode}`, {
        method: "GET",
        headers: getAuthHeaders()
    })
        .then(res => res.json())
        .then(data => {
            const po = data.body || data.data || data;
            if (po) {
                document.getElementById("viewPoStatus").innerText = po.status || 'N/A';
                document.getElementById("viewPoCode").innerText = po.poCode || poCode;
                document.getElementById("viewSupplierCode").innerText = po.supplierCode || '--';
                document.getElementById("viewSupplierName").innerText = po.supplierName || 'N/A';
                document.getElementById("viewCreatedBy").innerText = po.createdByUserName || po.createdByUserCode || '--';
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
        })
        .catch(err => console.error("Error fetching PO details:", err));
}

function markAsReceived(poCode) {
    if (!confirm(`Are you sure you want to mark PO ${poCode} as RECEIVED and update inventory stock?`)) return;

    fetch(`${API_BASE_URL}/mark-as-received/${poCode}`, {
        method: "PATCH",
        headers: getAuthHeaders()
    })
        .then(res => res.json())
        .then(data => {
            if (data.code === 200 || data.status === 200) {
                loadAllPurchaseOrders();
            } else {
                alert(data.message || "Failed to update status.");
            }
        })
        .catch(err => console.error("Error marking as received:", err));
}

function cancelPo(poCode) {
    if (!confirm(`Are you sure you want to cancel PO ${poCode}?`)) return;

    fetch(`${API_BASE_URL}/cancel/${poCode}`, {
        method: "PATCH",
        headers: getAuthHeaders()
    })
        .then(res => res.json())
        .then(data => {
            if (codeIsOk(data.code) || data.status === 200) {
                loadAllPurchaseOrders();
            } else {
                alert(data.message || "Failed to cancel PO.");
            }
        })
        .catch(err => console.error("Error cancelling PO:", err));
}

function codeIsOk(code) {
    return code === 200 || code === 201 || code === true;
}

function filterOrdersLocally() {
    const term = document.getElementById("universalPoSearch").value.toLowerCase();
    const filtered = loadedOrders.filter(item =>
        (item.poCode && item.poCode.toLowerCase().includes(term)) ||
        (item.supplierName && item.supplierName.toLowerCase().includes(term)) ||
        (item.status && item.status.toLowerCase().includes(term))
    );
    renderPoTable(filtered);
}

function formatDate(dtStr) {
    if (!dtStr) return '--';
    return new Date(dtStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}