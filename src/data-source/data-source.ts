import { DataSource } from 'typeorm';
import TypeOrmConfig from '../configs/typeorm/typeorm.config';
import { singleton } from 'tsyringe';

@singleton()
export class DatabaseConnection {
  private datasource: DataSource;
  constructor() {
    this.datasource = new DataSource(TypeOrmConfig.getOrmConfig());
  }

  async initialize() {
    return this.datasource.initialize();
  }

  getDataSource() {
    return this.datasource;
  }
}
