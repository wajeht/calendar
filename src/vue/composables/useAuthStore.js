import { ref, reactive, toRef } from "vue";
import { api } from "../api.js";
import { useToast } from "./useToast.js";

const state = reactive({
    isAuthenticated: false,
    isPasswordConfigured: null,
    cronSettings: null,
});

export function useAuthStore() {
    const toast = useToast();

    async function initialize() {
        try {
            const result = await api.auth.me();
            if (result?.success) {
                state.isAuthenticated = Boolean(result.data.isAuthenticated);
                state.isPasswordConfigured = Boolean(result.data.isPasswordConfigured);
                state.cronSettings = result.data.cronSettings || null;
                return result.data.calendars || [];
            }
            return [];
        } catch (error) {
            toast.error("Failed to load app");
            return [];
        }
    }

    return {
        isAuthenticated: toRef(state, "isAuthenticated"),
        isPasswordConfigured: toRef(state, "isPasswordConfigured"),
        cronSettings: toRef(state, "cronSettings"),
        initialize,
        setAuth: (value) => (state.isAuthenticated = value),
        setPasswordConfigured: (value) => (state.isPasswordConfigured = value),
    };
}
