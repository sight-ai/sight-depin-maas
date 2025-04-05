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

describe('OllamaTest (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).overrideProvider(MinerService)
      .useClass(MockedMinerService) // override with your test service
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/generate (POST)', async () => {
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
});
