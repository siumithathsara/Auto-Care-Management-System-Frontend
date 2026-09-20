const INVOICE_API = "http://localhost:8080/api/v1/invoices";
let customerInvoicesCache = [];
let customerViewModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    customerViewModalInstance = new bootstrap.Modal(document.getElementById('customerViewModal'));
    loadCustomerInvoices();
});

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

async function loadCustomerInvoices() {
    const customerUserCode = localStorage.getItem("userCode");
    const tbody = document.getElementById("customerInvoiceTableBody");

    if (!customerUserCode) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Session expired or User Code missing. Please re-login.</td></tr>`;
        return;
    }

    try {
        const res = await fetch(`${INVOICE_API}/customer/${customerUserCode}`, {
            method: "GET",
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (res.ok && result.code === 200) {
            customerInvoicesCache = result.data || [];
            updateCustomerKPIs(customerInvoicesCache);
            renderCustomerTable(customerInvoicesCache);
        } else {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">${result.message || 'Failed to fetch customer invoices.'}</td></tr>`;
        }
    } catch (err) {
        console.error("Error:", err);
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Network error. Unable to load invoice records.</td></tr>`;
    }
}

function updateCustomerKPIs(invoices) {
    document.getElementById("custKpiTotal").innerText = invoices.length;
    document.getElementById("custKpiPaid").innerText = invoices.filter(i => i.paymentStatus === "PAID").length;
    document.getElementById("custKpiPending").innerText = invoices.filter(i => i.paymentStatus !== "PAID").length;
}

function renderCustomerTable(invoices) {
    const tbody = document.getElementById("customerInvoiceTableBody");
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-5 fs-7">You have no invoices issued yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    invoices.forEach(inv => {
        let badgeClass = "badge-payment-unpaid";
        if (inv.paymentStatus === "PAID") badgeClass = "badge-payment-paid";
        else if (inv.paymentStatus === "PARTIAL") badgeClass = "badge-payment-partial";

        tbody.innerHTML += `
            <tr>
                <td><span class="invoice-code-badge">${inv.invoiceCode}</span></td>
                <td><span class="text-white fw-bold">${inv.jobCardCode}</span></td>
                <td>
                    <div class="text-light fs-7"><i class="fa-solid fa-car me-1 text-muted"></i>${inv.licensePlate || '-'}</div>
                    <small class="text-muted fs-8">${inv.brand || ''} ${inv.model || ''}</small>
                </td>
                <td class="text-white fw-bold">LKR ${inv.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                <td class="text-emerald">LKR ${inv.paidAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                <td class="text-warning fw-bold">LKR ${inv.balanceAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                <td><span class="${badgeClass}">${inv.paymentStatus}</span></td>
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

    document.getElementById("customerModalTitle").innerText = `Invoice - ${inv.invoiceCode}`;
    document.getElementById("customerModalBody").innerHTML = `
        <div class="invoice-detail-row"><span class="text-muted">Job Card Reference:</span> <span class="text-white fw-bold">${inv.jobCardCode}</span></div>
        <div class="invoice-detail-row"><span class="text-muted">Vehicle Registered:</span> <span class="text-white">${inv.licensePlate || '-'} (${inv.brand || ''} ${inv.model || ''})</span></div>
        <div class="invoice-detail-row"><span class="text-muted">Subtotal:</span> <span class="text-white">LKR ${inv.subtotal.toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>
        <div class="invoice-detail-row"><span class="text-muted">Applied Tax:</span> <span class="text-white">LKR ${(inv.taxAmount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>
        <div class="invoice-detail-row"><span class="text-muted">Discount Allowed:</span> <span class="text-white">LKR ${(inv.discount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>
        <div class="invoice-detail-row"><span class="text-muted">Total Amount:</span> <span class="text-emerald fw-bold fs-6">LKR ${inv.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>
        <div class="invoice-detail-row"><span class="text-muted">Amount Paid:</span> <span class="text-white">LKR ${inv.paidAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>
        <div class="invoice-detail-row"><span class="text-muted">Remaining Balance:</span> <span class="text-warning fw-bold">LKR ${inv.balanceAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>
        <div class="invoice-detail-row"><span class="text-muted">Payment Mode:</span> <span class="text-white">${inv.paymentMethod}</span></div>
        <div class="invoice-detail-row"><span class="text-muted">Issued Officer:</span> <span class="text-white">${inv.issuedByUsername || 'Service Staff'}</span></div>
    `;
    customerViewModalInstance.show();
}