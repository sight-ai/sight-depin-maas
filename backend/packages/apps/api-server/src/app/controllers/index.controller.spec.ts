import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PersistentModule, PersistentService } from '@saito/persistent';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../interceptors/all-exceptions.filter';

describe('Indexer Controller (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, PersistentModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    const persistent = moduleFixture.get(PersistentService);
    // await persistent.pgPool.query(
    //   SQL.typeAlias('void')`truncate table indexer.txs cascade`,
    // );
  });

  it('/api/v1/indexer/txs (POST)', () => {
    return request(app.getHttpServer()).get('/healthz').expect(200);
  });
});
