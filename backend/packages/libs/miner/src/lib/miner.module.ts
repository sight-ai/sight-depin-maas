import { Module } from '@nestjs/common';
import { PersistentModule } from "@saito/persistent";
import { EthStorageModule } from "@saito/ethstorage";
import { MinerServiceProvider } from "./miner.service";
import { MinerRepository } from "./miner.repository";

@Module({
  imports: [PersistentModule, EthStorageModule],
  providers: [MinerServiceProvider, MinerRepository],
  exports: [MinerServiceProvider]
})
export class MinerModule {}
