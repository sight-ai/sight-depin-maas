import { Module } from '@nestjs/common';
import { PersistentModule } from '@saito/persistent';
import { OpenaiRepository } from './openai.repository';
import OpenaiServiceProvider from './openai.service';

@Module({
  imports: [PersistentModule],
  providers: [OpenaiServiceProvider, OpenaiRepository],
  exports: [OpenaiServiceProvider],
})
export class OpenaiModule {}
