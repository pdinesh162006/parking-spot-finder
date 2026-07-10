import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

jest.mock('../src/config/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../src/config/redis', () => ({
  redis: {
    on: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'mock-user-uuid',
        email: 'test@example.com',
        name: 'Test Driver',
        role: 'DRIVER',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test Driver',
          phone: '+15550999',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Registration successful');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 400 if user email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'exists' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test Driver',
          phone: '+15550999',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User already exists with this email');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return access token on successful login', async () => {
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('password123', 12);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'mock-user-uuid',
        email: 'test@example.com',
        passwordHash,
        name: 'Test Driver',
        role: 'DRIVER',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 401 for incorrect credentials', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/auth/google-login', () => {
    it('should login an existing google user successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'mock-user-uuid',
        email: 'google-user@example.com',
        name: 'Google User',
        role: 'DRIVER',
      });

      const response = await request(app)
        .post('/api/auth/google-login')
        .send({
          email: 'google-user@example.com',
          name: 'Google User',
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toBe('google-user@example.com');
    });

    it('should register and login a new google user successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'mock-new-user-uuid',
        email: 'new-google-user@example.com',
        name: 'New Google User',
        role: 'OWNER',
      });

      const response = await request(app)
        .post('/api/auth/google-login')
        .send({
          email: 'new-google-user@example.com',
          name: 'New Google User',
          role: 'OWNER',
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toBe('new-google-user@example.com');
      expect(response.body.user.role).toBe('OWNER');
    });
  });
});
