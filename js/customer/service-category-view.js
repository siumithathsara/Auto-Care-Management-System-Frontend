const BASE_URL = "http://localhost:8080/api/v1/service-category";
let categoriesList = [];

// Fallback high quality category photos for Auto Care
const defaultCategoryImages = [
    "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80"

];

// Safety Image Assignment Utility
function getCategoryImageSafe(categoryName, fallbackImage) {
    if (!categoryName) return fallbackImage;
    const name = categoryName.toLowerCase();

    if (name.includes("engine") || name.includes("mechanical")) {
        return "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80";
    } else if (name.includes("wheel") || name.includes("tyre") || name.includes("alignment")) {
        return "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80";
    } else if (name.includes("wash") || name.includes("detail") || name.includes("cleaning")) {
        return "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80";
    } else if (name.includes("hybrid") || name.includes("electric") || name.includes("battery")) {
        return "https://images.unsplash.com/photo-1558441719-6779b6811239?auto=format&fit=crop&w=800&q=80";
    } else if (name.includes("paint") || name.includes("body") || name.includes("repair")) {
        return "https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=800&q=80";
    }

    return fallbackImage;
}

document.addEventListener("DOMContentLoaded", () => {
    fetchActiveCategories();
});

function getAuthHeader() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

async function fetchActiveCategories() {
    try {
        const res = await fetch(`${BASE_URL}/get-all`, { headers: getAuthHeader() });
        if (res.ok) {
            const responseData = await res.json();
            // Filter only ACTIVE categories for customer
            const data = responseData.data || [];
            categoriesList = data.filter(c => c.status === "ACTIVE");
            renderCategoryGrid(categoriesList);
        }
    } catch (err) {
        console.error("Error fetching categories:", err);
    }
}

function renderCategoryGrid(categories) {
    const grid = document.getElementById('customerCategoryGrid');
    grid.innerHTML = "";

    if (!categories || categories.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center text-muted py-5 fs-6">No active service categories available at the moment.</div>`;
        return;
    }

    categories.forEach((cat, index) => {
        // Safe Image Assignment: Keyword Match -> Fallback Image
        const fallbackImg = defaultCategoryImages[index % defaultCategoryImages.length];
        const bgImage = getCategoryImageSafe(cat.categoryName, fallbackImg);

        grid.innerHTML += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="cat-card d-flex flex-column">
                    <div class="cat-img-wrapper">
                        <img src="${bgImage}" alt="${cat.categoryName}">
                        <span class="cat-badge">${cat.categoryCode}</span>
                    </div>
                    <div class="p-4 d-flex flex-column flex-grow-1">
                        <h5 class="fw-bold text-white mb-2">${cat.categoryName}</h5>
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
    const query = document.getElementById('customerSearchInput').value.toLowerCase();
    const filtered = categoriesList.filter(c =>
        c.categoryName.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query))
    );
    renderCategoryGrid(filtered);
}

function selectCategory(categoryCode) {
    // Navigate to services page filtered by this category code
    window.location.href = `services.html?category=${categoryCode}`;
}