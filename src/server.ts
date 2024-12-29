import 'dotenv/config';
import 'reflect-metadata';
import { container } from 'tsyringe';
import './configs/di/container';
import { App } from './app';

import { DatabaseConnection } from './data-source/data-source';

const app = container.resolve(App);
const datasource = container.resolve(DatabaseConnection);

datasource
  .initialize()
  .then(() => {
    console.log('Data source initialized');
    app.start(3000);
  })
  .catch((err) => {
    console.error('Error during Data Source initialization:', err);
  });
