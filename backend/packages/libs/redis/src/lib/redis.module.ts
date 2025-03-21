import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';
import { RedisService } from "./redis.service";
import { Logger } from '@nestjs/common';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: ConfigService) => {
        const password = config.get('REDIS_PASSWORD');
        console.log('Using Redis password:', password ? '******' : 'no password');
        
        const redisOptions: RedisOptions = {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          password: password,
          db: config.get('REDIS_DB'),
        };

        const redis = new Redis(redisOptions);
        redis.on('error', (err) => {
          const logger = new Logger('RedisModule');
          logger.error(`Redis error: ${err.message}`);
        });
        return redis;
      },
      inject: [ConfigService]
    },
    RedisService
  ],
  exports: ['REDIS_CLIENT', RedisService]
})
export class RedisModule {} 