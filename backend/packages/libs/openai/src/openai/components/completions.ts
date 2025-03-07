import { getLogger } from '@saito/common';
// import OpenAI from 'ollama';
import { ChatCompletionChunk } from 'openai/resources/chat';
import OpenAI from 'openpipe/openai';
import { WrappedStream } from 'openpipe/openai/streaming';
import {
  concatMap,
  distinctUntilChanged,
  EMPTY,
  from,
  Observable,
  of,
  scan,
  tap,
  timeInterval,
} from 'rxjs';

export type TemporaryStreamInput = {
  content: string;
};

const kThrottleInterval = 1000;

export function debounceWrappedStream(stream: WrappedStream) {
  return new Observable<ChatCompletionChunk>(subscriber => {
    (async () => {
      for await (const part of stream) {
        subscriber.next(part);
      }

      subscriber.complete();
    })();
  }).pipe(
    timeInterval(),
    scan(
      (acc, curr) => {
        const isStop = curr.value.choices[0]?.finish_reason === 'stop';
        const content = curr.value.choices[0]?.delta?.content || '';

        // if not pass the interval and is not stop, then accumulate the interval and value
        if (
          acc.accumulatedInterval + curr.interval < kThrottleInterval &&
          !isStop
        ) {
          acc.accumulatedInterval += curr.interval;
          acc.pendingValue += content;
          return acc;
        }

        acc.accumulatedValue += acc.pendingValue;
        acc.accumulatedValue += content;

        acc.pendingValue = '';
        acc.accumulatedInterval = 0;
        return acc;
      },
      {
        accumulatedInterval: 0,
        accumulatedValue: '',
        pendingValue: '',
      },
    ),
    concatMap(v => {
      if (v.pendingValue.length > 0) {
        return EMPTY;
      }
      if (v.accumulatedValue.length === 0) {
        return EMPTY;
      }
      return of(v.accumulatedValue);
    }),
    tap({
      next: value => {
        getLogger().debug(`openai-stream: ${value}`);
      },
      complete: () => {
        getLogger().debug(`openai-stream: complete`);
      },
    }),
    distinctUntilChanged(),
  );
}

export function completions(api: OpenAI) {
  return {
    createSteam$(input: TemporaryStreamInput) {
      return new Observable<string>(subscriber => {
        api.chat.completions
          .create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: input.content }],
            stream: true,
          })
          .then(stream => {
            return from(
              (async () => {
                for await (const part of stream) {
                  const value = part.choices[0]?.delta?.content || '';
                  subscriber.next(value);
                }

                subscriber.complete();
              })(),
            );
          })
          .catch(err => {
            subscriber.error(err);
          });
      }).pipe(
        timeInterval(),
        scan(
          (acc, curr) => {
            if (acc.accumulatedInterval + curr.interval < kThrottleInterval) {
              acc.accumulatedInterval += curr.interval;
              acc.pendingValue += curr.value;
              return acc;
            }
            acc.accumulatedValue += acc.pendingValue;
            acc.accumulatedValue += curr.value;

            acc.pendingValue = '';
            acc.accumulatedInterval = 0;
            return acc;
          },
          {
            accumulatedInterval: 0,
            accumulatedValue: '',
            pendingValue: '',
          },
        ),
        concatMap(v => {
          if (v.pendingValue.length > 0) {
            return EMPTY;
          }
          if (v.accumulatedValue.length === 0) {
            return EMPTY;
          }
          return of(v.accumulatedValue);
        }),
        tap({
          next: value => {
            getLogger().debug(`openai: ${value}`);
          },
          complete: () => {
            getLogger().debug(`openai: complete`);
          },
        }),
        distinctUntilChanged(),
      );
    },
  };
}
