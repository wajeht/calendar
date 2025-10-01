import { ref, computed } from "vue";

export function useNotifications() {
    const permissionState = ref(
        typeof Notification !== "undefined" ? Notification.permission : "unsupported",
    );

    const isSupported = computed(() => typeof Notification !== "undefined");
    const isGranted = computed(() => permissionState.value === "granted");
    const isDenied = computed(() => permissionState.value === "denied");
    const isDefault = computed(() => permissionState.value === "default");

    async function requestPermission() {
        if (!isSupported.value) {
            return false;
        }

        if (permissionState.value === "granted") {
            return true;
        }

        try {
            const permission = await Notification.requestPermission();
            permissionState.value = permission;
            return permission === "granted";
        } catch (error) {
            console.error("Failed to request notification permission:", error);
            return false;
        }
    }

    function showBrowserNotification(title, options = {}) {
        if (!isSupported.value || !isGranted.value) {
            return null;
        }

        try {
            return new Notification(title, {
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                ...options,
            });
        } catch (error) {
            console.error("Failed to show browser notification:", error);
            return null;
        }
    }

    function getPermissionStatus() {
        return permissionState.value;
    }

    return {
        isSupported,
        isGranted,
        isDenied,
        isDefault,
        permissionState,
        requestPermission,
        showBrowserNotification,
        getPermissionStatus,
    };
}
