<script setup>
import { ref, onMounted, onUnmounted, reactive, useTemplateRef } from "vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import iCalendarPlugin from "@fullcalendar/icalendar";

import PasswordModal from "./modals/ModalPassword.vue";
import SettingsModal from "./modals/ModalSettings.vue";
import EventModal from "./modals/ModalEvent.vue";
import ConfirmModal from "./modals/ModalConfirm.vue";
import SetupPasswordModal from "./modals/ModalSetupPassword.vue";

import { useToast } from "../composables/useToast";
import { useAuthStore } from "../composables/useAuthStore.js";
import { useNotifications } from "../composables/useNotifications.js";

const toast = useToast();
const auth = useAuthStore();
const notifications = useNotifications();
const calendars = ref([]);
const notifiedEvents = ref(new Set());
let notificationInterval = null;

const calendarRef = useTemplateRef("calendarRef");
const eventSources = ref([]);

const showPasswordModal = ref(false);
const showSettingsModal = ref(false);
const showEventModal = ref(false);
const showSetupPasswordModal = ref(false);
const selectedEvent = ref(null);
const selectedEventCalendar = ref(null);
const settingsInitialTab = ref("calendars");

const confirmDialog = reactive({
    show: false,
    title: "",
    message: "",
    type: "default",
    confirmText: "Confirm",
    resolve: null,
    reject: () => {
        confirmDialog.show = false;
        confirmDialog.resolve = null;
        confirmDialog.reject = null;
    },
});

const viewMappings = {
    month: "dayGridMonth",
    week: "timeGridWeek",
    day: "timeGridDay",
    list: "listMonth",
};

const calendarOptions = ref({
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, iCalendarPlugin],
    initialView: getInitialView(),
    initialDate: getInitialDate(),
    firstDay: 1,
    headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth settingsButton",
    },
    customButtons: {
        settingsButton: {
            text: "settings",
            hint: "Manage Calendars",
            click: handleSettingsClick,
        },
    },
    height: "100%",
    nowIndicator: true,
    expandRows: true,
    editable: false,
    selectable: false,
    selectMirror: false,
    businessHours: {
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: "09:00",
        endTime: "17:00",
    },
    eventSources: [],
    eventClick: handleEventClick,
    eventSourceFailure: handleEventSourceFailure,
    datesSet: updateURL,
});

function getInitialView() {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get("view");
    return viewMappings[viewParam] || "timeGridWeek";
}

function getInitialDate() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("date") || undefined;
}

async function handleSettingsClick() {
    if (auth.isPasswordConfigured.value === false) {
        showSetupPasswordModal.value = true;
    } else {
        settingsInitialTab.value = auth.isAuthenticated.value ? "calendars" : "about";
        showSettingsModal.value = true;
    }
}

function handleShowPasswordModal() {
    showPasswordModal.value = true;
}

function handlePasswordConfigured() {
    showSetupPasswordModal.value = false;
    auth.setPasswordConfigured(true);
    showPasswordModal.value = true;
}

function handleEventClick(info) {
    info.jsEvent.preventDefault();

    if (
        !auth.isAuthenticated.value &&
        info.event.extendedProps &&
        !info.event.extendedProps.show_details_to_public
    ) {
        return;
    }

    const sourceCalendar = eventSources.value.find((es) => es.id == info.event.source.id);
    selectedEvent.value = info.event;
    selectedEventCalendar.value = sourceCalendar;
    showEventModal.value = true;
}

function closeEventModal() {
    showEventModal.value = false;
    selectedEvent.value = null;
    selectedEventCalendar.value = null;
}

function handleEventSourceFailure(error) {
    console.error("Calendar load failed:", error);
    toast.error("Failed to load calendar events");
}

async function handleAuthenticated() {
    showPasswordModal.value = false;
    const data = await auth.initialize();
    if (data.length) {
        calendars.value = data;
        updateCalendarSources(data);
    } else {
        await loadCalendars();
    }
    if (showSettingsModal.value) settingsInitialTab.value = "calendars";

    // Clear notified events and restart notification checker
    notifiedEvents.value.clear();
    startNotificationChecker();
}

function updateCalendarSources(calendarData) {
    const calendar = calendarRef.value?.getApi();
    if (!calendar) return;

    calendar.removeAllEventSources();
    eventSources.value = [];

    for (const cal of calendarData) {
        if (!cal?.id) continue;

        calendar.addEventSource({
            id: cal.id,
            events: cal.events || [],
            color: cal.color,
        });

        eventSources.value.push({
            id: cal.id,
            name: cal.name,
            color: cal.color,
        });
    }

    calendar.render();
}

async function loadCalendars() {
    try {
        const data = await auth.initialize();
        calendars.value = data;
        updateCalendarSources(data);

        // Clear notified events and restart notification checker
        notifiedEvents.value.clear();
        startNotificationChecker();
    } catch (error) {
        toast.error("Failed to load calendars");
    }
}

function updateURL() {
    const calendar = calendarRef.value.getApi();
    if (!calendar) return;

    const view = calendar.view;
    const date = calendar.getDate();
    const today = new Date().toISOString().split("T")[0];
    const currentDate = date.toISOString().split("T")[0];

    const viewName =
        Object.keys(viewMappings).find((key) => viewMappings[key] === view.type) || "week";

    const url = new URL(window.location);
    url.searchParams.set("view", viewName);

    if (currentDate !== today) {
        url.searchParams.set("date", currentDate);
    } else {
        url.searchParams.delete("date");
    }

    window.history.replaceState({}, "", url.toString());
}

