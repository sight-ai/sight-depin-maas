import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { MinerService } from "@saito/miner";
import { MockedMinerService } from "./mock/miner.service";

jest.setTimeout(60e3);

const OLLAMA_URL = 'http://localhost:11434';

/**
 * Utility function to compare headers, skipping those that
 * are typically dynamic or auto-generated.
 */
function compareHeaders(
  expectedHeaders: Record<string, string>,
  actualHeaders: Record<string, string>,
) {
  const skipKeys = ['date', 'transfer-encoding', 'content-length'];
  for (const key of Object.keys(expectedHeaders)) {
    if (skipKeys.includes(key.toLowerCase())) {
      continue;
    }
    expect(actualHeaders[key.toLowerCase()]).toEqual(expectedHeaders[key]);
  }
}

/**
 * Compare only the existence of properties in expected vs. actual.
 * - Recursively checks objects.
 * - Checks array length and then recurses on each element.
 * - Does not compare actual values—only ensures the same "shape."
 */
function compareBodyExistence(expected: any, actual: any) {
  // If expected is null/undefined, not much to check.
  if (expected == null) {
    return;
  }

  // Ensure actual is defined if expected is an object or array.
  expect(actual).toBeDefined();

  // If both are arrays, compare length and recurse per index.
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true);
    expect(actual.length).toBe(expected.length);
    for (let i = 0; i < expected.length; i++) {
      compareBodyExistence(expected[i], actual[i]);
    }
    return;
  }

  // If both are objects, ensure actual has at least the same keys,
  // and recurse down.
  if (typeof expected === 'object') {
    for (const key of Object.keys(expected)) {
      expect(actual).toHaveProperty(key);
      compareBodyExistence(expected[key], actual[key]);
    }
  }

  // If expected is a primitive (string, number, etc.),
  // we do not compare the exact value—only presence—so do nothing else.
}

// ---------------------------------------------------------
// Helper #3: Grab NDJSON from a streaming response.
// ---------------------------------------------------------
async function readNdjsonResponse(
  urlOrApp: string | INestApplication,
  endpoint: string,
  payload: any,
): Promise<{ headers: Record<string, string>; ndjsonLines: string[] }> {
  return new Promise((resolve, reject) => {
    request(urlOrApp)
      .post(endpoint)
      .send(payload)
      .expect(200)
      .parse((res, callback) => {
        let dataBuffer = '';
        res.on('data', (chunk: Buffer) => {
          dataBuffer += chunk.toString();
        });
        res.on('end', () => {
          callback(null, dataBuffer);
        });
      })
      .end((err, res) => {
        if (err) {
          return reject(err);
        }
        const rawBody = (res.body ?? '').trim();
        const lines = rawBody ? rawBody.split('\n') : [];
        resolve({ headers: res.headers, ndjsonLines: lines });
      });
  });
}

