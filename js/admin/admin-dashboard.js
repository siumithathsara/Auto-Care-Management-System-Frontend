const DASHBOARD_API = "http://localhost:8080/api/v1/dashboard";

let profileModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Profile Modal
    const modalEl = document.getElementById('userProfileModal');
    if (modalEl) {
        profileModalInstance = new bootstrap.Modal(modalEl);
    }

    loadDashboardData();
});

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

async function loadDashboardData() {
    const role = (localStorage.getItem("userRole") || "ADMIN").toUpperCase();

    const userNameElement = document.getElementById("loggedUserName");
    if (userNameElement) {
        userNameElement.innerText = localStorage.getItem("username") || "System User";
    }

    const roleBadgeElement = document.getElementById("loggedUserRole");
    if (roleBadgeElement) {
        roleBadgeElement.innerText = role;
    }

    const isAdmin = role.includes("ADMIN");
    const endpoint = isAdmin ? `${DASHBOARD_API}/admin` : `${DASHBOARD_API}/advisor`;

    console.log("Current Logged Role:", role);
    console.log("Calling Endpoint:", endpoint);

    try {
        const res = await fetch(endpoint, {
            method: "GET",
            headers: getAuthHeaders()
        });

        console.log("Backend Response Status:", res.status);

        if (res.ok) {
            const result = await res.json();
            console.log("Dashboard Data Response Received:", result);

            const actualData = result.body || result.data || result;

            if (actualData) {
                populateDashboardView(actualData, role);
            } else {
                console.warn("Response body/data is empty.");
            }
        } else {
            const errorText = await res.text();
            console.error(`Failed to load dashboard data (${res.status}):`, errorText);
        }

    } catch (err) {
        console.error("Error connecting with backend dashboard API:", err);
    }
}

