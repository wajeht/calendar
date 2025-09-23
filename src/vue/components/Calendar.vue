<script setup>
import { ref, onMounted, reactive, useTemplateRef } from "vue";
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
import { useAsyncData } from "../composables/useAsyncData.js";
import { api } from "../api.js";

const toast = useToast();
const calendars = ref([]);
const isAuthenticated = ref(false);

const calendarRef = useTemplateRef("calendarRef");
const eventSources = ref([]);

const showPasswordModal = ref(false);
const showSettingsModal = ref(false);
const showEventModal = ref(false);
const showSetupPasswordModal = ref(false);
const selectedEvent = ref(null);
const selectedEventCalendar = ref(null);
const isPasswordConfigured = ref(null); // null = checking, true = configured, false = not configured
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

async function handleSettingsClick() {
    if (isPasswordConfigured.value === false) {
        showSetupPasswordModal.value = true;
    } else {
        await verifySession();

        if (isAuthenticated.value) {
            settingsInitialTab.value = "calendars";
        } else {
            settingsInitialTab.value = "about";
        }
        showSettingsModal.value = true;
    }
}

function handleShowPasswordModal() {
    showPasswordModal.value = true;
}

const {
    data: passwordConfigResult,
    loading: passwordConfigLoading,
    refresh: fetchPasswordConfig,
} = useAsyncData(() => api.auth.isPasswordConfigured(), { immediate: false });

async function handlePasswordConfigurationCheck() {
    try {
        const result = await fetchPasswordConfig();
        if (result?.success) {
            isPasswordConfigured.value = result.data.configured;
        } else if (result) {
            console.error("Failed to check password configuration:", result.message);
            isPasswordConfigured.value = true;
        }
    } catch (error) {
        console.error("Error checking password configuration:", error);
        isPasswordConfigured.value = true;
    }
}

function handlePasswordConfigured() {
    showSetupPasswordModal.value = false;
    isPasswordConfigured.value = true;
    showPasswordModal.value = true;
}

function handleEventClick(info) {
    info.jsEvent.preventDefault();

    if (
        !isAuthenticated.value &&
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
    isAuthenticated.value = true;
    loadCalendars();

    // Keep settings modal open and refresh it to enable all tabs
    if (showSettingsModal.value) {
        settingsInitialTab.value = "calendars";
    }
}

const {
    data: verifyResult,
    loading: verifyLoading,
    refresh: runVerifySession,
} = useAsyncData(() => api.auth.verify(), { immediate: false });

async function verifySession() {
    try {
        const result = await runVerifySession();
        isAuthenticated.value = Boolean(result?.success);
    } catch (e) {
        isAuthenticated.value = false;
    }
}

const {
    data: calendarsResult,
    loading: calendarsLoading,
    refresh: fetchCalendars,
} = useAsyncData(() => api.calendar.get(), { immediate: false });

async function loadCalendars() {
    const result = await fetchCalendars();

    if (!result?.success || !result.data || result.data.length === 0) {
        console.debug("No calendars to load");
        calendars.value = [];
        const calendar = calendarRef.value.getApi();
        calendar.removeAllEventSources();
        eventSources.value = [];
        return;
    }

    const calendar = calendarRef.value.getApi();
    calendar.removeAllEventSources();
    eventSources.value = [];

    calendars.value = result.data;

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

onMounted(async () => {
    await handlePasswordConfigurationCheck();
    await loadCalendars();
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
            :is-authenticated="isAuthenticated"
            @calendar-updated="loadCalendars"
            @show-password-modal="handleShowPasswordModal"
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
