<script setup>
import { ref, reactive, useTemplateRef, onMounted, computed, watch, toRef } from "vue";
import { useToast } from "../../composables/useToast";
import { useAsyncData } from "../../composables/useAsyncData.js";
import { useAuthStore } from "../../composables/useAuthStore.js";
import { useTheme } from "../../composables/useTheme.js";
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
import FeedCalendarsModal from "./ModalFeedCalendars.vue";

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

const emit = defineEmits(["close", "calendar-updated", "show-password-modal", "auth-changed"]);
const toast = useToast();
const auth = useAuthStore();
const { theme, setTheme } = useTheme();
const isAuthenticated = toRef(props, "isAuthenticated");

const cronSettings = reactive({
    enabled: false,
    schedule: "0 */1 * * *",
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
            Object.assign(cronSettings, {
                ...result.data,
                schedule: result.data.schedule || "0 */1 * * *",
            });
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
    if (isSavingCron.value) {
        return;
    }

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

const feedToken = reactive({
    token: "",
    feedUrl: "",
    loading: false,
    regenerating: false,
    selectedCalendars: [],
    showCalendarPicker: false,
});

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
        const success = await auth.logout();
        if (success) {
            emit("auth-changed");
            emit("close");
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

async function loadFeedToken() {
    feedToken.loading = true;
    try {
        const result = await api.settings.getFeedToken();
        if (result.success) {
            feedToken.token = result.data.token;
            feedToken.feedUrl = window.location.origin + result.data.feedUrl;
            feedToken.selectedCalendars = result.data.calendars || [];
        } else {
            toast.error(result.message || "Failed to load feed URL");
        }
    } catch (error) {
        toast.error("Error loading feed URL: " + error.message);
    } finally {
        feedToken.loading = false;
    }
}

async function regenerateFeedToken() {
    if (feedToken.regenerating) return;

    feedToken.regenerating = true;
    try {
        const result = await api.settings.regenerateFeedToken();
        if (result.success) {
            feedToken.token = result.data.token;
            feedToken.feedUrl = window.location.origin + result.data.feedUrl;
            toast.success("Feed URL regenerated successfully");
        } else {
            toast.error(result.message || "Failed to regenerate feed URL");
        }
    } catch (error) {
        toast.error("Error regenerating feed URL: " + error.message);
    } finally {
        feedToken.regenerating = false;
    }
}

function copyFeedUrl() {
    navigator.clipboard.writeText(feedToken.feedUrl);
    toast.success("Feed URL copied to clipboard");
}

function handleFeedCalendarsUpdated(selectedIds) {
    feedToken.selectedCalendars = selectedIds;
    feedToken.showCalendarPicker = false;
}

const feedCalendarCount = computed(() => {
    if (feedToken.selectedCalendars.length === 0) {
        return "All calendars";
    }
    return `${feedToken.selectedCalendars.length} calendar${feedToken.selectedCalendars.length === 1 ? "" : "s"}`;
});

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
            Object.assign(cronSettings, {
                ...auth.cronSettings.value,
                schedule: auth.cronSettings.value.schedule || "0 */1 * * *",
            });
        } else {
            void getCronSettings();
        }
        void loadFeedToken();
    }
});

watch(isAuthenticated, (newValue) => {
    if (newValue) {
        if (auth.cronSettings.value) {
            Object.assign(cronSettings, {
                ...auth.cronSettings.value,
                schedule: auth.cronSettings.value.schedule || "0 */1 * * *",
            });
        } else {
            void getCronSettings();
        }
        void loadFeedToken();
    }
});
</script>

