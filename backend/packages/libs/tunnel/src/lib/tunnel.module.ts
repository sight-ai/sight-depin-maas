import { Module } from '@nestjs/common';
import { TunnelServiceProvider } from "./tunnel.service";
import { ProxyServiceProvider } from "./proxy.service";

@Module({
  providers: [TunnelServiceProvider, ProxyServiceProvider],
  exports: [TunnelServiceProvider, ProxyServiceProvider],
})
export class TunnelModule {}
