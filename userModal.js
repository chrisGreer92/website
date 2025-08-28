const bookingModal = document.getElementById('bookingModal');
const closeModalBtn = document.getElementById('closeModal');
const bookingForm = document.getElementById('bookingForm');

function openUserModal(event) {
    document.getElementById('slotId').value = event.id;
    document.querySelector('#bookingForm input[name="topic"]').value =
        event.title !== 'Available' ? event.title : '';
    bookingModal.style.display = 'flex';
}

closeModalBtn.addEventListener('click', () => {
    bookingModal.style.display = 'none';
    bookingForm.reset();
});

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(bookingForm).entries());

    try {
        await sendJSON(API_BASE + "/booking/request/" + formData.slotId,
            'PATCH', {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            topic: formData.topic,
            notes: formData.notes
        });
        alert('Booking Requested!');
        bookingModal.style.display = 'none';
        bookingForm.reset();
        calendar.refetchEvents();
    } catch (err) {
        alert(`Failed to book slot. ${err.message || err}`);
    }
});
