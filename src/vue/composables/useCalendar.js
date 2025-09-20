import { ref } from 'vue';
import { useToast } from './useToast';

export function useCalendar() {
    const toast = useToast();
    const calendars = ref([]);
    const isLoading = ref(false);

    // Get all calendars
    async function getCalendars() {
        isLoading.value = true;
        try {
            const response = await fetch('/api/calendars', {
                credentials: 'include',
            });

            if (!response.ok) {
                console.error('Failed to fetch calendars:', response.status);
                return { success: false, data: [] };
            }

            const calendarData = await response.json();
            calendars.value = calendarData;
            return { success: true, data: calendarData };
        } catch (error) {
            console.error('Error loading calendars:', error);
            toast.error('Failed to load calendars');
            return { success: false, error: error.message };
        } finally {
            isLoading.value = false;
        }
    }

    // Add new calendar
    async function addCalendar(calendarData) {
        isLoading.value = true;
        try {
            const response = await fetch('/api/calendars', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(calendarData),
            });

            if (response.ok) {
                toast.success('Calendar added successfully');
                await getCalendars(); // Refresh the list
                return { success: true };
            } else {
                const error = await response.text();
                toast.error('Failed to add calendar: ' + error);
                return { success: false, error };
            }
        } catch (error) {
            const errorMessage = 'Error adding calendar: ' + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            isLoading.value = false;
        }
    }

    // Update existing calendar
    async function updateCalendar(calendarId, calendarData) {
        isLoading.value = true;
        try {
            const response = await fetch(`/api/calendars/${calendarId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(calendarData),
            });

            if (response.ok) {
                toast.success('Calendar updated successfully');
                await getCalendars(); // Refresh the list
                return { success: true };
            } else {
                const error = await response.text();
                toast.error('Failed to update calendar: ' + error);
                return { success: false, error };
            }
        } catch (error) {
            const errorMessage = 'Error updating calendar: ' + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            isLoading.value = false;
        }
    }

    // Delete calendar
    async function deleteCalendar(calendarId) {
        isLoading.value = true;
        try {
            const response = await fetch(`/api/calendars/${calendarId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (response.ok) {
                toast.success('Calendar deleted successfully');
                await getCalendars(); // Refresh the list
                return { success: true };
            } else {
                const error = await response.text();
                toast.error('Failed to delete calendar: ' + error);
                return { success: false, error };
            }
        } catch (error) {
            const errorMessage = 'Error deleting calendar: ' + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            isLoading.value = false;
        }
    }

    // Import calendars
    async function importCalendars(calendarsList) {
        isLoading.value = true;
        try {
            const response = await fetch('/api/calendars/import', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ calendars: calendarsList }),
            });

            if (response.ok) {
                toast.success('Settings imported successfully');
                await getCalendars(); // Refresh the list
                return { success: true };
            } else {
                const error = await response.text();
                toast.error('Failed to import settings: ' + error);
                return { success: false, error };
            }
        } catch (error) {
            const errorMessage = 'Error importing settings: ' + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            isLoading.value = false;
        }
    }

    // Export calendars
    function exportCalendars() {
        const settings = {
            calendars: calendars.value,
            exported: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(settings, null, 2)], {
            type: 'application/json',
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `calendar-settings-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success('Settings exported successfully');
        return { success: true };
    }

    return {
        // State
        calendars,
        isLoading,

        // Methods
        getCalendars,
        addCalendar,
        updateCalendar,
        deleteCalendar,
        importCalendars,
        exportCalendars,
    };
}