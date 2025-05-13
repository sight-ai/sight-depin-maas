/**
 * Utility class for OpenAI format handling
 */
export class OpenAIFormatter {
  /**
   * Check if endpoint is using OpenAI format
   */
  static isOpenAIFormat(endpoint: string): boolean {
    return endpoint.includes('openai') || endpoint.includes('v1');
  }

  /**
   * Parse SSE data (data: {...})
   */
  static parseSSEData(dataStr: string): any {
    if (dataStr === '[DONE]') {
      return { done: true };
    }

    try {
      return JSON.parse(dataStr);
    } catch (err) {
      throw new Error(`Failed to parse SSE data: ${err}`);
    }
  }
}
