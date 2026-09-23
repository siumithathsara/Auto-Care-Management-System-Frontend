const BASE_URL = "http://localhost:8080/api/v1/service-category";
let categoriesList = [];

const defaultCategoryImages = [
    "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&auto=format&fit=crop&q=80"
];

function getCategoryImageSafe(categoryName, fallbackImage) {
    if (!categoryName) return fallbackImage;
    const name = categoryName.toLowerCase();

    if (name.includes("engine") || name.includes("mechanical")) {
        return "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80";
    } else if (name.includes("wheel") || name.includes("tyre") || name.includes("alignment")) {
        return "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=800&auto=format&fit=crop&q=80";
    } else if (name.includes("wash") || name.includes("detail") || name.includes("cleaning") || name.includes("full")) {
        return "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800&auto=format&fit=crop&q=80";
    } else if (name.includes("hybrid") || name.includes("electric") || name.includes("battery")) {
        return "https://images.unsplash.com/photo-1558441719-6779b6811239?w=800&auto=format&fit=crop&q=80";
    } else if (name.includes("paint") || name.includes("body") || name.includes("repair")) {
        return "https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=800&auto=format&fit=crop&q=80";
    }

    return fallbackImage;
}

document.addEventListener("DOMContentLoaded", () => {
    fetchActiveCategories();
});

function getAuthHeader() {
    const token = localStorage.getItem("jwtToken") || localStorage.getItem("token") || "";
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

async function fetchActiveCategories() {
    const grid = document.getElementById('customerCategoryGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="fa-solid fa-circle-notch fa-spin me-2 text-primary-color fs-5"></i>Loading service categories...
            </div>`;
    }

    try {
        const res = await fetch(`${BASE_URL}/get-all`, {
            method: "GET",
            headers: getAuthHeader()
        });

        if (res.ok) {
            const responseData = await res.json();
            const dataList = responseData.data || responseData.body || [];
            categoriesList = dataList.filter(c => !c.status || c.status === "ACTIVE");
            renderCategoryGrid(categoriesList);
        } else {
            if (grid) grid.innerHTML = `<div class="col-12 text-center text-danger py-5 fs-6">Failed to load service categories.</div>`;
        }
    } catch (err) {
        console.error("Error fetching categories:", err);
        if (grid) grid.innerHTML = `<div class="col-12 text-center text-danger py-5 fs-6">Network error. Unable to load categories.</div>`;
    }
}

function renderCategoryGrid(categories) {
    const grid = document.getElementById('customerCategoryGrid');
    if (!grid) return;

    grid.innerHTML = "";

    if (!Array.isArray(categories) || categories.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center text-muted py-5 fs-6">No active service categories available at the moment.</div>`;
        return;
    }

    categories.forEach((cat, index) => {
        const fallbackImg = defaultCategoryImages[index % defaultCategoryImages.length];
        const bgImage = getCategoryImageSafe(cat.categoryName, fallbackImg);

        grid.innerHTML += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="cat-card d-flex flex-column h-100">
                    <div class="cat-img-wrapper position-relative overflow-hidden" style="background-color: #1e293b; height: 180px;">
                        <img src="${bgImage}" 
                             alt="${cat.categoryName || 'Category'}" 
                             class="w-100 h-100 object-fit-cover"
                             onerror="this.style.display='none'; this.nextElementSibling.classList.remove('d-none');">
                        <div class="d-none w-100 h-100 d-flex align-items-center justify-content-center text-secondary position-absolute top-0 start-0">
                            <i class="fa-solid fa-car-rear fs-1 text-primary-color"></i>
                        </div>
                        <span class="cat-badge position-absolute top-0 end-0 m-3">${cat.categoryCode || 'CAT'}</span>
                    </div>
                    <div class="p-4 d-flex flex-column flex-grow-1">
                        <h5 class="fw-bold text-white mb-2">${cat.categoryName || 'Unnamed Category'}</h5>
                        <p class="text-muted fs-7 flex-grow-1 mb-3">${cat.description || 'Professional maintenance and care tailored for your vehicle.'}</p>
                        <div>
                            <button class="btn btn-outline-custom w-100 fs-7" onclick="selectCategory('${cat.categoryCode}')">
                                <i class="fa-solid fa-circle-info me-2"></i>View Services
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

function filterCustomerCategories() {
    const inputElem = document.getElementById('customerSearchInput');
    if (!inputElem) return;

    const query = inputElem.value.toLowerCase().trim();
    const filtered = categoriesList.filter(c =>
        (c.categoryName && c.categoryName.toLowerCase().includes(query)) ||
        (c.description && c.description.toLowerCase().includes(query)) ||
        (c.categoryCode && c.categoryCode.toLowerCase().includes(query))
    );
    renderCategoryGrid(filtered);
}

function selectCategory(categoryCode) {
    if (!categoryCode) return;

    window.location.href = `./vehicle-service-view.html?category=${encodeURIComponent(categoryCode)}`;
}