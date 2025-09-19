import request from 'supertest';

export async function createTestServer() {
    process.env.NODE_ENV = 'test';
    const { createApp } = await import('../app.js');
    const { app, ctx } = await createApp();

    await ctx.db.migrate.latest();


    const agent = request.agent(app);
    let sessionToken = null;

    async function login(password = null) {
        const response = await agent
            .post('/api/auth')
            .send({
                password: password || process.env.APP_PASSWORD || 'password'
            });

        if (response.status !== 200) {
            throw new Error(`Login failed: ${response.status}`);
        }

        const cookies = response.headers['set-cookie'];
        if (cookies) {
            const sessionMatch = cookies.join(';').match(/session_token=([^;]+)/);
            sessionToken = sessionMatch ? sessionMatch[1] : null;
        }

        return sessionToken;
    }

    async function logout() {
        if (sessionToken) {
            await agent.post('/api/auth/logout');
            sessionToken = null;
        }
    }

    async function cleanDatabase() {
        await ctx.db('calendars').del();
    }

    async function stop() {
        if (ctx.db && typeof ctx.db.destroy === 'function') {
            await ctx.db.destroy();
        }
    }

    return {
        app,
        ctx,
        login,
        logout,
        cleanDatabase,
        stop,
        get: (path) => agent.get(path),
        post: (path, body = null) => body ? agent.post(path).send(body) : agent.post(path),
        put: (path, body = null) => body ? agent.put(path).send(body) : agent.put(path),
        delete: (path) => agent.delete(path)
    };
}

export async function setupAuthenticatedServer() {
    const testServer = await createTestServer();
    await testServer.login();
    return testServer;
}
