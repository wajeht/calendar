import { ref } from "vue";
import { useToast } from "./useToast";
import { api } from "../api.js";

const isAuthenticated = ref(false);
const isLoading = ref(false);

export function useAuth() {
    const toast = useToast();

    async function checkPasswordConfiguration() {
        isLoading.value = true;
        try {
            const result = await api.settings.isPasswordConfigured();
            return result;
        } catch (error) {
            toast.error("Error checking password configuration: " + error.message);
            return { success: false, message: error.message };
        } finally {
            isLoading.value = false;
        }
    }

    async function setupPassword(password, confirmPassword) {
        isLoading.value = true;
        try {
            const result = await api.settings.setupPassword(password, confirmPassword);
            if (result.success) {
                toast.success("Password configured successfully! You can now log in.");
            } else {
                toast.error(result.message || "Failed to configure password");
            }
            return result;
        } catch (error) {
            toast.error("Failed to configure password: " + error.message);
            return { success: false, message: error.message };
        } finally {
            isLoading.value = false;
        }
    }

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
            const result = await api.auth.verify();
            if (result.success) {
                isAuthenticated.value = true;
                return true;
            } else {
                isAuthenticated.value = false;
                return false;
            }
        } catch (error) {
            isAuthenticated.value = false;
            console.error("Auth check failed:", error);
            return false;
        }
    }

    async function changePassword(currentPassword, newPassword, confirmPassword) {
        isLoading.value = true;
        try {
            const result = await api.settings.changePassword(currentPassword, newPassword, confirmPassword);
            if (result.success) {
                toast.success("Password changed successfully");
            } else {
                if (!result.errors) {
                    toast.error(result.message || "Failed to change password");
                }
            }
            return result;
        } catch (error) {
            toast.error("Failed to change password");
            return { success: false, message: error.message };
        } finally {
            isLoading.value = false;
        }
    }

    return {
        isAuthenticated,
        isLoading,
        login,
        logout,
        verifySession,
        checkPasswordConfiguration,
        setupPassword,
        changePassword,
    };
}
