const APPOINTMENT_BASE_URL = "http://localhost:8080/api/v1/appointment";
const SERVICE_BASE_URL = "http://localhost:8080/api/v1/service";
const VEHICLE_BASE_URL = "http://localhost:8080/api/v1/vehicle";

document.addEventListener("DOMContentLoaded", async () => {
    const currentUserCode = localStorage.getItem("userCode") || "CUST001";
    document.getElementById("appUserCode").value = currentUserCode;

    const today = new Date().toISOString().split('T')[0];
    document.getElementById("appDate").setAttribute("min", today);

    await loadCustomerVehicles(currentUserCode);

    const urlParams = new URLSearchParams(window.location.search);
    const preSelectedCode = urlParams.get('serviceCode');
    await loadServices(preSelectedCode);
});

function getAuthHeader() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem("jwtToken")}`
    };
}

// Service එකට අදාළ Image එක Code එකෙන් හෝ Name එකෙන් තෝරාගැනීම
function getServiceImage(serviceCode, serviceName) {
    const code = (serviceCode || '').toLowerCase();
    const name = (serviceName || '').toLowerCase();

    if (code.includes('srv001') || name.includes('full service') || name.includes('inspection')) {
        return "https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=400";
    } else if (code.includes('srv002') || name.includes('oil') || name.includes('engine')) {
        return "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=400";
    } else if (code.includes('srv003') || name.includes('wheel') || name.includes('alignment') || name.includes('tire')) {
        return "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?q=80&w=400";
    } else if (code.includes('srv004') || name.includes('wash') || name.includes('clean') || name.includes('detail')) {
        return "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=400";
    } else if (name.includes('brake')) {
        return "https://images.unsplash.com/photo-1600706432520-22d259c441c2?q=80&w=400";
    }

    return "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=400";
}

async function loadCustomerVehicles(userCode) {
    try {
        const res = await fetch(`${VEHICLE_BASE_URL}/get-by-customer/${userCode}`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            const vehicles = result.data || [];
            const select = document.getElementById('appVehicleSelect');

            if (vehicles.length === 0) {
                select.innerHTML = '<option value="" selected disabled>No vehicles found</option>';
                return;
            }

            select.innerHTML = '<option value="" selected disabled>Choose a vehicle...</option>';
            vehicles.forEach(v => {
                select.innerHTML += `<option value="${v.vehicleCode}">${v.licensePlate || v.vehicleCode} - ${v.vehicleModel}</option>`;
            });
        }
    } catch (err) {
        console.error("Vehicle fetch error:", err);
    }
}

async function loadServices(preSelectedCode) {
    try {
        const res = await fetch(`${SERVICE_BASE_URL}/get-all`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            renderServiceCards(result.data || [], preSelectedCode);
        }
    } catch (err) {
        console.error("Service fetch error:", err);
    }
}

function renderServiceCards(services, preSelectedCode) {
    const container = document.getElementById('servicesCardContainer');
    container.innerHTML = "";

    services.forEach(s => {
        const isSelected = (preSelectedCode && s.serviceCode === preSelectedCode);

        // Backend එකේ URL එකක් නැතහොත් Auto Mapped Image එක ගන්නවා
        const imageUrl = (s.imageUrl && s.imageUrl.trim() !== "")
            ? s.imageUrl
            : getServiceImage(s.serviceCode, s.serviceName);

        container.innerHTML += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="cat-card ${isSelected ? 'selected-card' : ''}" id="card_${s.serviceCode}" onclick="toggleServiceCard('${s.serviceCode}')">
                    <div class="card-select-badge"><i class="fa-solid fa-check"></i></div>
                    <input type="checkbox" class="d-none service-checkbox" value="${s.serviceCode}" data-fee="${s.standardFee}" data-time="${s.estimatedTimeMin}" id="chk_${s.serviceCode}" ${isSelected ? 'checked' : ''}>
                    
                    <div class="d-flex align-items-center gap-3 pe-3">
                        <div style="width: 56px; height: 56px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background-color: #2a2a2a;">
                            <img src="${imageUrl}" 
                                 alt="${s.serviceName}" 
                                 style="width: 100%; height: 100%; object-fit: cover;"
                                 onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=400';">
                        </div>
                        <div class="flex-grow-1 min-w-0">
                            <span class="cat-badge mb-1 d-inline-block">${s.serviceCode}</span>
                            <h6 class="fw-bold text-white text-truncate mb-1 fs-7">${s.serviceName}</h6>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="text-muted fs-8"><i class="fa-regular fa-clock me-1"></i>${s.estimatedTimeMin} mins</span>
                                <span class="fw-bold fs-7" style="color: var(--emerald);">LKR ${parseFloat(s.standardFee).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    calculateTotal();
}

function toggleServiceCard(serviceCode) {
    const checkbox = document.getElementById(`chk_${serviceCode}`);
    const card = document.getElementById(`card_${serviceCode}`);

    checkbox.checked = !checkbox.checked;
    if (checkbox.checked) {
        card.classList.add('selected-card');
    } else {
        card.classList.remove('selected-card');
    }
    calculateTotal();
}

function calculateTotal() {
    const selectedBoxes = document.querySelectorAll('.service-checkbox:checked');
    let totalFee = 0;
    let totalTime = 0;

    selectedBoxes.forEach(cb => {
        totalFee += parseFloat(cb.getAttribute('data-fee'));
        totalTime += parseInt(cb.getAttribute('data-time'));
    });

    document.getElementById('totalEstCost').innerText = `LKR ${totalFee.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('totalEstTime').innerText = `${totalTime} mins`;
}

async function handleAppointmentSubmit(event) {
    event.preventDefault();

    const selectedServices = Array.from(document.querySelectorAll('.service-checkbox:checked')).map(cb => cb.value);
    if (selectedServices.length === 0) {
        alert("Please select at least one service.");
        return;
    }

    const payload = {
        userCode: document.getElementById('appUserCode').value,
        vehicleCode: document.getElementById('appVehicleSelect').value,
        appointmentDate: document.getElementById('appDate').value,
        appointmentTime: document.getElementById('appTime').value + ":00",
        serviceCodes: selectedServices,
        specialNotes: document.getElementById('appSpecialNotes').value
    };

    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/create`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok) {
            alert(result.message || "Appointment created successfully!");
            window.location.href = "my-appointments.html";
        } else {
            alert(result.message || "Operation failed.");
        }
    } catch (err) {
        console.error("Error creating appointment:", err);
    }
}