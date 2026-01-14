import { api } from "../api.js";
import { reactive, toRef } from "vue";
import { useToast } from "./useToast.js";
import { useLogger } from "./useLogger.js";

const CACHE_KEY = "calendar_app_cache";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 1 day

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
            // Skip cache if no events (likely stale from DB change or new calendar)
            const totalEvents = (parsed.calendars || []).reduce(
                (sum, cal) => sum + (cal.events?.length || 0),
                0,
            );
            if (totalEvents === 0 && parsed.calendars?.length > 0) {
                logger.log("Cache has calendars but no events, skipping");
                localStorage.removeItem(CACHE_KEY);
                return null;
            }
            logger.log("Cache hit:", Object.keys(parsed));
            return parsed;
        }
        logger.log("Cache miss");
        return null;
    } catch (error) {
        logger.error("Cache read error:", error.message);
        return null;
    }
}

function setCache(data) {
    try {
        const { feedToken, calendars, ...safeData } = data;

        // Cache events within ±30 days to stay under localStorage quota
        const now = Date.now();
        const past = now - 30 * 24 * 60 * 60 * 1000;
        const future = now + 30 * 24 * 60 * 60 * 1000;

        safeData.calendars = (calendars || []).map((cal) => ({
            ...cal,
            events: (cal.events || []).filter((event) => {
                const start = new Date(event.start).getTime();
                return start >= past && start <= future;
            }),
        }));
        safeData._cachedAt = Date.now();
        localStorage.setItem(CACHE_KEY, JSON.stringify(safeData));
        logger.log("Cache set");
    } catch (error) {
        logger.error("Cache write error:", error.message);
    }
}

function clearCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        logger.log("Cache cleared");
    } catch (error) {
        logger.error("Cache clear error:", error.message);
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
                logger.log("isAuthenticated:", result.data.isAuthenticated);
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
