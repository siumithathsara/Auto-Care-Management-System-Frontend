const BASE_URL = "http://localhost:8080/api/v1/job-section";

function getAuthHeaders() {
    const token = localStorage.getItem("jwtToken") || localStorage.getItem("token") || "";
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function trackJobCardProgress() {
    const inputElem = document.getElementById("custJobCardInput");
    const jobCardCode = inputElem ? inputElem.value.trim() : "";
    const trackingResult = document.getElementById("customerTrackingResult");

    if (!jobCardCode) {
        alert("Please enter a valid Job Card Code!");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/get-by-job-card/${jobCardCode}`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (response.ok && (result.code === 200 || result.status === 200)) {
            const sections = result.data || result.body || [];

            if (Array.isArray(sections) && sections.length > 0) {
                renderCustomerTimeline(sections);
            } else {
                if (trackingResult) trackingResult.classList.add("d-none");
                alert("No service section records found for this Job Card.");
            }
        } else if (response.status === 401 || response.status === 403) {
            alert("Session expired or unauthorized! Please log in again.");
        } else {
            if (trackingResult) trackingResult.classList.add("d-none");
            alert(result.message || "Failed to fetch service progress details.");
        }
    } catch (e) {
        console.error("Error tracking job section progress:", e);
        if (trackingResult) trackingResult.classList.add("d-none");
        alert("Network error. Unable to track progress from server.");
    }
}

function renderCustomerTimeline(sections) {
    const trackingResult = document.getElementById("customerTrackingResult");
    if (trackingResult) trackingResult.classList.remove("d-none");

    const plateElem = document.getElementById("custPlateNo");
    if (plateElem) {
        plateElem.innerText = sections[0].vehicleLicensePlate || "N/A";
    }

    const completedCount = sections.filter(s => s.sectionStatus === 'COMPLETED').length;
    const percent = Math.round((completedCount / sections.length) * 100);

    const percentText = document.getElementById("custPercentText");
    const progressBar = document.getElementById("custProgressBar");

    if (percentText) percentText.innerText = `${percent}%`;
    if (progressBar) progressBar.style.width = `${percent}%`;

    const container = document.getElementById("customerTimelineContainer");
    if (!container) return;

    container.innerHTML = sections.map(s => {

        const formattedSectionName = s.sectionName
            ? s.sectionName.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
            : 'General Section';

        let statusBadgeClass = "bg-secondary";
        if (s.sectionStatus === 'COMPLETED') statusBadgeClass = "bg-success";
        else if (s.sectionStatus === 'IN_PROGRESS') statusBadgeClass = "bg-primary";
        else if (s.sectionStatus === 'PENDING') statusBadgeClass = "bg-warning text-dark";

        return `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="timeline-card h-100 p-3 bg-dark rounded-3 border border-secondary">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="fw-bold text-white mb-0">${formattedSectionName}</h6>
                        <span class="badge ${statusBadgeClass} px-2 py-1 fs-8">${s.sectionStatus || 'PENDING'}</span>
                    </div>
                    <p class="text-muted fs-7 mb-2">${s.remarks || 'No specific notes.'}</p>
                    <small class="text-muted d-block mt-2 pt-2 border-top border-secondary">
                        <i class="fa-solid fa-user-gear me-1 text-primary-color"></i>Mechanic: ${s.mechanicEmployeeName || 'Assigned'}
                    </small>
                </div>
            </div>
        `;
    }).join('');
}