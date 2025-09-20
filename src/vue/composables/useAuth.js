import { ref } from 'vue';
import { useToast } from './useToast';

export function useAuth() {
    const toast = useToast();
    const isAuthenticated = ref(false);
    const isLoading = ref(false);

    // Login function
    async function login(password) {
        isLoading.value = true;
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                isAuthenticated.value = true;
                toast.success('Logged in successfully');
                return { success: true };
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'Invalid password');
                return { success: false, error: errorData.error };
            }
        } catch (error) {
            const errorMessage = 'Authentication error: ' + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            isLoading.value = false;
        }
    }

    // Logout function
    async function logout() {
        isLoading.value = true;
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                isAuthenticated.value = false;
                toast.success('Logged out successfully');
                // Reload page to reset state
                window.location.reload();
                return { success: true };
            } else {
                toast.error('Failed to logout');
                return { success: false, error: 'Failed to logout' };
            }
        } catch (error) {
            const errorMessage = 'Error during logout: ' + error.message;
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            isLoading.value = false;
        }
    }

    // Verify session function
    async function verifySession() {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                credentials: 'include',
            });

            isAuthenticated.value = response.ok;
            return response.ok;
        } catch (error) {
            isAuthenticated.value = false;
            console.error('Auth check failed:', error);
            return false;
        }
    }

    return {
        // State
        isAuthenticated,
        isLoading,

        // Methods
        login,
        logout,
        verifySession,
    };
}