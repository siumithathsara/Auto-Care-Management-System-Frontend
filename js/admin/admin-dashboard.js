const DASHBOARD_API = "http://localhost:8080/api/v1/dashboard";

let profileModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Profile Modal
    profileModalInstance = new bootstrap.Modal(document.getElementById('userProfileModal'));
    loadDashboardData();
});

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

// Fetch Backend Data (AdminDashboardDTO / AdvisorDashboardDTO)
async function loadDashboardData() {
    const role = localStorage.getItem("userRole") || "ADMIN"; // Default ADMIN
    document.getElementById("loggedUserRole").innerText = role;

    const endpoint = (role === "ADMIN") ? `${DASHBOARD_API}/admin` : `${DASHBOARD_API}/advisor`;

    try {
        /* Real Backend Fetch (Uncomment once connected)
        const res = await fetch(endpoint, {
            method: "GET",
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (res.ok && result.data) {
            populateDashboardView(result.data, role);
        }
        */

        // Simulated Mock Data matching Spring Boot Backend
        setTimeout(() => {
            const mockAdminDTO = {
                todayRevenue: 45000.00,
                thisMonthRevenue: 680000.00,
                totalRevenue: 3450000.00,
                pendingInvoicesCount: 4,
                totalUnpaidAmount: 85000.00,
                lowStockCount: 3,
                outOfStockCount: 1,
                overview: {
                    activeJobCards: 8,
                    completedJobCards: 42,
                    vehiclesInWorkshop: 11
                }
            };
            populateDashboardView(mockAdminDTO, role);
        }, 300);

    } catch (err) {
        console.error("Error loading dashboard data:", err);
    }
}

// Map Spring Boot DTO Data to Dashboard UI
function populateDashboardView(data, role) {
    // Shared Overview Items
    const overview = data.overview || {};
    document.getElementById("kpiActiveJobs").innerText = overview.activeJobCards || 0;
    document.getElementById("kpiCompletedJobs").innerText = overview.completedJobCards || 0;
    document.getElementById("kpiInWorkshop").innerText = overview.vehiclesInWorkshop || 0;

    // Financial & Stock Metrics (Admin Only)
    if (role === "ADMIN") {
        document.getElementById("adminMetricsRow").classList.remove("d-none");
        document.getElementById("kpiTodayRevenue").innerText = `LKR ${(data.todayRevenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("metricMonthRevenue").innerText = `LKR ${(data.thisMonthRevenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("metricTotalRevenue").innerText = `LKR ${(data.totalRevenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("metricPendingInvoices").innerText = data.pendingInvoicesCount || 0;
        document.getElementById("metricUnpaidAmount").innerText = `LKR ${(data.totalUnpaidAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        document.getElementById("stockLowCount").innerText = data.lowStockCount || 0;
        document.getElementById("stockOutCount").innerText = data.outOfStockCount || 0;
    } else {
        // Hide Financial Metrics for Service Advisor
        document.getElementById("adminMetricsRow").classList.add("d-none");
        document.getElementById("kpiTodayRevenue").innerText = "N/A";
    }
}

// Settings Gear Click -> Navigate to User Management
function openUserManagement() {
    switchTab('user-management');
}

// Open User Profile Popup Modal
function openProfileModal() {
    document.getElementById("modalUserName").innerText = "Kasun Perera";
    document.getElementById("modalUserRole").innerText = localStorage.getItem("userRole") || "ADMIN";
    document.getElementById("modalUserCode").innerText = "USR-2026-001";
    document.getElementById("modalUserEmail").innerText = "admin@autocare.lk";
    document.getElementById("modalUserPhone").innerText = "+94 77 123 4567";
    document.getElementById("modalUserNic").innerText = "199512345678";
    document.getElementById("modalUserAddress").innerText = "Colombo, Sri Lanka";

    profileModalInstance.show();
}

// Dynamic Sidebar Tab Switcher
function switchTab(moduleName, event) {
    if (event) event.preventDefault();

    document.querySelectorAll(".sidebar-menu a").forEach(el => el.classList.remove("active"));

    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active");
    }

    const mainContainer = document.getElementById("dashboardMainContainer");
    const dynamicContent = document.getElementById("dynamicPageContent");

    if (moduleName === "dashboard") {
        mainContainer.children[0].classList.remove("d-none");
        mainContainer.children[1].classList.remove("d-none");
        dynamicContent.classList.add("d-none");
    } else {
        mainContainer.children[0].classList.add("d-none");
        mainContainer.children[1].classList.add("d-none");
        dynamicContent.classList.remove("d-none");

        const titleMap = {
            'job-cards': 'Job Cards Management',
            'job-sections': 'Job Sections',
            'vehicle-services': 'Vehicle Services',
            'service-categories': 'Service Categories',
            'vehicles': 'Vehicle Management',
            'appointments': 'Appointments Management',
            'spare-parts': 'Spare Parts Inventory',
            'purchase-orders': 'Purchase Orders',
            'suppliers': 'Supplier Management',
            'payments': 'Payments & Invoicing',
            'employees': 'Employee Management',
            'user-management': 'User Management & Settings'
        };

        document.getElementById("pageTitle").innerText = titleMap[moduleName] || moduleName.toUpperCase();
        document.getElementById("pageDescription").innerText = `Manage all ${titleMap[moduleName] || moduleName} operations from this page.`;
    }
}

// Mobile Responsive Sidebar Toggle
function toggleSidebar() {
    document.querySelector(".sidebar").classList.toggle("show");
}

// Logout Confirmation
function handleLogout() {
    if (confirm("Are you sure you want to log out?")) {
        localStorage.clear();
        window.location.href = "/login.html";
    }
}

/* Floating AI Chatbot Logic */
function toggleAiChat() {
    const chatWin = document.getElementById("aiChatWindow");
    chatWin.style.display = (chatWin.style.display === "flex") ? "none" : "flex";
}

function handleAiKeyPress(e) {
    if (e.key === 'Enter') sendAiMessage();
}

function sendAiMessage() {
    const input = document.getElementById("aiInputMsg");
    const body = document.getElementById("aiChatBody");
    const msg = input.value.trim();

    if (!msg) return;

    body.innerHTML += `<div class="chat-msg user">${msg}</div>`;
    input.value = "";
    body.scrollTop = body.scrollHeight;

    setTimeout(() => {
        body.innerHTML += `<div class="chat-msg bot">Processing your query regarding: "${msg}"...</div>`;
        body.scrollTop = body.scrollHeight;
    }, 600);
}