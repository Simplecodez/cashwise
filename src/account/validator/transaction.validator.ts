import Joi from 'joi';

const amountSchema = Joi.number().positive().greater(100).required();
const accountIdSchema = Joi.string()
  .uuid({ version: ['uuidv4'] })
  .required();
const accountNumberSchema = Joi.string().length(10).required();
const remarkSchema = Joi.string().length(120).optional();

export const getAccountTransactionValidator = Joi.object({
  id: accountIdSchema
});

export const initializeTransactionValidator = Joi.object({
  provider: Joi.valid('paystack', 'stripe').required(),
  amount: amountSchema,
  receiverAccountId: accountIdSchema
});

export const internalTransferValidator = Joi.object({
  senderAccountId: accountIdSchema,
  amount: amountSchema,
  receiverAccountNumber: accountNumberSchema,
  remark: remarkSchema
});

export const verifyExternalAccountValidator = Joi.object({
  accountNumber: accountNumberSchema,
  bankCode: Joi.string().max(10).required()
});

export const initiateExternalTransferValidator = Joi.object({
  customerName: Joi.string().required(),
  accountNumber: accountNumberSchema,
  bankCode: Joi.string().max(10).required(),
  amount: amountSchema,
  senderAccountId: accountIdSchema,
  remark: remarkSchema
});
