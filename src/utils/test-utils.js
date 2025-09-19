import request from 'supertest';

export async function createTestServer() {
    process.env.NODE_ENV = 'test';
    const { createApp } = await import('../app.js');
    const { app, ctx } = await createApp();

    await ctx.db.migrate.latest();

    const agent = request.agent(app);

    const testServer = {
        async login(password = null) {
            const response = await agent
                .post('/api/auth')
                .send({
                    password: password || process.env.APP_PASSWORD || 'password'
                });

            if (response.status !== 200) {
                throw new Error(`Login failed: ${response.status}`);
            }

            return response;
        },

        async logout() {
            return await agent.post('/api/auth/logout');
        },

        async cleanDatabase() {
            return await ctx.db('calendars').del();
        },

        async stop() {
            if (ctx.db && typeof ctx.db.destroy === 'function') {
                await ctx.db.destroy();
            }
        },

        get: (path) => agent.get(path),
        post: (path, body = null) => body ? agent.post(path).send(body) : agent.post(path),
        put: (path, body = null) => body ? agent.put(path).send(body) : agent.put(path),
        delete: (path) => agent.delete(path),
        request: (method, path) => agent[method](path),

        async createCalendar(data) {
            const { name, url, color = '#447dfc', hidden = false, details = false, data: calendarData = null, events = null } = data;
            const [id] = await ctx.db('calendars').insert({
                name, url, color, hidden, details, data: calendarData, events
            });
            return await ctx.db('calendars').where('id', id).first();
        }
    };

    return testServer;
}

export async function setupAuthenticatedServer() {
    const testServer = await createTestServer();
    await testServer.login();
    return testServer;
}
