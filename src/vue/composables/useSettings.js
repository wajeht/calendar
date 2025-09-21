import { ref, reactive } from "vue";
import { useToast } from "./useToast";
import { api } from "../api.js";

export function useSettings() {
    const toast = useToast();
    const isLoading = ref(false);

    const cronSettings = reactive({
        enabled: false,
        schedule: "0 */2 * * *", // Every 2 hours
        status: "",
        lastRun: "",
    });

    async function getCronSettings() {
        isLoading.value = true;
        try {
            const result = await api.settings.getCronSettings();
            if (result.success) {
                Object.assign(cronSettings, result.data);
                return result;
            } else {
                toast.error(result.message || "Failed to load auto refresh settings");
                return result;
            }
        } catch (error) {
            toast.error("Error loading auto refresh settings: " + error.message);
            return { success: false, message: error.message, errors: null, data: null };
        } finally {
            isLoading.value = false;
        }
    }

    async function updateCronSettings() {
        isLoading.value = true;
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
            isLoading.value = false;
        }
    }

    return {
        cronSettings,
        isLoading,
        getCronSettings,
        updateCronSettings,
    };
}
