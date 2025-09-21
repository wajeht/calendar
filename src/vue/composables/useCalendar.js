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
            const data = await api.calendar.get();
            calendars.value = data;
            return { success: true, data };
        } catch (error) {
            toast.error("Failed to load calendars");
            return { success: false, message: error.message };
        } finally {
            isLoading.value = false;
        }
    }

    async function addCalendar(calendarData) {
        isLoading.value = true;
        try {
            const result = await api.calendar.create(calendarData);
            if (result.success) {
                toast.success("Calendar added successfully");
                await getCalendars();
            } else {
                toast.error("Failed to add calendar: " + (result.message || "Unknown error"));
            }
            return result;
        } catch (error) {
            toast.error("Error adding calendar: " + error.message);
            return { success: false, message: error.message };
        } finally {
            isLoading.value = false;
        }
    }

    async function updateCalendar(calendarId, calendarData) {
        isLoading.value = true;
        try {
            const result = await api.calendar.update(calendarId, calendarData);
            if (result.success) {
                toast.success("Calendar updated successfully");
                await getCalendars();
            } else {
                toast.error("Failed to update calendar: " + (result.message || "Unknown error"));
            }
            return result;
        } catch (error) {
            toast.error("Error updating calendar: " + error.message);
            return { success: false, message: error.message };
        } finally {
            isLoading.value = false;
        }
    }

    async function deleteCalendar(calendarId) {
        isLoading.value = true;
        try {
            const result = await api.calendar.delete(calendarId);
            if (result.success) {
                toast.success("Calendar deleted successfully");
                await getCalendars();
            } else {
                toast.error("Failed to delete calendar: " + (result.message || "Unknown error"));
            }
            return result;
        } catch (error) {
            toast.error("Error deleting calendar: " + error.message);
            return { success: false, message: error.message };
        } finally {
            isLoading.value = false;
        }
    }

    async function importCalendars(calendarsList) {
        isLoading.value = true;
        try {
            const result = await api.calendar.import(calendarsList);
            if (result.success) {
                toast.success("Settings imported successfully");
                await getCalendars();
            } else {
                toast.error("Failed to import settings: " + (result.message || "Unknown error"));
            }
            return result;
        } catch (error) {
            toast.error("Error importing settings: " + error.message);
            return { success: false, message: error.message };
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

                toast.success("Settings exported successfully");
            } else {
                toast.error("Failed to export settings: " + (result.message || "Unknown error"));
            }
            return result;
        } catch (error) {
            toast.error("Error exporting settings: " + error.message);
            return { success: false, message: error.message };
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
    };
}
