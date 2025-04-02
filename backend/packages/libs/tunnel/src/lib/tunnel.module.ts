import { Module } from '@nestjs/common';
import {TunnelServiceProvider} from "./tunnel.service";
import {OllamaModule} from "@saito/ollama"
@Module({
  imports: [OllamaModule],
  providers: [TunnelServiceProvider],
  exports: [TunnelServiceProvider],
})
export class TunnelModule {}
