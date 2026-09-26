const request = require('supertest');
const jwt = require('jsonwebtoken');
const { makeToken } = require('./helpers.cjs');

let app;
beforeAll(async () => {
  app = (await import('../server.js')).default;
});

describe('Auth API', () => {
  test('register creates a customer', async () => {
    if (!global.__MONGO_READY__) return;
    const res = await request(app)
      .post('/api/users/register')
      .send({ username: 'alice', email: 'alice@example.com', password: 'password1', type: 'Customer' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user.password).toBeUndefined();
  });

  test('register rejects a duplicate email', async () => {
    if (!global.__MONGO_READY__) return;
    await request(app).post('/api/users/register').send({ username: 'bob', email: 'dup@example.com', password: 'password1' });
    const res = await request(app).post('/api/users/register').send({ username: 'bob2', email: 'dup@example.com', password: 'password1' });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('login succeeds with valid credentials', async () => {
    if (!global.__MONGO_READY__) return;
    await request(app).post('/api/users/register').send({ username: 'carol', email: 'carol@example.com', password: 'password1' });

    const res = await request(app).post('/api/users/login').send({ email: 'carol@example.com', password: 'password1' });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    const decoded = jwt.decode(res.body.token);
    expect(decoded.role).toBe('Customer');
  });

  test('login rejects an incorrect password', async () => {
    if (!global.__MONGO_READY__) return;
    await request(app).post('/api/users/register').send({ username: 'dave', email: 'dave@example.com', password: 'password1' });

    const res = await request(app).post('/api/users/login').send({ email: 'dave@example.com', password: 'wrongpass' });

    expect(res.statusCode).toBe(401);
  });

  test('protected route rejects a missing token', async () => {
    const res = await request(app).get('/api/customers/mybookings');
    expect(res.statusCode).toBe(401);
  });

  test('protected route rejects an invalid token', async () => {
    const res = await request(app).get('/api/customers/mybookings').set('Authorization', 'Bearer not-a-real-token');
    expect(res.statusCode).toBe(403);
  });

  test('protected route rejects an expired token', async () => {
    const expired = jwt.sign({ userId: 'abc', role: 'Customer' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
    const res = await request(app).get('/api/customers/mybookings').set('Authorization', `Bearer ${expired}`);
    expect(res.statusCode).toBe(403);
  });
});
