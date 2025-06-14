import { LoggerModule } from 'nestjs-pino';
import pretty from 'pino-pretty';

export const PinoLoggerModule = LoggerModule.forRoot({
  pinoHttp: {
    level: process.env['LOG_LEVEL'],
    stream:
      process.env['NODE_ENV'] === 'production'
        ? undefined
        : pretty({ hideObject: false }),
  },
});
