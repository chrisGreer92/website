const adminBookingModal = document.getElementById('adminModal');
const adminCloseBtn = document.getElementById('closeAdminModal');
const adminSaveBtn = document.getElementById('saveAdminStatus');
const adminDeleteBtn = document.getElementById('deleteBookingBtn');
const adminStatus = document.getElementById('adminStatus');

function openAdminModal(event) {
    document.getElementById('adminSlotId').value = event.id;
    document.getElementById('adminName').textContent = event.extendedProps.name || '';
    document.getElementById('adminEmail').textContent = event.extendedProps.email || '';
    document.getElementById('adminPhone').textContent = event.extendedProps.phone || '';
    document.getElementById('adminTopic').textContent = event.extendedProps.topic || event.title;
    document.getElementById('adminNotes').textContent = event.extendedProps.notes || '';
    adminBookingModal.style.display = 'flex';
}

adminCloseBtn.addEventListener('click', () => {
    adminBookingModal.style.display = 'none';
});


adminSaveBtn.addEventListener('click', async () => {
    const slotId = document.getElementById('adminSlotId').value;
    const status = adminStatus.value;

    try {
        await sendJSON(`/booking/admin/${slotId}`, 'PATCH', { status });
        adminBookingModal.style.display = 'none';
        calendar.refetchEvents();
    } catch (err) {
        alert(`Failed to update status. ${err.message || err}`);
    }
});

adminDeleteBtn.addEventListener('click', async () => {
    const slotId = document.getElementById('adminSlotId').value;

    if (!confirm("Are you sure you want to delete this booking?")) return;

    try {
        await sendJSON(`/booking/admin/${slotId}`, 'DELETE');
        adminBookingModal.style.display = 'none';
        calendar.refetchEvents();
    } catch (err) {
        alert(`Failed to delete booking. ${err.message || err}`);
    }
});
