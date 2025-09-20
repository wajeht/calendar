import { defineStore } from "pinia";
import { ref } from "vue";

export const useToast = defineStore("toast", () => {
    const toasts = ref([]);
    let toastId = 0;

    function showToast(message, type = "info", title = null, duration = 5000) {
        const id = ++toastId;
        const toast = {
            id,
            message,
            type,
            title,
            show: false,
        };

        toasts.value.push(toast);

        // Trigger animation on next tick
        setTimeout(() => {
            const toastItem = toasts.value.find((t) => t.id === id);
            if (toastItem) {
                toastItem.show = true;
            }
        }, 10);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }

    function removeToast(id) {
        const toastIndex = toasts.value.findIndex((t) => t.id === id);
        if (toastIndex > -1) {
            toasts.value[toastIndex].show = false;
            setTimeout(() => {
                const index = toasts.value.findIndex((t) => t.id === id);
                if (index > -1) {
                    toasts.value.splice(index, 1);
                }
            }, 300);
        }
    }

    function success(message, title = null, duration = 5000) {
        return showToast(message, "success", title, duration);
    }

    function error(message, title = null, duration = 8000) {
        return showToast(message, "error", title, duration);
    }

    function warning(message, title = null, duration = 6000) {
        return showToast(message, "warning", title, duration);
    }

    function info(message, title = null, duration = 5000) {
        return showToast(message, "info", title, duration);
    }

    function clear() {
        toasts.value.forEach((toast) => {
            toast.show = false;
        });
        setTimeout(() => {
            toasts.value = [];
        }, 300);
    }

    return {
        toasts,
        showToast,
        removeToast,
        success,
        error,
        warning,
        info,
        clear,
    };
});
