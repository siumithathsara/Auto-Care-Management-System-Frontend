const API_BASE_URL = "http://localhost:8080/api/v1/job-card";

function getAuthHeaders() {
    const token = localStorage.getItem("jwtToken") || localStorage.getItem("token") || "";
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function trackJobCardForCustomer() {
    const searchInput = document.getElementById("customerSearchCode");
    const code = searchInput ? searchInput.value.trim() : "";

    if (!code) {
        alert("Please enter a valid Job Card Code!");
        return;
    }

    const resultCard = document.getElementById("customerJobCardResult");

    try {
        const res = await fetch(`${API_BASE_URL}/get-by-code/${code}`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        const data = await res.json();

        if (res.ok && (data.code === 200 || data.status === 200)) {

            const dto = data.data || data.body;

            if (!dto) {
                alert("Job Card details could not be found!");
                return;
            }

            if (resultCard) resultCard.classList.remove("d-none");

            document.getElementById("custStatusBadge").innerText = dto.status || 'PENDING';
            document.getElementById("custJobCardCode").innerText = dto.jobCardCode || code;
            document.getElementById("custLicensePlate").innerText = dto.licensePlate || 'N/A';
            document.getElementById("custMileage").innerText = `${dto.mileageIn || 0} KM`;
            document.getElementById("custFuel").innerText = dto.fuelLevel || 'N/A';
            document.getElementById("custAdvisor").innerText = dto.advisorName || 'N/A';
            document.getElementById("custEstTime").innerText = dto.estimatedCompletionTime
                ? new Date(dto.estimatedCompletionTime).toLocaleString()
                : '--';

            const servicesList = document.getElementById("custServicesList");
            if (servicesList) {
                servicesList.innerHTML = "";
                if (Array.isArray(dto.services) && dto.services.length > 0) {
                    dto.services.forEach(srv => {
                        servicesList.innerHTML += `<li class="mb-1 text-white"><i class="fa-solid fa-angle-right me-2 text-primary-color"></i>${srv.serviceName || srv.serviceCode}</li>`;
                    });
                } else {
                    servicesList.innerHTML = `<li>No services listed.</li>`;
                }
            }

            const partsList = document.getElementById("custPartsList");
            if (partsList) {
                partsList.innerHTML = "";
                if (Array.isArray(dto.parts) && dto.parts.length > 0) {
                    dto.parts.forEach(prt => {
                        const qty = prt.quantity || prt.qty || 1;
                        partsList.innerHTML += `<li class="mb-1 text-white"><i class="fa-solid fa-angle-right me-2 text-primary-color"></i>${prt.partName || prt.itemCode} (x${qty})</li>`;
                    });
                } else {
                    partsList.innerHTML = `<li>No spare parts added yet.</li>`;
                }
            }

            const totalFee = parseFloat(dto.estimatedTotalFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
            document.getElementById("custTotalFee").innerText = `LKR ${totalFee}`;

        } else if (res.status === 401 || res.status === 403) {
            alert("Session expired or unauthorized! Please log in again.");
        } else {
            if (resultCard) resultCard.classList.add("d-none");
            alert(data.message || "Job Card Code not found!");
        }

    } catch (err) {
        console.error("Error fetching job card:", err);
        if (resultCard) resultCard.classList.add("d-none");
        alert("Network error. Unable to fetch Job Card details from server.");
    }
}