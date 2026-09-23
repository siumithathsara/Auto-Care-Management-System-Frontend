const EMPLOYEE_BASE_URL = "http://localhost:8080/api/v1/employee";

let allEmployeesCache = [];
let employeeModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    const modalElement = document.getElementById('employeeModal');
    if (modalElement) {
        employeeModalInstance = new bootstrap.Modal(modalElement);
    }

    const userRole = (localStorage.getItem("userRole") || "ADVISOR").toUpperCase();
    setupRolePermissions(userRole);
    loadAllEmployees();
});

function getAuthHeader() {
    const token = localStorage.getItem("jwtToken");
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

function setupRolePermissions(role) {
    const roleIndicator = document.getElementById("roleIndicator");
    const addBtn = document.getElementById("addEmployeeBtn");

    if (!roleIndicator) return;

    if (role === "ADMIN") {
        roleIndicator.className = "badge bg-success px-3 py-2";
        roleIndicator.innerText = "Role: ADMIN (Full Control)";
        if (addBtn) addBtn.classList.remove("d-none");
    } else {
        roleIndicator.className = "badge bg-info text-dark px-3 py-2";
        roleIndicator.innerText = "Role: ADVISOR (Read Only)";
        if (addBtn) addBtn.classList.add("d-none");
    }
}

async function loadAllEmployees() {
    const tbody = document.getElementById("employeeTableBody");
    try {
        const res = await fetch(`${EMPLOYEE_BASE_URL}/get-all-employee`, { headers: getAuthHeader() });

        if (res.ok) {
            const result = await res.json();

            allEmployeesCache = result.body || result.data || [];
            renderEmployeeTable(allEmployeesCache);
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to fetch employees. Access denied or server error.</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading employees:", err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Network error connecting to backend.</td></tr>`;
    }
}

// Render Table with Dark Theme Styling & Conditional Action Buttons
function renderEmployeeTable(employees) {
    const tbody = document.getElementById("employeeTableBody");
    const userRole = (localStorage.getItem("userRole") || "ADVISOR").toUpperCase();

    const countElement = document.getElementById("totalEmployeeCount");
    if (countElement) countElement.innerText = employees.length;

    if (!Array.isArray(employees) || employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5 fs-7">No employees found.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    employees.forEach(emp => {
        let actionColumnHtml = "";

        if (userRole === "ADMIN") {
            actionColumnHtml = `
                <div class="d-flex gap-2 justify-content-end">
                    <button class="btn btn-sm btn-outline-warning" onclick="openEditModal('${emp.employeeCode}')" title="Edit">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee('${emp.employeeCode}')" title="Delete">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
        } else {
            actionColumnHtml = `<span class="badge bg-secondary text-light fs-8">Read Only</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td><span class="badge bg-dark border border-secondary text-info fw-semibold">${emp.employeeCode || ''}</span></td>
                <td><span class="text-white fw-bold">${emp.employeeName || ''}</span></td>
                <td><span class="badge bg-primary text-white">${emp.designation || ''}</span></td>
                <td class="text-light"><i class="fa-solid fa-phone me-1 text-muted fs-8"></i>${emp.phone || ''}</td>
                <td class="text-muted fs-7">${emp.address || '-'}</td>
                <td class="text-end px-4">${actionColumnHtml}</td>
            </tr>
        `;
    });
}

// Open Modal for Create (Admin Only)
function openCreateModal() {
    document.getElementById("editEmployeeCode").value = "";
    document.getElementById("employeeForm").reset();
    document.getElementById("modalTitle").innerHTML = `<i class="fa-solid fa-user-plus me-2 text-primary"></i>Register Employee`;
    if (employeeModalInstance) employeeModalInstance.show();
}

// Open Modal for Edit (Admin Only)
function openEditModal(employeeCode) {
    const emp = allEmployeesCache.find(e => e.employeeCode === employeeCode);
    if (!emp) return;

    document.getElementById("editEmployeeCode").value = emp.employeeCode;
    document.getElementById("employeeName").value = emp.employeeName || "";
    document.getElementById("designation").value = emp.designation || "";
    document.getElementById("phone").value = emp.phone || "";
    document.getElementById("address").value = emp.address || "";

    document.getElementById("modalTitle").innerHTML = `<i class="fa-solid fa-user-pen me-2 text-warning"></i>Edit Employee (${emp.employeeCode})`;
    if (employeeModalInstance) employeeModalInstance.show();
}

// Save or Update Employee (Admin Only)
async function saveEmployee() {
    const editCode = document.getElementById("editEmployeeCode").value;
    const name = document.getElementById("employeeName").value.trim();
    const designation = document.getElementById("designation").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();

    if (!name || !designation || !phone) {
        alert("Please fill all required fields correctly.");
        return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        alert("Phone number must be exactly 10 digits.");
        return;
    }

    const payload = {
        employeeName: name,
        designation: designation,
        phone: phone,
        address: address
    };

    const isEdit = editCode !== "";
    const url = isEdit ? `${EMPLOYEE_BASE_URL}/${editCode}` : `${EMPLOYEE_BASE_URL}/register-employee`;
    const method = isEdit ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: getAuthHeader(),
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok) {
            alert(result.message || (isEdit ? "Employee updated successfully!" : "Employee registered successfully!"));
            if (employeeModalInstance) employeeModalInstance.hide();
            loadAllEmployees();
        } else {
            alert(result.message || "Operation failed.");
        }
    } catch (err) {
        console.error("Save employee error:", err);
        alert("Error connecting to server.");
    }
}

// Delete Employee (Admin Only)
async function deleteEmployee(employeeCode) {
    if (!confirm(`Are you sure you want to delete employee ${employeeCode}?`)) return;

    try {
        const res = await fetch(`${EMPLOYEE_BASE_URL}/${employeeCode}`, {
            method: "DELETE",
            headers: getAuthHeader()
        });

        const result = await res.json();
        if (res.ok) {
            alert(result.message || "Employee deleted successfully!");
            loadAllEmployees();
        } else {
            alert(result.message || "Delete operation failed.");
        }
    } catch (err) {
        console.error("Delete employee error:", err);
        alert("Error connecting to server.");
    }
}

// Local Search Filter
function filterEmployeesLocally() {
    const query = document.getElementById("employeeSearchInput").value.toLowerCase();
    const filtered = allEmployeesCache.filter(e =>
        (e.employeeCode && e.employeeCode.toLowerCase().includes(query)) ||
        (e.employeeName && e.employeeName.toLowerCase().includes(query)) ||
        (e.designation && e.designation.toLowerCase().includes(query)) ||
        (e.phone && e.phone.includes(query))
    );
    renderEmployeeTable(filtered);
}