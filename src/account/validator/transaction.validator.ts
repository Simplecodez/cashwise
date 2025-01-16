import Joi from 'joi';

export const initializeTransactionValidator = Joi.object({
  provider: Joi.valid('paystack', 'stripe').required(),
  amount: Joi.number().positive().required(),
  receiverAccountId: Joi.string()
    .uuid({ version: ['uuidv4'] })
    .required()
});
