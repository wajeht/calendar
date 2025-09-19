import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createTestServer } from '../../../utils/test-utils.js';

describe('Auth API - Real HTTP Tests', () => {
    let testServer;

    before(async () => {
        testServer = await createTestServer();
    });

    after(async () => {
        if (testServer) {
            await testServer.stop();
        }
    });

    describe('POST /api/auth (Login)', () => {
        it('should login successfully with correct password', async () => {
            const response = await testServer.post('/api/auth', {
                password: process.env.APP_PASSWORD || 'password'
            });

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.success, true);
            assert.strictEqual(response.body.message, 'Authentication successful');

            const cookies = response.headers['set-cookie'];
            assert.ok(cookies);
            assert.ok(cookies.some(cookie => cookie.includes('session_token')));
        });

        it('should reject login with wrong password', async () => {
            const response = await testServer.post('/api/auth', {
                password: 'wrong-password'
            });

            assert.strictEqual(response.status, 400);
            assert.ok(response.body.error);
            assert.ok(response.body.error.includes('Invalid password'));
        });

        it('should reject login with missing password', async () => {
            const response = await testServer.post('/api/auth', {});

            assert.strictEqual(response.status, 400);
            assert.ok(response.body.error);
            assert.ok(response.body.error.includes('Password is required'));
        });
    });

    describe('GET /api/auth/verify (Session Verification)', () => {
        before(async () => {
            await testServer.login();
        });

        it('should verify valid session token', async () => {
            const response = await testServer.get('/api/auth/verify');

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.success, true);
            assert.strictEqual(response.body.message, 'Session is valid');
        });

        it('should reject invalid session token', async () => {
            const response = await request(testServer.app)
                .get('/api/auth/verify')
                .set('Cookie', 'session_token=invalid-token');

            assert.strictEqual(response.status, 401);
        });

        it('should reject missing session token', async () => {
            await testServer.logout();

            const response = await testServer.get('/api/auth/verify');
            assert.strictEqual(response.status, 401);

            await testServer.login();
        });
    });

    describe('POST /api/auth/logout (Logout)', () => {
        it('should logout successfully', async () => {
            const response = await testServer.post('/api/auth/logout');

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.success, true);
            assert.strictEqual(response.body.message, 'Logged out successfully');

            const cookies = response.headers['set-cookie'];
            assert.ok(cookies);
            assert.ok(cookies.some(cookie => cookie.includes('session_token=;')));
        });
    });

    describe('Full Auth Flow', () => {
        it('should complete login -> verify -> logout flow', async () => {
            const sessionToken = await testServer.login();
            assert.ok(sessionToken);

            const verifyResponse = await testServer.get('/api/auth/verify');
            assert.strictEqual(verifyResponse.status, 200);

            await testServer.logout();

            const invalidVerifyResponse = await testServer.get('/api/auth/verify');
            assert.strictEqual(invalidVerifyResponse.status, 401);
        });
    });
});
