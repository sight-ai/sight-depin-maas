import { Module } from '@nestjs/common';
import TunnelServiceProvider from "./tunnel.service";

@Module({
  imports: [],
  providers: [TunnelServiceProvider],
  exports: [TunnelServiceProvider],
})
export class TunnelModule {}
