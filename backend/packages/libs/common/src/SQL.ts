import { createSqlTag } from 'slonik';
import { DateSqlToken, TimestampSqlToken } from 'slonik/dist/types';
import z from 'zod';

export const SQL = {
  ...createSqlTag({
    typeAliases: {
      id: z.object({
        id: z.number(),
      }),
      void: z.object({}).strict(),
      any: z.any(),
      tx_id: z.object({
        tx_id: z.string(),
      }),
    },
  }),
  get nullish() {
    return {
      date: (date: Date | null | undefined) => {
        if (date == null) {
          return null;
        }
        const dateObj: DateSqlToken = Object.freeze({
          date,
          type: 'SLONIK_TOKEN_DATE',
        });
        return dateObj;
      },
      timestamp: (date: Date | null | undefined) => {
        if (date == null) {
          return null;
        }
        const time: TimestampSqlToken = Object.freeze({
          date,
          type: 'SLONIK_TOKEN_TIMESTAMP',
        });
        return time;
      },
      bigInt: (bigInt: bigint | null | undefined) => {
        if (bigInt == null) {
          return null;
        }
        return bigInt.toString();
      },
      string: (str: string | null | undefined) => {
        if (str == null) {
          return null;
        }
        return str;
      },
      boolean: (bool: boolean | null | undefined) => {
        if (bool == null) {
          return null;
        }
        return bool;
      },
    };
  },
};
