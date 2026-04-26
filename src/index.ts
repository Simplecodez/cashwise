import 'dotenv/config';
import 'reflect-metadata';
import { container } from 'tsyringe';
import './configs/di/container';
import { App } from './app';
import { DatabaseConnection } from './data-source/data-source';
import { Logger } from './common/logger/logger';

const app = container.resolve(App);
const logger = container.resolve(Logger);
const datasource = container.resolve(DatabaseConnection);

datasource
  .initialize()
  .then(() => {
    logger.appLogger.info('Data source initialized');
    app.start(3000);
  })
  .catch((err) => {
    logger.appLogger.error('Error during Data Source initialization:', err);
    process.exit(1);
  });
