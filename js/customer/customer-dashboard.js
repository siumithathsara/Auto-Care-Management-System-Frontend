// Base API Endpoint corresponding to CustomerDashboardController
const CUSTOMER_DASHBOARD_API = "http://localhost:8080/api/v1/customer-dashboard";

let profileModalInstance = null;
let serviceHistoryChartInstance = null;
let serviceTypeChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Profile Modal
    profileModalInstance = new bootstrap.Modal(document.getElementById('userProfileModal'));

    // Retrieve logged customer details from localStorage or use default
    const customerCode = localStorage.getItem("customerCode") || "CUST-001";

    // Set Topbar user name
    document.getElementById("topbarUserName").innerText = localStorage.getItem("userName") || "Customer User";
    document.getElementById("topbarUserRole").innerText = localStorage.getItem("userRole") || "CUSTOMER";

    // Load Data from Spring Boot Backend
    fetchCustomerDashboardData(customerCode);

    // Initialize Charts
    initCharts();
});

// Auth Headers helper
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

// Fetch Customer Dashboard Data via Spring Boot REST Controller
async function fetchCustomerDashboardData(customerCode) {
    const endpoint = `${CUSTOMER_DASHBOARD_API}/get-by-customer/${customerCode}`;

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const commonResponse = await response.json();
            if (commonResponse.data) {
                renderDashboardData(commonResponse.data);
            }
        } else {
            console.warn("Backend error or unauthorized. Loading mock/demo data...");
            loadFallbackData();
        }
    } catch (err) {
        console.error("Failed to connect with Backend:", err);
        loadFallbackData();
    }
}

// Populate DTO Data into Dashboard
function renderDashboardData(data) {
    // 1. KPI Stats
    document.getElementById("kpiTotalVehicles").innerText = data.totalVehicles || 0;
    document.getElementById("kpiActiveJobs").innerText = data.activeJobCards || 0;
    document.getElementById("kpiCompletedJobs").innerText = data.completedJobCards || 0;

    const pending = data.pendingPaymentAmount || 0;
    document.getElementById("kpiPendingPayment").innerText = `LKR ${pending.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

    // 2. Approved Appointments Table
    const appTable = document.getElementById("approvedAppointmentsTable");
    const appointments = data.approvedAppointments || [];
    document.getElementById("approvedAppointmentsCount").innerText = appointments.length;

    if (appointments.length === 0) {
        appTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No confirmed appointments.</td></tr>`;
    } else {
        appTable.innerHTML = appointments.map(app => `
            <tr>
                <td><small class="text-info fw-bold">${app.appointmentDate || ''} ${app.appointmentTime || ''}</small></td>
                <td><span class="badge bg-secondary">${app.vehicleNumber || 'N/A'}</span></td>
                <td>${app.notes || 'General Checkup'}</td>
                <td><span class="badge bg-success">${app.status || 'CONFIRMED'}</span></td>
            </tr>
        `).join('');
    }

    // 3. Active Jobs List
    const activeTable = document.getElementById("activeJobsTable");
    const activeJobs = data.activeJobsList || [];
    document.getElementById("activeJobsCount").innerText = activeJobs.length;

    if (activeJobs.length === 0) {
        activeTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No active services running.</td></tr>`;
    } else {
        activeTable.innerHTML = activeJobs.map(job => `
            <tr>
                <td><strong class="text-warning">${job.jobCardCode || 'N/A'}</strong></td>
                <td><span class="badge bg-secondary">${job.vehicleNumber || 'N/A'}</span></td>
                <td><small class="text-muted">${job.checkInTime || 'N/A'}</small></td>
                <td><span class="badge bg-warning text-dark">${job.status || 'IN_PROGRESS'}</span></td>
            </tr>
        `).join('');
    }

    // 4. Recent Job History
    const historyTable = document.getElementById("recentHistoryTable");
    const history = data.recentJobHistoryList || [];

    if (history.length === 0) {
        historyTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No service history found.</td></tr>`;
    } else {
        historyTable.innerHTML = history.map(h => `
            <tr>
                <td><strong class="text-light">${h.jobCardCode || 'N/A'}</strong></td>
                <td><span class="badge bg-secondary">${h.vehicleNumber || 'N/A'}</span></td>
                <td><small class="text-muted">${h.checkInTime || 'N/A'}</small></td>
                <td><small class="text-muted">${h.checkOutTime || 'N/A'}</small></td>
                <td><span class="badge bg-success">${h.status || 'COMPLETED'}</span></td>
            </tr>
        `).join('');
    }
}

