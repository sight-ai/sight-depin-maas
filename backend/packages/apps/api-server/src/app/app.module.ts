import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { IndexController } from './controllers/index.controller';
import { KeeperController } from "./controllers/keeper.controller";
import { KeeperModule } from "@saito/keeper";
import { OllamaModule } from "@saito/ollama";
import { ModelController } from "./controllers/model.controller";
import { MiningController } from "./controllers/mining.controller";

@Module({
  imports: [KeeperModule, OllamaModule],
  controllers: [IndexController, KeeperController, ModelController, MiningController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
