import Joi from 'joi';
import { PaginationParams } from './pagination.args';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../http-codes/codes';

export const paginationValidator = Joi.object({
  nextCursor: Joi.string().base64({ paddingRequired: false }).optional(),
  limit: Joi.number().integer().min(5).max(15).required(),
  filter: Joi.string().max(120).optional(),
  reverse: Joi.boolean().optional()
});

export async function validatePaginationParams(queryString: {
  limit: string;
  nextCursor?: string;
  filter?: string;
  reverse?: string;
}) {
  await paginationValidator.validateAsync(queryString);
  const { limit, nextCursor, filter, reverse } = queryString;
  // /users?filters=status=active,kyc=1
  const paginationParams: PaginationParams = {
    first: Number(limit),
    reverse: reverse === 'true' || reverse === 'yes' ? true : false,
    ...(nextCursor ? { after: nextCursor } : {})
  };

  return {
    paginationParams,
    ...(filter ? { parsedFilter: parseFilter(filter) } : {})
  };
}

function parseFilter(filter: string) {
  return filter.split(',').reduce((accummulator, currentValue) => {
    const [column, value] = currentValue.split('=');
    if (!column || !value) {
      throw new AppError(
        `Invalid filter format: ${currentValue}, provide a field and value`,
        HttpStatus.BAD_REQUEST
      );
    }

    accummulator[column] = value;
    return accummulator;
  }, {} as Record<string, string>);
}
