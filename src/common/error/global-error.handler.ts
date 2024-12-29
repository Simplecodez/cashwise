import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../http-codes/codes';

export class GlobalErrorHandler {
  static handleValidationError(error: any) {
    let message = error.message;
    const formattedError = new AppError(message, HttpStatus.BAD_REQUEST);
    return formattedError;
  }

  static handleDuplicateDB(err: any): AppError {
    let message: string = 'Email or phone number already exist';
    return new AppError(message, 400);
  }

  static handleJWTError() {
    return new AppError('Invalid token. Please log in again!', 401);
  }

  static handleJWTExpiredError() {
    return new AppError('Your token has expired! Please log in again.', 401);
  }

  static sendError(err: AppError, res: Response) {
    // console.error('error', err);
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    // Log the error
    console.error('error', err);
    // Send generic message.
    return res.status(500).json({
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

      this.sendError(error, res);
    };
  }
}
