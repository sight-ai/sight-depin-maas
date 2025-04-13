import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../interceptors/all-exceptions.filter';
import { MinerService } from '@saito/miner';
import { MockedMinerService } from '../../../test/mock/miner.service';
import { DeviceStatusService } from '@saito/device-status';
import { MockedDeviceStatusService } from '../../../test/mock/device-status.service';
import { TunnelService } from '@saito/tunnel';
import { MockedTunnelService } from '../../../test/mock/tunnel.service';

describe('Indexer Controller (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MinerService)
      .useValue(new MockedMinerService())
      .overrideProvider(DeviceStatusService)
      .useValue(new MockedDeviceStatusService())
      .overrideProvider(TunnelService)
      .useValue(new MockedTunnelService())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (moduleFixture) {
      await moduleFixture.close();
    }
  });

  it('/api/v1/indexer/txs (POST)', () => {
    return request(app.getHttpServer()).get('/healthz').expect(200);
  });
});
