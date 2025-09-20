import { ref } from "vue";
import { useToast } from "./useToast";

export function useCalendar() {
    const toast = useToast();
    const calendars = ref([]);
    const isLoading = ref(false);

    async function getCalendars() {
        isLoading.value = true;
        try {
            const response = await fetch("/api/calendars", {
                credentials: "include",
            });

            if (!response.ok) {
                console.error("Failed to fetch calendars:", response.status);
                return { success: false, data: [] };
            }

            const calendarData = await response.json();
            calendars.value = calendarData;
            return { success: true, data: calendarData };
        } catch (error) {
            console.error("Error loading calendars:", error);
            toast.error("Failed to load calendars");
            return { success: false, error: error.message };
        } finally {
            isLoading.value = false;
        }
    }

    async function addCalendar(calendarData) {
        isLoading.value = true;
        try {
            const response = await fetch("/api/calendars", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: calendarData.name,
                    url: calendarData.url,
                    color: calendarData.color,
                    hidden: calendarData.hidden || false
                }),
            });

            if (response.ok) {
                toast.success("Calendar added successfully");
                await getCalendars();
                return { success: true };
            } else {
                const error = await response.text();
                toast.error("Failed to add calendar: " + error);
                return { success: false, error };
            }
        } catch (error) {
            const errorMessage = "Error adding calendar: " + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            isLoading.value = false;
        }
    }

    async function updateCalendar(calendarId, calendarData) {
        isLoading.value = true;
        try {
            const response = await fetch(`/api/calendars/${calendarId}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: calendarData.name,
                    url: calendarData.url,
                    color: calendarData.color,
                    hidden: calendarData.hidden
                }),
            });

            if (response.ok) {
                toast.success("Calendar updated successfully");
                await getCalendars();
                return { success: true };
            } else {
                const error = await response.text();
                toast.error("Failed to update calendar: " + error);
                return { success: false, error };
            }
        } catch (error) {
            const errorMessage = "Error updating calendar: " + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            isLoading.value = false;
        }
    }

    async function deleteCalendar(calendarId) {
        isLoading.value = true;
        try {
            const response = await fetch(`/api/calendars/${calendarId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.ok) {
                toast.success("Calendar deleted successfully");
                await getCalendars();
                return { success: true };
            } else {
                const error = await response.text();
                toast.error("Failed to delete calendar: " + error);
                return { success: false, error };
            }
        } catch (error) {
            const errorMessage = "Error deleting calendar: " + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            isLoading.value = false;
        }
    }

    async function importCalendars(calendarsList) {
        isLoading.value = true;
        try {
            const response = await fetch("/api/calendars/import", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ calendars: calendarsList }),
            });

            if (response.ok) {
                toast.success("Settings imported successfully");
                await getCalendars();
                return { success: true };
            } else {
                const error = await response.text();
                toast.error("Failed to import settings: " + error);
                return { success: false, error };
            }
        } catch (error) {
            const errorMessage = "Error importing settings: " + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            isLoading.value = false;
        }
    }

    function exportCalendars() {
        try {
            if (!calendars.value || calendars.value.length === 0) {
                toast.warning("No calendars to export");
                return { success: false, error: "No calendars to export" };
            }

            const settings = {
                calendars: calendars.value,
                exported: new Date().toISOString(),
            };

            const blob = new Blob([JSON.stringify(settings, null, 2)], {
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
            return { success: true };
        } catch (error) {
            const errorMessage = "Error exporting settings: " + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
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
