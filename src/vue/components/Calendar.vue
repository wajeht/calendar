<script setup>
import { ref, onMounted, onUnmounted, reactive, useTemplateRef, defineAsyncComponent } from "vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import iCalendarPlugin from "@fullcalendar/icalendar";

const PasswordModal = defineAsyncComponent(() => import("./modals/ModalPassword.vue"));
const SettingsModal = defineAsyncComponent(() => import("./modals/ModalSettings.vue"));
const EventModal = defineAsyncComponent(() => import("./modals/ModalEvent.vue"));
const ConfirmModal = defineAsyncComponent(() => import("./modals/ModalConfirm.vue"));
const SetupPasswordModal = defineAsyncComponent(() => import("./modals/ModalSetupPassword.vue"));

import { useToast } from "../composables/useToast";
import { useAuthStore } from "../composables/useAuthStore.js";
import { useTheme } from "../composables/useTheme.js";
import { useLogger } from "../composables/useLogger.js";

const toast = useToast();
const logger = useLogger("Calendar");
const auth = useAuthStore();
const { initialize: initTheme } = useTheme();
const calendars = ref([]);

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
    auth.clearCache();
    const { calendars: data } = await auth.initialize();
    calendars.value = data;
    updateCalendarSources(data);
    if (showSettingsModal.value) settingsInitialTab.value = "calendars";
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

async function reloadCalendars() {
    try {
        const { calendars: data } = await auth.initialize();
        calendars.value = data;
        updateCalendarSources(data);
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

const lastKnownDate = ref(new Date().toISOString().split("T")[0]);
const midnightTimeout = ref(null);

function navigateToTodayIfNeeded(previousDate) {
    const calendar = calendarRef.value?.getApi();
    if (!calendar) return;

    // Only auto-navigate if no modals are open
    const isIdle =
        !showPasswordModal.value &&
        !showSettingsModal.value &&
        !showEventModal.value &&
        !showSetupPasswordModal.value &&
        !confirmDialog.show;

    if (isIdle) {
        const calendarDate = calendar.getDate().toISOString().split("T")[0];

        // If calendar was showing the previous date, navigate to new today
        if (calendarDate === previousDate) {
            calendar.today();
            updateURL();
        }
    }
}

function handleDateChange() {
    const currentDate = new Date().toISOString().split("T")[0];
    if (currentDate === lastKnownDate.value) return;

    const previousDate = lastKnownDate.value;
    lastKnownDate.value = currentDate;

    navigateToTodayIfNeeded(previousDate);
    scheduleMidnightUpdate();
}

function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
        handleDateChange();
    }
}

function scheduleMidnightUpdate() {
    if (midnightTimeout.value) clearTimeout(midnightTimeout.value);

    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 100); // 100ms after midnight

    const msUntilMidnight = midnight - now;
    midnightTimeout.value = setTimeout(handleDateChange, msUntilMidnight);
}

onMounted(async () => {
    logger.log("Mount started");
    const { calendars: data, fromCache, sync } = await auth.initialize();
    logger.log("Initialize done, fromCache:", fromCache, "calendars:", data.length);
    calendars.value = data;
    updateCalendarSources(data);
    initTheme();

    if (fromCache && sync) {
        logger.log("Showing sync toast and starting background sync");
        const syncToastId = toast.info("Syncing...", null, 0);
        const freshData = await sync();
        logger.log("Fresh data received, calendars:", freshData.length);
        calendars.value = freshData;
        updateCalendarSources(freshData);
        toast.removeToast(syncToastId);
        logger.log("Sync toast removed");
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleMidnightUpdate();
    logger.log("Mount complete");
});

onUnmounted(() => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (midnightTimeout.value) {
        clearTimeout(midnightTimeout.value);
        midnightTimeout.value = null;
    }
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
            @calendar-updated="reloadCalendars"
            @show-password-modal="handleShowPasswordModal"
            @auth-changed="reloadCalendars"
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
