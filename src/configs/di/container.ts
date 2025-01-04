import { container, Lifecycle } from 'tsyringe';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { DatabaseConnection } from '../../data-source/data-source';
import { LocalAuth } from '../../user/entities/local-auth.entity';
import { BvnService } from '../../integrations/bvn-verification/bvn-verification.service';
import { Kyc } from '../../user/entities/kyc/kyc.entity';

const datasource = container.resolve(DatabaseConnection);

container.register('DataSource', {
  useFactory: () => datasource.getDataSource()
});

container.register<Repository<User>>('UserRepository', {
  useFactory: () => datasource.getDataSource().getRepository(User)
});

container.register<Repository<LocalAuth>>('LocalAuthRepository', {
  useFactory: () => datasource.getDataSource().getRepository(LocalAuth)
});

container.register<Repository<Kyc>>('KycRepository', {
  useFactory: () => datasource.getDataSource().getRepository(Kyc)
});

container.register('BvnService', BvnService, { lifecycle: Lifecycle.Singleton });
