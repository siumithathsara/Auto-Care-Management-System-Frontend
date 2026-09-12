const EMPLOYEE_BASE_URL = "http://localhost:8080/api/v1/employee";

let allEmployeesCache = [];
let employeeModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    employeeModalInstance = new bootstrap.Modal(document.getElementById('employeeModal'));

    const userRole = (localStorage.getItem("userRole") || "ADVISOR").toUpperCase();
    setupRolePermissions(userRole);
    loadAllEmployees();
});

function getAuthHeader() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

// Security UI Controls based on User Role
function setupRolePermissions(role) {
    const roleIndicator = document.getElementById("roleIndicator");
    const addBtn = document.getElementById("addEmployeeBtn");

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

// Fetch All Employees
async function loadAllEmployees() {
    const tbody = document.getElementById("employeeTableBody");
    try {
        const res = await fetch(`${EMPLOYEE_BASE_URL}/get-all-employee`, { headers: getAuthHeader() });

        if (res.ok) {
            const result = await res.json();
            allEmployeesCache = result.data || [];
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

    document.getElementById("totalEmployeeCount").innerText = employees.length;

    if (employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5 fs-7">No employees found.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    employees.forEach(emp => {
        // Build Action Column based on Role
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
            actionColumnHtml = `<span class="badge bg-secondary-subtle text-muted fs-8">Read Only</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td><span class="badge bg-dark border border-secondary text-info fw-semibold">${emp.employeeCode}</span></td>
                <td><span class="text-white fw-bold">${emp.employeeName}</span></td>
                <td><span class="badge bg-primary-subtle text-primary border border-primary-subtle">${emp.designation}</span></td>
                <td class="text-light"><i class="fa-solid fa-phone me-1 text-muted fs-8"></i>${emp.phone}</td>
                <td class="text-muted fs-7">${emp.address || '-'}</td>
                <td class="text-end px-4">${actionColumnHtml}</td>
            </tr>
        `;
    });
}

// Open Modal for Create
function openCreateModal() {
    document.getElementById("editEmployeeCode").value = "";
    document.getElementById("employeeForm").reset();
    document.getElementById("modalTitle").innerHTML = `<i class="fa-solid fa-user-plus me-2 text-primary"></i>Register Employee`;
    employeeModalInstance.show();
}

// Open Modal for Edit
function openEditModal(employeeCode) {
    const emp = allEmployeesCache.find(e => e.employeeCode === employeeCode);
    if (!emp) return;

    document.getElementById("editEmployeeCode").value = emp.employeeCode;
    document.getElementById("employeeName").value = emp.employeeName;
    document.getElementById("designation").value = emp.designation;
    document.getElementById("phone").value = emp.phone;
    document.getElementById("address").value = emp.address || "";

    document.getElementById("modalTitle").innerHTML = `<i class="fa-solid fa-user-pen me-2 text-warning"></i>Edit Employee (${emp.employeeCode})`;
    employeeModalInstance.show();
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
            employeeModalInstance.hide();
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
    }
}

// Local Search Filter
function filterEmployeesLocally() {
    const query = document.getElementById("employeeSearchInput").value.toLowerCase();
    const filtered = allEmployeesCache.filter(e =>
        e.employeeCode.toLowerCase().includes(query) ||
        e.employeeName.toLowerCase().includes(query) ||
        e.designation.toLowerCase().includes(query) ||
        e.phone.includes(query)
    );
    renderEmployeeTable(filtered);
}