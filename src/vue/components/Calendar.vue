<script setup>
import { ref, onMounted, reactive } from "vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import iCalendarPlugin from "@fullcalendar/icalendar";

import PasswordModal from "./PasswordModal.vue";
import SettingsModal from "./SettingsModal.vue";
import EventModal from "./EventModal.vue";
import ConfirmModal from "./ConfirmModal.vue";

import { useToast } from "../toast";

const toast = useToast();

// Reactive state
const calendarRef = ref();
const calendars = ref([]);
const eventSources = ref([]);
const isAuthenticated = ref(false);

// Modal states
const showPasswordModal = ref(false);
const showSettingsModal = ref(false);
const showEventModal = ref(false);
const selectedEvent = ref(null);
const selectedEventCalendar = ref(null);

// Confirm dialog
const confirmDialog = reactive({
    show: false,
    title: "",
    message: "",
    type: "default",
    confirmText: "Confirm",
    resolve: null,
    reject: null,
});

// View mappings for URL params
const viewMappings = {
    month: "dayGridMonth",
    week: "timeGridWeek",
    day: "timeGridDay",
    list: "listMonth",
};

// FullCalendar options
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
    loading: handleLoading,
    eventSourceFailure: handleEventSourceFailure,
    datesSet: handleDatesSet,
});

// Get initial view from URL params
function getInitialView() {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get("view");
    return viewMappings[viewParam] || "timeGridWeek";
}

// Get initial date from URL params
function getInitialDate() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("date") || undefined;
}

// Event handlers
function handleSettingsClick() {
    if (isAuthenticated.value) {
        showSettingsModal.value = true;
    } else {
        showPasswordModal.value = true;
    }
}

function handleEventClick(info) {
    info.jsEvent.preventDefault();

    if (info.event.extendedProps && info.event.extendedProps.isDetailHidden) {
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

function handleLoading(isLoading) {
    if (isLoading) {
        console.debug("Loading calendar...");
    }
}

function handleEventSourceFailure(error) {
    console.error("Calendar load failed:", error);
    toast.error("Failed to load calendar events");
}

function handleDatesSet() {
    updateURL();
}

function handleAuthenticated() {
    isAuthenticated.value = true;
    showPasswordModal.value = false;
    loadCalendars();
    toast.success("Logged in successfully");
}

// API functions
async function checkAuthStatus() {
    try {
        const response = await fetch("/api/auth/verify", {
            method: "GET",
            credentials: "include",
        });

        isAuthenticated.value = response.ok;
    } catch (error) {
        isAuthenticated.value = false;
        console.error("Auth check failed:", error);
    }
}

async function loadCalendars() {
    try {
        const response = await fetch("/api/calendars", {
            credentials: "include",
        });

        if (!response.ok) {
            console.error("Failed to fetch calendars:", response.status);
            return;
        }

        const calendarData = await response.json();
        calendars.value = calendarData;

        if (!calendarData || calendarData.length === 0) {
            console.debug("No calendars to load");
            return;
        }

        // Update FullCalendar event sources
        const calendar = calendarRef.value.getApi();
        calendar.removeAllEventSources();
        eventSources.value = [];

        for (const cal of calendarData) {
            if (!cal || !cal.id) continue;

            const events = cal.events || [];

            const source = {
                id: cal.id,
                events: events,
                color: cal.color,
            };

            calendar.addEventSource(source);

            eventSources.value.push({
                id: cal.id,
                name: cal.name,
                color: cal.color,
            });
        }
    } catch (error) {
        console.error("Error loading calendars:", error);
        toast.error("Failed to load calendars");
    }
}

function updateURL() {
    const calendar = calendarRef.value.getApi();
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

// Confirm helper
function confirm(message, title = "Confirm", type = "default", confirmText = "Confirm") {
    return new Promise((resolve) => {
        confirmDialog.show = true;
        confirmDialog.title = title;
        confirmDialog.message = message;
        confirmDialog.type = type;
        confirmDialog.confirmText = confirmText;
        confirmDialog.resolve = () => {
            confirmDialog.show = false;
            resolve(true);
        };
        confirmDialog.reject = () => {
            confirmDialog.show = false;
            resolve(false);
        };
    });
}

// Keyboard handler
function handleKeydown(e) {
    if (e.key === "Escape") {
        if (showEventModal.value) closeEventModal();
        else if (showSettingsModal.value) showSettingsModal.value = false;
        else if (showPasswordModal.value) showPasswordModal.value = false;
        else if (confirmDialog.show) confirmDialog.reject();
    }
}

// Initialize
onMounted(async () => {
    document.addEventListener("keydown", handleKeydown);
    await checkAuthStatus();
    await loadCalendars();
    toast.info("Calendar loaded successfully");
});
</script>

<template>
    <div class="h-screen w-screen">
        <FullCalendar ref="calendarRef" :options="calendarOptions" />

        <!-- Password Modal -->
        <PasswordModal
            v-if="showPasswordModal"
            @close="showPasswordModal = false"
            @authenticated="handleAuthenticated"
        />

        <!-- Settings Modal -->
        <SettingsModal
            v-if="showSettingsModal"
            @close="showSettingsModal = false"
            :calendars="calendars"
            @calendar-updated="loadCalendars"
        />

        <!-- Event Modal -->
        <EventModal
            v-if="showEventModal"
            :event="selectedEvent"
            :calendar="selectedEventCalendar"
            @close="closeEventModal"
        />

        <!-- Confirm Modal -->
        <ConfirmModal
            v-if="confirmDialog.show"
            :title="confirmDialog.title"
            :message="confirmDialog.message"
            :type="confirmDialog.type"
            :confirm-text="confirmDialog.confirmText"
            @confirm="confirmDialog.resolve"
            @cancel="confirmDialog.reject"
        />
    </div>
</template>
