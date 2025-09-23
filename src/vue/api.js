const baseURL = import.meta?.env?.VITE_API_BASE || "";

function buildURL(input, params) {
    const isAbsolute = /^https?:\/\//i.test(input);
    const raw = isAbsolute ? input : `${baseURL}${input}`;
    const url = new URL(raw, window.location.origin);
    if (params && typeof params === "object") {
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            url.searchParams.set(key, String(value));
        });
    }
    return url.toString();
}

async function request(url, options = {}) {
    const {
        method = "GET",
        body,
        headers = {},
        params,
        signal,
        timeoutMs = 15000,
        credentials = "include",
    } = options;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (signal) {
        if (signal.aborted) controller.abort();
        else signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const hasBody = body !== undefined && body !== null;
    const shouldSendJSON = hasBody && /^(POST|PUT|PATCH)$/i.test(method);

    const urlWithParams = buildURL(url, params);

    const response = await fetch(urlWithParams, {
        method,
        credentials,
        headers: {
            ...(shouldSendJSON ? { "Content-Type": "application/json" } : {}),
            ...headers,
        },
        body: shouldSendJSON ? body : undefined,
        signal: controller.signal,
    }).catch((err) => {
        clearTimeout(timer);
        throw err;
    });

    clearTimeout(timer);

    const contentType = response.headers.get("content-type") || "";
    const isJSON = contentType.includes("application/json");
    const isNoContent = response.status === 204;

    let parsed;
    if (!isNoContent) {
        try {
            parsed = isJSON ? await response.json() : await response.text();
        } catch (_e) {
            parsed = null;
        }
    }

    const normalized = (success, data, message = "", errors = null) => ({
        success,
        message,
        errors,
        data,
        status: response.status,
    });

    if (response.ok) {
        if (isJSON && parsed && typeof parsed === "object" && "success" in parsed) {
            return { ...parsed, status: response.status };
        }
        return normalized(true, isNoContent ? null : (parsed ?? null));
    }

    if (isJSON && parsed && typeof parsed === "object") {
        const message = parsed.message || response.statusText;
        const errors = parsed.errors || null;
        const data = parsed.data ?? null;
        return normalized(false, data, message, errors);
    }

    return normalized(false, null, response.statusText || "Request failed", null);
}

export const api = {
    auth: {
        async login(password) {
            return request("/api/auth", {
                method: "POST",
                body: JSON.stringify({ password }),
            });
        },

        async logout() {
            return request("/api/auth/logout", {
                method: "POST",
            });
        },

        async verify() {
            return request("/api/auth/verify");
        },

        async isPasswordConfigured() {
            return request("/api/auth/password-configured");
        },

        async setupPassword(password, confirmPassword) {
            return request("/api/auth/setup-password", {
                method: "POST",
                body: JSON.stringify({ password, confirmPassword }),
            });
        },

        async changePassword(currentPassword, newPassword, confirmPassword) {
            return request("/api/auth/password", {
                method: "PUT",
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                }),
            });
        },
    },

    calendar: {
        async get(params) {
            return request("/api/calendars", { params });
        },

        async create(calendarData) {
            return request("/api/calendars", {
                method: "POST",
                body: JSON.stringify({
                    name: calendarData.name,
                    url: calendarData.url,
                    color: calendarData.color,
                    visible_to_public:
                        calendarData.visible_to_public !== undefined
                            ? calendarData.visible_to_public
                            : true,
                    show_details_to_public:
                        calendarData.show_details_to_public !== undefined
                            ? calendarData.show_details_to_public
                            : true,
                }),
            });
        },

        async update(calendarId, calendarData) {
            return request(`/api/calendars/${calendarId}`, {
                method: "PUT",
                body: JSON.stringify({
                    name: calendarData.name,
                    url: calendarData.url,
                    color: calendarData.color,
                    visible_to_public: calendarData.visible_to_public,
                    show_details_to_public: calendarData.show_details_to_public,
                }),
            });
        },

        async delete(calendarId) {
            return request(`/api/calendars/${calendarId}`, {
                method: "DELETE",
            });
        },

        async import(calendarsList) {
            return request("/api/calendars/import", {
                method: "POST",
                body: JSON.stringify({ calendars: calendarsList }),
            });
        },

        async export() {
            return request("/api/calendars/export");
        },

        async refresh() {
            return request("/api/calendars/refresh", {
                method: "POST",
            });
        },
    },

    settings: {
        async getCronSettings() {
            return request("/api/settings/cron");
        },

        async updateCronSettings(enabled, schedule) {
            return request("/api/settings/cron", {
                method: "PUT",
                body: JSON.stringify({ enabled, schedule }),
            });
        },
    },
};
