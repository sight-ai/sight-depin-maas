import got from 'got-cjs';
import { toFile } from 'openai';
import OpenAI from 'openpipe/openai';
import * as path from 'path';

export async function translateTelegramVoice(client: OpenAI, url: string) {
  const filename = path.basename(url);
  const content = await got(url).buffer();
  const file = await toFile(content, filename, { type: 'oga' });

  const translatedContent = await client.audio.translations.create({
    file,
    model: 'whisper-1',
  });

  return translatedContent.text;
}
