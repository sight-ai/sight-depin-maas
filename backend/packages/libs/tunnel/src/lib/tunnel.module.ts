import { Module, forwardRef } from '@nestjs/common';
import { TunnelServiceProvider } from "./tunnel.service";
@Module({
  providers: [TunnelServiceProvider ],
  exports: [TunnelServiceProvider],
})
export class TunnelModule {}
