import { watch, onBeforeUnmount } from "vue";
import { api } from "../api.js";
import { useAuthStore } from "./useAuthStore.js";

let mediaQueryListener = null;
let mediaQuery = null;

function getSystemTheme() {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(themeValue) {
    const root = document.documentElement;
    const effectiveTheme = themeValue === "system" ? getSystemTheme() : themeValue;

    if (effectiveTheme === "dark") {
        root.classList.add("dark");
    } else {
        root.classList.remove("dark");
    }
}

function setupMediaQueryListener(authStore) {
    if (typeof window === "undefined") return;

    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQueryListener = () => {
        if (authStore.theme.value === "system") {
            applyTheme("system");
        }
    };
    mediaQuery.addEventListener("change", mediaQueryListener);
}

function cleanupMediaQueryListener() {
    if (mediaQuery && mediaQueryListener) {
        mediaQuery.removeEventListener("change", mediaQueryListener);
        mediaQuery = null;
        mediaQueryListener = null;
    }
}

export function useTheme() {
    const auth = useAuthStore();

    function initialize() {
        applyTheme(auth.theme.value);

        setupMediaQueryListener(auth);

        watch(
            () => auth.theme.value,
            (newTheme) => {
                applyTheme(newTheme);
            },
        );
    }

    async function setTheme(newTheme) {
        const previousTheme = auth.theme.value;

        auth.setTheme(newTheme);
        applyTheme(newTheme);

        try {
            const result = await api.settings.updateTheme(newTheme);
            if (!result.success) {
                auth.setTheme(previousTheme);
                applyTheme(previousTheme);
            }
        } catch {
            auth.setTheme(previousTheme);
            applyTheme(previousTheme);
        }
    }

    onBeforeUnmount(() => {
        cleanupMediaQueryListener();
    });

    return {
        theme: auth.theme,
        initialize,
        setTheme,
    };
}
