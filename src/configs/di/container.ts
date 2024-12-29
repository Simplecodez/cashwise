import { container } from 'tsyringe';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { DatabaseConnection } from '../../data-source/data-source';
import { LocalAuth } from '../../user/entities/local-auth.entity';

const datasource = container.resolve(DatabaseConnection);

container.register<Repository<User>>('UserRepository', {
  useFactory: () => datasource.getDataSource().getRepository(User)
});

container.register<Repository<LocalAuth>>('LocalAuthRepository', {
  useFactory: () => datasource.getDataSource().getRepository(LocalAuth)
});

container.register('DataSource', {
  useFactory: () => datasource.getDataSource()
});
