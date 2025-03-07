import { HTTPError } from 'got-cjs';
import { stringifyJSON } from '../utils/bitint-json';

export function parseErrorDetail(error: unknown): string {
  if (error instanceof HTTPError) {
    return `http-error[${error.response.statusCode}]: ${error.message}
url: ${error.response.url}
code: ${error.code}
request: ${stringifyJSON(error.request.options.toJSON())}
response: ${stringifyJSON(error.response.body)}
response-headers: ${stringifyJSON(error.response.rawHeaders)}
stack: ${error.stack}
`;
  }

  if (error instanceof Error) {
    return `${error.message}
${error.stack}
`;
  }

  return String(error);
}
