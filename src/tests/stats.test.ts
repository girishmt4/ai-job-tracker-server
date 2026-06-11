import request from 'supertest';
import app from '../app';

async function registerAndLogin() {
  const user = {
    name: 'Stats User',
    email: `stats-${Date.now()}@example.com`,
    password: 'Password1',
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return res.body.accessToken as string;
}

describe('GET /api/stats/overview', () => {
  it('should return zeros for user with no applications', async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .get('/api/stats/overview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.totalApplications).toBe(0);
    expect(res.body.interviews).toBe(0);
  });

  it('should return correct counts after adding applications', async () => {
    const token = await registerAndLogin();
    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyName: 'A', jobTitle: 'Dev' });
    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyName: 'B', jobTitle: 'Dev', status: 'INTERVIEW_SCHEDULED' });

    const res = await request(app)
      .get('/api/stats/overview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.totalApplications).toBe(2);
    expect(res.body.interviews).toBe(1);
  });
});
