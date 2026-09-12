const BASE_URL = "http://localhost:8080/api/v1/job-section";

async function trackJobCardProgress() {
    const jobCardCode = document.getElementById("custJobCardInput").value.trim();
    if (!jobCardCode) return;

    try {
        const response = await fetch(`${BASE_URL}/get-by-job-card/${jobCardCode}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("userToken")}` }
        });
        const result = await response.json();

        if (result.code === 200 && result.data && result.data.length > 0) {
            renderCustomerTimeline(result.data);
        } else {
            alert("No service records found for this Job Card.");
        }
    } catch (e) {
        alert("Failed to track progress.");
    }
}

function renderCustomerTimeline(sections) {
    document.getElementById("customerTrackingResult").classList.remove("d-none");

    // License Plate
    document.getElementById("custPlateNo").innerText = sections[0].vehicleLicensePlate || "N/A";

    // Progress Calculation
    const completed = sections.filter(s => s.sectionStatus === 'COMPLETED').length;
    const percent = Math.round((completed / sections.length) * 100);

    document.getElementById("custPercentText").innerText = `${percent}%`;
    document.getElementById("custProgressBar").style.width = `${percent}%`;

    // Render Timeline Cards
    const container = document.getElementById("customerTimelineContainer");
    container.innerHTML = sections.map(s => `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="timeline-card h-100">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="fw-bold text-white mb-0">${s.sectionName}</h6>
                    <span class="badge badge-status-${s.sectionStatus}">${s.sectionStatus}</span>
                </div>
                <p class="text-muted fs-7 mb-2">${s.remarks || 'No specific notes.'}</p>
                <small class="text-muted d-block"><i class="fa-solid fa-user-gear me-1"></i>Mechanic: ${s.mechanicEmployeeName || 'Assigned'}</small>
            </div>
        </div>
    `).join('');
}