import { Module } from '@nestjs/common';
import { NodeServiceProvider } from "./node.service";
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot()
  ],
  providers: [NodeServiceProvider],
  exports: [NodeServiceProvider]
})
export class NodeModule {}
