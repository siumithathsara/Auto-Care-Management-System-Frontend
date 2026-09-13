const API_BASE_URL = "http://localhost:8080/api/v1/job-card";

function trackJobCardForCustomer() {
    const code = document.getElementById("customerSearchCode").value.trim();
    if (!code) return;

    const token = localStorage.getItem("authToken");

    fetch(`${API_BASE_URL}/get-by-code/${code}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.code === 200) {
                const dto = data.data;
                document.getElementById("customerJobCardResult").classList.remove("d-none");

                document.getElementById("custStatusBadge").innerText = dto.status;
                document.getElementById("custJobCardCode").innerText = dto.jobCardCode;
                document.getElementById("custLicensePlate").innerText = dto.licensePlate || 'N/A';
                document.getElementById("custMileage").innerText = `${dto.mileageIn} KM`;
                document.getElementById("custFuel").innerText = dto.fuelLevel;
                document.getElementById("custAdvisor").innerText = dto.advisorName || 'N/A';
                document.getElementById("custEstTime").innerText = dto.estimatedCompletionTime ? new Date(dto.estimatedCompletionTime).toLocaleString() : '--';

                // Services
                const servicesList = document.getElementById("custServicesList");
                servicesList.innerHTML = "";
                if (dto.services && dto.services.length > 0) {
                    dto.services.forEach(srv => {
                        servicesList.innerHTML += `<li class="mb-1 text-white"><i class="fa-solid fa-angle-right me-2 text-primary-color"></i>${srv.serviceName || srv.serviceCode}</li>`;
                    });
                } else {
                    servicesList.innerHTML = `<li>No services listed.</li>`;
                }

                // Parts
                const partsList = document.getElementById("custPartsList");
                partsList.innerHTML = "";
                if (dto.parts && dto.parts.length > 0) {
                    dto.parts.forEach(prt => {
                        partsList.innerHTML += `<li class="mb-1 text-white"><i class="fa-solid fa-angle-right me-2 text-primary-color"></i>${prt.partName || prt.itemCode} (x${prt.quantity})</li>`;
                    });
                } else {
                    partsList.innerHTML = `<li>No spare parts added yet.</li>`;
                }

                document.getElementById("custTotalFee").innerText = `LKR ${dto.estimatedTotalFee ? dto.estimatedTotalFee.toLocaleString() : '0.00'}`;
            } else {
                alert("Job Card Code not found!");
            }
        })
        .catch(err => console.error("Error fetching job card:", err));
}