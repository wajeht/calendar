<template>
    <div class="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-60 z-[3000]" @click="$emit('close')">
        <div class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-sm shadow-lg z-[3001] max-w-4xl w-[90%] max-h-[85vh] overflow-hidden text-[13px] leading-tight" @click.stop style="font-family: 'Lucida Grande', Helvetica, Arial, Verdana, sans-serif;">
            <div class="bg-gray-100 border-b border-gray-300 p-4 relative">
                <h2 class="m-0 text-base font-bold text-gray-800">Settings</h2>
                <button class="absolute top-1/2 right-4 transform -translate-y-1/2 bg-none border-none text-lg cursor-pointer text-gray-500 p-0 w-5 h-5 flex items-center justify-center hover:text-gray-800" @click="$emit('close')">&times;</button>
            </div>

            <div class="p-5 max-h-[calc(85vh-140px)] overflow-y-auto">
                <!-- Tab Navigation -->
                <div class="border-b border-gray-200 mb-6">
                    <nav class="-mb-px flex space-x-8">
                        <button
                            @click="activeTab = 'calendars'"
                            :class="[
                                'py-2 px-1 border-b-2 font-medium text-sm',
                                activeTab === 'calendars'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                            ]"
                        >
                            Calendars
                        </button>
                        <button
                            @click="activeTab = 'settings'"
                            :class="[
                                'py-2 px-1 border-b-2 font-medium text-sm',
                                activeTab === 'settings'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                            ]"
                        >
                            Settings
                        </button>
                    </nav>
                </div>

                <!-- Calendars Tab -->
                <div v-if="activeTab === 'calendars'">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-medium text-gray-900">Calendar Management</h3>
                        <button @click="showAddForm = true" class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-white bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-700 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-slate-800 hover:to-slate-700 hover:border-slate-700" style="font-family: inherit;">
                            Add Calendar
                        </button>
                    </div>

                    <!-- Add Calendar Form -->
                    <div v-if="showAddForm" class="bg-gray-50 p-4 rounded-lg mb-6">
                        <h4 class="text-md font-medium text-gray-900 mb-4">Add New Calendar</h4>
                        <form @submit.prevent="addCalendar">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="mb-4">
                                    <label class="block mb-1 font-bold text-gray-800 text-[13px]">Calendar Name <span class="text-red-500 ml-0.5 font-bold">*</span></label>
                                    <input
                                        v-model="newCalendar.name"
                                        type="text"
                                        class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-[13px] box-border focus:outline-none focus:border-blue-400 focus:shadow-[0_0_4px_rgba(102,175,233,0.6)]"
                                        required
                                        placeholder="My Calendar"
                                        style="font-family: inherit;"
                                    />
                                </div>
                                <div class="mb-4">
                                    <label class="block mb-1 font-bold text-gray-800 text-[13px]">Calendar URL <span class="text-red-500 ml-0.5 font-bold">*</span></label>
                                    <input
                                        v-model="newCalendar.url"
                                        type="url"
                                        class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-[13px] box-border focus:outline-none focus:border-blue-400 focus:shadow-[0_0_4px_rgba(102,175,233,0.6)]"
                                        required
                                        placeholder="https://example.com/calendar.ics"
                                        style="font-family: inherit;"
                                    />
                                </div>
                                <div class="mb-4">
                                    <label class="block mb-1 font-bold text-gray-800 text-[13px]">Color</label>
                                    <input
                                        v-model="newCalendar.color"
                                        type="color"
                                        class="w-full h-8 px-0.5 border border-gray-300 rounded-sm text-[13px] box-border focus:outline-none focus:border-blue-400 focus:shadow-[0_0_4px_rgba(102,175,233,0.6)]"
                                        style="font-family: inherit;"
                                    />
                                </div>
                                <div class="mb-4">
                                    <label class="cursor-pointer font-normal text-gray-800 text-[13px] leading-relaxed m-0 block">
                                        <input
                                            v-model="newCalendar.hideDetails"
                                            type="checkbox"
                                            class="mr-2 mt-0.5"
                                        />
                                        Hide event details
                                    </label>
                                </div>
                            </div>
                            <div class="flex gap-2 mt-4">
                                <button type="submit" class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-white bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-700 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-slate-800 hover:to-slate-700 hover:border-slate-700" style="font-family: inherit;">Add Calendar</button>
                                <button type="button" @click="cancelAdd" class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-gray-800 bg-gradient-to-b from-white to-gray-200 border border-gray-300 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-gray-200 hover:to-gray-300 hover:border-gray-400" style="font-family: inherit;">Cancel</button>
                            </div>
                        </form>
                    </div>

                    <!-- Calendar List -->
                    <div class="space-y-3">
                        <div
                            v-for="calendar in calendars"
                            :key="calendar.id"
                            class="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                        >
                            <div class="flex items-center space-x-3">
                                <div
                                    class="w-4 h-4 rounded-full"
                                    :style="{ backgroundColor: calendar.color }"
                                ></div>
                                <div>
                                    <h4 class="font-medium text-gray-900">{{ calendar.name }}</h4>
                                    <p class="text-sm text-gray-500">{{ calendar.url }}</p>
                                    <span
                                        v-if="calendar.hideDetails"
                                        class="text-xs text-yellow-600"
                                    >
                                        Details hidden
                                    </span>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button
                                    @click="editCalendar(calendar)"
                                    class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-white bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-700 cursor-pointer text-xs font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-slate-800 hover:to-slate-700 hover:border-slate-700"
                                    style="font-family: inherit;"
                                >
                                    Edit
                                </button>
                                <button
                                    @click="deleteCalendar(calendar)"
                                    class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-white bg-gradient-to-b from-red-500 to-red-700 border border-red-500 cursor-pointer text-xs font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-red-700 hover:to-red-500 hover:border-red-700"
                                    style="font-family: inherit;"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Edit Calendar Form -->
                    <div v-if="editingCalendar" class="bg-gray-50 p-4 rounded-lg mt-6">
                        <h4 class="text-md font-medium text-gray-900 mb-4">Edit Calendar</h4>
                        <form @submit.prevent="updateCalendar">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="mb-4">
                                    <label class="block mb-1 font-bold text-gray-800 text-[13px]">Calendar Name <span class="text-red-500 ml-0.5 font-bold">*</span></label>
                                    <input
                                        v-model="editingCalendar.name"
                                        type="text"
                                        class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-[13px] box-border focus:outline-none focus:border-blue-400 focus:shadow-[0_0_4px_rgba(102,175,233,0.6)]"
                                        required
                                        style="font-family: inherit;"
                                    />
                                </div>
                                <div class="mb-4">
                                    <label class="block mb-1 font-bold text-gray-800 text-[13px]">Calendar URL <span class="text-red-500 ml-0.5 font-bold">*</span></label>
                                    <input
                                        v-model="editingCalendar.url"
                                        type="url"
                                        class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-[13px] box-border focus:outline-none focus:border-blue-400 focus:shadow-[0_0_4px_rgba(102,175,233,0.6)]"
                                        required
                                        style="font-family: inherit;"
                                    />
                                </div>
                                <div class="mb-4">
                                    <label class="block mb-1 font-bold text-gray-800 text-[13px]">Color</label>
                                    <input
                                        v-model="editingCalendar.color"
                                        type="color"
                                        class="w-full h-8 px-0.5 border border-gray-300 rounded-sm text-[13px] box-border focus:outline-none focus:border-blue-400 focus:shadow-[0_0_4px_rgba(102,175,233,0.6)]"
                                        style="font-family: inherit;"
                                    />
                                </div>
                                <div class="mb-4">
                                    <label class="cursor-pointer font-normal text-gray-800 text-[13px] leading-relaxed m-0 block">
                                        <input
                                            v-model="editingCalendar.hideDetails"
                                            type="checkbox"
                                            class="mr-2 mt-0.5"
                                        />
                                        Hide event details
                                    </label>
                                </div>
                            </div>
                            <div class="flex gap-2 mt-4">
                                <button type="submit" class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-white bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-700 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-slate-800 hover:to-slate-700 hover:border-slate-700" style="font-family: inherit;">
                                    Update Calendar
                                </button>
                                <button type="button" @click="cancelEdit" class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-gray-800 bg-gradient-to-b from-white to-gray-200 border border-gray-300 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-gray-200 hover:to-gray-300 hover:border-gray-400" style="font-family: inherit;">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Import/Export Section -->
                    <div class="mt-8 pt-6 border-t border-gray-200">
                        <h4 class="text-md font-medium text-gray-900 mb-4">Import/Export</h4>
                        <div class="flex gap-4">
                            <button @click="exportCalendars" class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-white bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-700 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-slate-800 hover:to-slate-700 hover:border-slate-700" style="font-family: inherit;">
                                Export Settings
                            </button>
                            <div class="relative">
                                <input
                                    ref="importInput"
                                    type="file"
                                    accept=".json"
                                    @change="importCalendars"
                                    class="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <button class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-gray-800 bg-gradient-to-b from-white to-gray-200 border border-gray-300 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-gray-200 hover:to-gray-300 hover:border-gray-400" style="font-family: inherit;">Import Settings</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Settings Tab -->
                <div v-if="activeTab === 'settings'" class="space-y-6">
                    <div>
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Application Settings</h3>

                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h4 class="font-medium text-gray-900">Debug Mode</h4>
                                    <p class="text-sm text-gray-500">
                                        Enable console debug logging
                                    </p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input
                                        v-model="debugMode"
                                        type="checkbox"
                                        class="sr-only peer"
                                    />
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"
                                    ></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-gray-200">
                        <button @click="logout" class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-white bg-gradient-to-b from-red-500 to-red-700 border border-red-500 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-red-700 hover:to-red-500 hover:border-red-700" style="font-family: inherit;">Logout</button>
                    </div>
                </div>
            </div>

            <div class="bg-gray-100 border-t border-gray-300 p-4 text-right">
                <button @click="$emit('close')" class="relative inline-block px-3 py-1 ml-0 mr-1 leading-snug text-gray-800 bg-gradient-to-b from-white to-gray-200 border border-gray-300 cursor-pointer text-[13px] font-normal text-center align-middle whitespace-nowrap select-none rounded-sm hover:from-gray-200 hover:to-gray-300 hover:border-gray-400" style="font-family: inherit;">Close</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, watch } from "vue";
