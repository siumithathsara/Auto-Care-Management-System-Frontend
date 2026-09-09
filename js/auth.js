const BASE_URL = "http://localhost:8080/api/v1";

// Toggle between Login and Sign Up UI Views
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

// Login Event Listener
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    hideAlert();

    const authData = {
        username: document.getElementById('loginUsername').value,
        password: document.getElementById('loginPassword').value
    };

    try {
        const response = await fetch(`${BASE_URL}/test/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authData)
        });

        const result = await response.json();

        if (response.ok && result.code === 200) {
            showAlert("Login Successful! Redirecting...", "success");
            localStorage.setItem("jwtToken", result.data);
            // window.location.href = "dashboard.html";
        } else {
            showAlert(result.message || "Invalid Username or Password!", "danger");
        }
    } catch (error) {
        showAlert("Server connection failed. Please try again later.", "danger");
    }
});

// Customer Registration Event Listener
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

        if (response.ok && result.code === 201) {
            showAlert("Account Registered Successfully! Please Sign In.", "success");
            document.getElementById('signupForm').reset();
            setTimeout(() => toggleAuth('login'), 1500);
        } else {
            showAlert(result.message || "Registration failed!", "danger");
        }
    } catch (error) {
        showAlert("Server connection failed. Please try again later.", "danger");
    }
});