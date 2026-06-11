import request from 'supertest';
import app from '../app';

async function registerAndLogin() {
  const user = {
    name: 'App User',
    email: `user-${Date.now()}@example.com`,
    password: 'Password1',
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return res.body.accessToken as string;
}

const newApp = { companyName: 'Acme Corp', jobTitle: 'Frontend Engineer' };

describe('GET /api/applications', () => {
  it('should return paginated applications for authenticated user', async () => {
    const token = await registerAndLogin();
    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send(newApp);
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/applications', () => {
  it('should create application with required fields', async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send(newApp);
    expect(res.status).toBe(201);
    expect(res.body.application.companyName).toBe('Acme Corp');
    expect(res.body.application.status).toBe('APPLIED');
  });

  it('should return 400 if companyName missing', async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ jobTitle: 'Engineer' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/applications/:id', () => {
  it('should update application status', async () => {
    const token = await registerAndLogin();
    const created = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send(newApp);
    const id = created.body.application.id;

    const res = await request(app)
      .put(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INTERVIEW_SCHEDULED' });
    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('INTERVIEW_SCHEDULED');
  });

  it('should return 403 if application belongs to different user', async () => {
    const token1 = await registerAndLogin();
    const token2 = await registerAndLogin();
    const created = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token1}`)
      .send(newApp);
    const id = created.body.application.id;

    const res = await request(app)
      .put(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ status: 'REJECTED' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/applications/:id', () => {
  it('should delete application', async () => {
    const token = await registerAndLogin();
    const created = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send(newApp);
    const id = created.body.application.id;

    const res = await request(app)
      .delete(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('should return 403 if not owner', async () => {
    const token1 = await registerAndLogin();
    const token2 = await registerAndLogin();
    const created = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token1}`)
      .send(newApp);
    const id = created.body.application.id;

    const res = await request(app)
      .delete(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(403);
  });
});
