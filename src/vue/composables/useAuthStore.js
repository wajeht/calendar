import { api } from "../api.js";
import { reactive, toRef } from "vue";
import { useToast } from "./useToast.js";
import { useLogger } from "./useLogger.js";

const CACHE_KEY = "calendar_app_cache";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

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
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed._cachedAt && Date.now() - parsed._cachedAt > CACHE_EXPIRY_MS) {
                logger.log("Cache expired");
                localStorage.removeItem(CACHE_KEY);
                return null;
            }
            logger.log("Cache hit:", Object.keys(parsed));
            return parsed;
        }
        logger.log("Cache miss");
        return null;
    } catch {
        logger.log("Cache read error");
        return null;
    }
}

function setCache(data) {
    try {
        const { feedToken, ...safeData } = data;
        safeData._cachedAt = Date.now();
        localStorage.setItem(CACHE_KEY, JSON.stringify(safeData));
        logger.log("Cache set:", Object.keys(safeData));
    } catch {
        logger.log("Cache write error");
    }
}

function clearCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        logger.log("Cache cleared");
    } catch {
        logger.log("Cache clear error");
    }
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
            logger.log("Using cached data, returning sync function");
            return {
                calendars: cached.calendars || [],
                fromCache: true,
                sync: () => fetchFreshData(),
            };
        }

        logger.log("No cache, fetching fresh data");
        const calendars = await fetchFreshData();
        return { calendars, fromCache: false, sync: null };
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
            logger.log("Fetch failed - no success");
            return [];
        } catch (error) {
            logger.error("Fetch error:", error.message);
            toast.error("Failed to load app");
            return [];
        } finally {
            state.isSyncing = false;
            logger.log("Sync complete");
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
                clearCache();

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
        clearCache,
    };
}
