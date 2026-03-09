import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import User from '../models/User.js';

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Auth Controller', () => {
    beforeEach(async () => {
        await User.deleteMany({});
    });

    test('POST /api/v1/auth/signup - Should create a new user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/signup')
            .send({
                fullName: 'Test User',
                email: 'test@example.com',
                password: 'Password123!',
                phone: '1234567890',
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe('test@example.com');
    });

    test('POST /api/v1/auth/signin - Should login existing user', async () => {
        // Create user first
        await User.create({
            name: 'Test Member',
            email: 'member@example.com',
            password: 'Password123!',
        });

        const res = await request(app)
            .post('/api/v1/auth/signin')
            .send({
                email: 'member@example.com',
                password: 'Password123!',
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe('member@example.com');
    });
});
