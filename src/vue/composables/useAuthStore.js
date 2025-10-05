import { api } from "../api.js";
import { reactive, toRef } from "vue";
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

    async function logout() {
        try {
            const result = await api.auth.logout();
            if (result.success) {
                state.isAuthenticated = false;
                state.isPasswordConfigured = null;
                state.cronSettings = null;

                toast.success(result.message || "Logged out successfully");
                return true;
            } else {
                toast.error(result.message || "Failed to logout");
                return false;
            }
        } catch (error) {
            toast.error("Logout error: " + error.message);
            return false;
        }
    }

    return {
        isAuthenticated: toRef(state, "isAuthenticated"),
        isPasswordConfigured: toRef(state, "isPasswordConfigured"),
        cronSettings: toRef(state, "cronSettings"),
        initialize,
        logout,
        setAuth: (value) => (state.isAuthenticated = value),
        setPasswordConfigured: (value) => (state.isPasswordConfigured = value),
    };
}
