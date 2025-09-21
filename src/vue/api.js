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

            if (response.ok) {
                return { success: true };
            } else {
                const result = await response.json().catch(() => ({
                    success: false,
                    message: "Invalid password",
                }));
                return result;
            }
        },

        async logout() {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });

            if (response.ok) {
                return { success: true };
            } else {
                const result = await response.json().catch(() => ({
                    success: false,
                    message: "Failed to logout",
                }));
                return result;
            }
        },

        async verify() {
            const response = await fetch("/api/auth/verify", {
                method: "GET",
                credentials: "include",
            });

            return response.ok;
        },
    },

    calendar: {
        async get() {
            const response = await fetch("/api/calendars", {
                credentials: "include",
            });

            if (response.ok) {
                return await response.json();
            } else {
                const result = await response.json().catch(() => ({
                    success: false,
                    message: `Failed to fetch calendars: ${response.status}`,
                }));
                throw new Error(result.message || "Failed to fetch calendars");
            }
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
                    hidden: calendarData.hidden || false,
                    details: calendarData.details || false,
                }),
            });

            if (response.ok) {
                return { success: true };
            } else {
                const result = await response.json().catch(async () => {
                    const text = await response.text();
                    return { success: false, message: text };
                });
                return result;
            }
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
                    hidden: calendarData.hidden,
                    details: calendarData.details,
                }),
            });

            if (response.ok) {
                return { success: true };
            } else {
                const result = await response.json().catch(async () => {
                    const text = await response.text();
                    return { success: false, message: text };
                });
                return result;
            }
        },

        async delete(calendarId) {
            const response = await fetch(`/api/calendars/${calendarId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.ok) {
                return { success: true };
            } else {
                const result = await response.json().catch(async () => {
                    const text = await response.text();
                    return { success: false, message: text };
                });
                return result;
            }
        },

        async import(calendarsList) {
            const response = await fetch("/api/calendars/import", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ calendars: calendarsList }),
            });

            if (response.ok) {
                return { success: true };
            } else {
                const result = await response.json().catch(async () => {
                    const text = await response.text();
                    return { success: false, message: text };
                });
                return result;
            }
        },
    },
};
