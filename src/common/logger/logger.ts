import winston from 'winston';
import morgan, { StreamOptions } from 'morgan';
import { Request } from 'express';
import { singleton } from 'tsyringe';

winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
});

@singleton()
export class Logger {
  private readonly logger: winston.Logger;
  private readonly transports = [new winston.transports.Console()];

  constructor() {
    this.logger = winston.createLogger({
      level: this.level(),
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4
      },
      format: this.format(),
      transports: this.transports
    });
  }

  private level() {
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : 'http';
  }

  private format() {
    return winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.colorize({ all: true }),
      winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
    );
  }

  private configMorganTokens() {
    morgan.token('ip', (req: Request) => req.ip);
  }

  morganMiddleware() {
    this.configMorganTokens();
    return morgan(':ip :method :url :status :res[content-length] - :response-time ms', {
      stream: {
        write: (message) => this.logger.http(message)
      },
      skip: () => {
        const env = process.env.NODE_ENV || 'development';
        return env !== 'development';
      }
    });
  }

  get appLogger() {
    return this.logger;
  }
}
