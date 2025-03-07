import { Module } from '@nestjs/common';
import EthStorageServiceProvider from "./ethstorage.service";

@Module({
  imports: [],
  exports: [EthStorageServiceProvider],
  providers: [EthStorageServiceProvider],
})
export class EthStorageModule {}
