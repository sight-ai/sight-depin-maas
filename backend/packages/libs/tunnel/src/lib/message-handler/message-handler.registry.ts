import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import {
  MESSAGE_HANDLER_META,
  MessageHandlerMeta,
} from './message-handler.decorator';
import {
  IncomeBaseMessageHandler,
  OutcomeBaseMessageHandler,
} from './base-message-handler';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

@Injectable()
export class MessageHandlerRegistry implements OnModuleInit {
  private readonly logger = new Logger(MessageHandlerRegistry.name);

  private incomeHandlers = new Map<string, IncomeBaseMessageHandler>();
  private outcomeHandlers = new Map<string, OutcomeBaseMessageHandler>();

  constructor(
    private readonly discovery: DiscoveryService,
  ) {}

  async onModuleInit() {
    this.logger.log('Scanning for message handlers...');
    const wrappers: InstanceWrapper[] = this.discovery.getProviders();

    for (const wrapper of wrappers) {
      const instance = wrapper.instance;
      if (!instance) continue;

      const meta = Reflect.getMetadata(
        MESSAGE_HANDLER_META,
        instance.constructor,
      ) as MessageHandlerMeta | undefined;

      if (!meta) continue;

      if (meta.direction === 'income') {
        this.logger.debug(
          `Registering income handler: "${meta.type}" → ${instance.constructor.name}`,
        );
        this.incomeHandlers.set(meta.type, instance as IncomeBaseMessageHandler);
      }

      if (meta.direction === 'outcome') {
        this.logger.debug(
          `Registering outcome handler: "${meta.type}" → ${instance.constructor.name}`,
        );
        this.outcomeHandlers.set(meta.type, instance as OutcomeBaseMessageHandler);
      }
    }

    this.logger.log(
      `Registered ${this.incomeHandlers.size} income and ${this.outcomeHandlers.size} outcome handlers.`,
    );
  }

  getIncomeHandler(type: string): IncomeBaseMessageHandler | undefined {
    return this.incomeHandlers.get(type);
  }

  getOutcomeHandler(type: string): OutcomeBaseMessageHandler | undefined {
    return this.outcomeHandlers.get(type);
  }

  getHandlerDescriptors(): {
    direction: 'income' | 'outcome';
    type: string;
    className: string;
  }[] {
    const descriptors: any[] = [];

    for (const [type, handler] of this.incomeHandlers) {
      descriptors.push({
        direction: 'income',
        type,
        className: handler.constructor.name,
      });
    }

    for (const [type, handler] of this.outcomeHandlers) {
      descriptors.push({
        direction: 'outcome',
        type,
        className: handler.constructor.name,
      });
    }

    return descriptors;
  }
}
