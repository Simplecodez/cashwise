export class BullmqJobError extends Error {
  public name: string;
  public isOperational: boolean;

  constructor(message: string, name: string) {
    super(message);
    this.name = name;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
