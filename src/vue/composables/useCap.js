import { ref, computed } from "vue";
import { useAuthStore } from "./useAuthStore.js";

const WIDGET_SRC = "https://cdn.jsdelivr.net/npm/@cap.js/widget@0.1.56";

export function useCap(widget) {
    const auth = useAuthStore();
    const token = ref("");

    const enabled = computed(() => Boolean(auth.cap.value?.enabled));
    const apiEndpoint = computed(() => auth.cap.value?.apiEndpoint || "");

    function load() {
        if (!enabled.value) return;
        if (document.querySelector(`script[src="${WIDGET_SRC}"]`)) return;

        const script = document.createElement("script");
        script.src = WIDGET_SRC;
        script.defer = true;
        document.head.appendChild(script);
    }

    function onSolve(event) {
        token.value = event.detail?.token || "";
    }

    // Cap tokens are single-use — reset the widget so it can be re-solved
    function reset() {
        token.value = "";
        widget?.value?.reset?.();
    }

    return {
        enabled,
        apiEndpoint,
        token,
        load,
        onSolve,
        reset,
    };
}
