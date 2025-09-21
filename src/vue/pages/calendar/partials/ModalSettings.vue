<script setup>
import { ref, reactive, watch, useTemplateRef, onMounted } from "vue";
import { useToast } from "../../../composables/useToast";
import { useAuth } from "../../../composables/useAuth.js";
import { useCalendar } from "../../../composables/useCalendar.js";
import { useSettings } from "../../../composables/useSettings.js";
import Modal from "../../../components/Modal.vue";
import FormGroup from "../../../components/FormGroup.vue";
import Input from "../../../components/Input.vue";
import Select from "../../../components/Select.vue";
import Button from "../../../components/Button.vue";
import Checkbox from "../../../components/Checkbox.vue";
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
const { logout, verifySession, changePassword: changePasswordComposable } = useAuth();
const {
    importCalendars: importCalendarsAPI,
    exportCalendars: exportCalendarsAPI,
    refreshCalendars,
} = useCalendar();
const {
    cronSettings,
    isLoading: isLoadingCron,
    getCronSettings,
    updateCronSettings,
} = useSettings();

const activeTab = ref("calendars");
const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const editingCalendar = ref(null);
const deletingCalendar = ref(null);
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

const isRefreshing = ref(false);
const isExporting = ref(false);
const isImporting = ref(false);

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

async function exportCalendars() {
    isExporting.value = true;
    try {
        await exportCalendarsAPI();
    } finally {
        isExporting.value = false;
    }
}

function triggerImport() {
    importInput.value.click();
}

async function importCalendars(event) {
    const file = event.target.files[0];
    if (!file) return;

    isImporting.value = true;
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
            throw new Error(result.message || "Failed to import calendars");
        }
    } catch (error) {
        if (error instanceof SyntaxError) {
            toast.error("Invalid JSON file format");
        } else {
            toast.error("Error importing settings: " + error.message);
        }
    } finally {
        isImporting.value = false;
        event.target.value = "";
    }
}

async function logoutUser() {
    await logout();
}

async function refreshAllCalendars() {
    isRefreshing.value = true;
    try {
        const result = await refreshCalendars();
        if (result.success) {
            emit("calendar-updated");
            await getCronSettings(); // Reload to get updated last run time
        }
    } finally {
        isRefreshing.value = false;
    }
}

async function changePassword() {
    passwordErrors.currentPassword = "";
    passwordErrors.newPassword = "";
    passwordErrors.confirmPassword = "";

    changingPassword.value = true;

    try {
        const result = await changePasswordComposable(
            passwordForm.currentPassword,
            passwordForm.newPassword,
            passwordForm.confirmPassword,
        );

        if (result.success) {
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
            }
        }
    } finally {
        changingPassword.value = false;
    }
}

