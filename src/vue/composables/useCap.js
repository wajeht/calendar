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

    // Handles the widget's own reset/error events — clear the token only.
    // Must not call widget.reset() here, or it re-fires reset and recurses.
    function onReset() {
        token.value = "";
    }

    // Cap tokens are single-use — imperatively reset the widget so it can be
    // re-solved after a failed login. The resulting reset event clears the token.
    function reset() {
        widget?.value?.reset?.();
    }

    return {
        enabled,
        apiEndpoint,
        token,
        load,
        onSolve,
        onReset,
        reset,
    };
}
