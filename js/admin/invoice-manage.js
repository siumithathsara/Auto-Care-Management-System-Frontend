const INVOICE_API = "http://localhost:8080/api/v1/invoices";
const JOB_CARD_API = "http://localhost:8080/api/v1/job-cards";

let adminInvoicesCache = [];
let availableJobCardsCache = [];
let selectedJobCardObj = null;

let createModalInstance = null;
let viewModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    createModalInstance = new bootstrap.Modal(document.getElementById('createInvoiceModal'));
    viewModalInstance = new bootstrap.Modal(document.getElementById('adminViewModal'));
    loadAdminInvoices();
});

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

async function loadAdminInvoices() {
    const tbody = document.getElementById("adminInvoiceTableBody");
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted py-5 fs-7">
                <i class="fa-solid fa-circle-notch fa-spin me-2 text-primary-color"></i>Fetching all system invoices...
            </td>
        </tr>`;

    try {
        const res = await fetch(`${INVOICE_API}/get-all`, {
            method: "GET",
            headers: getAuthHeaders()
        });
        const result = await res.json();

        console.log("API Response:", result);

        if (res.ok && result.status === 200) {
            adminInvoicesCache = result.body || [];
            updateAdminKPIs(adminInvoicesCache);
            renderAdminTable(adminInvoicesCache);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${result.message || 'Failed to fetch invoices.'}</td></tr>`;
        }
    } catch (err) {
        console.error("Error:", err);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Network error. Unable to connect to backend.</td></tr>`;
    }
}

function updateAdminKPIs(invoices) {
    document.getElementById("adminKpiTotal").innerText = invoices.length;
    document.getElementById("adminKpiPaid").innerText = invoices.filter(i => i.paymentStatus === "PAID").length;
    document.getElementById("adminKpiPending").innerText = invoices.filter(i => i.paymentStatus !== "PAID").length;
}

function renderAdminTable(invoices) {
    const tbody = document.getElementById("adminInvoiceTableBody");
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5 fs-7">No invoice records found.</td></tr>`;
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
                <td>
                    <div class="text-white fw-bold">${inv.jobCardCode}</div>
                    <small class="text-muted fs-8"><i class="fa-solid fa-car me-1"></i>${inv.licensePlate || '-'} (${inv.brand || ''} ${inv.model || ''})</small>
                </td>
                <td>
                    <div class="text-light fs-7">${inv.customerUsername || 'N/A'}</div>
                    <small class="text-muted fs-8">${inv.customerPhone || '-'}</small>
                </td>
                <td>
                    <div class="text-white fw-bold fs-7">LKR ${(inv.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                    <small class="text-muted fs-8">Paid: ${(inv.paidAmount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</small>
                </td>
                <td><span class="${badgeClass}">${inv.paymentStatus || 'UNPAID'}</span></td>
                <td class="text-muted fs-7">${inv.issuedDate ? new Date(inv.issuedDate).toLocaleDateString() : '-'}</td>
                <td class="text-end">
                    <button class="btn btn-action-icon" onclick="viewInvoiceModal('${inv.invoiceCode}')" title="View Detail">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

async function openCreateInvoiceModal() {
    document.getElementById("createInvoiceForm").reset();
    document.getElementById("jobCardPreviewCard").classList.add("d-none");
    selectedJobCardObj = null;
    calculateCalculatedTotals();

    const select = document.getElementById("jobCardSelect");
    select.innerHTML = `<option value="">Loading job cards...</option>`;

    try {
        const res = await fetch('http://localhost:8080/api/v1/job-card/get-all', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const result = await res.json();

        const jobCardData = result.body || result.data;
        if (res.ok && jobCardData) {

            const invoicedJobCardCodes = adminInvoicesCache.map(inv => inv.jobCardCode);

            availableJobCardsCache = jobCardData.filter(jc => {
                const code = jc.jobCardCode || jc.code;
                return !invoicedJobCardCodes.includes(code);
            });

            select.innerHTML = `<option value="">-- Select Completed Job Card --</option>`;

            if (availableJobCardsCache.length > 0) {
                availableJobCardsCache.forEach(jc => {
                    const code = jc.jobCardCode || jc.code;
                    select.innerHTML += `<option value="${code}">${code} - ${jc.licensePlate || jc.vehicleCode || ''}</option>`;
                });
            } else {
                select.innerHTML = `<option value="">No Job Cards Available</option>`;
            }

        } else {
            select.innerHTML = `<option value="">No Job Cards Available</option>`;
        }
    } catch (e) {
        console.error("Job card load error:", e);
        select.innerHTML = `<option value="">Failed to load job cards</option>`;
    }

    createModalInstance.show();
}

function onJobCardSelected() {
    const selectedCode = document.getElementById("jobCardSelect").value;
    const previewCard = document.getElementById("jobCardPreviewCard");

    if (!selectedCode) {
        previewCard.classList.add("d-none");
        selectedJobCardObj = null;
        calculateCalculatedTotals();
        return;
    }

    selectedJobCardObj = availableJobCardsCache.find(j => (j.jobCardCode || j.code) === selectedCode);


    console.log("Selected Job Card Object:", selectedJobCardObj);

    if (selectedJobCardObj) {

        const custName = selectedJobCardObj.customerUsername || selectedJobCardObj.customerName || selectedJobCardObj.clientName || 'N/A';
        const custPhone = selectedJobCardObj.customerPhone || selectedJobCardObj.phone || selectedJobCardObj.contactNumber || 'N/A';
        const license = selectedJobCardObj.licensePlate || selectedJobCardObj.vehicleCode || selectedJobCardObj.vehicleNumber || '-';
        const brandModel = `${selectedJobCardObj.brand || ''} ${selectedJobCardObj.model || ''}`.trim();

        document.getElementById("previewCustomerName").innerText = custName;
        document.getElementById("previewCustomerPhone").innerText = custPhone;
        document.getElementById("previewVehicle").innerText = brandModel ? `${license} (${brandModel})` : license;

        const subtotal = selectedJobCardObj.subtotal || selectedJobCardObj.totalCost || selectedJobCardObj.estimatedTotalFee || selectedJobCardObj.totalAmount || 0;
        document.getElementById("previewSubtotal").innerText = `LKR ${subtotal.toLocaleString('en-US', {minimumFractionDigits:2})}`;

        previewCard.classList.remove("d-none");
    }
    calculateCalculatedTotals();
}

function calculateCalculatedTotals() {
    const subtotal = selectedJobCardObj ? (selectedJobCardObj.subtotal || selectedJobCardObj.totalCost || selectedJobCardObj.estimatedTotalFee || selectedJobCardObj.totalAmount || 0) : 0;
    const taxPct = parseFloat(document.getElementById("taxPercentage").value) || 0;
    const discPct = parseFloat(document.getElementById("discountPercentage").value) || 0;
    const paid = parseFloat(document.getElementById("paidAmount").value) || 0;

    const taxAmount = (subtotal * taxPct) / 100;
    const discountAmount = (subtotal * discPct) / 100;
    const total = subtotal + taxAmount - discountAmount;
    const balance = total - paid;

    document.getElementById("calcTotal").innerText = `LKR ${total.toLocaleString('en-US', {minimumFractionDigits:2})}`;
    document.getElementById("calcPaid").innerText = `LKR ${paid.toLocaleString('en-US', {minimumFractionDigits:2})}`;
    document.getElementById("calcBalance").innerText = `LKR ${balance.toLocaleString('en-US', {minimumFractionDigits:2})}`;
}

async function submitCreateInvoice() {
    const jobCardCode = document.getElementById("jobCardSelect").value;
    if (!jobCardCode) {
        alert("Please select a valid Job Card!");
        return;
    }

    const payload = {
        jobCardCode: jobCardCode,
        paymentMethod: document.getElementById("paymentMethod").value,
        taxPercentage: parseFloat(document.getElementById("taxPercentage").value) || 0,
        discountPercentage: parseFloat(document.getElementById("discountPercentage").value) || 0,
        paidAmount: parseFloat(document.getElementById("paidAmount").value) || 0
    };

    try {
        const res = await fetch(`${INVOICE_API}/create`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok && (result.status === 201 || result.status === 200 || result.code === 201 || result.code === 200)) {
            alert(result.message || "Invoice Created Successfully!");
            createModalInstance.hide();

            const resData = result.body || result.data;
            if (resData && resData.pdfBase64) {
                const invCode = resData.invoice ? resData.invoice.invoiceCode : "Generated";
                const link = document.createElement("a");
                link.href = `data:application/pdf;base64,${resData.pdfBase64}`;
                link.download = `Invoice_${invCode}.pdf`;
                link.click();
            }

            loadAdminInvoices();
        } else {
            alert(result.message || "Failed to create invoice.");
        }
    } catch (err) {
        console.error("Error creating invoice:", err);
        alert("Server error occurred while creating invoice.");
    }
}

function viewInvoiceModal(code) {
    const inv = adminInvoicesCache.find(i => i.invoiceCode === code);
    if (!inv) return;

    document.getElementById("adminModalTitle").innerText = `Invoice Details - ${inv.invoiceCode}`;
    document.getElementById("adminModalBody").innerHTML = `
        <div class="invoice-detail-row mb-2"><span class="text-muted">Job Card Code:</span> <span class="text-white fw-bold">${inv.jobCardCode}</span></div>
        <div class="invoice-detail-row mb-2"><span class="text-muted">Vehicle Plate:</span> <span class="text-white">${inv.licensePlate || '-'} (${inv.brand || ''} ${inv.model || ''})</span></div>
        <div class="invoice-detail-row mb-2"><span class="text-muted">Customer Name:</span> <span class="text-white">${inv.customerUsername || 'N/A'}</span></div>
        <div class="invoice-detail-row mb-2"><span class="text-muted">Customer Email:</span> <span class="text-white">${inv.customerEmail || '-'}</span></div>
        <div class="invoice-detail-row mb-2"><span class="text-muted">Subtotal:</span> <span class="text-white">LKR ${(inv.subtotal || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>
        <div class="invoice-detail-row mb-2"><span class="text-muted">Tax Amount:</span> <span class="text-white">LKR ${(inv.taxAmount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>
        <div class="invoice-detail-row mb-2"><span class="text-muted">Discount:</span> <span class="text-white">LKR ${(inv.discount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>
        <div class="invoice-detail-row mb-2"><span class="text-muted">Total Amount:</span> <span class="text-emerald fw-bold fs-6">LKR ${(inv.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>
        <div class="invoice-detail-row mb-2"><span class="text-muted">Paid Amount:</span> <span class="text-white">LKR ${(inv.paidAmount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>
        <div class="invoice-detail-row mb-2"><span class="text-muted">Balance Due:</span> <span class="text-warning fw-bold">LKR ${(inv.balanceAmount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</span></div>
        <div class="invoice-detail-row mb-2"><span class="text-muted">Payment Method:</span> <span class="text-white">${inv.paymentMethod || '-'}</span></div>
        <div class="invoice-detail-row mb-2"><span class="text-muted">Issued By:</span> <span class="text-white">${inv.issuedByUsername || 'System Admin'}</span></div>
    `;
    viewModalInstance.show();
}

function filterAdminInvoices() {
    const q = document.getElementById("adminSearchInput").value.toLowerCase();
    const filtered = adminInvoicesCache.filter(i =>
        (i.invoiceCode && i.invoiceCode.toLowerCase().includes(q)) ||
        (i.jobCardCode && i.jobCardCode.toLowerCase().includes(q)) ||
        (i.licensePlate && i.licensePlate.toLowerCase().includes(q)) ||
        (i.customerUsername && i.customerUsername.toLowerCase().includes(q))
    );
    renderAdminTable(filtered);
}