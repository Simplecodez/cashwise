import { DataSourceOptions } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

export default class TypeOrmConfig {
  static getOrmConfig(): DataSourceOptions {
    return {
      type: "postgres",
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT as string),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: true,
      entities: [__dirname + "/../**/*.entity{.ts,.js}"],
      migrations: ["src/migration/**/*{.ts,.js}"],
      ssl: Boolean(process.env.DB_SSL) || false,
      namingStrategy: new SnakeNamingStrategy(),
      useUTC: true,
    };
  }
}
