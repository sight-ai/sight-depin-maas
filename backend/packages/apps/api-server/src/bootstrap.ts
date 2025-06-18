import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import assert from 'assert';
import express, { Response, Request, NextFunction, json, urlencoded } from 'express';
import { patchNestJsSwagger } from 'nestjs-zod';
import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './app/interceptors/all-exceptions.filter';
import { Logger } from '@nestjs/common';
import { PlainTextToJsonMiddleware } from "./app/plaintext-to-json-middleware";
import { FileLoggerService } from './app/logger/file-logger.service';

const clientJsonPayloadLimit = '10mb';

/**
 * This is the hack for colon in request path, which conforms to google api convention.
 * @param document the open api object
 */
function amendActionPath(document: OpenAPIObject) {
  const paths = Object.keys(document.paths);
  for (const p of paths) {
    if (p.indexOf('[:]') < 0) continue;
    const fixedPath = p.split('[:]').join(':');
    const pathDocument = document.paths[p];
    assert(pathDocument, `path ${p} not found`);
    document.paths[fixedPath] = pathDocument;
    delete document.paths[p];
  }
}

export async function bootstrap() {
  const fileLogger = new FileLoggerService();
  const app = await NestFactory.create(AppModule, {
    logger: fileLogger
  });
  const logger = new Logger('bootstrap');

  app.enableCors();
  app.use(express.text());
  app.use(new PlainTextToJsonMiddleware().use);
  app.use(json({ limit: clientJsonPayloadLimit }));
  app.use(urlencoded({ limit: clientJsonPayloadLimit, extended: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  // Set all success responses to 200
  app.use((req: Request, res: Response, next: NextFunction) => {
    const originalStatus = res.status;
    res.status = function(code: number) {
      if (code === 201) {
        return originalStatus.call(this, 200);
      }
      return originalStatus.call(this, code);
    };
    next();
  });

  const swaggerBuilder = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('ALEX B20 API')
    .setDescription('Alex B20 API service')
    .setVersion('0.0.1')
    .build();
  patchNestJsSwagger();
  const document = SwaggerModule.createDocument(app, swaggerBuilder);
  amendActionPath(document);
  SwaggerModule.setup('swagger-ui', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  app.getHttpAdapter().get('/swagger-api.json', (_, res: Response) => {
    res.json(document);
  });
  process
    .on('unhandledRejection', reason => {
      const message =
        reason instanceof Error
          ? `${reason.stack ?? reason}`
          : JSON.stringify(reason);
      logger.error(`unhandledRejection: ${message}`);
      process.exit(1);
    })
    .on('uncaughtException', (err, origin) => {
      logger.error(`${origin} ${err.name} ${err.stack}`);
      process.exit(1);
    });

  const port = process.env.API_PORT! || 8716;
  await app.listen(port, () => {
    logger.log(`Saito API server started at port ${port}`);
  });
}

