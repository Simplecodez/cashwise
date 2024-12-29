import { container } from 'tsyringe';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { DatabaseConnection } from '../../data-source/data-source';

const datasource = container.resolve(DatabaseConnection);

container.register<Repository<User>>('UserRepository', {
  useFactory: () => datasource.getDataSource().getRepository(User)
});

container.register('DataSource', {
  useFactory: () => datasource.getDataSource()
});
