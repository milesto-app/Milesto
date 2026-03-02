import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/goals returns 401 without auth', () => {
    return request(app.getHttpServer()).get('/api/goals').expect(401);
  });

  it('POST /api/goals returns 401 without auth', () => {
    return request(app.getHttpServer())
      .post('/api/goals')
      .send({ title: 'Test', description: 'Test' })
      .expect(401);
  });
});
