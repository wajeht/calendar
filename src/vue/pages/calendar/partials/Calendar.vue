<script setup>
import { ref, onMounted, onUnmounted, reactive, useTemplateRef } from "vue";
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

import { useToast } from "../../../composables/useToast";
import { useAuth } from "../../../composables/useAuth.js";
import { useCalendar } from "../../../composables/useCalendar.js";

const toast = useToast();
const { isAuthenticated, verifySession } = useAuth();
const { calendars, getCalendars } = useCalendar();

const calendarRef = useTemplateRef("calendarRef");
const eventSources = ref([]);

const showPasswordModal = ref(false);
const showSettingsModal = ref(false);
const showEventModal = ref(false);
const selectedEvent = ref(null);
const selectedEventCalendar = ref(null);

const confirmDialog = reactive({
    show: false,
    title: "",
    message: "",
    type: "default",
    confirmText: "Confirm",
    resolve: null,
    reject: null,
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
    loading: handleLoading,
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

function handleAuthenticated() {
    showPasswordModal.value = false;
    loadCalendars();
}

async function loadCalendars() {
    const result = await getCalendars();

    if (!result.success || !result.data || result.data.length === 0) {
        console.debug("No calendars to load");
        return;
    }

    const calendar = calendarRef.value.getApi();
    calendar.removeAllEventSources();
    eventSources.value = [];

    for (const cal of result.data) {
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

function handleKeydown(e) {
    if (e.key === "Escape") {
        if (showEventModal.value) closeEventModal();
        else if (showSettingsModal.value) showSettingsModal.value = false;
        else if (showPasswordModal.value) showPasswordModal.value = false;
        else if (confirmDialog.show) confirmDialog.reject();
    }
}

onMounted(async () => {
    document.addEventListener("keydown", handleKeydown);
    await verifySession();
    await loadCalendars();
    toast.info("Calendar loaded successfully");
});

onUnmounted(() => {
    document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
    <div class="h-screen w-screen">
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
            @calendar-updated="loadCalendars"
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
    </div>
</template>
