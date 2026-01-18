import { api } from "../api.js";
import { reactive, toRef } from "vue";
import { useToast } from "./useToast.js";
import { useLogger } from "./useLogger.js";

const CACHE_KEY = "calendar:cache";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const logger = useLogger("AuthStore");

const state = reactive({
    isAuthenticated: false,
    isPasswordConfigured: null,
    cronSettings: null,
    theme: "system",
    feedToken: null,
    isSyncing: false,
});

function getCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;

        const cached = JSON.parse(raw);
        if (Date.now() - cached._cachedAt > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return cached;
    } catch {
        return null;
    }
}

function setCache(data) {
    try {
        const { feedToken: _feedToken, ...rest } = data;
        rest._cachedAt = Date.now();
        localStorage.setItem(CACHE_KEY, JSON.stringify(rest));
    } catch {}
}

function applyData(data) {
    state.isAuthenticated = Boolean(data.isAuthenticated);
    state.isPasswordConfigured = Boolean(data.isPasswordConfigured);
    state.cronSettings = data.cronSettings || null;
    state.theme = data.theme || "system";
    state.feedToken = data.feedToken || null;
}

export function useAuthStore() {
    const toast = useToast();

    async function initialize() {
        logger.log("Initialize started");
        const cached = getCache();

        if (cached) {
            applyData(cached);
            return {
                calendars: cached.calendars || [],
                fromCache: true,
                sync: () => fetchFreshData(),
            };
        }

        const calendars = await fetchFreshData();
        return { calendars, fromCache: false };
    }

    async function fetchFreshData() {
        logger.log("Fetching fresh data from /me");
        state.isSyncing = true;
        try {
            const result = await api.auth.me();
            if (result?.success) {
                logger.log("Fresh data received:", Object.keys(result.data));
                applyData(result.data);
                setCache(result.data);
                return result.data.calendars || [];
            }
            logger.error("Fetch failed - success:", result?.success, "status:", result?.status);
            return [];
        } catch (error) {
            logger.error("Fetch error:", error.message);
            toast.error("Failed to load app");
            return [];
        } finally {
            state.isSyncing = false;
        }
    }

    async function logout() {
        try {
            const result = await api.auth.logout();
            if (result.success) {
                state.isAuthenticated = false;
                state.isPasswordConfigured = null;
                state.cronSettings = null;
                state.theme = "system";
                state.feedToken = null;
                toast.success(result.message || "Logged out successfully");
                return true;
            } else {
                toast.error(result.message || "Failed to logout");
                return false;
            }
        } catch (error) {
            toast.error("Logout error: " + error.message);
            return false;
        }
    }

    function setFeedToken(tokenData) {
        state.feedToken = tokenData;
    }

    function setFeedCalendars(calendars) {
        if (state.feedToken) {
            state.feedToken.calendars = calendars;
        }
    }

    return {
        isAuthenticated: toRef(state, "isAuthenticated"),
        isPasswordConfigured: toRef(state, "isPasswordConfigured"),
        cronSettings: toRef(state, "cronSettings"),
        theme: toRef(state, "theme"),
        feedToken: toRef(state, "feedToken"),
        isSyncing: toRef(state, "isSyncing"),
        initialize,
        logout,
        setPasswordConfigured: (value) => (state.isPasswordConfigured = value),
        setTheme: (value) => (state.theme = value),
        setFeedToken,
        setFeedCalendars,
    };
}
