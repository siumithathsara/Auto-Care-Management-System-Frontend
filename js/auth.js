const BASE_URL = "http://localhost:8080/api/v1";

function toggleAuth(view) {
    const loginSec = document.getElementById('loginSection');
    const signupSec = document.getElementById('signupSection');
    hideAlert();

    if (view === 'signup') {
        loginSec.classList.add('hidden');
        signupSec.classList.remove('hidden');
    } else {
        signupSec.classList.add('hidden');
        loginSec.classList.remove('hidden');
    }
}

function showAlert(message, type) {
    const alertBox = document.getElementById('alertBox');
    alertBox.className = `alert alert-${type}`;
    alertBox.innerText = message;
    alertBox.classList.remove('d-none');
}

function hideAlert() {
    document.getElementById('alertBox').classList.add('d-none');
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    hideAlert();

    const enteredUsername = document.getElementById('loginUsername').value.trim();
    const authData = {
        username: enteredUsername,
        password: document.getElementById('loginPassword').value
    };

    try {
        const response = await fetch(`${BASE_URL}/test/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authData)
        });

        const result = await response.json();
        console.log("Full Server Response:", result);

        const resCode = result.code || result.status || response.status;
        const resBody = result.body || result.data || result;

        if (response.ok && (resCode === 200 || resCode === 201)) {

            let token = "";
            let role = "CUSTOMER";

            if (typeof resBody === 'object' && resBody !== null) {
                token = resBody.token || resBody.accessToken || "";

                let backendRole = resBody.role || resBody.userRole || resBody.authority;
                if (typeof backendRole === 'object' && backendRole !== null) {
                    role = backendRole.name || backendRole.toString() || "CUSTOMER";
                } else if (backendRole) {
                    role = backendRole.toString();
                }
            }

            if ((!role || role === "CUSTOMER") && (enteredUsername.toLowerCase() === "admin" || enteredUsername.toLowerCase().includes("admin"))) {
                role = "ADMIN";
            }

            console.log("Extracted Token:", token);
            console.log("Extracted Role:", role);

            // Token එකක් නැතිනම් Login සාර්ථක නොවේ
            if (!token) {
                showAlert(result.message || "Invalid Username or Password!", "danger");
                return;
            }

            showAlert("Login Successful! Redirecting...", "success");

            localStorage.setItem("jwtToken", token);
            localStorage.setItem("userRole", role);
            localStorage.setItem("username", authData.username);

            setTimeout(() => {
                const upperRole = role ? role.toString().toUpperCase() : "";
                console.log("Processed Role for Redirect:", upperRole);

                if (upperRole.includes("ADMIN") || upperRole.includes("ADVISOR")) {
                    console.log("Redirecting to Admin Dashboard...");
                    window.location.href = "./pages/admin/admin-dashboard.html";
                } else {
                    console.log("Redirecting to Customer Dashboard...");
                    window.location.href = "./pages/customer/customer-dashboard.html";
                }
            }, 1000);

        } else {

            showAlert(result.message || "Invalid Username or Password!", "danger");
        }
    } catch (error) {
        console.error("Login Error:", error);
        showAlert("Server connection failed. Please try again later.", "danger");
    }
});

document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    hideAlert();

    const userData = {
        username: document.getElementById('regUsername').value,
        password: document.getElementById('regPassword').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value,
        nicPassport: document.getElementById('regNic').value,
        address: document.getElementById('regAddress').value
    };

    try {
        const response = await fetch(`${BASE_URL}/user/register-customer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (response.ok && (result.code === 201 || response.status === 201)) {
            showAlert("Account Registered Successfully! Please Sign In.", "success");
            document.getElementById('signupForm').reset();
            setTimeout(() => toggleAuth('login'), 1500);
        } else {
            showAlert(result.message || "Registration failed!", "danger");
        }
    } catch (error) {
        console.error("Registration Error:", error);
        showAlert("Server connection failed. Please try again later.", "danger");
    }
});