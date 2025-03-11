import { Logger } from '@nestjs/common';
import { stringifyJSON } from '@saito/common';
import {
  SchemaValidationError,
  type Interceptor,
  type QueryResultRow,
} from 'slonik';

const logger = new Logger('pg:interceptor:result-parser');
export const createResultParserInterceptor = (): Interceptor => {
  return {
    // If you are not going to transform results using Zod, then you should use `afterQueryExecution` instead.
    // Future versions of Zod will provide a more efficient parser when parsing without transformations.
    // You can even combine the two – use `afterQueryExecution` to validate results, and (conditionally)
    // transform results as needed in `transformRow`.
    transformRow: (executionContext, actualQuery, row) => {
      const { resultParser } = executionContext;

      if (!resultParser) {
        return row;
      }

      // 处理数据类型转换
      const transformedRow = Object.entries(row).reduce((acc, [key, value]) => {
        if (typeof value === 'bigint') {
          acc[key] = Number(value);
        } else if (key.endsWith('_at') && typeof value === 'number') {
          // 处理日期时间字段
          acc[key] = new Date(value).toISOString();
        } else if (typeof value === 'string' && value.endsWith('n')) {
          // 处理数字字符串
          acc[key] = Number(value.slice(0, -1));
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, unknown>);

      const validationResult = resultParser.safeParse(transformedRow);

      if (validationResult.success === false) {
        logger.error(
          `Validation result: ${stringifyJSON(validationResult, 2)}
          query: ${actualQuery.sql}
          value: ${stringifyJSON(actualQuery.values, 2)}
          ---
          row: ${stringifyJSON(row, 2)}
          `,
        );
        throw new SchemaValidationError(
          actualQuery,
          row,
          validationResult.error.issues,
        );
      }

      return validationResult.data as QueryResultRow;
    },
  };
};
