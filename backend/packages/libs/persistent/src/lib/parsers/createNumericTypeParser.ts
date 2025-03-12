import { TypeParser } from 'slonik';

const numericParser = (value: string) => {
  return Number(value);
};

export const createNumericTypeParser = (): TypeParser => {
  return {
    name: 'numeric',
    parse: numericParser,
  };
};
