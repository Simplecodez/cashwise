import Joi from 'joi';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../../common/http-codes/codes';
import { KycLevel } from '../enum/kyc.enum';

const kycLevelSchema = Joi.valid('level_1', 'level_2', 'level_3').required();
const documentNumberSchema = Joi.string()
  .pattern(/^\d{11}$/)
  .message('Document number must be 11 digits long.')
  .required();

const kycUpdateValidator = Joi.object({
  level: kycLevelSchema,
  bvn: Joi.when('level', {
    is: 'level_1',
    then: documentNumberSchema,
    otherwise: Joi.forbidden()
  }),
  nin: Joi.when('level', {
    is: 'level_2',
    then: documentNumberSchema,
    otherwise: Joi.forbidden()
  }),
  documentUrlId: Joi.when('level', {
    is: 'level_2',
    then: Joi.string().min(10).max(86).required(),
    otherwise: Joi.when('level', {
      is: 'level_3',
      then: Joi.string().min(10).max(86).required(),
      otherwise: Joi.forbidden()
    })
  })
});

export async function validateKycUpdate(approvedKycLevel: KycLevel, reqBody: any) {
  await kycUpdateValidator.validateAsync(reqBody);

  const levelOrder = ['level_0', 'level_1', 'level_2', 'level_3'];
  const currentLevelIndex = levelOrder.indexOf(approvedKycLevel);
  const requestedLevelIndex = levelOrder.indexOf(reqBody.level);

  if (approvedKycLevel === KycLevel.LEVEL_3)
    throw new AppError(
      'You have already completed the highest level of KYC verification. Further upgrades are not required.',
      HttpStatus.BAD_REQUEST
    );

  if (currentLevelIndex === requestedLevelIndex) {
    throw new AppError(
      "It looks like you've already completed for this level. You can now update to the next level",
      HttpStatus.CONFLICT
    );
  }

  if (requestedLevelIndex < currentLevelIndex)
    throw new AppError("You've already completed this KYC level", HttpStatus.BAD_REQUEST);

  if (requestedLevelIndex !== currentLevelIndex + 1) {
    throw new AppError(
      'Please complete the current and previous levels before progressing',
      HttpStatus.BAD_REQUEST
    );
  }
}
