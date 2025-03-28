/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

import { OllamaModel } from "./ollama/ollama.schema";
import { MinerModel } from "./miner/miner.schema";
import { DeviceSchema } from './device-status/device-status.schema';


export const m = {
  ollama<T extends keyof typeof OllamaModel>(type: T) {
    return OllamaModel[type]
  },
  miner<T extends keyof typeof MinerModel>(type: T) {
    return MinerModel[type];
  },
  deviceStatus<T extends keyof typeof DeviceSchema>(type: T) {
    return DeviceSchema[type];
  }
};

export const kModel = m;
