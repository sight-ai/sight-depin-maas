import { ModelOfOpenAI } from '@saito/models';
import { z } from 'zod';
import { getOpenAIModelName } from './openai-config';

export function makeConversation(
  intent: string,
  historyMessages: ModelOfOpenAI<'request_message'>[],
) {
  const historyMessagesConcat = historyMessages
    .filter(message => ['user', 'assistant'].includes(message.role))
    .map(message => `${message.role}: ${message.content}`)
    .join('\n')

  return `\n### HistoryMessages
  ${historyMessagesConcat}
  ### CurrentMessage
  user: ${intent}
  `
}

export const extractMemoryFunctionCall: ModelOfOpenAI<'$function'> = {
  name: 'create_memory',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: [
          "basic_info",
          "contacts",
          "preference",
          "events",
          "other"
        ]},
      name: { type: 'string', description: "Name of the memory entry. for example language_spoken" },
      content: { type: 'string', description: "Content of the memory entry. Can be a sentence" },
      sensitivity: {
        type: 'string',
        enum: ['very_low', 'low', 'medium', 'high', 'extreme'],
      },
    },
    required: ['name'],
  },
};

export const ExtractMemoryFuncCallResultSchema = z.object({
  category: z.string(),
  name: z.string(),
  content: z.string(),
  sensitivity: z.enum(['very_low', 'low', 'medium', 'high', 'extreme']),
});

export type ExtractMemoryFuncCallResult = z.infer<typeof ExtractMemoryFuncCallResultSchema>;

export function makeExtractMemoryRequests(
  conversation: string,
): ModelOfOpenAI<'chat_completion_request'> {
  const systemPrompt = `
You are a service that memorizes new information introduced by users from their conversation history and the current message.

In each current message, evaluate whether any new information has been introduced that hasn't been captured in the history. If so, translate this new information into a JSON program object using the provided tools. For example, if a user mentions a preference, new location, or any other details not previously recorded, this should be captured.

Be cautious not to repeat or memorize information already presented in the history. Focus on identifying and extracting only the novel data presented in the user's current message. If there is nothing new to memorize, return { "name": "null"}

Take a deep breath and think carefully about the information. This is crucial for ensuring all details are accurately captured and memorized for future interactions.

The following is a user request:

${conversation}

Current Time: ${new Date().toISOString()}, ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
`;

  return {
    model: getOpenAIModelName(),
    messages: [{ role: 'system', content: systemPrompt }],
    functions: [extractMemoryFunctionCall],
    function_call: { name: extractMemoryFunctionCall.name },
  };
}

// RETRIEVER

export const retrieveMemoryFunctionCall: ModelOfOpenAI<'$function'> = {
  name: 'retrieve_memory',
  description: 'A function that helps to retrieve memory to boost answer quality.',
  parameters: {
    type: 'object',
    properties: {
      memory_ids: {
        type: "array",
        description: "Array of memory IDs to retrieve.",
        items: {
          "type": "string",
          "description": "A memory ID used for retrieval."
        }
      },
      context: {
        "type": "string",
        "description": "Additional context for how should handle relevant memories. Should be simple and clear."
      }
    },
    required: [
      "memory_ids",
      "context"
    ],
  },
};

export const RetrieveMemoryFuncCallResultSchema = z.object({
  memory_ids: z.array(z.string()),
  context: z.string()
});

export type RetrieveMemoryFuncCallResult = z.infer<typeof RetrieveMemoryFuncCallResultSchema>;

export function makeRetrieveMemoryRequests(
  conversation: string,
  memoryCatalog: string
): ModelOfOpenAI<'chat_completion_request'> {
  const systemPrompt = `
You are a service that try to retrieve memory to enhance the response quality.

Evaluate whether any memory from memory catalog that are related to the conversation. If so, call retrieve_memory with memory id and offer a clear prompt to describe how the memory is expect.

Take a deep breath and think carefully about the information. This is crucial for ensuring all details are accurately captured and memorized for future interactions.

The following is a user request:

${conversation}

The following is memory catalog, only pick memory from this list:

${memoryCatalog}

Current Time: ${new Date().toISOString()}, ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
`;

  return {
    model: getOpenAIModelName(),
    messages: [{ role: 'system', content: systemPrompt }],
    functions: [retrieveMemoryFunctionCall],
    function_call: { name: retrieveMemoryFunctionCall.name },
  };
}


