<script setup>
import { ref, reactive, watch } from "vue";
import { useToast } from "../composables/useToast";
import { useAuth } from "../composables/useAuth.js";
import { useCalendar } from "../composables/useCalendar.js";
import Modal from "./ui/modal/Modal.vue";
import FormGroup from "./ui/FormGroup.vue";
import Input from "./ui/Input.vue";
import Button from "./ui/Button.vue";
import Checkbox from "./ui/Checkbox.vue";

const props = defineProps({
    calendars: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(["close", "calendar-updated"]);
const toast = useToast();
const { logout } = useAuth();
const {
    addCalendar: addCalendarAPI,
    updateCalendar: updateCalendarAPI,
    deleteCalendar: deleteCalendarAPI,
    importCalendars: importCalendarsAPI,
    exportCalendars: exportCalendarsAPI,
    isLoading,
} = useCalendar();

const activeTab = ref("calendars");
const showAddForm = ref(false);
const editingCalendar = ref(null);
const debugMode = ref(localStorage.getItem("calendar-debug") === "true");

const newCalendar = reactive({
    name: "",
    url: "",
    color: "#3b82f6",
    hidden: false,
});

function resetNewCalendar() {
    newCalendar.name = "";
    newCalendar.url = "";
    newCalendar.color = "#3b82f6";
    newCalendar.hidden = false;
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
    const result = await addCalendarAPI(newCalendar);
    if (result.success) {
        emit("calendar-updated");
        cancelAdd();
    }
}

async function updateCalendar() {
    const result = await updateCalendarAPI(editingCalendar.value.id, editingCalendar.value);
    if (result.success) {
        emit("calendar-updated");
        cancelEdit();
    }
}

async function deleteCalendar(calendar) {
    if (!confirm(`Are you sure you want to delete "${calendar.name}"?`)) {
        return;
    }

    const result = await deleteCalendarAPI(calendar.id);
    if (result.success) {
        emit("calendar-updated");
    }
}

function exportCalendars() {
    exportCalendarsAPI();
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

        const result = await importCalendarsAPI(settings.calendars);
        if (result.success) {
            emit("calendar-updated");
        }
    } catch (error) {
        toast.error("Error importing settings: " + error.message);
    }

    event.target.value = "";
}

async function logoutUser() {
    await logout();
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

<template>
    <Modal title="Settings" size="large" @close="$emit('close')">
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
                <Button variant="primary" @click="showAddForm = true"> Add Calendar </Button>
            </div>

            <!-- Add Calendar Form -->
            <div v-if="showAddForm" class="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 class="text-md font-medium text-gray-900 mb-4">Add New Calendar</h4>
                <form @submit.prevent="addCalendar">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormGroup label="Calendar Name" required>
                            <Input
                                v-model="newCalendar.name"
                                type="text"
                                placeholder="My Calendar"
                                required
                            />
                        </FormGroup>
                        <FormGroup label="Calendar URL" required>
                            <Input
                                v-model="newCalendar.url"
                                type="url"
                                placeholder="https://example.com/calendar.ics"
                                required
                            />
                        </FormGroup>
                        <FormGroup label="Color">
                            <Input v-model="newCalendar.color" type="color" />
                        </FormGroup>
                        <FormGroup>
                            <Checkbox
                                v-model="newCalendar.hidden"
                                label="Hide event details"
                            />
                        </FormGroup>
                    </div>
                    <div class="flex gap-2 mt-4">
                        <Button type="submit" variant="primary">Add Calendar</Button>
                        <Button type="button" @click="cancelAdd">Cancel</Button>
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
                            <span v-if="calendar.hidden" class="text-xs text-yellow-600">
                                Details hidden
                            </span>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <Button @click="editCalendar(calendar)" variant="primary" size="small">
                            Edit
                        </Button>
                        <Button @click="deleteCalendar(calendar)" variant="danger" size="small">
                            Delete
                        </Button>
                    </div>
                </div>
            </div>

            <!-- Edit Calendar Form -->
            <div v-if="editingCalendar" class="bg-gray-50 p-4 rounded-lg mt-6">
                <h4 class="text-md font-medium text-gray-900 mb-4">Edit Calendar</h4>
                <form @submit.prevent="updateCalendar">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormGroup label="Calendar Name" required>
                            <Input v-model="editingCalendar.name" type="text" required />
                        </FormGroup>
                        <FormGroup label="Calendar URL" required>
                            <Input v-model="editingCalendar.url" type="url" required />
                        </FormGroup>
                        <FormGroup label="Color">
                            <Input v-model="editingCalendar.color" type="color" />
                        </FormGroup>
                        <FormGroup>
                            <Checkbox
                                v-model="editingCalendar.hidden"
                                label="Hide event details"
                            />
                        </FormGroup>
                    </div>
                    <div class="flex gap-2 mt-4">
                        <Button type="submit" variant="primary"> Update Calendar </Button>
                        <Button type="button" @click="cancelEdit"> Cancel </Button>
                    </div>
                </form>
            </div>

            <!-- Import/Export Section -->
            <div class="mt-8 pt-6 border-t border-gray-200">
                <h4 class="text-md font-medium text-gray-900 mb-4">Import/Export</h4>
                <div class="flex gap-4">
                    <Button @click="exportCalendars" variant="primary"> Export Settings </Button>
                    <div class="relative">
                        <input
                            ref="importInput"
                            type="file"
                            accept=".json"
                            @change="importCalendars"
                            class="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Button>Import Settings</Button>
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
                            <p class="text-sm text-gray-500">Enable console debug logging</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input v-model="debugMode" type="checkbox" class="sr-only peer" />
                            <div
                                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"
                            ></div>
                        </label>
                    </div>
                </div>
            </div>

            <div class="pt-6 border-t border-gray-200">
                <Button @click="logoutUser" variant="danger">Logout</Button>
            </div>
        </div>

        <template #footer>
            <Button @click="$emit('close')">Close</Button>
        </template>
    </Modal>
</template>
