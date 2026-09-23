const APPOINTMENT_BASE_URL = "http://localhost:8080/api/v1/appointment";
const SERVICE_BASE_URL = "http://localhost:8080/api/v1/service";
const VEHICLE_BASE_URL = "http://localhost:8080/api/v1/vehicle";

document.addEventListener("DOMContentLoaded", async () => {

    const currentUserCode = localStorage.getItem("customerCode") || localStorage.getItem("userCode") || "";

    const userCodeInput = document.getElementById("appUserCode");
    if (userCodeInput) userCodeInput.value = currentUserCode;

    const dateInput = document.getElementById("appDate");
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute("min", today);
    }

    if (currentUserCode) {
        await loadCustomerVehicles(currentUserCode);
    } else {
        const select = document.getElementById('appVehicleSelect');
        if (select) {
            select.innerHTML = '<option value="" selected disabled>Please login to view vehicles</option>';
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const preSelectedCode = urlParams.get('serviceCode');
    await loadServices(preSelectedCode);
});

function getAuthHeader() {
    const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

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
    const select = document.getElementById('appVehicleSelect');
    if (!select) return;

    console.log("Fetching vehicles for customer/user code:", userCode);

    try {
        const res = await fetch(`${VEHICLE_BASE_URL}/get-by-customer/${userCode}`, {
            headers: getAuthHeader()
        });

        console.log("Vehicle Fetch HTTP Status:", res.status);

        if (res.ok) {
            const result = await res.json();
            console.log("Backend Response JSON:", result);

            const vehicles = result.body || result.data || result;

            if (!Array.isArray(vehicles) || vehicles.length === 0) {
                select.innerHTML = '<option value="" selected disabled>No vehicles found for this user</option>';
                return;
            }

            select.innerHTML = '<option value="" selected disabled>Choose a vehicle...</option>';
            vehicles.forEach(v => {
                const code = v.vehicleCode || v.id;
                const plate = v.licensePlate || v.vehicleNumber || code;
                const model = v.vehicleModel || v.model || '';

                select.innerHTML += `<option value="${code}">${plate} - ${model}</option>`;
            });
        } else {
            select.innerHTML = `<option value="" selected disabled>Error: ${res.status} ${res.statusText}</option>`;
        }
    } catch (err) {
        console.error("Vehicle fetch network error:", err);
        select.innerHTML = '<option value="" selected disabled>Network Error loading vehicles</option>';
    }
}

async function loadServices(preSelectedCode) {
    try {
        const res = await fetch(`${SERVICE_BASE_URL}/get-all`, { headers: getAuthHeader() });
        if (res.ok) {
            const result = await res.json();
            const services = result.body || result.data || result || [];
            renderServiceCards(services, preSelectedCode);
        }
    } catch (err) {
        console.error("Service fetch error:", err);
    }
}

function renderServiceCards(services, preSelectedCode) {
    const container = document.getElementById('servicesCardContainer');
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(services) || services.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted py-3">No active services available right now.</div>`;
        return;
    }

    services.forEach(s => {
        const isSelected = (preSelectedCode && s.serviceCode === preSelectedCode);
        const imageUrl = (s.imageUrl && s.imageUrl.trim() !== "")
            ? s.imageUrl
            : getServiceImage(s.serviceCode, s.serviceName);

        const fee = s.standardFee || 0;
        const time = s.estimatedTimeMin || s.estimatedTimeMins || 0;

        container.innerHTML += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="cat-card ${isSelected ? 'selected-card' : ''}" id="card_${s.serviceCode}" onclick="toggleServiceCard('${s.serviceCode}')">
                    <div class="card-select-badge"><i class="fa-solid fa-check"></i></div>
                    <input type="checkbox" class="d-none service-checkbox" value="${s.serviceCode}" data-fee="${fee}" data-time="${time}" id="chk_${s.serviceCode}" ${isSelected ? 'checked' : ''}>
                    
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
                                <span class="text-muted fs-8"><i class="fa-regular fa-clock me-1"></i>${time} mins</span>
                                <span class="fw-bold fs-7" style="color: var(--emerald, #10b981);">LKR ${parseFloat(fee).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
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

    if (checkbox && card) {
        checkbox.checked = !checkbox.checked;
        if (checkbox.checked) {
            card.classList.add('selected-card');
        } else {
            card.classList.remove('selected-card');
        }
        calculateTotal();
    }
}

function calculateTotal() {
    const selectedBoxes = document.querySelectorAll('.service-checkbox:checked');
    let totalFee = 0;
    let totalTime = 0;

    selectedBoxes.forEach(cb => {
        totalFee += parseFloat(cb.getAttribute('data-fee') || 0);
        totalTime += parseInt(cb.getAttribute('data-time') || 0);
    });

    const costElem = document.getElementById('totalEstCost');
    const timeElem = document.getElementById('totalEstTime');

    if (costElem) costElem.innerText = `LKR ${totalFee.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    if (timeElem) timeElem.innerText = `${totalTime} mins`;
}

async function handleAppointmentSubmit(event) {
    event.preventDefault();

    const selectedServices = Array.from(document.querySelectorAll('.service-checkbox:checked')).map(cb => cb.value);
    if (selectedServices.length === 0) {
        alert("Please select at least one service.");
        return;
    }

    const vehicleVal = document.getElementById('appVehicleSelect')?.value;
    if (!vehicleVal) {
        alert("Please select a vehicle.");
        return;
    }

    const rawTime = document.getElementById('appTime')?.value;
    const formattedTime = rawTime ? (rawTime.length === 5 ? `${rawTime}:00` : rawTime) : "";

    const payload = {
        userCode: document.getElementById('appUserCode')?.value || '',
        vehicleCode: vehicleVal,
        appointmentDate: document.getElementById('appDate')?.value || '',
        appointmentTime: formattedTime,
        serviceCodes: selectedServices,
        specialNotes: document.getElementById('appSpecialNotes')?.value || ''
    };

    try {
        const res = await fetch(`${APPOINTMENT_BASE_URL}/create`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok && (result.code === 201 || result.code === 200 || result.status === 201 || result.status === 200)) {
            alert(result.message || "Appointment created successfully!");
            window.location.href = "my-appointments.html";
        } else {
            alert(result.message || "Operation failed. Please check payload data.");
        }
    } catch (err) {
        console.error("Error creating appointment:", err);
        alert("Server network error!");
    }
}