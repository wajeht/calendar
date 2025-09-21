import { ref, onUnmounted } from "vue";

const toasts = ref([]);
const timeouts = new Map();
let toastId = 0;

export function useToast() {
    onUnmounted(() => {
        timeouts.forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        timeouts.clear();
    });

    function showToast(message, type = "info", title = null, duration = 5000) {
        if (!message) return null;

        const existingToast = toasts.value.find(
            (t) => t.message === message && t.type === type && t.show,
        );
        if (existingToast) {
            return existingToast.id;
        }

        const id = ++toastId;
        const toast = {
            id,
            message,
            type,
            title,
            show: false,
        };

        toasts.value.push(toast);

        const showTimeoutId = setTimeout(() => {
            const toastItem = toasts.value.find((t) => t.id === id);
            if (toastItem) {
                toastItem.show = true;
            }
            timeouts.delete(`show-${id}`);
        }, 50);
        timeouts.set(`show-${id}`, showTimeoutId);

        if (duration > 0) {
            const removeTimeoutId = setTimeout(() => {
                removeToast(id);
                timeouts.delete(`remove-${id}`);
            }, duration);
            timeouts.set(`remove-${id}`, removeTimeoutId);
        }

        return id;
    }

    function removeToast(id) {
        const showKey = `show-${id}`;
        const removeKey = `remove-${id}`;
        const hideKey = `hide-${id}`;

        [showKey, removeKey, hideKey].forEach((key) => {
            if (timeouts.has(key)) {
                clearTimeout(timeouts.get(key));
                timeouts.delete(key);
            }
        });

        const toastIndex = toasts.value.findIndex((t) => t.id === id);
        if (toastIndex > -1) {
            toasts.value[toastIndex].show = false;

            const hideTimeoutId = setTimeout(() => {
                const index = toasts.value.findIndex((t) => t.id === id);
                if (index > -1) {
                    toasts.value.splice(index, 1);
                }
                timeouts.delete(hideKey);
            }, 300);
            timeouts.set(hideKey, hideTimeoutId);
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
        timeouts.forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        timeouts.clear();

        toasts.value.forEach((toast) => {
            toast.show = false;
        });

        const clearTimeoutId = setTimeout(() => {
            toasts.value = [];
            timeouts.delete("clear-all");
        }, 300);
        timeouts.set("clear-all", clearTimeoutId);
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
}
