import { ref } from "vue";

const toasts = ref([]);
let toastId = 0;

export function useToast() {
    function addToast(message, type = "info", title = null, duration = 5000) {
        if (!message) return;

        const id = ++toastId;
        const toast = {
            id,
            message,
            type,
            title,
            visible: true,
        };

        toasts.value.push(toast);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }

    function removeToast(id) {
        const index = toasts.value.findIndex((t) => t.id === id);
        if (index > -1) {
            toasts.value.splice(index, 1);
        }
    }

    function success(message, title = null, duration = 5000) {
        return addToast(message, "success", title, duration);
    }

    function error(message, title = null, duration = 8000) {
        return addToast(message, "error", title, duration);
    }

    function warning(message, title = null, duration = 6000) {
        return addToast(message, "warning", title, duration);
    }

    function info(message, title = null, duration = 5000) {
        return addToast(message, "info", title, duration);
    }

    function clear() {
        toasts.value.splice(0);
    }

    return {
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
        clear,
    };
}
