import { Module, forwardRef } from '@nestjs/common';
import { PersistentModule } from "@saito/persistent";
import MinerServiceProvider from "./miner.service";
import { MinerRepository } from "./miner.repository";
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PersistentModule,
    ScheduleModule.forRoot(),
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
