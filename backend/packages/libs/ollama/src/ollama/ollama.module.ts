import { Module } from '@nestjs/common';
import { PersistentModule } from '@saito/persistent';
import { OllamaRepository } from './ollama.repository';
import OllamaServiceProvider from './ollama.service';
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [HttpModule, PersistentModule],
  providers: [OllamaServiceProvider, OllamaRepository],
  exports: [OllamaServiceProvider],
})
export class OllamaModule {}
