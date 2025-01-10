import Joi from 'joi';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../../common/http-codes/codes';
import { KycLevel } from '../../user/enum/kyc.enum';

const accountTypeSchema = Joi.string().valid('savings', 'current').required().messages({
  'any.only': 'Account type must be either "savings" or "current".',
  'any.required': 'Account type is required.'
});

const accountNameSchema = Joi.string()
  .min(3)
  .max(30)
  .pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/)
  .optional()
  .messages({
    'string.pattern.base':
      'Account name can only contain letters, numbers, and underscores.',
    'string.min': 'Account name must be at least 3 characters long.',
    'string.max': 'Account name must not exceed 30 characters.'
  });

const accountCreationValidator = Joi.object({
  accountType: accountTypeSchema,
  accountName: accountNameSchema
});

export const getOneUserAccountValidator = Joi.object({
  id: Joi.string()
    .uuid({ version: ['uuidv4'] })
    .required()
});

export const confirmAccountValidator = Joi.object({
  accountNumber: Joi.string().length(10)
});

export async function accountCreateValidation(
  reqBody: {
    accountType: string;
    accountName: string;
  },
  userKycLevel: KycLevel
) {
  await accountCreationValidator.validateAsync(reqBody);
  if (userKycLevel === KycLevel.LEVEL_0)
    throw new AppError(
      'Please complete your KYC before trying to create an account',
      HttpStatus.FORBIDDEN
    );
}
