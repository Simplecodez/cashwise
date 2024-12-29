import Joi from 'joi';
import countries from 'i18n-iso-countries';

countries.registerLocale(require('i18n-iso-countries/langs/en.json'));
const countryNames = Object.values(countries.getNames('en'));
const allowedNationalities = ['Nigeria'];

const nameSchema = Joi.string()
  .pattern(/[a-zA-Z'-\\s]+$/)
  .min(3)
  .max(30)
  .message("Please enter your first name. It can only contain [a-z, A-Z, ' and -].")
  .required();

const usernameSchema = Joi.string()
  .min(3)
  .max(30)
  .pattern(/^[a-zA-Z0-9_]+$/)
  .required()
  .messages({
    'string.base': 'Username must be a string.',
    'string.empty': 'Username cannot be empty.',
    'string.min': 'Username must be at least 3 characters long.',
    'string.max': 'Username cannot be longer than 30 characters.',
    'string.pattern.base': 'Username can only contain letters, numbers, and underscores.',
    'any.required': 'Username is required.'
  });

const emailSchema = Joi.string()
  .email({
    minDomainSegments: 2,
    tlds: { allow: ['com', 'net'] }
  })
  .message('Please provide a valid email')
  .required();

const phoneNumberSchema = Joi.string()
  .min(10)
  .message(
    'Phone number must be exactly 10 digits. Please exclude the country code and leading zero'
  )
  .max(10)
  .message(
    'Phone number must be exactly 10 digits. Please exclude the country code and leading zero'
  )
  .required();

const countryCodeSchema = Joi.string()
  .min(2)
  .max(6)
  .message('Please provide a valid phone number')
  .required();

const dateOfBirthSchema = Joi.date()
  .iso()
  .max('now')
  .min('01-01-1923')
  .messages({
    'date.base': 'Date of birth must be a valid date.',
    'date.max': 'Date of birth cannot be in the future.',
    'date.min': 'Date of birth cannot be older than 100 years.'
  })
  .required();

const genderSchema = Joi.string().valid('male', 'female', 'others').required().messages({
  'any.only': 'Gender must be one of the following: male, female, or others.',
  'string.base': 'Gender must be a string.',
  'any.required': 'Gender is a required field.'
});

const addressSchema = Joi.string()
  .min(10)
  .max(1000)
  .pattern(/^[a-zA-Z0-9\s,.'-]+$/)
  .required()
  .messages({
    'string.base': 'Address must be a string.',
    'string.empty': 'Address is required.',
    'string.min': 'Address must be at least 10 characters long.',
    'string.max': 'Address cannot exceed 300 characters.',
    'string.pattern.base': 'Address contains invalid characters.'
  });

// const bvnSchema = Joi.string()
//   .pattern(/^\d{11}$/)
//   .message('BVN must be exactly 11 digits long.')
//   .required();

const passwordSchema = Joi.string()
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
  .max(100)
  .required()
  .messages({
    'string.pattern.base':
      'Password must be at least 8 characters long, include uppercase and lowercase letters, a digit, and a special character.',
    'string.empty': 'Password is required.'
  });

export { passwordSchema };

const passwordConfirmSchema = Joi.any().valid(Joi.ref('password')).required().messages({
  'any.only': 'Passwords do not match. Please make sure the passwords match.'
});

const nationalitySchema = Joi.string()
  .valid(...countryNames)
  .required()
  .messages({
    'any.only': 'Please provide a valid nationality.',
    'string.empty': 'Nationality is required.'
  });

const countryOfResidenceSchema = Joi.string()
  .valid(...allowedNationalities)
  .required()
  .messages({
    'any.only': 'Country of residence must be Nigeria.',
    'string.empty': 'Country of residence is required.'
  });

const sessionIdSchema = Joi.string()
  .uuid({ version: ['uuidv4'] })
  .required();

const otpSchema = Joi.string().length(6).required();

export const registrationDataValidator = Joi.object({
  userData: Joi.object({
    firstName: nameSchema,
    lastName: nameSchema,
    username: usernameSchema,
    email: emailSchema,
    dateOfBirth: dateOfBirthSchema,
    gender: genderSchema,
    address: addressSchema,
    nationality: nationalitySchema,
    countryOfResidence: countryOfResidenceSchema,
    password: passwordSchema,
    confirmPassword: passwordConfirmSchema
  }).required(),
  sessionId: sessionIdSchema
});

export const sendPhoneNumberOTPValidator = Joi.object({
  phoneNumber: phoneNumberSchema,
  countryCode: countryCodeSchema
});

export const signinValidator = Joi.object({
  user: Joi.string().required(),
  password: Joi.string().required()
});

export const verifyPhoneNumberValidator = Joi.object({
  otp: otpSchema,
  sessionId: sessionIdSchema
});

export const verifyEmailValidator = Joi.object({
  email: emailSchema,
  otp: otpSchema
});

export const resendVerifyEmailOtpValidator = Joi.object({
  email: emailSchema
});
