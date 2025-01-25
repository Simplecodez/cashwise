import Joi from 'joi';

export const paginationValidator = Joi.object({
  nextCursor: Joi.string().optional().base64({ paddingRequired: false }),
  limit: Joi.number().integer().min(5).max(15).required()
});
