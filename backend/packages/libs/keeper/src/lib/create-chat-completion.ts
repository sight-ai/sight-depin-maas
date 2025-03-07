import { z, ZodRawShape } from "zod";
import { m, ModelOfOpenAI } from "@saito/models";
import OpenAI from "openpipe/openai";
import { getLogger } from "@saito/common";

type ChatCompletionToFunctionCallSuccess<T> = {
  status: 'success';
  result: {
    name: string;
    args: T;
  };
};

type ChatCompletionSuccess = {
  status: 'success';
  message: ModelOfOpenAI<'response_message'>;
};

type ChatCompletionFailed = {
  status: 'failed';
  reason: string;
};

export async function createChatCompletionFromSchema<
  O extends z.ZodObject<ZodRawShape>,
>(
  requestBody: ModelOfOpenAI<'chat_completion_request'>,
  argumentSchema: O,
  client: OpenAI,
): Promise<
  ChatCompletionToFunctionCallSuccess<z.infer<O>> | ChatCompletionFailed
> {
  const result = await createChatCompletionToFunctionCall(requestBody, client);

  console.log(JSON.stringify(result));

  if (result.status === 'failed') {
    return result;
  }

  if (result.message.function_call == null) {
    return {
      status: 'failed',
      reason: `No function_call found in ${JSON.stringify(result.message)}`,
    };
  }

  return processArgumentsFromChatCompletion(
    {
      status: 'success',
      result: {
        name: result.message.function_call.name,
        args: result.message.function_call.arguments,
      },
    },
    argumentSchema,
  );
}

async function processArgumentsFromChatCompletion<
  O extends z.ZodObject<ZodRawShape>,
>(
  result: ChatCompletionFailed | ChatCompletionToFunctionCallSuccess<unknown>,
  schema: O,
): Promise<
  ChatCompletionFailed | ChatCompletionToFunctionCallSuccess<z.infer<O>>
> {
  if (result.status === 'failed') {
    return result;
  }

  const { name, args } = result.result;
  const parsedArgs = schema.safeParse(args);

  if (!parsedArgs.success) {
    return {
      status: 'failed',
      reason: `Failed to parse arguments for function ${name}, ${JSON.stringify(
        parsedArgs.error,
      )}`,
    };
  }

  return {
    status: 'success',
    result: {
      name,
      args: parsedArgs.data,
    },
  };
}

export async function createChatCompletionToFunctionCall(
  requestBody: ModelOfOpenAI<'chat_completion_request'>,
  client: OpenAI,
): Promise<ChatCompletionFailed | ChatCompletionSuccess> {
  const logger = getLogger('chat.completion');
  logger.verbose(`request body: ${JSON.stringify(requestBody, null, 2)}`);

  const parsedRequestBody = m
    .openai('chat_completion_request')
    .parse(requestBody);

  const result = await client.chat.completions.create(parsedRequestBody);
  const response = m.openai('chat_completion_response').parse(result);

  logger.verbose(`response body: ${JSON.stringify(response, null, 2)}`);

  if (response.choices == null || response.choices.length == 0) {
    return {
      status: 'failed',
      reason: `No assistant response found in ${JSON.stringify(
        response.choices,
      )}`,
    };
  }

  return {
    status: 'success',
    message: response.choices[0].message,
  };
}
