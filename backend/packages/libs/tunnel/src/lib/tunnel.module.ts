import { Module, forwardRef } from '@nestjs/common';
import {TunnelServiceProvider} from "./tunnel.service";
import {OllamaModule} from "@saito/ollama"

@Module({
  imports: [forwardRef(() => OllamaModule)],
  providers: [TunnelServiceProvider],
  exports: [TunnelServiceProvider],
})
export class TunnelModule {}
