import { api } from "../api.js";
import { reactive, toRef } from "vue";
import { useToast } from "./useToast.js";
import { useLogger } from "./useLogger.js";

const CACHE_KEY = "calendar:cache";
const THEME_KEY = "calendar:theme";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const logger = useLogger("AuthStore");

function normalizeTheme(value) {
    return value === "light" || value === "dark" || value === "system" ? value : null;
}

function getStoredTheme() {
    try {
        return normalizeTheme(localStorage.getItem(THEME_KEY)) || "system";
    } catch {
        return "system";
    }
}

function setStoredTheme(value) {
    const theme = normalizeTheme(value) || "system";

    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {}
}

const state = reactive({
    isAuthenticated: false,
    isPasswordConfigured: null,
    cronSettings: null,
    theme: getStoredTheme(),
    feedToken: null,
    isSyncing: false,
});

function getCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        const data = parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
        const cachedAt = parsed._cachedAt || data._cachedAt;

        if (!cachedAt || Date.now() - cachedAt > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return {
            access: parsed.access || data.access || (data.isAuthenticated ? "auth" : "public"),
            version: parsed.version || data.version || null,
            theme: parsed.theme || data.theme || "system",
            data,
            _cachedAt: cachedAt,
        };
    } catch {
        return null;
    }
}

function setCache(data) {
    try {
        const { feedToken: _feedToken, notModified: _notModified, ...cacheData } = data;
        const access = cacheData.access || (cacheData.isAuthenticated ? "auth" : "public");
        const theme = normalizeTheme(cacheData.theme) || getStoredTheme();

        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
                access,
                version: cacheData.version || null,
                theme,
                data: { ...cacheData, theme },
                _cachedAt: Date.now(),
            }),
        );
    } catch {}
}

function clearCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch {}
}

function applyData(data) {
    state.isAuthenticated = Boolean(data.isAuthenticated);
    state.isPasswordConfigured = Boolean(data.isPasswordConfigured);
    state.cronSettings = data.cronSettings || null;
    state.theme = normalizeTheme(data.theme) || getStoredTheme();
    state.feedToken = data.feedToken || null;

    if (data.theme) {
        setStoredTheme(data.theme);
    }
}

function resetState() {
    state.isAuthenticated = false;
    state.isPasswordConfigured = null;
    state.cronSettings = null;
    state.theme = getStoredTheme();
    state.feedToken = null;
}

export function useAuthStore() {
    const toast = useToast();

    async function refresh() {
        const calendars = await fetchFreshData({ cache: getCache() });
        return { calendars };
    }

    async function initialize() {
        logger.log("Initialize started");
        const cached = getCache();

        if (cached?.access === "public" && cached.data?.isAuthenticated === false) {
            applyData(cached.data);
            return {
                calendars: cached.data.calendars || [],
                fromCache: true,
                sync: () => fetchFreshData({ cache: cached }),
            };
        }

        const calendars = await fetchFreshData({ cache: cached });
        return { calendars, fromCache: false };
    }

    async function fetchFreshData({ cache = null } = {}) {
        logger.log("Fetching fresh data from /me");
        state.isSyncing = true;
        try {
            const result = await api.auth.me({ version: cache?.version });
            if (result?.success) {
                let data = result.data || {};

                if (data.notModified && cache?.data && data.access === cache.access) {
                    data = {
                        ...cache.data,
                        ...data,
                        calendars: cache.data.calendars || [],
                        notModified: false,
                    };
                } else if (data.notModified) {
                    data = { ...data, calendars: [], notModified: false };
                }

                logger.log("Fresh data received:", Object.keys(data));
                applyData(data);
                setCache(data);
                return data.calendars || [];
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
                clearCache();
                resetState();
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
        refresh,
        logout,
        setPasswordConfigured: (value) => (state.isPasswordConfigured = value),
        setTheme: (value) => {
            state.theme = normalizeTheme(value) || "system";
            setStoredTheme(state.theme);
        },
        setFeedToken,
        setFeedCalendars,
    };
}
