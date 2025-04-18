/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

import { OllamaModel } from "./ollama/ollama.schema";
import { MinerSchema } from "./miner/miner.schema";
import { DeviceSchema } from './device-status/device-status.schema';


export const m = {
  ollama<T extends keyof typeof OllamaModel>(type: T) {
    return OllamaModel[type]
  },
  miner<T extends keyof typeof MinerSchema>(type: T) {
    return MinerSchema[type];
  },
  deviceStatus<T extends keyof typeof DeviceSchema>(type: T) {
    return DeviceSchema[type];
  }
};

export const kModel = m;
