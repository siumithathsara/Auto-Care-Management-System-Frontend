
const CUSTOMER_DASHBOARD_API = "http://localhost:8080/api/v1/customer-dashboard";
const USER_API = "http://localhost:8080/api/v1/user"; // User Controller for fetching logged user details

let profileModalInstance = null;
let serviceHistoryChartInstance = null;
let serviceTypeChartInstance = null;

document.addEventListener("DOMContentLoaded", async () => {
    // Initialize Profile Modal
    const modalEl = document.getElementById('userProfileModal');
    if (modalEl) {
        profileModalInstance = new bootstrap.Modal(modalEl);
    }

    const username = localStorage.getItem("username");

    if (!username) {
        console.error("No logged-in user found in LocalStorage!");
        showEmptyDashboardError("Session expired or invalid user. Please log in again.");
        return;
    }

    const savedUserRole = localStorage.getItem("userRole") || "CUSTOMER";
    const topbarNameEl = document.getElementById("topbarUserName");
    const topbarRoleEl = document.getElementById("topbarUserRole");

    if (topbarNameEl) topbarNameEl.innerText = username;
    if (topbarRoleEl) topbarRoleEl.innerText = savedUserRole;

    console.log("Fetching fresh user profile for username:", username);
    const customerCode = await fetchRealUserCodeByUsername(username);

    if (!customerCode || customerCode.trim() === "" || customerCode === "ww") {
        console.error("No valid customerCode found for username:", username);
        showEmptyDashboardError(`Customer record for '${username}' not found in Database.`);
    } else {

        localStorage.setItem("customerCode", customerCode);
        console.log(`Loading Dashboard Data specifically for Customer [${username}] -> Code: [${customerCode}]`);

        fetchCustomerDashboardData(customerCode.trim());
    }

    // Initialize Charts
    initCharts();
});

