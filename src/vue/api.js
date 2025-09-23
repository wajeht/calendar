async function request(url, options = {}) {
    const defaultOptions = {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    };

    if (
        options.method === "DELETE" ||
        (!options.body && options.method !== "POST" && options.method !== "PUT")
    ) {
        delete defaultOptions.headers["Content-Type"];
    }

    const response = await fetch(url, {
        ...defaultOptions,
        ...options,
    });

    const result = await response.json().catch(() => ({
        success: false,
        message: "Failed to parse response",
        errors: null,
        data: null,
    }));

    return result;
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
    },

    calendar: {
        async get() {
            return request("/api/calendars");
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
        async isPasswordConfigured() {
            return request("/api/settings/password-configured");
        },

        async setupPassword(password, confirmPassword) {
            return request("/api/settings/setup-password", {
                method: "POST",
                body: JSON.stringify({ password, confirmPassword }),
            });
        },

        async changePassword(currentPassword, newPassword, confirmPassword) {
            return request("/api/settings/password", {
                method: "PUT",
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                }),
            });
        },

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