function checkEventNotifications() {
    // Only check if authenticated and notifications are enabled
    if (!auth.isAuthenticated.value || !auth.notificationSettings.value?.enabled) {
        return;
    }

    const now = new Date();
    const leadTimeMs = (auth.notificationSettings.value.leadTime || 5) * 60 * 1000; // Convert minutes to ms

    for (const calendar of calendars.value) {
        // Skip if calendar doesn't have notifications enabled
        if (!calendar.enable_notifications) {
            continue;
        }

        // Skip if no events
        if (!calendar.events || !Array.isArray(calendar.events)) {
            continue;
        }

        for (const event of calendar.events) {
            // Skip if no start time or already notified
            if (!event.start || notifiedEvents.value.has(event.uid || event.id)) {
                continue;
            }

            const eventStart = new Date(event.start);
            const timeUntilEvent = eventStart.getTime() - now.getTime();

            // Check if event is starting soon (within lead time window)
            if (timeUntilEvent > 0 && timeUntilEvent <= leadTimeMs) {
                const minutesUntil = Math.ceil(timeUntilEvent / 60000);
                const message = `Starting in ${minutesUntil} min: ${event.title || "Untitled Event"}`;
                toast.info(message);

                // Show browser notification if permission granted
                if (notifications.isGranted.value) {
                    notifications.showBrowserNotification(event.title || "Untitled Event", {
                        body: `Starting in ${minutesUntil} minute${minutesUntil !== 1 ? "s" : ""}`,
                        tag: event.uid || event.id,
                    });
                }

                notifiedEvents.value.add(event.uid || event.id);
                continue;
            }

            // Check if event is starting now (within 1 minute window)
            if (timeUntilEvent >= -30000 && timeUntilEvent <= 30000) {
                const message = `Starting now: ${event.title || "Untitled Event"}`;
                toast.info(message);

                // Show browser notification if permission granted
                if (notifications.isGranted.value) {
                    notifications.showBrowserNotification(event.title || "Untitled Event", {
                        body: "Starting now",
                        tag: event.uid || event.id,
                    });
                }

                notifiedEvents.value.add(event.uid || event.id);
                continue;
            }

            // Check if event is currently happening
            const eventEnd = event.end ? new Date(event.end) : null;
            if (eventEnd && now >= eventStart && now < eventEnd) {
                // Only notify once when entering the event
                if (timeUntilEvent >= -60000) {
                    // Within 1 minute of start
                    const message = `Happening now: ${event.title || "Untitled Event"}`;
                    toast.info(message);

                    // Show browser notification if permission granted
                    if (notifications.isGranted.value) {
                        notifications.showBrowserNotification(event.title || "Untitled Event", {
                            body: "Happening now",
                            tag: event.uid || event.id,
                        });
                    }

                    notifiedEvents.value.add(event.uid || event.id);
                }
            }
        }
    }
}

function startNotificationChecker() {
    // Clear any existing interval
    stopNotificationChecker();

    // Only start if authenticated and notifications enabled
    if (!auth.isAuthenticated.value || !auth.notificationSettings.value?.enabled) {
        return;
    }

    // Run immediately
    checkEventNotifications();

    // Then run every 60 seconds
    notificationInterval = setInterval(checkEventNotifications, 60000);
}

function stopNotificationChecker() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
}

onMounted(async () => {
    const data = await auth.initialize();
    if (data.length) {
        calendars.value = data;
        updateCalendarSources(data);
    } else {
        await loadCalendars();
    }

    // Start notification checker if authenticated and enabled
    startNotificationChecker();
});

onUnmounted(() => {
    stopNotificationChecker();
});
</script>

<template>
    <main class="h-screen w-screen">
        <FullCalendar ref="calendarRef" :options="calendarOptions" />

        <PasswordModal
            v-if="showPasswordModal"
            @close="showPasswordModal = false"
            @authenticated="handleAuthenticated"
        />

        <SettingsModal
            v-if="showSettingsModal"
            @close="showSettingsModal = false"
            :calendars="calendars"
            :initial-tab="settingsInitialTab"
            :is-authenticated="auth.isAuthenticated.value"
            @calendar-updated="loadCalendars"
            @show-password-modal="handleShowPasswordModal"
            @auth-changed="loadCalendars"
        />

        <EventModal
            v-if="showEventModal"
            :event="selectedEvent"
            :calendar="selectedEventCalendar"
            @close="closeEventModal"
        />

        <ConfirmModal
            v-if="confirmDialog.show"
            :title="confirmDialog.title"
            :message="confirmDialog.message"
            :type="confirmDialog.type"
            :confirm-text="confirmDialog.confirmText"
            @confirm="confirmDialog.resolve"
            @cancel="confirmDialog.reject"
        />

        <SetupPasswordModal
            v-if="showSetupPasswordModal"
            @close="showSetupPasswordModal = false"
            @password-configured="handlePasswordConfigured"
        />
    </main>
</template>

<style>
.fc .fc-toolbar.fc-header-toolbar {
    padding-left: 10px;
    padding-top: 10px;
    padding-right: 10px;
}
</style>