// Fallback Mock Data matching CustomerDashboardDTO
function loadFallbackData() {
    const mockData = {
        totalVehicles: 2,
        activeJobCards: 1,
        completedJobCards: 6,
        pendingPaymentAmount: 18500.00,
        approvedAppointments: [
            {
                appointmentDate: "2026-09-28",
                appointmentTime: "09:30 AM",
                vehicleNumber: "WP CAB-4589",
                notes: "Engine Oil Change & Hybrid Battery Check",
                status: "CONFIRMED"
            }
        ],
        activeJobsList: [
            {
                jobCardCode: "JOB-2026-091",
                vehicleNumber: "WP CAB-4589",
                checkInTime: "2026-09-20 08:30 AM",
                status: "IN_PROGRESS"
            }
        ],
        recentJobHistoryList: [
            {
                jobCardCode: "JOB-2026-042",
                vehicleNumber: "WP CAB-4589",
                checkInTime: "2026-08-12 09:00 AM",
                checkOutTime: "2026-08-12 04:30 PM",
                status: "COMPLETED"
            },
            {
                jobCardCode: "JOB-2026-010",
                vehicleNumber: "WP BZ-1234",
                checkInTime: "2026-06-05 10:00 AM",
                checkOutTime: "2026-06-05 02:15 PM",
                status: "COMPLETED"
            }
        ]
    };
    renderDashboardData(mockData);
}

// Chart.js Visualization Function
function initCharts() {
    // 1. Service History Bar Chart
    const ctxBar = document.getElementById('serviceHistoryChart').getContext('2d');
    if (serviceHistoryChartInstance) serviceHistoryChartInstance.destroy();

    serviceHistoryChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
            datasets: [{
                label: 'Services Completed',
                data: [1, 2, 1, 3, 2, 4],
                backgroundColor: 'rgba(99, 102, 241, 0.85)',
                borderColor: '#6366f1',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', stepSize: 1 }, beginAtZero: true }
            }
        }
    });

    // 2. Service Type Donut Chart
    const ctxPie = document.getElementById('serviceTypeChart').getContext('2d');
    if (serviceTypeChartInstance) serviceTypeChartInstance.destroy();

    serviceTypeChartInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Full Service', 'Oil Service', 'Engine Repair', 'Body Wash'],
            datasets: [{
                data: [50, 20, 20, 10],
                backgroundColor: ['#6366f1', '#3b82f6', '#f59e0b', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 10, font: { size: 11 } } }
            },
            cutout: '70%'
        }
    });
}

// Profile Modal Controller
function openProfileModal() {
    document.getElementById("modalUserName").innerText = localStorage.getItem("userName") || "Customer User";
    document.getElementById("modalUserRole").innerText = localStorage.getItem("userRole") || "CUSTOMER";
    document.getElementById("modalUserCode").innerText = localStorage.getItem("customerCode") || "CUST-001";
    document.getElementById("modalUserEmail").innerText = localStorage.getItem("userEmail") || "customer@autocare.com";
    document.getElementById("modalUserPhone").innerText = localStorage.getItem("userPhone") || "+94 77 123 4567";

    profileModalInstance.show();
}

// Sidebar Navigation Handling
function switchTab(moduleName, event) {
    if (event) event.preventDefault();

    document.querySelectorAll(".sidebar-menu a").forEach(el => el.classList.remove("active"));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active");
    }

    const dynamicContent = document.getElementById("dynamicPageContent");

    if (moduleName === "dashboard") {
        document.getElementById("kpiRow").classList.remove("d-none");
        document.getElementById("chartsRow").classList.remove("d-none");
        document.getElementById("tablesRow").classList.remove("d-none");
        document.getElementById("historyRow").classList.remove("d-none");
        dynamicContent.classList.add("d-none");
    } else {
        document.getElementById("kpiRow").classList.add("d-none");
        document.getElementById("chartsRow").classList.add("d-none");
        document.getElementById("tablesRow").classList.add("d-none");
        document.getElementById("historyRow").classList.add("d-none");
        dynamicContent.classList.remove("d-none");

        const titleMap = {
            'my-vehicles': 'My Vehicles',
            'vehicle-services': 'Vehicle Services',
            'track-service': 'Track Service',
            'track-status': 'Track Vehicle Service Status',
            'appointments': 'Appointments',
            'invoices': 'Invoices & Payments'
        };

        document.getElementById("pageTitle").innerText = titleMap[moduleName] || moduleName;
        document.getElementById("pageDescription").innerText = `Manage your ${titleMap[moduleName] || moduleName} information from this section.`;
    }
}

// Toggle Mobile Sidebar
function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("show");
}

// Handle Logout
function handleLogout() {
    localStorage.clear();
    alert("Logged out successfully!");
    // window.location.href = "login.html";
}

// AI Assistant Toggle & Logic
function toggleAiChat() {
    const chatWin = document.getElementById("aiChatWindow");
    chatWin.style.display = (chatWin.style.display === "flex") ? "none" : "flex";
}

function handleAiKeyPress(event) {
    if (event.key === "Enter") sendAiMessage();
}

function sendAiMessage() {
    const inputField = document.getElementById("aiInputMsg");
    const chatBody = document.getElementById("aiChatBody");
    const text = inputField.value.trim();

    if (!text) return;

    // Append User Message
    const userDiv = document.createElement("div");
    userDiv.className = "chat-msg user";
    userDiv.innerText = text;
    chatBody.appendChild(userDiv);

    inputField.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;

    // Bot Response Simulation
    setTimeout(() => {
        const botDiv = document.createElement("div");
        botDiv.className = "chat-msg bot";
        botDiv.innerText = "Thank you for contacting AutoCare AI. Our team will assist you with this query shortly!";
        chatBody.appendChild(botDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 700);
}