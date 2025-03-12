import { Module } from '@nestjs/common';
import { PersistentModule } from '@saito/persistent';
import { OllamaRepository } from './ollama.repository';
import OllamaServiceProvider from './ollama.service';
import { HttpModule } from "@nestjs/axios";
import { MinerModule } from '@saito/miner';

@Module({
  imports: [HttpModule, PersistentModule, MinerModule],
  providers: [OllamaServiceProvider, OllamaRepository],
  exports: [OllamaServiceProvider],
})
export class OllamaModule {}