onMounted(() => {
    getCronSettings();
});
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
                <button
                    @click="activeTab = 'account'"
                    :class="[
                        'py-2 px-1 border-b-2 font-medium text-sm',
                        activeTab === 'account'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    ]"
                >
                    Account
                </button>
            </nav>
        </div>

        <!-- Calendars Tab -->
        <div v-if="activeTab === 'calendars'" class="h-[500px] flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium text-gray-900">Calendar Management</h3>
                <Button variant="primary" @click="showAddModal = true"> Add Calendar </Button>
            </div>

            <!-- Calendar List -->
            <div class="flex-1 min-h-0 mb-6">
                <div class="h-full overflow-y-auto border border-gray-200 rounded-lg bg-white">
                    <div class="overflow-x-hidden">
                        <table class="w-full table-fixed">
                            <thead class="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th
                                        class="w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        Calendar
                                    </th>
                                    <th
                                        class="w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        URL
                                    </th>
                                    <th
                                        class="w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        Status
                                    </th>
                                    <th
                                        class="w-1/4 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                <tr
                                    v-for="calendar in calendars"
                                    :key="calendar.id"
                                    class="hover:bg-gray-50"
                                >
                                    <td class="px-4 py-4">
                                        <div class="flex items-center space-x-3">
                                            <div
                                                class="w-4 h-4 rounded-full flex-shrink-0"
                                                :style="{ backgroundColor: calendar.color }"
                                            ></div>
                                            <span class="font-medium text-gray-900">{{
                                                calendar.name
                                            }}</span>
                                        </div>
                                    </td>
                                    <td class="px-4 py-4">
                                        <span
                                            class="text-sm text-gray-500 truncate block"
                                            :title="calendar.url"
                                            >{{ calendar.url }}</span
                                        >
                                    </td>
                                    <td class="px-4 py-4">
                                        <span
                                            v-if="calendar.hidden"
                                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                                        >
                                            Hidden
                                        </span>
                                        <span
                                            v-else-if="calendar.details"
                                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                        >
                                            Details Hidden
                                        </span>
                                        <span
                                            v-else
                                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                        >
                                            Visible
                                        </span>
                                    </td>
                                    <td class="px-4 py-4 text-right">
                                        <div class="flex gap-2 justify-end">
                                            <Button
                                                @click="editCalendar(calendar)"
                                                variant="primary"
                                                size="small"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                @click="deleteCalendar(calendar)"
                                                variant="danger"
                                                size="small"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="calendars.length === 0">
                                    <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                                        No calendars configured. Click "Add Calendar" to get
                                        started.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Import/Export Section -->
            <div class="border-t border-gray-200 pt-4">
                <h4 class="text-md font-medium text-gray-900 mb-4">Import/Export</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                        @click="exportCalendars"
                        variant="primary"
                        :disabled="isExporting"
                        class="w-full"
                    >
                        {{ isExporting ? "Exporting..." : "Export Settings" }}
                    </Button>
                    <Button
                        @click="triggerImport"
                        variant="default"
                        :disabled="isImporting"
                        class="w-full"
                    >
                        {{ isImporting ? "Importing..." : "Import Settings" }}
                    </Button>
                    <input
                        ref="importInput"
                        type="file"
                        accept=".json"
                        @change="importCalendars"
                        class="hidden"
                    />
                </div>
            </div>
        </div>

        <!-- Settings Tab -->
        <div v-if="activeTab === 'settings'" class="h-[500px] overflow-y-auto space-y-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium text-gray-900">Settings Management</h3>
            </div>

            <div class="space-y-6">
                <!-- Auto Refresh Section -->
                <div class="space-y-4">
                    <div>
                        <Checkbox
                            v-model="cronSettings.enabled"
                            label="Enable automatic calendar refresh"
                            :disabled="isLoadingCron"
                            @change="updateCronSettings"
                        />
                    </div>

                    <div v-if="cronSettings.enabled" class="space-y-4">
                        <FormGroup label="Refresh Schedule">
                            <Select
                                v-model="cronSettings.schedule"
                                @change="updateCronSettings"
                                :disabled="isLoadingCron"
                            >
                                <option value="0 */1 * * *">Every hour</option>
                                <option value="0 */2 * * *">Every 2 hours</option>
                                <option value="0 */4 * * *">Every 4 hours</option>
                                <option value="0 */6 * * *">Every 6 hours</option>
                                <option value="0 */12 * * *">Every 12 hours</option>
                                <option value="0 0 * * *">Daily</option>
                            </Select>
                        </FormGroup>

                        <FormGroup v-if="cronSettings.lastRun" label="Last Run">
                            <div class="text-sm py-1.5 text-gray-600">
                                {{ new Date(cronSettings.lastRun).toLocaleString() }}
                            </div>
                        </FormGroup>
                    </div>
                </div>

                <!-- Manual Refresh Section -->
                <div class="border-t border-gray-200 pt-4">
                    <h4 class="text-md font-medium text-gray-900 mb-4">Manual Refresh</h4>
                    <Button @click="refreshAllCalendars" :disabled="isRefreshing" variant="primary">
                        {{ isRefreshing ? "Refreshing..." : "Refresh All Calendars Now" }}
                    </Button>
                </div>
            </div>
        </div>

        <!-- Account Tab -->
        <div v-if="activeTab === 'account'" class="h-[500px] overflow-y-auto space-y-6">
            <!-- Password Change Section -->
            <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                <div class="space-y-4">
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

            <!-- Logout Section -->
            <div class="pt-6 border-t border-gray-200">
                <h4 class="text-md font-medium text-gray-900 mb-4">Account Actions</h4>
                <Button @click="logoutUser" class="w-[134px]" variant="danger">Logout</Button>
            </div>
        </div>

        <template #footer>
            <Button @click="emit('close')">Close</Button>
        </template>

        <!-- Separate Modals with Higher Z-Index -->
        <AddCalendarModal
            v-if="showAddModal"
            high-z-index
            @close="showAddModal = false"
            @calendar-added="handleCalendarAdded"
        />

        <EditCalendarModal
            v-if="showEditModal && editingCalendar"
            :calendar="editingCalendar"
            high-z-index
            @close="
                showEditModal = false;
                editingCalendar = null;
            "
            @calendar-updated="handleCalendarUpdated"
        />

        <DeleteCalendarModal
            v-if="showDeleteModal && deletingCalendar"
            :calendar="deletingCalendar"
            high-z-index
            @close="
                showDeleteModal = false;
                deletingCalendar = null;
            "
            @calendar-deleted="handleCalendarDeleted"
        />
    </Modal>
</template>
