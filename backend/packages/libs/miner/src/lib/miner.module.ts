import { Module, forwardRef } from '@nestjs/common';
import { PersistentModule } from "@saito/persistent";
import MinerServiceProvider from "./miner.service";
import { MinerRepository } from "./miner.repository";

@Module({
  imports: [
    PersistentModule,
  ],
  providers: [
    MinerServiceProvider,
    MinerRepository
  ],
  exports: [
    MinerServiceProvider
  ]
})
export class MinerModule {}
