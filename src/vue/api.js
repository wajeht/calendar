export const api = {
    auth: {
        async login(password) {
            const response = await fetch("/api/auth", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ password }),
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },

        async logout() {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },

        async verify() {
            const response = await fetch("/api/auth/verify", {
                method: "GET",
                credentials: "include",
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },
    },

    calendar: {
        async get() {
            const response = await fetch("/api/calendars", {
                credentials: "include",
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },

        async create(calendarData) {
            const response = await fetch("/api/calendars", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
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

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },

        async update(calendarId, calendarData) {
            const response = await fetch(`/api/calendars/${calendarId}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: calendarData.name,
                    url: calendarData.url,
                    color: calendarData.color,
                    visible_to_public: calendarData.visible_to_public,
                    show_details_to_public: calendarData.show_details_to_public,
                }),
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },

        async delete(calendarId) {
            const response = await fetch(`/api/calendars/${calendarId}`, {
                method: "DELETE",
                credentials: "include",
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },

        async import(calendarsList) {
            const response = await fetch("/api/calendars/import", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ calendars: calendarsList }),
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },

        async export() {
            const response = await fetch("/api/calendars/export", {
                credentials: "include",
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },

        async refresh() {
            const response = await fetch("/api/calendars/refresh", {
                method: "POST",
                credentials: "include",
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },
    },

    settings: {
        async isPasswordConfigured() {
            const response = await fetch("/api/settings/password-configured", {
                credentials: "include",
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },

        async setupPassword(password, confirmPassword) {
            const response = await fetch("/api/settings/setup-password", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, confirmPassword }),
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },

        async changePassword(currentPassword, newPassword, confirmPassword) {
            const response = await fetch("/api/settings/password", {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                }),
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },

        async getCronSettings() {
            const response = await fetch("/api/settings/cron", {
                credentials: "include",
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },

        async updateCronSettings(enabled, schedule) {
            const response = await fetch("/api/settings/cron", {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled, schedule }),
            });

            const result = await response.json().catch(() => ({
                success: false,
                message: "Failed to parse response",
                errors: null,
                data: null,
            }));

            return result;
        },
    },
};
