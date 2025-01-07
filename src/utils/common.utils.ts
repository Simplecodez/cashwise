import otpGenerator from 'otp-generator';
import jwt from 'jsonwebtoken';
import { CountryCode, parsePhoneNumber } from 'libphonenumber-js/max';
import { AppError } from './app-error.utils';
import { HttpStatus } from '../common/http-codes/codes';
import bcrypt from 'bcrypt';

export class CommonUtils {
  static generateOtp(options: {
    size: number;
    digit: boolean;
    upper: boolean;
    lower: boolean;
  }): string {
    const otp = otpGenerator.generate(options.size, {
      digits: options.digit,
      upperCaseAlphabets: options.upper,
      lowerCaseAlphabets: options.lower,
      specialChars: false
    });

    return otp;
  }

  static validatePhoneNumber(phoneNumber: string, countryCode: string) {
    try {
      const parsedPhoneNumber = parsePhoneNumber(phoneNumber, countryCode as CountryCode);

      if (
        !(
          parsedPhoneNumber.isValid() &&
          parsedPhoneNumber.country === countryCode.toUpperCase()
        )
      ) {
        throw new AppError(
          'Invalid phone number or country code.',
          HttpStatus.BAD_REQUEST
        );
      }

      return this.formatPhoneNumber(parsedPhoneNumber.number);
    } catch (error: any) {
      if (error?.message === 'INVALID_COUNTRY') {
        throw new AppError(
          'Invalid phone number or country code.',
          HttpStatus.BAD_REQUEST
        );
      }
    }
  }

  private static formatPhoneNumber(phoneNumber: string) {
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+' + phoneNumber;
    }

    return phoneNumber;
  }

  static signToken(payload: { id: string; tokenVersion: string }, expiresIn: string) {
    return jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn
    });
  }

  static verifyJWTToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      });
    });
  }

  static async verifyPassword(
    candidatePassword: string,
    userPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, userPassword);
  }

  static formatDate(date: Date) {
    if (isNaN(date.getTime())) return null;

    return date.toISOString().split('T')[0];
  }
}
