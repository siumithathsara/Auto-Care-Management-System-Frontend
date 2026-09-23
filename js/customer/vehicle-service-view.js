const SERVICE_BASE_URL = "http://localhost:8080/api/v1/service";
const CATEGORY_BASE_URL = "http://localhost:8080/api/v1/service-category";
let availableServicesList = [];

function getAuthHeader() {
    const token = localStorage.getItem("jwtToken");
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

document.addEventListener("DOMContentLoaded", async () => {

    await loadCustomerCategoryDropdown();

    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');

    if (categoryParam) {
        document.getElementById('custCategoryFilterSelect').value = categoryParam;
        updatePageTitle(categoryParam);
        fetchServicesByCategory(categoryParam);
    } else {
        fetchAllActiveServices();
    }
});

function updatePageTitle(categoryCode) {
    const selectedOption = document.querySelector(`#custCategoryFilterSelect option[value="${categoryCode}"]`);

    if (categoryCode !== "ALL" && selectedOption) {
        document.getElementById('servicePageTitle').innerText = `${selectedOption.text} - Services`;
        document.getElementById('servicePageSubtitle').innerText = `Showing all specialized services under ${selectedOption.text}`;
    } else {
        document.getElementById('servicePageTitle').innerText = "Available Vehicle Services";
        document.getElementById('servicePageSubtitle').innerText = "Browse our full catalog of professional vehicle repair & maintenance services.";
    }
}

function onCategoryFilterChange() {
    const selectedCat = document.getElementById('custCategoryFilterSelect').value;
    updatePageTitle(selectedCat);
    fetchServicesByCategory(selectedCat);
}

async function loadCustomerCategoryDropdown() {
    try {
        const res = await fetch(`${CATEGORY_BASE_URL}/get-all`, { headers: getAuthHeader() });
        if (res.ok) {
            const responseData = await res.json();

            const categories = responseData.body || responseData.data || [];
            const select = document.getElementById('custCategoryFilterSelect');

            categories.forEach(c => {

                if (!c.dataStatus || c.dataStatus === "ACTIVE") {
                    select.innerHTML += `<option value="${c.categoryCode}">${c.categoryName}</option>`;
                }
            });
        }
    } catch (err) {
        console.error("Error loading categories:", err);
    }
}

async function fetchAllActiveServices() {
    try {
        const res = await fetch(`${SERVICE_BASE_URL}/get-all`, { headers: getAuthHeader() });
        if (res.ok) {
            const responseData = await res.json();

            availableServicesList = responseData.body || responseData.data || [];
            renderServicesGrid(availableServicesList);
        } else {
            console.error("Failed to fetch active services. Status:", res.status);
            renderServicesGrid([]);
        }
    } catch (err) {
        console.error("Error fetching services:", err);
        renderServicesGrid([]);
    }
}

async function fetchServicesByCategory(categoryCode) {
    if (categoryCode === "ALL") {
        fetchAllActiveServices();
        return;
    }
    try {
        const res = await fetch(`${SERVICE_BASE_URL}/get-by-category/${categoryCode}`, { headers: getAuthHeader() });
        if (res.ok) {
            const responseData = await res.json();
            availableServicesList = responseData.body || responseData.data || [];
            renderServicesGrid(availableServicesList);
        } else {
            console.error("Failed to fetch category services. Status:", res.status);
            renderServicesGrid([]);
        }
    } catch (err) {
        console.error("Error fetching category services:", err);
        renderServicesGrid([]);
    }
}

function renderServicesGrid(services) {
    const grid = document.getElementById('customerServicesGrid');
    grid.innerHTML = "";

    if (!services || services.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center text-muted py-5 fs-6">No services available for the selected category.</div>`;
        return;
    }

    services.forEach(s => {
        grid.innerHTML += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="service-card">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="duration-pill"><i class="fa-regular fa-clock me-1"></i>${s.estimatedTimeMin} mins</span>
                        <span class="badge bg-secondary-subtle text-indigo border border-secondary px-2 py-1 fs-8">${s.serviceCode}</span>
                    </div>

                    <h5 class="fw-bold text-white mb-2">${s.serviceName}</h5>
                    <p class="text-muted fs-7 flex-grow-1 mb-4">${s.description || 'Professional vehicle care and maintenance service.'}</p>

                    <div class="d-flex justify-content-between align-items-center pt-3 border-top border-white border-opacity-10">
                        <div>
                            <span class="text-muted fs-8 d-block">STANDARD FEE</span>
                            <span class="service-price-tag">LKR ${parseFloat(s.standardFee).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <button class="btn btn-primary-custom btn-sm" onclick="bookService('${s.serviceCode}')">
                            Book Service
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

function filterCustomerServices() {
    const query = document.getElementById('custSearchInput').value.toLowerCase();
    const filtered = availableServicesList.filter(s =>
        (s.serviceName && s.serviceName.toLowerCase().includes(query)) ||
        (s.description && s.description.toLowerCase().includes(query)) ||
        (s.serviceCode && s.serviceCode.toLowerCase().includes(query))
    );
    renderServicesGrid(filtered);
}

function bookService(serviceCode) {
    window.location.href = `appointment-booking.html?serviceCode=${serviceCode}`;
}