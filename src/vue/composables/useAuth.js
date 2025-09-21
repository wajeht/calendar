import { ref } from "vue";
import { useToast } from "./useToast";
import { api } from "../api.js";

const isAuthenticated = ref(false);
const isLoading = ref(false);

export function useAuth() {
    const toast = useToast();

    async function login(password) {
        isLoading.value = true;
        try {
            const result = await api.auth.login(password);
            if (result.success) {
                isAuthenticated.value = true;
                toast.success("Logged in successfully");
            } else {
                toast.error(result.message || "Invalid password");
            }
            return result;
        } catch (error) {
            toast.error("Authentication error: " + error.message);
            return { success: false, message: error.message };
        } finally {
            isLoading.value = false;
        }
    }

    async function logout(options = {}) {
        const { reload = true } = options;
        isLoading.value = true;
        try {
            const result = await api.auth.logout();
            if (result.success) {
                isAuthenticated.value = false;
                toast.success("Logged out successfully");
                if (reload) window.location.reload();
            } else {
                toast.error(result.message || "Failed to logout");
            }
            return result;
        } catch (error) {
            toast.error("Logout error: " + error.message);
            return { success: false, message: error.message };
        } finally {
            isLoading.value = false;
        }
    }

    async function verifySession() {
        try {
            const isValid = await api.auth.verify();
            isAuthenticated.value = isValid;
            return isValid;
        } catch (error) {
            isAuthenticated.value = false;
            console.error("Auth check failed:", error);
            return false;
        }
    }

    return {
        isAuthenticated,
        isLoading,
        login,
        logout,
        verifySession,
    };
}
