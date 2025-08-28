const API_BASE = "https://bookingsystem.fly.dev";
let ADMIN_AUTH = null; //Will be saved when logged in
let ADMIN_MODE = false; // i.e. ?admin=true or not

document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');

    const params = new URLSearchParams(location.search);
    
    ADMIN_MODE = (params.get('admin') === 'true');
    ADMIN_AUTH = sessionStorage.getItem('ADMIN_AUTH');

    //Button prompts admin mode login
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {

            if (ADMIN_MODE) {
                ADMIN_AUTH = null;
                sessionStorage.removeItem('ADMIN_AUTH');
                const url = new URL(window.location.href);
                url.searchParams.delete('admin');
                window.location.href = url.toString();
                return;
            }

            const u = prompt("Admin username:");
            if (!u) return;
            const p = prompt("Admin password:");
            if (p == null) return;

            ADMIN_AUTH = "Basic " + btoa(u + ":" + p);
            sessionStorage.setItem('ADMIN_AUTH', ADMIN_AUTH);

            // Force admin=true in the URL and reload
            const url = new URL(window.location.href);
            url.searchParams.set('admin', 'true');
            window.location.href = url.toString();
        });
    }

    const getURL = ADMIN_MODE
        ? API_BASE + "/booking/admin?showPast=true&deleted=false&sort=startTime" //Admin gets specific (may tweak)
        : API_BASE + "/booking/public"; //Public gets the hardcoded return

    const statusColors = {
        available: '#007bff',
        pending: '#800080',
        confirmed: '#3CB043',
        rejected: '#ff0000',
        cancelled: '#000000'
    };

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        height: 'auto',
        allDaySlot: false,
        slotMinTime: "09:00:00",
        slotMaxTime: "19:00:00",
        firstDay: 1,
        hiddenDays: [0, 6], // Hides Sat & Sun
        buttonText: { today: 'This Week' },

        //Can click and drag to create events (if in as admin)
        selectable: ADMIN_MODE,
        selectMirror: ADMIN_MODE,

        events: async (fetchInfo, successCallback, failureCallback) => {
            try {
                const headers = ADMIN_MODE && ADMIN_AUTH ? { Authorization: ADMIN_AUTH } : {};
                const res = await fetch(getURL, { headers });
                // const res = await fetch(getURL);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const bookings = await res.json();

                const events = bookings.map(b => {
                    const statusLower = b.status.toLowerCase();
                    const statusFormatted = statusLower.charAt(0).toUpperCase() + statusLower.slice(1);

                    return {
                        id: b.id,
                        title: b.topic ? b.topic : statusFormatted,
                        start: b.startTime,
                        end: b.endTime,
                        color: statusColors[statusLower] || '#808080',
                        //Props for admin
                        extendedProps: {
                            status: b.status,
                            name: b.name,
                            email: b.email,
                            phone: b.phone,
                            topic: b.topic,
                            notes: b.notes
                        }
                    };
                });

                console.log('Loaded events:', events);
                successCallback(events);
            } catch (err) {
                console.error('Error fetching bookings', err);
                failureCallback(err);
            }
        },

        // Click and drag to create slots
        select: async function(info) {
            console.log('Clicked');
            if (!ADMIN_MODE) return; // only allow for admin

            const options = {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };

            const startReadable = new Date(info.startStr).toLocaleString(undefined, options);
            const endReadable   = new Date(info.endStr).toLocaleString(undefined, options);

            if (!confirm(`Create Available slot?:\nStart: ${startReadable}\nEnd:   ${endReadable}`)) {
                calendar.unselect();
                return;
            }

            try {
                await sendJSON(API_BASE + "/booking/admin", 'POST', {
                    startTime: info.startStr,
                    endTime: info.endStr
                });
                calendar.refetchEvents();
            } catch (err) {
                alert(`Failed to create slot. ${err.message || err}`);
            } finally {
                calendar.unselect();
            }
        },

        eventClick: function (info) {
            if (ADMIN_MODE) {
                openAdminModal(info.event); //adminModal.js
            } else {
                openUserModal(info.event); //userModal.js
            }
        }

    });
    window.calendar = calendar;
    calendar.render();

});

// Shared JSON helper (admin & user can reuse)
async function sendJSON(url, method, payload) {

    const headers = { 'Content-Type': 'application/json' };
    if (ADMIN_MODE && ADMIN_AUTH) headers['Authorization'] = ADMIN_AUTH;

    const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const errorJson = await res.json();
            const firstKey = Object.keys(errorJson)[0];
            if (firstKey) msg = errorJson[firstKey];
        } catch {
            msg = await res.text();
        }
        throw new Error(msg);
    }
    return res.json().catch(() => ({}));
}
