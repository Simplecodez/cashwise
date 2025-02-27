import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../http-codes/codes';
import { AxiosError } from 'axios';
import { container } from 'tsyringe';
import { Logger } from '../logger/logger';
const logger = container.resolve(Logger);

export class GlobalErrorHandler {
  static handleValidationError(error: any) {
    let message = error.message;
    const formattedError = new AppError(message, HttpStatus.BAD_REQUEST);
    return formattedError;
  }

  static handleDuplicateDB(err: any): AppError {
    let message: string = 'Email or username already exist';
    return new AppError(message, 400);
  }

  static handleBadJsonFormatError(): AppError {
    return new AppError(
      'Invalid JSON format, please check your request body.',
      HttpStatus.BAD_REQUEST
    );
  }

  static handleJWTError() {
    return new AppError('Invalid token. Please log in again!', HttpStatus.UNAUTHORIZED);
  }

  static handleJWTExpiredError() {
    return new AppError('Your token has expired! Please log in again.', HttpStatus.UNAUTHORIZED);
  }

  static handleAxiosError(error: AxiosError<any>) {
    if (error.response?.status === 404) {
      return new AppError('Invalid or expired token', HttpStatus.UNAUTHORIZED);
    }

    if (error.response?.status === 400) return new AppError('Bad request', HttpStatus.BAD_REQUEST);
    if (error.response?.status === 422 && error.response?.data.code === 'invalid_bank_code')
      return new AppError('Invalid bank code', HttpStatus.BAD_REQUEST);

    return error;
  }

  static sendError(err: AppError, res: Response) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }

    logger.appLogger.error(err.message, err.stack);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Sorry, an error occurred. Please try again later.'
    });
  }

  static errorHandler() {
    return (error: any, req: Request, res: Response, next: NextFunction) => {
      if (error.name === 'ValidationError' && error.isJoi)
        error = this.handleValidationError(error);
      if (error.code === '23505') error = this.handleDuplicateDB(error);
      if (error.name === 'JsonWebTokenError') error = this.handleJWTError();
      if (error.name === 'TokenExpiredError') error = this.handleJWTExpiredError();
      if (error.isAxiosError) error = this.handleAxiosError(error);
      if (error instanceof SyntaxError && 'body' in error) error = this.handleBadJsonFormatError();

      this.sendError(error, res);
    };
  }
}
