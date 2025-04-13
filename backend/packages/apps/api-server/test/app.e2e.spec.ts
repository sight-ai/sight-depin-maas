import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { MinerService } from "@saito/miner";
import { MockedMinerService } from "./mock/miner.service";
import { DeviceStatusService } from "@saito/device-status";
import { MockedDeviceStatusService } from "./mock/device-status.service";
import { TunnelService } from "@saito/tunnel";
import { MockedTunnelService } from "./mock/tunnel.service";

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
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
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('saito API');
  });

  it('should /healthz (GET)', () => {
    return request(app.getHttpServer())
      .get('/healthz')
      .expect(200)
      .expect('OK');
  });
});
