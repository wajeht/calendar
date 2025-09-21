import { ref } from "vue";
import { useToast } from "./useToast";
import { api } from "../api.js";

const calendars = ref([]);
const isLoading = ref(false);

export function useCalendar() {
    const toast = useToast();

    async function getCalendars() {
        isLoading.value = true;
        try {
            const result = await api.calendar.get();
            if (result.success) {
                calendars.value = result.data;
                return result;
            } else {
                toast.error(result.message || "Failed to load calendars");
                return result;
            }
        } catch (error) {
            toast.error("Failed to load calendars: " + error.message);
            return { success: false, message: error.message, errors: null, data: null };
        } finally {
            isLoading.value = false;
        }
    }

    async function addCalendar(calendarData) {
        isLoading.value = true;
        try {
            const result = await api.calendar.create(calendarData);
            if (result.success) {
                toast.success(result.message || "Calendar added successfully");
                await getCalendars();
            } else {
                toast.error(result.message || "Failed to add calendar");
            }
            return result;
        } catch (error) {
            toast.error("Error adding calendar: " + error.message);
            return { success: false, message: error.message, errors: null, data: null };
        } finally {
            isLoading.value = false;
        }
    }

    async function updateCalendar(calendarId, calendarData) {
        isLoading.value = true;
        try {
            const result = await api.calendar.update(calendarId, calendarData);
            if (result.success) {
                toast.success(result.message || "Calendar updated successfully");
                await getCalendars();
                return result;
            } else {
                toast.error(result.message || "Failed to update calendar");
                return result;
            }
        } catch (error) {
            toast.error("Error updating calendar: " + error.message);
            return { success: false, message: error.message, errors: null, data: null };
        } finally {
            isLoading.value = false;
        }
    }

    async function deleteCalendar(calendarId) {
        isLoading.value = true;
        try {
            const result = await api.calendar.delete(calendarId);
            if (result.success) {
                toast.success(result.message || "Calendar deleted successfully");
                await getCalendars();
            } else {
                toast.error(result.message || "Failed to delete calendar");
            }
            return result;
        } catch (error) {
            toast.error("Error deleting calendar: " + error.message);
            return { success: false, message: error.message, errors: null, data: null };
        } finally {
            isLoading.value = false;
        }
    }

    async function importCalendars(calendarsList) {
        isLoading.value = true;
        try {
            const result = await api.calendar.import(calendarsList);
            if (result.success) {
                toast.success(result.message || "Settings imported successfully");
                await getCalendars();
            } else {
                toast.error(result.message || "Failed to import settings");
            }
            return result;
        } catch (error) {
            toast.error("Error importing settings: " + error.message);
            return { success: false, message: error.message, errors: null, data: null };
        } finally {
            isLoading.value = false;
        }
    }

    async function exportCalendars() {
        isLoading.value = true;
        try {
            const result = await api.calendar.export();
            if (result.success) {
                const blob = new Blob([JSON.stringify(result.data, null, 2)], {
                    type: "application/json",
                });

                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `calendar-settings-${new Date().toISOString().split("T")[0]}.json`;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(url);

                toast.success(result.message || "Settings exported successfully");
            } else {
                toast.error(result.message || "Failed to export settings");
            }
            return result;
        } catch (error) {
            toast.error("Error exporting settings: " + error.message);
            return { success: false, message: error.message, errors: null, data: null };
        } finally {
            isLoading.value = false;
        }
    }

    async function refreshCalendars() {
        isLoading.value = true;
        try {
            const result = await api.calendar.refresh();
            if (result.success) {
                const data = result.data;
                const successMsg = `Calendars refreshed: ${data.successful} successful, ${data.failed} failed`;
                toast.success(successMsg);
                await getCalendars();
                return result;
            } else {
                toast.error(result.message || "Failed to refresh calendars");
                return result;
            }
        } catch (error) {
            toast.error("Error refreshing calendars: " + error.message);
            return { success: false, message: error.message, errors: null, data: null };
        } finally {
            isLoading.value = false;
        }
    }

    return {
        calendars,
        isLoading,

        getCalendars,
        addCalendar,
        updateCalendar,
        deleteCalendar,
        importCalendars,
        exportCalendars,
        refreshCalendars,
    };
}
