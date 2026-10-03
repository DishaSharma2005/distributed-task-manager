const request = require('supertest');
const app = require('../src/app');

// Load the in-memory MongoDB setup (starts mongo, connects mongoose)
require('./setup');

// ─────────────────────────────────────────────────────────────
// 1. Health Check
// ─────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('should return 200 with status healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('instance');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// ─────────────────────────────────────────────────────────────
// 2. Instance Info
// ─────────────────────────────────────────────────────────────
describe('GET /api/instance', () => {
  it('should return 200 with instance and hostname fields', async () => {
    const res = await request(app).get('/api/instance');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('instance');
    expect(res.body).toHaveProperty('hostname');
    // When INSTANCE_ID is not set, should default to 'LOCAL'
    expect(typeof res.body.instance).toBe('string');
    expect(typeof res.body.hostname).toBe('string');
  });

  it('should reflect the INSTANCE_ID environment variable', async () => {
    const original = process.env.INSTANCE_ID;
    process.env.INSTANCE_ID = 'TEST-INSTANCE';
    const res = await request(app).get('/api/instance');
    expect(res.body.instance).toBe('TEST-INSTANCE');
    process.env.INSTANCE_ID = original;
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Task CRUD
// ─────────────────────────────────────────────────────────────
describe('POST /api/tasks', () => {
  it('should create a task and return 201 with the task data', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test Task', description: 'A test description' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.title).toBe('Test Task');
    expect(res.body.description).toBe('A test description');
    expect(res.body.completed).toBe(false);
    expect(res.body).toHaveProperty('createdAt');
  });

  it('should return 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ description: 'No title provided' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 when title is an empty string', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: '   ' });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/tasks', () => {
  it('should return an empty array when no tasks exist', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('should return all created tasks', async () => {
    // Create two tasks first
    await request(app).post('/api/tasks').send({ title: 'Task One' });
    await request(app).post('/api/tasks').send({ title: 'Task Two' });

    const res = await request(app).get('/api/tasks');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
  });
});

describe('PUT /api/tasks/:id', () => {
  it('should mark a task as completed', async () => {
    // First create a task
    const created = await request(app)
      .post('/api/tasks')
      .send({ title: 'Mark me done' });

    const id  = created.body._id;
    const res = await request(app)
      .put(`/api/tasks/${id}`)
      .send({ completed: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  it('should return 404 for a non-existent task id', async () => {
    const fakeId = '64a1234567890abcdef12345'; // valid ObjectId format, but does not exist
    const res = await request(app)
      .put(`/api/tasks/${fakeId}`)
      .send({ completed: true });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('should delete a task and return 200', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .send({ title: 'Delete me' });

    const id  = created.body._id;
    const res = await request(app).delete(`/api/tasks/${id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Task deleted successfully');

    // Verify it no longer exists
    const all = await request(app).get('/api/tasks');
    expect(all.body.find(t => t._id === id)).toBeUndefined();
  });

  it('should return 404 when deleting a non-existent task', async () => {
    const fakeId = '64a1234567890abcdef12345';
    const res = await request(app).delete(`/api/tasks/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });
});
