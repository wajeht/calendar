import { ref } from "vue";
import { useToast } from "./useToast";

export function useAuth() {
    const toast = useToast();
    const isAuthenticated = ref(false);
    const isLoading = ref(false);

    async function login(password) {
        isLoading.value = true;
        try {
            const response = await fetch("/api/auth", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                isAuthenticated.value = true;
                toast.success("Logged in successfully");
                return { success: true };
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "Invalid password");
                return { success: false, error: errorData.error };
            }
        } catch (error) {
            const errorMessage = "Authentication error: " + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            isLoading.value = false;
        }
    }

    async function logout(options = {}) {
        const { reload = true } = options;
        isLoading.value = true;

        try {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });

            if (response.ok) {
                isAuthenticated.value = false;
                toast.success("Logged out successfully");

                if (reload) {
                    window.location.reload();
                }

                return { success: true };
            } else {
                const errorText = await response.text().catch(() => "Failed to logout");
                toast.error(errorText);
                return { success: false, error: errorText };
            }
        } catch (error) {
            const errorMessage = "Error during logout: " + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            isLoading.value = false;
        }
    }

    async function verifySession() {
        try {
            const response = await fetch("/api/auth/verify", {
                method: "GET",
                credentials: "include",
            });

            isAuthenticated.value = response.ok;
            return response.ok;
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
