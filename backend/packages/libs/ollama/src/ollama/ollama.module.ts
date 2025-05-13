import { Module } from '@nestjs/common';
import { PersistentModule } from '@saito/persistent';
import { HttpModule } from "@nestjs/axios";
import { MinerModule } from '@saito/miner';
import { DeviceStatusModule } from '@saito/device-status';

// Import from new folder structure
import { OllamaRepository } from './ollama.repository';
import OllamaServiceProvider from './services/ollama.service';
import { OllamaApiClient } from './api/ollama-api.client';
import { OllamaRequestHandler } from './handlers/ollama-request.handler';
import { OllamaStreamHandler } from './handlers/ollama-stream.handler';
import { ChatHandler } from './chat/chat-handler';

@Module({
  imports: [
    HttpModule,
    PersistentModule,
    MinerModule,
    DeviceStatusModule
  ],
  providers: [
    OllamaApiClient,
    OllamaRequestHandler,
    OllamaStreamHandler,
    ChatHandler,
    OllamaServiceProvider,
    OllamaRepository
  ],
  exports: [OllamaServiceProvider.provide, OllamaRepository]
})
export class OllamaModule {}
