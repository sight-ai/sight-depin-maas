import { OpenAIModelName } from '@saito/models';
import { z } from 'zod';

const OpenAIConfigSchema = z.object({
  model: OpenAIModelName.default('gpt-4o'),
});

const openaiConfig = OpenAIConfigSchema.parse({});

export const getOpenAIConfig = () => openaiConfig;

export const setOpenAIConfig = (config: typeof openaiConfig) => {
  openaiConfig.model = config.model;
};

export const getOpenAIModelName = () => openaiConfig.model;
