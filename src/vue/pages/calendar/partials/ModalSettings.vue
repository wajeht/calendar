<script setup>
import { ref, reactive, watch, useTemplateRef } from "vue";
import { useToast } from "../../../composables/useToast";
import { useAuth } from "../../../composables/useAuth.js";
import { useCalendar } from "../../../composables/useCalendar.js";
import { api } from "../../../api.js";
import Modal from "../../../components/Modal.vue";
import FormGroup from "../../../components/FormGroup.vue";
import Input from "../../../components/Input.vue";
import Button from "../../../components/Button.vue";
import AddCalendarModal from "./ModalAddCalendar.vue";
import EditCalendarModal from "./ModalEditCalendar.vue";
import DeleteCalendarModal from "./ModalDeleteCalendar.vue";

const props = defineProps({
    calendars: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(["close", "calendar-updated"]);
const toast = useToast();
const { logout, verifySession } = useAuth();
const { importCalendars: importCalendarsAPI, exportCalendars: exportCalendarsAPI } = useCalendar();

const activeTab = ref("calendars");
const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const editingCalendar = ref(null);
const deletingCalendar = ref(null);
const debugMode = ref(localStorage.getItem("calendar-debug") === "true");
const importInput = useTemplateRef("importInput");

const passwordForm = reactive({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
});
const changingPassword = ref(false);

const passwordErrors = reactive({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
});

function editCalendar(calendar) {
    editingCalendar.value = calendar;
    showEditModal.value = true;
}

function deleteCalendar(calendar) {
    deletingCalendar.value = calendar;
    showDeleteModal.value = true;
}

function handleCalendarAdded() {
    emit("calendar-updated");
    showAddModal.value = false;
}

function handleCalendarUpdated() {
    emit("calendar-updated");
    showEditModal.value = false;
    editingCalendar.value = null;
}

function handleCalendarDeleted() {
    emit("calendar-updated");
    showDeleteModal.value = false;
    deletingCalendar.value = null;
}

function exportCalendars() {
    exportCalendarsAPI();
}

async function importCalendars(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        if (!file.name.endsWith(".json")) {
            throw new Error("Please select a JSON file");
        }

        if (file.size > 1024 * 1024) {
            throw new Error("File size too large. Please select a file under 1MB");
        }

        const text = await file.text();
        const settings = JSON.parse(text);

        if (!settings.calendars || !Array.isArray(settings.calendars)) {
            throw new Error("Invalid settings file format. Expected a 'calendars' array");
        }

        const result = await importCalendarsAPI(settings.calendars);
        if (result.success) {
            emit("calendar-updated");
            toast.success("Settings imported successfully");
        } else {
            throw new Error(result.error || "Failed to import calendars");
        }
    } catch (error) {
        if (error instanceof SyntaxError) {
            toast.error("Invalid JSON file format");
        } else {
            toast.error("Error importing settings: " + error.message);
        }
    } finally {
        event.target.value = "";
    }
}

async function logoutUser() {
    await logout();
}

async function changePassword() {
    passwordErrors.currentPassword = "";
    passwordErrors.newPassword = "";
    passwordErrors.confirmPassword = "";

    changingPassword.value = true;

    try {
        const result = await api.settings.changePassword(
            passwordForm.currentPassword,
            passwordForm.newPassword,
            passwordForm.confirmPassword,
        );

        if (result.success) {
            toast.success("Password changed successfully");
            passwordForm.currentPassword = "";
            passwordForm.newPassword = "";
            passwordForm.confirmPassword = "";
            await verifySession();
        } else {
            if (result.errors) {
                Object.keys(result.errors).forEach((field) => {
                    if (passwordErrors.hasOwnProperty(field)) {
                        passwordErrors[field] = result.errors[field];
                    }
                });
            } else {
                toast.error(result.message || "Failed to change password");
            }
        }
    } catch (error) {
        toast.error("Failed to change password");
    } finally {
        changingPassword.value = false;
    }
}

function updateDebugMode() {
    if (debugMode.value) {
        localStorage.setItem("calendar-debug", "true");
    } else {
        localStorage.removeItem("calendar-debug");
    }
}

watch(debugMode, updateDebugMode);
</script>

<template>
    <Modal title="Settings" size="large" @close="emit('close')">
        <!-- Tab Navigation -->
        <div class="border-b border-gray-200 mb-4">
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
                <Button variant="primary" @click="showAddModal = true"> Add Calendar </Button>
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
                            <div class="flex flex-wrap gap-3 mt-1">
                                <span v-if="calendar.hidden" class="text-xs text-red-500">
                                    Calendar Hidden
                                </span>
                                <span v-if="calendar.details" class="text-xs text-gray-500">
                                    Details Hidden
                                </span>
                            </div>
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

            <!-- Password Change Section -->
            <div class="pt-6 border-t border-gray-200">
                <h4 class="font-medium text-gray-900 mb-4">Change Password</h4>
                <div class="space-y-4 max-w-md">
                    <FormGroup
                        label="Current Password"
                        required
                        input-id="currentPassword"
                        :error="passwordErrors.currentPassword"
                    >
                        <Input
                            id="currentPassword"
                            v-model="passwordForm.currentPassword"
                            type="password"
                            placeholder="Enter current password"
                            required
                        />
                    </FormGroup>

                    <FormGroup
                        label="New Password"
                        required
                        input-id="newPassword"
                        :error="passwordErrors.newPassword"
                    >
                        <Input
                            id="newPassword"
                            v-model="passwordForm.newPassword"
                            type="password"
                            placeholder="Enter new password (min 8 characters)"
                            required
                        />
                    </FormGroup>

                    <FormGroup
                        label="Confirm New Password"
                        required
                        input-id="confirmNewPassword"
                        :error="passwordErrors.confirmPassword"
                    >
                        <Input
                            id="confirmNewPassword"
                            v-model="passwordForm.confirmPassword"
                            type="password"
                            placeholder="Confirm new password"
                            required
                        />
                    </FormGroup>

                    <Button
                        @click="changePassword"
                        :disabled="
                            changingPassword ||
                            !passwordForm.currentPassword ||
                            !passwordForm.newPassword ||
                            !passwordForm.confirmPassword
                        "
                        variant="primary"
                    >
                        {{ changingPassword ? "Changing..." : "Change Password" }}
                    </Button>
                </div>
            </div>

            <div class="pt-6 border-t border-gray-200">
                <Button @click="logoutUser" variant="danger">Logout</Button>
            </div>
        </div>

        <template #footer>
            <Button @click="emit('close')">Close</Button>
        </template>

        <!-- Separate Modals -->
        <AddCalendarModal
            v-if="showAddModal"
            @close="showAddModal = false"
            @calendar-added="handleCalendarAdded"
        />

        <EditCalendarModal
            v-if="showEditModal && editingCalendar"
            :calendar="editingCalendar"
            @close="
                showEditModal = false;
                editingCalendar = null;
            "
            @calendar-updated="handleCalendarUpdated"
        />

        <DeleteCalendarModal
            v-if="showDeleteModal && deletingCalendar"
            :calendar="deletingCalendar"
            @close="
                showDeleteModal = false;
                deletingCalendar = null;
            "
            @calendar-deleted="handleCalendarDeleted"
        />
    </Modal>
</template>