function getAuthHeaders() {
    const token = localStorage.getItem("jwtToken");
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function fetchRealUserCodeByUsername(username) {
    try {
        const response = await fetch(`${USER_API}/get-user/${username}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const commonResponse = await response.json();
            const userData = commonResponse.body || commonResponse.data || commonResponse;

            if (userData) {

                const foundCode = userData.customerCode || userData.userCode || userData.code || userData.id;
                if (foundCode) {
                    console.log("Successfully retrieved Customer Code from Backend:", foundCode);
                    return foundCode;
                }
            }
        } else {
            console.warn(`User endpoint returned status ${response.status}`);
        }
    } catch (err) {
        console.error("Error fetching user profile code by username:", err);
    }

    return username;
}

async function fetchCustomerDashboardData(customerCode) {
    const endpoint = `${CUSTOMER_DASHBOARD_API}/get-by-customer/${customerCode}`;
    console.log("Fetching dashboard data from endpoint:", endpoint);

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const commonResponse = await response.json();
            console.log("Backend Response Data received:", commonResponse);

            if (commonResponse.status === 404 || commonResponse.code === 404 || commonResponse.body === null) {
                console.warn("Backend Custom 404:", commonResponse.message);
                showEmptyDashboardError(commonResponse.message || `No customer details found for Code: ${customerCode}`);
                return;
            }

            const actualData = commonResponse.body || commonResponse.data || commonResponse;

            if (actualData && typeof actualData === 'object') {
                renderDashboardData(actualData);
            } else {
                showEmptyDashboardError("No dashboard data returned for this customer.");
            }
        } else {
            if (response.status === 404) {
                showEmptyDashboardError(`Customer code '${customerCode}' not found in Database.`);
            } else if (response.status === 401 || response.status === 403) {
                showEmptyDashboardError("Unauthorized access. Please login again.");
            } else {
                showEmptyDashboardError(`Failed to load data. Backend status: ${response.status}`);
            }
        }
    } catch (err) {
        console.error("Failed to connect with Backend (Network Error):", err);
        showEmptyDashboardError("Network Error: Cannot connect to Backend Server.");
    }
}

function renderDashboardData(data) {
    console.log("Rendering dashboard with data:", data);

    const totalVehicles = data.totalVehicles ?? data.totalVehicleCount ?? 0;
    const activeJobsCount = data.activeJobCards ?? data.activeJobsCount ?? data.activeJobCount ?? (data.activeJobsList ? data.activeJobsList.length : 0);
    const completedJobsCount = data.completedJobCards ?? data.completedJobsCount ?? data.completedJobCount ?? (data.recentJobHistoryList ? data.recentJobHistoryList.length : 0);
    const pending = data.pendingPaymentAmount ?? data.pendingAmount ?? 0;

    const kpiTotalVehicles = document.getElementById("kpiTotalVehicles") || document.getElementById("totalVehicles");
    const kpiActiveJobs = document.getElementById("kpiActiveJobs") || document.getElementById("activeJobs");
    const kpiCompletedJobs = document.getElementById("kpiCompletedJobs") || document.getElementById("completedJobs");
    const kpiPendingPayment = document.getElementById("kpiPendingPayment") || document.getElementById("pendingPayment");

    if (kpiTotalVehicles) kpiTotalVehicles.innerText = totalVehicles;
    if (kpiActiveJobs) kpiActiveJobs.innerText = activeJobsCount;
    if (kpiCompletedJobs) kpiCompletedJobs.innerText = completedJobsCount;

    if (kpiPendingPayment) {
        kpiPendingPayment.innerText = `LKR ${Number(pending).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    }

    const appTable = document.getElementById("approvedAppointmentsTable");
    const appCountEl = document.getElementById("approvedAppointmentsCount");
    const appointments = data.approvedAppointments || data.appointmentsList || [];

    if (appCountEl) appCountEl.innerText = appointments.length;

    if (appTable) {
        if (appointments.length === 0) {
            appTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No confirmed appointments.</td></tr>`;
        } else {
            appTable.innerHTML = appointments.map(app => `
                <tr>
                    <td><small class="text-info fw-bold">${app.appointmentDate || app.date || ''} ${app.appointmentTime || app.time || ''}</small></td>
                    <td><span class="badge bg-secondary">${app.vehicleNumber || app.vehicleNo || 'N/A'}</span></td>
                    <td>${app.notes || app.serviceType || 'General Checkup'}</td>
                    <td><span class="badge bg-success">${app.status || 'CONFIRMED'}</span></td>
                </tr>
            `).join('');
        }
    }

    const activeTable = document.getElementById("activeJobsTable");
    const activeCountEl = document.getElementById("activeJobsCount");
    const activeJobs = data.activeJobsList || data.activeJobs || [];

    if (activeCountEl) activeCountEl.innerText = activeJobs.length;

    if (activeTable) {
        if (activeJobs.length === 0) {
            activeTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No active services running.</td></tr>`;
        } else {
            activeTable.innerHTML = activeJobs.map(job => `
                <tr>
                    <td><strong class="text-warning">${job.jobCardCode || job.jobCardNo || 'N/A'}</strong></td>
                    <td><span class="badge bg-secondary">${job.vehicleNumber || job.vehicleNo || 'N/A'}</span></td>
                    <td><small class="text-muted">${job.checkInTime || job.startDate || 'N/A'}</small></td>
                    <td><span class="badge bg-warning text-dark">${job.status || 'IN_PROGRESS'}</span></td>
                </tr>
            `).join('');
        }
    }

    const historyTable = document.getElementById("recentHistoryTable");
    const history = data.recentJobHistoryList || data.jobHistory || [];

    if (historyTable) {
        if (history.length === 0) {
            historyTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No service history found.</td></tr>`;
        } else {
            historyTable.innerHTML = history.map(h => `
                <tr>
                    <td><strong class="text-light">${h.jobCardCode || h.jobCardNo || 'N/A'}</strong></td>
                    <td><span class="badge bg-secondary">${h.vehicleNumber || h.vehicleNo || 'N/A'}</span></td>
                    <td><small class="text-muted">${h.checkInTime || h.startDate || 'N/A'}</small></td>
                    <td><small class="text-muted">${h.checkOutTime || h.endDate || 'N/A'}</small></td>
                    <td><span class="badge bg-success">${h.status || 'COMPLETED'}</span></td>
                </tr>
            `).join('');
        }
    }
}

function showEmptyDashboardError(message) {
    const kpiTotalVehicles = document.getElementById("kpiTotalVehicles") || document.getElementById("totalVehicles");
    const kpiActiveJobs = document.getElementById("kpiActiveJobs") || document.getElementById("activeJobs");
    const kpiCompletedJobs = document.getElementById("kpiCompletedJobs") || document.getElementById("completedJobs");
    const kpiPendingPayment = document.getElementById("kpiPendingPayment") || document.getElementById("pendingPayment");

    if (kpiTotalVehicles) kpiTotalVehicles.innerText = "0";
    if (kpiActiveJobs) kpiActiveJobs.innerText = "0";
    if (kpiCompletedJobs) kpiCompletedJobs.innerText = "0";
    if (kpiPendingPayment) kpiPendingPayment.innerText = "LKR 0.00";

    const emptyRow = `<tr><td colspan="5" class="text-center text-danger py-3">${message}</td></tr>`;

    const appTable = document.getElementById("approvedAppointmentsTable");
    const activeTable = document.getElementById("activeJobsTable");
    const historyTable = document.getElementById("recentHistoryTable");

    if (appTable) appTable.innerHTML = emptyRow;
    if (activeTable) activeTable.innerHTML = emptyRow;
    if (historyTable) historyTable.innerHTML = emptyRow;
}

// Chart.js Visualization Function
// function initCharts() {
//     const ctxBar = document.getElementById('serviceHistoryChart')?.getContext('2d');
//     if (ctxBar) {
//         if (serviceHistoryChartInstance) serviceHistoryChartInstance.destroy();
//         serviceHistoryChartInstance = new Chart(ctxBar, {
//             type: 'bar',
//             data: {
//                 labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
//                 datasets: [{
//                     label: 'Services Completed',
//                     data: [1, 2, 1, 3, 2, 4],
//                     backgroundColor: 'rgba(99, 102, 241, 0.85)',
//                     borderColor: '#6366f1',
//                     borderWidth: 1,
//                     borderRadius: 6
//                 }]
//             },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 plugins: { legend: { display: false } },
//                 scales: {
//                     x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
//                     y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', stepSize: 1 }, beginAtZero: true }
//                 }
//             }
//         });
//     }
//
//     const ctxPie = document.getElementById('serviceTypeChart')?.getContext('2d');
//     if (ctxPie) {
//         if (serviceTypeChartInstance) serviceTypeChartInstance.destroy();
//         serviceTypeChartInstance = new Chart(ctxPie, {
//             type: 'doughnut',
//             data: {
//                 labels: ['Full Service', 'Oil Service', 'Engine Repair', 'Body Wash'],
//                 datasets: [{
//                     data: [50, 20, 20, 10],
//                     backgroundColor: ['#6366f1', '#3b82f6', '#f59e0b', '#10b981'],
//                     borderWidth: 0
//                 }]
//             },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 plugins: {
//                     legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 10, font: { size: 11 } } }
//                 },
//                 cutout: '70%'
//             }
//         });
//     }
// }

// Profile Modal Controller
function openProfileModal() {
    const modalUserName = document.getElementById("modalUserName");
    const modalUserRole = document.getElementById("modalUserRole");
    const modalUserCode = document.getElementById("modalUserCode");
    const modalUserEmail = document.getElementById("modalUserEmail");
    const modalUserPhone = document.getElementById("modalUserPhone");

    const currentCustomerCode = localStorage.getItem("customerCode") || "N/A";

    if (modalUserName) modalUserName.innerText = localStorage.getItem("userName") || localStorage.getItem("username") || "Customer User";
    if (modalUserRole) modalUserRole.innerText = localStorage.getItem("userRole") || "CUSTOMER";
    if (modalUserCode) modalUserCode.innerText = currentCustomerCode;
    if (modalUserEmail) modalUserEmail.innerText = localStorage.getItem("userEmail") || "customer@autocare.com";
    if (modalUserPhone) modalUserPhone.innerText = localStorage.getItem("userPhone") || "+94 77 123 4567";

    if (profileModalInstance) profileModalInstance.show();
}

function switchTab(moduleName, event) {
    if (event) event.preventDefault();

    document.querySelectorAll(".sidebar-menu a").forEach(el => el.classList.remove("active"));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active");
    }

    const dynamicContent = document.getElementById("dynamicPageContent");
    const pageIframe = document.getElementById("pageIframe");
    const kpiRow = document.getElementById("kpiRow");
    const chartsRow = document.getElementById("chartsRow");
    const tablesRow = document.getElementById("tablesRow");
    const historyRow = document.getElementById("historyRow");

    if (moduleName === "dashboard") {
        if (kpiRow) kpiRow.classList.remove("d-none");
        if (chartsRow) chartsRow.classList.remove("d-none");
        if (tablesRow) tablesRow.classList.remove("d-none");
        if (historyRow) historyRow.classList.remove("d-none");
        if (dynamicContent) dynamicContent.classList.add("d-none");
    } else {
        if (kpiRow) kpiRow.classList.add("d-none");
        if (chartsRow) chartsRow.classList.add("d-none");
        if (tablesRow) tablesRow.classList.add("d-none");
        if (historyRow) historyRow.classList.add("d-none");
        if (dynamicContent) dynamicContent.classList.remove("d-none");

        // Dynamic File Mapping
        const pageMap = {
            'my-vehicles': 'my_vehicles.html',
            'vehicle-services': 'service-category-view.html',
            'track-service': 'job-section-view.html',
            'track-status': 'job-card-tracker.html',
            'appointments': 'appointment-booking.html',
            'invoices': 'invoice-tracker.html'
        };

        if (pageIframe && pageMap[moduleName]) {
            pageIframe.src = pageMap[moduleName];
        }
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.toggle("show");
}

function handleLogout() {
    localStorage.clear();
    alert("Logged out successfully!");
    window.location.href = "../../index.html";
}

function toggleAiChat() {
    const chatWin = document.getElementById("aiChatWindow");
    if (chatWin) {
        chatWin.style.display = (chatWin.style.display === "flex") ? "none" : "flex";
    }
}

function handleAiKeyPress(event) {
    if (event.key === "Enter") sendAiMessage();
}

function sendAiMessage() {
    const inputField = document.getElementById("aiInputMsg");
    const chatBody = document.getElementById("aiChatBody");
    if (!inputField || !chatBody) return;

    const text = inputField.value.trim();
    if (!text) return;

    const userDiv = document.createElement("div");
    userDiv.className = "chat-msg user";
    userDiv.innerText = text;
    chatBody.appendChild(userDiv);

    inputField.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;

    setTimeout(() => {
        const botDiv = document.createElement("div");
        botDiv.className = "chat-msg bot";
        botDiv.innerText = "Thank you for contacting AutoCare AI. Our team will assist you with this query shortly!";
        chatBody.appendChild(botDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 700);
}