function populateDashboardView(data, role) {
    console.log("Populating Dashboard UI with data:", data);

    const overview = data.overview || data;

    const kpiActiveJobs = document.getElementById("kpiActiveJobs");
    const kpiCompletedJobs = document.getElementById("kpiCompletedJobs");
    const kpiInWorkshop = document.getElementById("kpiInWorkshop");

    if (kpiActiveJobs) kpiActiveJobs.innerText = overview.activeJobCards ?? data.activeJobCards ?? 0;
    if (kpiCompletedJobs) kpiCompletedJobs.innerText = overview.completedJobCards ?? data.completedJobCards ?? 0;
    if (kpiInWorkshop) kpiInWorkshop.innerText = overview.vehiclesInWorkshop ?? data.vehiclesInWorkshop ?? 0;

    const todayRevenueCard = document.getElementById("todayRevenueCard");
    const adminMetricsRow = document.getElementById("adminMetricsRow");
    const stockInventorySection = document.getElementById("stockInventorySection");

    const isAdminRole = (role || "").toUpperCase().includes("ADMIN");

    if (isAdminRole) {

        if (todayRevenueCard) todayRevenueCard.style.display = "block";
        if (adminMetricsRow) {
            adminMetricsRow.classList.remove("d-none");
            adminMetricsRow.style.display = "flex";
        }
        if (stockInventorySection) stockInventorySection.style.display = "block";

        const kpiTodayRevenue = document.getElementById("kpiTodayRevenue");
        const metricMonthRevenue = document.getElementById("metricMonthRevenue");
        const metricTotalRevenue = document.getElementById("metricTotalRevenue");
        const metricPendingInvoices = document.getElementById("metricPendingInvoices");
        const metricUnpaidAmount = document.getElementById("metricUnpaidAmount");
        const stockLowCount = document.getElementById("stockLowCount");
        const stockOutCount = document.getElementById("stockOutCount");

        if (kpiTodayRevenue) kpiTodayRevenue.innerText = `LKR ${(data.todayRevenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        if (metricMonthRevenue) metricMonthRevenue.innerText = `LKR ${(data.thisMonthRevenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        if (metricTotalRevenue) metricTotalRevenue.innerText = `LKR ${(data.totalRevenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        if (metricPendingInvoices) metricPendingInvoices.innerText = data.pendingInvoicesCount || 0;
        if (metricUnpaidAmount) metricUnpaidAmount.innerText = `LKR ${(data.totalUnpaidAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        if (stockLowCount) stockLowCount.innerText = data.lowStockCount || 0;
        if (stockOutCount) stockOutCount.innerText = data.outOfStockCount || 0;
    } else {

        if (todayRevenueCard) todayRevenueCard.style.display = "none";
        if (adminMetricsRow) {
            adminMetricsRow.classList.add("d-none");
            adminMetricsRow.style.display = "none";
        }
        if (stockInventorySection) stockInventorySection.style.display = "none";
    }
}

function openUserManagement() {
    switchTab('user-management');
}

function openProfileModal() {
    const username = localStorage.getItem("username") || "System User";
    const role = localStorage.getItem("userRole") || "ADMIN";

    const modalUserName = document.getElementById("modalUserName");
    const modalUserRole = document.getElementById("modalUserRole");

    if (modalUserName) modalUserName.innerText = username;
    if (modalUserRole) modalUserRole.innerText = role;

    if (profileModalInstance) {
        profileModalInstance.show();
    }
}
function switchTab(moduleName, event) {
    if (event) event.preventDefault();

    // Active Highlight Toggle
    document.querySelectorAll(".sidebar-menu a").forEach(el => el.classList.remove("active"));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active");
    }

    const kpiOverviewRow = document.getElementById("kpiOverviewRow");
    const adminMetricsRow = document.getElementById("adminMetricsRow");
    const dynamicContent = document.getElementById("dynamicPageContent");
    const iframe = document.getElementById("adminPageIframe");

    if (moduleName === "dashboard") {
        if (kpiOverviewRow) kpiOverviewRow.classList.remove("d-none");
        if (adminMetricsRow) adminMetricsRow.classList.remove("d-none");
        if (dynamicContent) dynamicContent.classList.add("d-none");
    } else {
        if (kpiOverviewRow) kpiOverviewRow.classList.add("d-none");
        if (adminMetricsRow) adminMetricsRow.classList.add("d-none");
        if (dynamicContent) dynamicContent.classList.remove("d-none");

        const pageMap = {
            'job-cards': 'job-card-manage.html',
            'job-sections': 'job-section-manage.html',
            'vehicle-services': 'vehicle-service-manage.html',
            'service-categories': 'service-category-manage.html',
            'vehicles': 'vehicle_management.html',
            'appointments': 'appointment-manage.html',
            'spare-parts': 'spare-part-manage.html',
            'purchase-orders': 'purchase-order.html',
            'suppliers': 'supplier-manage.html',
            'payments': 'invoice-manage.html',
            'employees': 'employee-manage.html',
            'user-management': 'user_management.html'
        };

        if (iframe && pageMap[moduleName]) {
            iframe.src = pageMap[moduleName];
        }
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.toggle("show");
}


function handleLogout() {
    if (confirm("Are you sure you want to log out?")) {
        localStorage.clear();
        window.location.href = "../../index.html";
    }
}

/* ==========================================================
   AI BOT CHAT COMPONENT LOGIC
   ========================================================== */

function toggleAiChat() {
    const chatWin = document.getElementById("aiChatWindow");
    if (chatWin) {
        chatWin.style.display = (chatWin.style.display === "flex") ? "none" : "flex";
    }
}

function handleAiKeyPress(e) {
    if (e.key === 'Enter') {
        sendAiMessage();
    }
}

function sendAiMessage() {
    const input = document.getElementById("aiInputMsg");
    const body = document.getElementById("aiChatBody");
    if (!input || !body) return;

    const msg = input.value.trim();
    if (!msg) return;

    body.innerHTML += `<div class="chat-msg user">${msg}</div>`;
    input.value = "";
    body.scrollTop = body.scrollHeight;

    setTimeout(() => {
        body.innerHTML += `<div class="chat-msg bot">Processing your query regarding: "${msg}"... (AI Backend integration pending)</div>`;
        body.scrollTop = body.scrollHeight;
    }, 600);
}