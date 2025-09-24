<script setup>
import { ref, reactive, useTemplateRef, onMounted, computed, watch, toRef } from "vue";
import { useToast } from "../../composables/useToast";
import { useAsyncData } from "../../composables/useAsyncData.js";
import { useAuthStore } from "../../composables/useAuthStore.js";
import { api } from "../../api.js";
import Modal from "../../components/Modal.vue";
import FormGroup from "../../components/FormGroup.vue";
import Input from "../../components/Input.vue";
import Select from "../../components/Select.vue";
import Button from "../../components/Button.vue";
import Checkbox from "../../components/Checkbox.vue";
import AddCalendarModal from "./ModalAddCalendar.vue";
import EditCalendarModal from "./ModalEditCalendar.vue";
import DeleteCalendarModal from "./ModalDeleteCalendar.vue";

const props = defineProps({
    calendars: {
        type: Array,
        default: () => [],
    },
    initialTab: {
        type: String,
        default: "calendars",
    },
    isAuthenticated: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["close", "calendar-updated", "show-password-modal"]);
const toast = useToast();
const auth = useAuthStore();
const isAuthenticated = toRef(props, "isAuthenticated");

const cronSettings = reactive({
    enabled: false,
    schedule: "0 */2 * * *",
    status: "",
    lastRun: "",
});

const { loading: isLoadingCron, refresh: fetchCronSettings } = useAsyncData(
    () => api.settings.getCronSettings(),
    { immediate: false },
);

async function getCronSettings() {
    try {
        const result = await fetchCronSettings();
        if (result && result.success) {
            Object.assign(cronSettings, result.data);
        } else if (result) {
            toast.error(result.message || "Failed to load auto refresh settings");
        }
        return result;
    } catch (error) {
        toast.error("Error loading auto refresh settings: " + error.message);
        return { success: false, message: error.message, errors: null, data: null };
    }
}

const isSavingCron = ref(false);
async function updateCronSettings() {
    isSavingCron.value = true;
    try {
        const result = await api.settings.updateCronSettings(
            cronSettings.enabled,
            cronSettings.schedule,
        );
        if (result.success) {
            toast.success(result.message || "Auto refresh settings updated");
            Object.assign(cronSettings, result.data);
            return result;
        } else {
            toast.error(result.message || "Failed to update auto refresh settings");
            return result;
        }
    } catch (error) {
        toast.error("Error updating auto refresh settings: " + error.message);
        return { success: false, message: error.message, errors: null, data: null };
    } finally {
        isSavingCron.value = false;
    }
}

const activeTab = ref(isAuthenticated.value ? props.initialTab : "about");
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
const { loading: isExporting, refresh: runExport } = useAsyncData(() => api.calendar.export(), {
    immediate: false,
});
const isImporting = ref(false);

const copyRightYear = computed(() => {
    return new Date().getFullYear();
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

async function exportCalendars() {
    try {
        const result = await runExport();
        if (result?.success) {
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
        } else if (result) {
            toast.error(result.message || "Failed to export settings");
        }
    } catch (error) {
        toast.error("Error exporting settings: " + error.message);
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

        const result = await api.calendar.import(settings.calendars);
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

const isLoggingOut = ref(false);
async function logoutUser() {
    isLoggingOut.value = true;
    try {
        const result = await api.auth.logout();
        if (result.success) {
            toast.success(result.message || "Logged out successfully");
            window.location.reload();
        } else {
            toast.error(result.message || "Failed to logout");
        }
    } catch (error) {
        toast.error("Logout error: " + error.message);
    } finally {
        isLoggingOut.value = false;
    }
}

async function refreshAllCalendars() {
    isRefreshing.value = true;
    try {
        const result = await api.calendar.refresh();
        if (result.success) {
            const data = result.data;
            toast.success(
                `Calendars refreshed: ${data.successful} successful, ${data.failed} failed`,
            );
            emit("calendar-updated");
            await getCronSettings(); // Reload to get updated last run time
        } else {
            toast.error(result.message || "Failed to refresh calendars");
        }
    } catch (error) {
        toast.error("Error refreshing calendars: " + error.message);
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
        const result = await api.auth.changePassword(
            passwordForm.currentPassword,
            passwordForm.newPassword,
            passwordForm.confirmPassword,
        );

        if (result.success) {
            passwordForm.currentPassword = "";
            passwordForm.newPassword = "";
            passwordForm.confirmPassword = "";
            await auth.initialize();
            toast.success(result.message || "Password changed successfully");
        } else {
            toast.error(result.message || "Failed to change password");
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

function handleTabClick(tabName) {
    if (!isAuthenticated.value && tabName !== "about") {
        return;
    }
    activeTab.value = tabName;
}

function handleLogin() {
    emit("show-password-modal");
}

onMounted(() => {
    if (isAuthenticated.value) {
        if (auth.cronSettings.value) {
            Object.assign(cronSettings, auth.cronSettings.value);
        } else {
            void getCronSettings();
        }
    }
});

watch(isAuthenticated, (newValue) => {
    if (newValue) {
        if (auth.cronSettings.value) {
            Object.assign(cronSettings, auth.cronSettings.value);
        } else {
            void getCronSettings();
        }
    }
});
</script>

<template>
    <Modal title="Settings" size="large" :body-padding="false" @close="emit('close')">
        <!-- Vertical Layout Container -->
        <div class="flex h-[500px]">
            <!-- Sidebar Navigation -->
            <div class="w-36 border-r border-gray-300 bg-gray-100">
                <nav class="py-4 pl-4 pr-3 space-y-2">
                    <Button
                        @click="handleTabClick('calendars')"
                        :variant="activeTab === 'calendars' ? 'primary' : 'default'"
                        :disabled="!isAuthenticated"
                        class="w-full justify-start !text-left !mr-0"
                    >
                        Calendars
                    </Button>
                    <Button
                        @click="handleTabClick('preferences')"
                        :variant="activeTab === 'preferences' ? 'primary' : 'default'"
                        :disabled="!isAuthenticated"
                        class="w-full justify-start !text-left !mr-0"
                    >
                        Preferences
                    </Button>
                    <Button
                        @click="handleTabClick('account')"
                        :variant="activeTab === 'account' ? 'primary' : 'default'"
                        :disabled="!isAuthenticated"
                        class="w-full justify-start !text-left !mr-0"
                    >
                        Account
                    </Button>
                    <Button
                        @click="handleTabClick('about')"
                        :variant="activeTab === 'about' ? 'primary' : 'default'"
                        class="w-full justify-start !text-left !mr-0"
                    >
                        About
                    </Button>
                    <Button
                        v-if="isAuthenticated"
                        @click="logoutUser"
                        variant="danger"
                        :loading="isLoggingOut"
                        class="w-full justify-start !text-left !mr-0"
                    >
                        Logout
                    </Button>
                    <Button
                        v-else
                        @click="handleLogin"
                        variant="default"
                        class="w-full justify-start !text-left !mr-0"
                    >
                        Login
                    </Button>
                </nav>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-hidden">
                <!-- Calendars Tab -->
                <div v-if="activeTab === 'calendars'" class="h-full overflow-y-auto space-y-6 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-medium text-gray-900">Calendars</h3>
                        <Button variant="primary" @click="showAddModal = true">
                            Add Calendar
                        </Button>
                    </div>

                    <!-- Calendar List -->
                    <div class="space-y-4">
                        <div
                            class="h-[400px] overflow-y-auto border border-gray-200 rounded-lg bg-white"
                        >
                            <div class="overflow-x-hidden">
                                <table class="w-full table-fixed">
                                    <thead class="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th
                                                class="w-3/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Calendar
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
                                                <div class="flex items-start space-x-3">
                                                    <div
                                                        class="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                                                        :style="{ backgroundColor: calendar.color }"
                                                    ></div>
                                                    <div class="min-w-0 flex-1">
                                                        <div class="font-medium text-gray-900">
                                                            {{ calendar.name }}
                                                        </div>
                                                        <div class="mt-2">
                                                            <span
                                                                v-if="!calendar.visible_to_public"
                                                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap"
                                                            >
                                                                Hidden from Public
                                                            </span>
                                                            <span
                                                                v-else-if="
                                                                    !calendar.show_details_to_public
                                                                "
                                                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap"
                                                            >
                                                                Details Hidden from Public
                                                            </span>
                                                            <span
                                                                v-else
                                                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap"
                                                            >
                                                                Visible to Public
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
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
                                            <td
                                                colspan="2"
                                                class="px-4 py-8 text-center text-gray-500"
                                            >
                                                No calendars configured. Click "Add Calendar" to get
                                                started.
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Preferences Tab -->
                <div
                    v-if="activeTab === 'preferences'"
                    class="h-full overflow-y-auto space-y-6 p-6"
                >
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-medium text-gray-900">Preferences</h3>
                    </div>

                    <div class="space-y-6">
                        <!-- Auto Refresh Section -->
                        <div class="space-y-4">
                            <h4 class="text-md font-medium text-gray-900">Auto Refresh</h4>
                            <div>
                                <Checkbox
                                    v-model="cronSettings.enabled"
                                    label="Enable automatic calendar refresh"
                                    :disabled="isLoadingCron || isSavingCron"
                                    @change="updateCronSettings"
                                />
                            </div>

                            <div v-if="cronSettings.enabled" class="space-y-4">
                                <FormGroup label="Refresh Schedule">
                                    <Select
                                        v-model="cronSettings.schedule"
                                        @change="updateCronSettings"
                                        :disabled="isLoadingCron || isSavingCron"
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
                            <Button
                                @click="refreshAllCalendars"
                                :loading="isRefreshing"
                                variant="primary"
                            >
                                Refresh All Calendars Now
                            </Button>
                        </div>

                        <!-- Import/Export Section -->
                        <div class="border-t border-gray-200 pt-4">
                            <h4 class="text-md font-medium text-gray-900 mb-4">Import/Export</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Button
                                    @click="exportCalendars"
                                    variant="primary"
                                    :loading="isExporting"
                                    class="w-full"
                                >
                                    Export Settings
                                </Button>
                                <Button
                                    @click="triggerImport"
                                    variant="default"
                                    :loading="isImporting"
                                    class="w-full"
                                >
                                    Import Settings
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
                </div>

                <!-- Account Tab -->
                <div v-if="activeTab === 'account'" class="h-full overflow-y-auto space-y-6 p-6">
                    <!-- Password Change Section -->
                    <div>
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Account</h3>
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
                                :loading="changingPassword"
                                :disabled="
                                    !passwordForm.currentPassword ||
                                    !passwordForm.newPassword ||
                                    !passwordForm.confirmPassword
                                "
                                variant="primary"
                            >
                                Change Password
                            </Button>
                        </div>
                    </div>
                </div>

                <!-- About Tab -->
                <div v-if="activeTab === 'about'" class="h-full overflow-y-auto space-y-6 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-medium text-gray-900">About</h3>
                    </div>

                    <div class="space-y-6">
                        <div class="space-y-4">
                            <p class="text-sm text-gray-600 leading-relaxed">
                                A web-based calendar application with multiple calendar source
                                support via iCal/WebCal URLs
                            </p>

                            <p class="text-sm text-gray-600">
                                Questions or feedback?
                                <a
                                    href="mailto:github@jaw.dev"
                                    class="text-gray-800 hover:text-gray-900 underline"
                                >
                                    Drop me a line
                                </a>
                                or
                                <a
                                    href="https://github.com/wajeht/calendar/issues"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-gray-800 hover:text-gray-900 underline"
                                >
                                    create an issue
                                </a>
                                on
                                <a
                                    href="https://github.com/wajeht/calendar"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-gray-800 hover:text-gray-900 underline"
                                >
                                    Github
                                </a>
                            </p>

                            <p class="text-sm text-gray-600">
                                Copyright © {{ copyRightYear }}. Made with ❤️ by
                                <a
                                    href="https://github.com/wajeht"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-gray-800 hover:text-gray-900 underline"
                                >
                                    @wajeht
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

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
