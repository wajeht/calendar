import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { setupAuthenticatedServer } from '../../../utils/test-utils.js';

describe('Calendar API - Real HTTP Tests', () => {
    let testServer;

    before(async () => {
        testServer = await setupAuthenticatedServer();
        await testServer.cleanDatabase();
    });

    after(async () => {
        if (testServer) {
            await testServer.stop();
        }
    });

    describe('GET /api/calendars (List Calendars)', () => {
        it('should get calendars list regardless of auth status', async () => {
            let response = await testServer.get('/api/calendars');
            assert.strictEqual(response.status, 200);
            assert.ok(Array.isArray(response.body));

            await testServer.logout();
            response = await testServer.get('/api/calendars');
            assert.strictEqual(response.status, 200);
            assert.ok(Array.isArray(response.body));

            await testServer.login();
        });
    });

    describe('POST /api/calendars (Create Calendar)', () => {
        it('should create a new calendar', async () => {
            const calendarData = {
                name: 'Test Calendar',
                url: 'https://calendar.google.com/calendar/ical/test@gmail.com/public/basic.ics',
                color: '#ff0000'
            };

            const response = await testServer.post('/api/calendars', calendarData);

            assert.strictEqual(response.status, 201);
            assert.strictEqual(response.body.name, 'Test Calendar');
            assert.strictEqual(response.body.url, calendarData.url);
            assert.strictEqual(response.body.color, '#ff0000');
            assert.ok(response.body.id);
        });

        it('should reject calendar with missing name', async () => {
            const calendarData = {
                url: 'https://calendar.google.com/calendar/ical/test2@gmail.com/public/basic.ics'
            };

            const response = await testServer.post('/api/calendars', calendarData);

            assert.strictEqual(response.status, 400);
            assert.ok(response.body.error);
        });

        it('should reject calendar with invalid URL', async () => {
            const calendarData = {
                name: 'Invalid URL Calendar',
                url: 'not-a-valid-url'
            };

            const response = await testServer.post('/api/calendars', calendarData);

            assert.strictEqual(response.status, 400);
            assert.ok(response.body.error);
        });

        it('should reject duplicate calendar URL', async () => {
            const calendarData = {
                name: 'Duplicate Calendar',
                url: 'https://calendar.google.com/calendar/ical/test@gmail.com/public/basic.ics'
            };

            const response = await testServer.post('/api/calendars', calendarData);

            assert.strictEqual(response.status, 400);
            assert.ok(response.body.error);
            assert.ok(response.body.error.includes('already exists'));
        });

        it('should require authentication', async () => {
            await testServer.logout();

            const calendarData = {
                name: 'Unauthorized Calendar',
                url: 'https://calendar.google.com/calendar/ical/unauthorized@gmail.com/public/basic.ics'
            };

            const response = await testServer.post('/api/calendars', calendarData);

            assert.strictEqual(response.status, 401);

            await testServer.login();
        });
    });

    describe('GET /api/calendars/:id (Get Calendar)', () => {
        let calendarId;

        before(async () => {
            const calendar = await testServer.ctx.models.calendar.create({
                name: 'Get Test Calendar',
                url: 'https://calendar.google.com/calendar/ical/get-test@gmail.com/public/basic.ics'
            });
            calendarId = calendar.id;
        });

        it('should get calendar by ID', async () => {
            const response = await testServer.get(`/api/calendars/${calendarId}`);
            const data = response.body;

            assert.strictEqual(response.status, 200);
            assert.strictEqual(data.success, true);
            assert.strictEqual(data.data.id, calendarId);
            assert.strictEqual(data.data.name, 'Get Test Calendar');
        });

        it('should return 404 for non-existent calendar', async () => {
            const response = await testServer.get('/api/calendars/99999');

            assert.strictEqual(response.status, 404);
        });

        it('should require authentication', async () => {
            await testServer.logout();

            const response = await testServer.get(`/api/calendars/${calendarId}`);

            assert.strictEqual(response.status, 401);

            await testServer.login();
        });
    });

    describe('PUT /api/calendars/:id (Update Calendar)', () => {
        let calendarId;

        before(async () => {
            const calendar = await testServer.ctx.models.calendar.create({
                name: 'Update Test Calendar',
                url: 'https://calendar.google.com/calendar/ical/update-test@gmail.com/public/basic.ics'
            });
            calendarId = calendar.id;
        });

        it('should update calendar name', async () => {
            const updateData = {
                name: 'Updated Calendar Name'
            };

            const response = await testServer.put(`/api/calendars/${calendarId}`, updateData);
            const data = response.body;

            assert.strictEqual(response.status, 200);
            assert.strictEqual(data.name, 'Updated Calendar Name');
            assert.strictEqual(data.id, calendarId);
        });

        it('should update calendar visibility', async () => {
            const updateData = {
                visible: false
            };

            const response = await testServer.put(`/api/calendars/${calendarId}`, updateData);
            const data = response.body;

            assert.strictEqual(response.status, 200);
            assert.strictEqual(!!data.hidden, true);
        });

        it('should return 404 for non-existent calendar', async () => {
            const updateData = {
                name: 'Non-existent Calendar'
            };

            const response = await testServer.put('/api/calendars/99999', updateData);

            assert.strictEqual(response.status, 404);
        });

        it('should require authentication', async () => {
            await testServer.logout();

            const updateData = {
                name: 'Unauthorized Update'
            };

            const response = await testServer.put(`/api/calendars/${calendarId}`, updateData);

            assert.strictEqual(response.status, 401);

            await testServer.login();
        });
    });

    describe('DELETE /api/calendars/:id (Delete Calendar)', () => {
        let calendarId;

        before(async () => {
            const calendar = await testServer.ctx.models.calendar.create({
                name: 'Delete Test Calendar',
                url: 'https://calendar.google.com/calendar/ical/delete-test@gmail.com/public/basic.ics'
            });
            calendarId = calendar.id;
        });

        it('should delete calendar by ID', async () => {
            const response = await testServer.delete(`/api/calendars/${calendarId}`);
            const data = response.body;

            assert.strictEqual(response.status, 200);
            assert.strictEqual(data.name, 'Delete Test Calendar');
            assert.strictEqual(data.id, calendarId);

            const getResponse = await testServer.get(`/api/calendars/${calendarId}`);
            assert.strictEqual(getResponse.status, 404);
        });

        it('should return 404 for non-existent calendar', async () => {
            const response = await testServer.delete('/api/calendars/99999');

            assert.strictEqual(response.status, 404);
        });

        it('should require authentication', async () => {
            await testServer.logout();

            const response = await testServer.delete('/api/calendars/1');

            assert.strictEqual(response.status, 401);

            await testServer.login();
        });
    });

    describe('POST /api/calendars/refetch (Refetch All Calendars)', () => {
        it('should initiate calendar refetch', async () => {
            const response = await testServer.post('/api/calendars/refetch');
            const data = response.body;

            assert.strictEqual(response.status, 200);
            assert.strictEqual(data.success, true);
            assert.ok(data.message.includes('refetch initiated'));
        });

        it('should require authentication', async () => {
            await testServer.logout();

            const response = await testServer.post('/api/calendars/refetch');

            assert.strictEqual(response.status, 401);

            await testServer.login();
        });
    });
});