describe('OllamaTest (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).overrideProvider(MinerService)
      .useClass(MockedMinerService) // override with your test service
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/generate (POST) (non-stream)', async () => {
    // make model generate to POST - /api/generate
    // it should return the same as POST - http://localhost:13434/api/generate (ollama)
    // be sure to check both response header and body
    const generateRequest = {
      model: 'gemma3:4b',
      prompt: 'Hello from Nest test!',
      stream: false,
    };

    const ollamaResponse = await request(OLLAMA_URL)
      .post('/api/generate')
      .send(generateRequest)
      .expect(200);

    console.log(ollamaResponse.headers);
    console.log(ollamaResponse.body);

    // 2. Call local Nest endpoint
    const localResponse = await request(app.getHttpServer())
      .post('/api/generate')
      .send(generateRequest)
      .expect(200);

    // Compare headers
    compareHeaders(ollamaResponse.headers, localResponse.headers);

    // Compare only property existence for the response body
    compareBodyExistence(ollamaResponse.body, localResponse.body);
  });

  it('/api/generate (POST) (stream)', async () => {
    // make model generate to POST - /api/generate
    // it should return the same as POST - http://localhost:13434/api/generate (ollama)
    // be sure to check both response header and body

    const generateRequest = {
      model: 'gemma3:4b',
      prompt: 'Hello from Nest test!',
      stream: true,
    };

    // 1) Ollama NDJSON
    const ollamaResult = await readNdjsonResponse(
      OLLAMA_URL,
      '/api/generate',
      generateRequest,
    );
    console.log('Ollama Headers:', ollamaResult.headers);
    console.log('Ollama NDJSON lines:', ollamaResult.ndjsonLines);

    // 2) Local NDJSON
    const localResult = await readNdjsonResponse(
      app.getHttpServer(),
      '/api/generate',
      generateRequest,
    );
    console.log('Local Headers:', localResult.headers);
    console.log('Local NDJSON lines:', localResult.ndjsonLines);

    // ---------------------------------------------------------
    // 1. Compare headers
    // ---------------------------------------------------------
    compareHeaders(ollamaResult.headers, localResult.headers);

    // ---------------------------------------------------------
    // 2. Compare NDJSON line count (optional)
    // ---------------------------------------------------------
    expect(localResult.ndjsonLines.length).toBe(
      ollamaResult.ndjsonLines.length,
    );

    // ---------------------------------------------------------
    // 3. Compare body existence within each line
    // ---------------------------------------------------------
    // Typically, you'd parse each line as JSON:
    const ollamaObjects = ollamaResult.ndjsonLines.map((line) => JSON.parse(line));
    const localObjects = localResult.ndjsonLines.map((line) => JSON.parse(line));

    // Compare array length again (just in case).
    expect(localObjects.length).toBe(ollamaObjects.length);

    // For each line, compare the shape (keys, arrays, etc.)
    for (let i = 0; i < ollamaObjects.length; i++) {
      compareBodyExistence(ollamaObjects[i], localObjects[i]);
    }
  });

  it('/api/chat (POST) (non-stream)', async () => {
    // make model generate to POST - /api/chat
    // it should return the same as POST - http://localhost:13434/api/chat (ollama)
    // be sure to check both response header and body
    const chatRequest = {
      "model": "gemma3:4b",
      "options": {
        "num_predict": 5
      },
      "messages": [
        {
          "role": "user",
          "content": "ping"
        }
      ],
      stream: false
    }

    const ollamaResponse = await request(OLLAMA_URL)
      .post('/api/chat')
      .send(chatRequest)
      .expect(200);

    console.log(ollamaResponse.headers);
    console.log(ollamaResponse.body);

    // 2. Call local Nest endpoint
    const localResponse = await request(app.getHttpServer())
      .post('/api/chat')
      .send(chatRequest)
      .expect(200);

    // Compare headers
    compareHeaders(ollamaResponse.headers, localResponse.headers);

    // Compare only property existence for the response body
    compareBodyExistence(ollamaResponse.body, localResponse.body);
  });

  it('/api/chat (POST) (stream)', async () => {
    // make model generate to POST - /api/chat
    // it should return the same as POST - http://localhost:13434/api/chat (ollama)
    // be sure to check both response header and body

    const chatRequest = {
      "model": "gemma3:4b",
      "options": {
        "num_predict": 5
      },
      "messages": [
        {
          "role": "user",
          "content": "ping"
        }
      ],
      stream: false
    }

    // 1) Ollama NDJSON
    const ollamaResult = await readNdjsonResponse(
      OLLAMA_URL,
      '/api/chat',
      chatRequest,
    );
    console.log('Ollama Headers:', ollamaResult.headers);
    console.log('Ollama NDJSON lines:', ollamaResult.ndjsonLines);

    // 2) Local NDJSON
    const localResult = await readNdjsonResponse(
      app.getHttpServer(),
      '/api/chat',
      chatRequest,
    );
    console.log('Local Headers:', localResult.headers);
    console.log('Local NDJSON lines:', localResult.ndjsonLines);

    // ---------------------------------------------------------
    // 1. Compare headers
    // ---------------------------------------------------------
    compareHeaders(ollamaResult.headers, localResult.headers);

    // ---------------------------------------------------------
    // 2. Compare NDJSON line count (optional)
    // ---------------------------------------------------------
    expect(localResult.ndjsonLines.length).toBe(
      ollamaResult.ndjsonLines.length,
    );

    // ---------------------------------------------------------
    // 3. Compare body existence within each line
    // ---------------------------------------------------------
    // Typically, you'd parse each line as JSON:
    const ollamaObjects = ollamaResult.ndjsonLines.map((line) => JSON.parse(line));
    const localObjects = localResult.ndjsonLines.map((line) => JSON.parse(line));

    // Compare array length again (just in case).
    expect(localObjects.length).toBe(ollamaObjects.length);

    // For each line, compare the shape (keys, arrays, etc.)
    for (let i = 0; i < ollamaObjects.length; i++) {
      compareBodyExistence(ollamaObjects[i], localObjects[i]);
    }
  });
});
