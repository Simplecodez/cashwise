interface IAppError extends Error {
  message: string;
  statusCode: number;
  status: string;
  code?: string;
  type?: string;
  isOperational: boolean;
}

// Custom error class
class AppError extends Error implements IAppError {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode === 500 ? 'Error' : 'fail';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export { AppError, IAppError };
