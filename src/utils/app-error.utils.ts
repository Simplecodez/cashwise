import { HttpStatus } from '../common/http-codes/codes';

interface IAppError extends Error {
  message: string;
  statusCode: number;
  status: string;
  code?: string;
  type?: string;
  isOperational: boolean;
}

class AppError extends Error implements IAppError {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: HttpStatus) {
    super(message);
    this.statusCode = statusCode;
    this.status = this.getStatusLabel(statusCode);
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  private getStatusLabel(statusCode: number): string {
    const labels: Record<number, string> = {
      500: 'error',
      202: 'pending'
    };
    return labels[statusCode] || 'fail';
  }
}

export { AppError, IAppError };
