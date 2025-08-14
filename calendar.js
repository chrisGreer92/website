document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        height: 'auto',
        allDaySlot: false,
        slotMinTime: "09:00:00",
        slotMaxTime: "19:00:00",
        firstDay: 1,
        hiddenDays: [0, 6], // Hides Sat & Sun
        buttonText: { today: 'This Week' },

        events: async (fetchInfo, successCallback, failureCallback) => {
            try {
                const res = await fetch('/booking?status=AVAILABLE&deleted=false&sort=startTime');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const bookings = await res.json();

                const events = bookings.map(b => ({
                    id: b.id,
                    title: b.topic || 'Available',
                    start: b.startTime,
                    end: b.endTime
                }));

                console.log('Loaded events:', events);
                successCallback(events);
            } catch (err) {
                console.error('Error fetching bookings', err);
                failureCallback(err);
            }
        },

        eventClick: function (info) {
            // Get relevent slot
            document.getElementById('slotId').value = info.event.id;
            document.querySelector('#bookingForm input[name="topic"]')
                .value = info.event.title !== 'Available' ? info.event.title : '';

            // Show Popover
            document.getElementById('bookingModal').style.display = 'flex';
        }
    });

    calendar.render();

    // Popover setup
    const bookingModal = document.getElementById('bookingModal');
    const closeModalBtn = document.getElementById('closeModal');
    const bookingForm = document.getElementById('bookingForm');

    // Close button
    closeModalBtn.addEventListener('click', function () {
        bookingModal.style.display = 'none';
        bookingForm.reset();
    });

    // Handle Request
    bookingForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = Object.fromEntries(new FormData(bookingForm).entries());

        try {
            const res = await fetch(`/booking/${formData.slotId}/request`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    topic: formData.topic,
                    notes: formData.notes
                })
            });

            // Handle backend and potential errors
            if (!res.ok) {
                let errorMessage = `HTTP ${res.status}`;
                try {
                    const errorJson = await res.json();
                    const firstKey = Object.keys(errorJson)[0];
                    if (firstKey) {
                        errorMessage = errorJson[firstKey];
                    }
                } catch {
                    errorMessage = await res.text();
                }
                console.error('Booking failed:', errorMessage);
                alert(`Failed to book slot.\n${errorMessage}`);
                return;
            }

            // Success!
            alert('Booking Requested!');
            bookingModal.style.display = 'none';
            bookingForm.reset();
            calendar.refetchEvents();

        } catch (err) {
            // Handle fetch/network errors
            console.error('Booking request error:', err);
            alert(`Failed to book slot. ${err.message || err}`);
        }
    });
});
