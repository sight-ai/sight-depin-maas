import { OnModuleDestroy } from '@nestjs/common';
import {
  createDateTypeParser,
  createIntervalTypeParser,
  createPool,
  createTimestampTypeParser,
  createTimestampWithTimeZoneTypeParser,
  DatabasePool,
} from 'slonik';
import { createQueryLoggingInterceptor } from 'slonik-interceptor-query-logging';
import { env } from '../env';
import { createResultParserInterceptor } from './interceptor/result-parser-interceptor';
import {
  createByteaTypeParser,
  createFloat4TypeParser,
  createFloat8TypeParser,
  createInt8TypeParser,
  createIntegerTypeParser,
  createNumericTypeParser,
} from './parsers';
import { PersistentService } from './persistent.interface';

export class DefaultPersistentService
  extends PersistentService
  implements OnModuleDestroy
{
  private _pgPool: DatabasePool | null = null;
  private _isClosing: boolean = false;

  get pgPool(): DatabasePool {
    if (this._pgPool === null) {
      throw new Error('pgPool is not initialized');
    }
    return this._pgPool;
  }

  async connectPool() {
    const pool = await createPool(env().NODE_DATABASE_URL, {
      connectionTimeout: 60e3,
      typeParsers: [
        // - customized type parsers
        createInt8TypeParser(),
        createNumericTypeParser(),
        createFloat4TypeParser(),
        createFloat8TypeParser(),
        createIntegerTypeParser(),
        createByteaTypeParser(),

        // - default type parsers
        createDateTypeParser(),
        createIntervalTypeParser(),
        createTimestampTypeParser(),
        createTimestampWithTimeZoneTypeParser(),
      ],
      interceptors: [
        createQueryLoggingInterceptor(),
        createResultParserInterceptor(),
      ],
    });

    this._pgPool = pool;
  }

  async onModuleDestroy() {
    if (this._isClosing || this._pgPool === null) {
      return;
    }

    this._isClosing = true;
    try {
      await this._pgPool.end();
    } catch (error) {
      console.error('Error closing database pool:', error);
    } finally {
      this._pgPool = null;
      this._isClosing = false;
    }
  }
}

const PersistentServiceProvider = {
  provide: PersistentService,
  useFactory: async () => {
    const service = new DefaultPersistentService();
    const url = process.env['NODE_DATABASE_URL'];
    if (url !== undefined && url !== null && url !== '') {
      await service.connectPool();
    } else {
      console.warn('NODE_DATABASE_URL is not set, skip connecting to DB');
    }
    return service;
  },
};

export default PersistentServiceProvider;
