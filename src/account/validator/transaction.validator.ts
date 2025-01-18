import Joi from 'joi';

const amountSchema = Joi.number().positive().greater(100).required();
const accountIdSchema = Joi.string()
  .uuid({ version: ['uuidv4'] })
  .required();

export const initializeTransactionValidator = Joi.object({
  provider: Joi.valid('paystack', 'stripe').required(),
  amount: amountSchema,
  receiverAccountId: accountIdSchema
});

export const internalTransferValidator = Joi.object({
  senderAccountId: accountIdSchema,
  amount: amountSchema,
  receiverAccountNumber: Joi.string().length(10).required(),
  remark: Joi.string().length(120).optional()
});
