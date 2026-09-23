const INVOICE_API = "http://localhost:8080/api/v1/invoices";
let customerInvoicesCache = [];
let customerViewModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    const modalElem = document.getElementById('customerViewModal');
    if (modalElem) {
        customerViewModalInstance = new bootstrap.Modal(modalElem);
    }
    loadCustomerInvoices();
});

function getAuthHeaders() {
    const token = localStorage.getItem("jwtToken") || localStorage.getItem("token") || "";
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function loadCustomerInvoices() {

    const customerUserCode = localStorage.getItem("customerCode") || localStorage.getItem("userCode") || "";
    const tbody = document.getElementById("customerInvoiceTableBody");

    if (!customerUserCode) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Session expired or Customer Code missing. Please login again.</td></tr>`;
        }
        return;
    }

    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-circle-notch fa-spin me-2 text-primary-color"></i>Loading your invoice history...</td></tr>`;
    }

    try {
        const res = await fetch(`${INVOICE_API}/customer/${customerUserCode}`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        const result = await res.json();

        if (res.ok && (result.code === 200 || result.status === 200)) {
            customerInvoicesCache = result.data || result.body || [];
            updateCustomerKPIs(customerInvoicesCache);
            renderCustomerTable(customerInvoicesCache);
        } else {
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">${result.message || 'Failed to fetch customer invoices.'}</td></tr>`;
            }
        }
    } catch (err) {
        console.error("Error loading invoices:", err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Network error. Unable to load invoice records.</td></tr>`;
        }
    }
}

function updateCustomerKPIs(invoices) {
    const totalElem = document.getElementById("custKpiTotal");
    const paidElem = document.getElementById("custKpiPaid");
    const pendingElem = document.getElementById("custKpiPending");

    if (totalElem) totalElem.innerText = invoices.length;
    if (paidElem) paidElem.innerText = invoices.filter(i => i.paymentStatus === "PAID").length;
    if (pendingElem) pendingElem.innerText = invoices.filter(i => i.paymentStatus !== "PAID").length;
}

function renderCustomerTable(invoices) {
    const tbody = document.getElementById("customerInvoiceTableBody");
    if (!tbody) return;

    if (!Array.isArray(invoices) || invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-5 fs-7">You have no invoices issued yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    invoices.forEach(inv => {
        let badgeClass = "badge-payment-unpaid";
        if (inv.paymentStatus === "PAID") badgeClass = "badge-payment-paid";
        else if (inv.paymentStatus === "PARTIAL") badgeClass = "badge-payment-partial";

        const total = parseFloat(inv.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
        const paid = parseFloat(inv.paidAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
        const balance = parseFloat(inv.balanceAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2});

        tbody.innerHTML += `
            <tr>
                <td><span class="invoice-code-badge">${inv.invoiceCode || '-'}</span></td>
                <td><span class="text-white fw-bold">${inv.jobCardCode || '-'}</span></td>
                <td>
                    <div class="text-light fs-7"><i class="fa-solid fa-car me-1 text-muted"></i>${inv.licensePlate || '-'}</div>
                    <small class="text-muted fs-8">${inv.brand || ''} ${inv.model || ''}</small>
                </td>
                <td class="text-white fw-bold">LKR ${total}</td>
                <td class="text-emerald">LKR ${paid}</td>
                <td class="text-warning fw-bold">LKR ${balance}</td>
                <td><span class="${badgeClass}">${inv.paymentStatus || 'UNPAID'}</span></td>
                <td class="text-muted fs-7">${inv.issuedDate ? new Date(inv.issuedDate).toLocaleDateString() : '-'}</td>
                <td class="text-end">
                    <button class="btn btn-action-icon" onclick="viewCustomerInvoiceModal('${inv.invoiceCode}')" title="View Statement">
                        <i class="fa-solid fa-file-invoice"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function viewCustomerInvoiceModal(code) {
    const inv = customerInvoicesCache.find(i => i.invoiceCode === code);
    if (!inv) return;

    const subtotal = parseFloat(inv.subtotal || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
    const tax = parseFloat(inv.taxAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
    const discount = parseFloat(inv.discount || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
    const total = parseFloat(inv.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
    const paid = parseFloat(inv.paidAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
    const balance = parseFloat(inv.balanceAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2});

    const titleElem = document.getElementById("customerModalTitle");
    const bodyElem = document.getElementById("customerModalBody");

    if (titleElem) titleElem.innerText = `Invoice - ${inv.invoiceCode}`;
    if (bodyElem) {
        bodyElem.innerHTML = `
            <div class="invoice-detail-row mb-2"><span class="text-muted">Job Card Reference:</span> <span class="text-white fw-bold">${inv.jobCardCode || '-'}</span></div>
            <div class="invoice-detail-row mb-2"><span class="text-muted">Vehicle Registered:</span> <span class="text-white">${inv.licensePlate || '-'} (${inv.brand || ''} ${inv.model || ''})</span></div>
            <div class="invoice-detail-row mb-2"><span class="text-muted">Subtotal:</span> <span class="text-white">LKR ${subtotal}</span></div>
            <div class="invoice-detail-row mb-2"><span class="text-muted">Applied Tax:</span> <span class="text-white">LKR ${tax}</span></div>
            <div class="invoice-detail-row mb-2"><span class="text-muted">Discount Allowed:</span> <span class="text-white">LKR ${discount}</span></div>
            <div class="invoice-detail-row mb-2"><span class="text-muted">Total Amount:</span> <span class="text-emerald fw-bold fs-6">LKR ${total}</span></div>
            <div class="invoice-detail-row mb-2"><span class="text-muted">Amount Paid:</span> <span class="text-white">LKR ${paid}</span></div>
            <div class="invoice-detail-row mb-2"><span class="text-muted">Remaining Balance:</span> <span class="text-warning fw-bold">LKR ${balance}</span></div>
            <div class="invoice-detail-row mb-2"><span class="text-muted">Payment Mode:</span> <span class="text-white">${inv.paymentMethod || 'N/A'}</span></div>
            <div class="invoice-detail-row mb-2"><span class="text-muted">Issued Officer:</span> <span class="text-white">${inv.issuedByUsername || 'Service Staff'}</span></div>
        `;
    }

    if (customerViewModalInstance) {
        customerViewModalInstance.show();
    }
}