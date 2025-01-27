import Joi from 'joi';

const amountSchema = Joi.number().positive().greater(100).required();
const uuidIdSchema = Joi.string()
  .uuid({ version: ['uuidv4'] })
  .required();
const accountNumberSchema = Joi.string().length(10).required();
const remarkSchema = Joi.string().length(120).optional();

export const getAccountTransactionsValidator = Joi.object({
  id: uuidIdSchema
});

export const getAccountTransactionValidator = Joi.object({
  id: uuidIdSchema,
  reference: uuidIdSchema
});

export const initializeTransactionValidator = Joi.object({
  provider: Joi.valid('paystack', 'stripe').required(),
  amount: amountSchema,
  receiverAccountId: uuidIdSchema
});

export const internalTransferValidator = Joi.object({
  senderAccountId: uuidIdSchema,
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
  senderAccountId: uuidIdSchema,
  remark: remarkSchema
});
