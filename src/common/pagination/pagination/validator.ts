import Joi from 'joi';

export const paginationValidator = Joi.object({
  nextCursor: Joi.string().base64({ paddingRequired: false }).optional(),
  limit: Joi.number().integer().min(2).max(15).required()
});