import { useToast } from "../toast";

const props = defineProps({
    calendars: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(["close", "calendar-updated"]);
const toast = useToast();

const activeTab = ref("calendars");
const showAddForm = ref(false);
const editingCalendar = ref(null);
const debugMode = ref(localStorage.getItem("calendar-debug") === "true");

const newCalendar = reactive({
    name: "",
    url: "",
    color: "#3b82f6",
    hideDetails: false,
});

function resetNewCalendar() {
    newCalendar.name = "";
    newCalendar.url = "";
    newCalendar.color = "#3b82f6";
    newCalendar.hideDetails = false;
}

function cancelAdd() {
    showAddForm.value = false;
    resetNewCalendar();
}

function editCalendar(calendar) {
    editingCalendar.value = { ...calendar };
}

function cancelEdit() {
    editingCalendar.value = null;
}

async function addCalendar() {
    try {
        const response = await fetch("/api/calendars", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newCalendar),
        });

        if (response.ok) {
            toast.success("Calendar added successfully");
            emit("calendar-updated");
            cancelAdd();
        } else {
            const error = await response.text();
            toast.error("Failed to add calendar: " + error);
        }
    } catch (error) {
        toast.error("Error adding calendar: " + error.message);
    }
}

async function updateCalendar() {
    try {
        const response = await fetch(`/api/calendars/${editingCalendar.value.id}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editingCalendar.value),
        });

        if (response.ok) {
            toast.success("Calendar updated successfully");
            emit("calendar-updated");
            cancelEdit();
        } else {
            const error = await response.text();
            toast.error("Failed to update calendar: " + error);
        }
    } catch (error) {
        toast.error("Error updating calendar: " + error.message);
    }
}

async function deleteCalendar(calendar) {
    if (!confirm(`Are you sure you want to delete "${calendar.name}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/calendars/${calendar.id}`, {
            method: "DELETE",
            credentials: "include",
        });

        if (response.ok) {
            toast.success("Calendar deleted successfully");
            emit("calendar-updated");
        } else {
            const error = await response.text();
            toast.error("Failed to delete calendar: " + error);
        }
    } catch (error) {
        toast.error("Error deleting calendar: " + error.message);
    }
}

function exportCalendars() {
    const settings = {
        calendars: props.calendars,
        exported: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], {
        type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `calendar-settings-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Settings exported successfully");
}

async function importCalendars(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const settings = JSON.parse(text);

        if (!settings.calendars || !Array.isArray(settings.calendars)) {
            throw new Error("Invalid settings file format");
        }

        const response = await fetch("/api/calendars/import", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ calendars: settings.calendars }),
        });

        if (response.ok) {
            toast.success("Settings imported successfully");
            emit("calendar-updated");
        } else {
            const error = await response.text();
            toast.error("Failed to import settings: " + error);
        }
    } catch (error) {
        toast.error("Error importing settings: " + error.message);
    }

    event.target.value = "";
}

async function logout() {
    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
        });

        if (response.ok) {
            toast.success("Logged out successfully");
            window.location.reload();
        } else {
            toast.error("Failed to logout");
        }
    } catch (error) {
        toast.error("Error during logout: " + error.message);
    }
}

function updateDebugMode() {
    if (debugMode.value) {
        localStorage.setItem("calendar-debug", "true");
    } else {
        localStorage.removeItem("calendar-debug");
    }
}

// Watch debug mode changes
watch(debugMode, updateDebugMode);
</script>