<template>
    <Modal title="Settings" size="large" :body-padding="false" @close="emit('close')">
        <!-- Vertical Layout Container -->
        <div class="flex h-[500px]">
            <!-- Sidebar Navigation -->
            <div
                class="w-36 border-r border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-900"
            >
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
                        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Calendars
                        </h3>
                        <Button variant="primary" @click="showAddModal = true">
                            Add Calendar
                        </Button>
                    </div>

                    <!-- Calendar List -->
                    <div class="space-y-4">
                        <div
                            class="h-[400px] overflow-y-auto border border-gray-200 rounded-lg bg-white dark:border-gray-600 dark:bg-gray-800"
                        >
                            <div class="overflow-x-hidden">
                                <table class="w-full table-fixed">
                                    <thead class="bg-gray-50 sticky top-0 z-10 dark:bg-gray-900">
                                        <tr>
                                            <th
                                                class="w-3/4 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                            >
                                                Calendar
                                            </th>
                                            <th
                                                class="w-1/4 px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                            >
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody
                                        class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700"
                                    >
                                        <tr
                                            v-for="calendar in calendars"
                                            :key="calendar.id"
                                            class="hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            <td class="px-4 py-4">
                                                <div class="flex items-start space-x-3">
                                                    <div
                                                        class="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                                                        :style="{ backgroundColor: calendar.color }"
                                                    ></div>
                                                    <div class="min-w-0 flex-1">
                                                        <div
                                                            class="font-medium text-gray-900 dark:text-gray-100"
                                                        >
                                                            {{ calendar.name }}
                                                        </div>
                                                        <div class="mt-2">
                                                            <span
                                                                v-if="!calendar.visible_to_public"
                                                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 whitespace-nowrap"
                                                            >
                                                                Hidden from Public
                                                            </span>
                                                            <span
                                                                v-else-if="
                                                                    !calendar.show_details_to_public
                                                                "
                                                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 whitespace-nowrap"
                                                            >
                                                                Details Hidden from Public
                                                            </span>
                                                            <span
                                                                v-else
                                                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 whitespace-nowrap"
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
                                                class="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
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
                        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Preferences
                        </h3>
                    </div>

                    <div class="space-y-6">
                        <!-- Appearance Section -->
                        <div class="space-y-4">
                            <h4 class="text-md font-medium text-gray-900 dark:text-gray-100">
                                Appearance
                            </h4>
                            <FormGroup label="Theme" input-id="theme-select">
                                <Select
                                    id="theme-select"
                                    :model-value="theme"
                                    @update:model-value="setTheme"
                                >
                                    <option value="system">System</option>
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                </Select>
                            </FormGroup>
                        </div>

                        <!-- Auto Refresh Section -->
                        <div class="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h4 class="text-md font-medium text-gray-900 dark:text-gray-100">
                                Auto Refresh
                            </h4>
                            <div>
                                <Checkbox
                                    id="enable-auto-refresh"
                                    v-model="cronSettings.enabled"
                                    label="Enable automatic calendar refresh"
                                    :disabled="isLoadingCron || isSavingCron"
                                    @update:modelValue="updateCronSettings"
                                />
                            </div>

                            <div v-if="cronSettings.enabled" class="space-y-4">
                                <FormGroup label="Refresh Schedule" input-id="refresh-schedule">
                                    <Select
                                        id="refresh-schedule"
                                        v-model="cronSettings.schedule"
                                        :disabled="isLoadingCron || isSavingCron"
                                        @update:modelValue="updateCronSettings"
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
                                    <div class="text-sm py-1.5 text-gray-600 dark:text-gray-400">
                                        {{ new Date(cronSettings.lastRun).toLocaleString() }}
                                    </div>
                                </FormGroup>
                            </div>
                        </div>

                        <!-- Manual Refresh Section -->
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h4 class="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                                Manual Refresh
                            </h4>
                            <Button
                                @click="refreshAllCalendars"
                                :loading="isRefreshing"
                                variant="primary"
                            >
                                Refresh All Calendars Now
                            </Button>
                        </div>

                        <!-- Import/Export Section -->
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h4 class="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                                Import/Export
                            </h4>
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

                        <!-- Calendar Feed Section -->
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h4 class="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">
                                Calendar Feed
                            </h4>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Subscribe to this URL in any calendar app to see your selected
                                calendars combined.
                            </p>

                            <div v-if="feedToken.loading" class="text-gray-500 dark:text-gray-400">
                                Loading feed URL...
                            </div>

                            <div v-else class="space-y-4">
                                <div>
                                    <label
                                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                                    >
                                        Feed URL
                                    </label>
                                    <div
                                        class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                                    >
                                        <code
                                            class="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 truncate select-all"
                                            :title="feedToken.feedUrl"
                                        >
                                            {{ feedToken.feedUrl }}
                                        </code>
                                        <Button
                                            @click="copyFeedUrl"
                                            variant="primary"
                                            size="small"
                                            class="flex-shrink-0"
                                        >
                                            Copy
                                        </Button>
                                    </div>
                                </div>

                                <div
                                    class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                                >
                                    <div>
                                        <span
                                            class="text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >
                                            Included Calendars
                                        </span>
                                        <p class="text-xs text-gray-500 dark:text-gray-400">
                                            {{ feedCalendarCount }}
                                        </p>
                                    </div>
                                    <Button
                                        @click="feedToken.showCalendarPicker = true"
                                        variant="default"
                                        size="small"
                                    >
                                        Select
                                    </Button>
                                </div>

                                <div
                                    class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                                >
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <span
                                                class="text-sm font-medium text-red-700 dark:text-red-400"
                                            >
                                                Regenerate URL
                                            </span>
                                            <p class="text-xs text-red-600 dark:text-red-400">
                                                This will invalidate the current URL
                                            </p>
                                        </div>
                                        <Button
                                            @click="regenerateFeedToken"
                                            :loading="feedToken.regenerating"
                                            variant="danger"
                                            size="small"
                                        >
                                            Regenerate
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Account Tab -->
                <div v-if="activeTab === 'account'" class="h-full overflow-y-auto space-y-6 p-6">
                    <!-- Password Change Section -->
                    <div>
                        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                            Account
                        </h3>
                        <form @submit.prevent="changePassword" class="space-y-4">
                            <!-- Hidden username field for password managers -->
                            <input
                                type="text"
                                name="username"
                                autocomplete="username"
                                value="admin"
                                readonly
                                aria-hidden="true"
                                tabindex="-1"
                                style="position: absolute; left: -9999px; width: 1px; height: 1px"
                            />

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
                                    autocomplete="current-password"
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
                                    autocomplete="new-password"
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
                                    autocomplete="new-password"
                                />
                            </FormGroup>

                            <Button
                                type="submit"
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
                        </form>
                    </div>
                </div>

                <!-- About Tab -->
                <div v-if="activeTab === 'about'" class="h-full overflow-y-auto space-y-6 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">About</h3>
                    </div>

                    <div class="space-y-6">
                        <div class="space-y-4">
                            <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                A web-based calendar application with multiple calendar source
                                support via iCal/WebCal URLs
                            </p>

                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                Questions or feedback?
                                <a
                                    href="mailto:github@jaw.dev"
                                    class="text-gray-800 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 underline"
                                >
                                    Drop me a line
                                </a>
                                or
                                <a
                                    href="https://github.com/wajeht/calendar/issues"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-gray-800 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 underline"
                                >
                                    create an issue
                                </a>
                                on
                                <a
                                    href="https://github.com/wajeht/calendar"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-gray-800 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 underline"
                                >
                                    Github
                                </a>
                            </p>

                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                Copyright © {{ copyRightYear }}. Made with ❤️ by
                                <a
                                    href="https://github.com/wajeht"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-gray-800 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 underline"
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

        <FeedCalendarsModal
            v-if="feedToken.showCalendarPicker"
            :calendars="calendars"
            :selected-calendars="feedToken.selectedCalendars"
            high-z-index
            @close="feedToken.showCalendarPicker = false"
            @calendars-updated="handleFeedCalendarsUpdated"
        />
    </Modal>
</template>
