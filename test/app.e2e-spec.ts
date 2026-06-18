import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `test_${Date.now()}@example.com`,
        username: `testuser_${Date.now()}`,
        displayName: 'Test User',
        password: 'Test1234!',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');
      });
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer()).get('/api/health/live').expect(200);
  });
});
