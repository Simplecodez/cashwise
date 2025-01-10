import { inject, singleton } from 'tsyringe';
import { FindOneOptions, Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { createHash, randomBytes } from 'crypto';

@singleton()
export class AccountService {
  constructor(
    @inject('AccountRepository') private readonly accountRepository: Repository<Account>
  ) {}

  async createAccount(data: Partial<Account>) {
    const accountNumber = await this.generateAccountNumber();
    const newAccount = this.accountRepository.create({ ...data, accountNumber });
    return this.accountRepository.insert(newAccount);
  }

  async findOne(options: FindOneOptions<Account>) {
    return this.accountRepository.findOne(options);
  }

  async confirmAccount(accountNumber: string) {
    console.log(accountNumber);
    return this.accountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.user', 'user')
      .select(['account.name', 'user.firstName', 'user.lastName'])
      .where('account.accountNumber = :accountNumber', { accountNumber })
      .getOne();
  }

  async findAll(userId: string) {
    return this.accountRepository.find({ where: { userId } });
  }

  private async generateAccountNumber(): Promise<string> {
    let exists = false;
    let checkCount = 0;
    let accountNumber = '';

    do {
      const timestamp = Date.now().toString();
      const random = randomBytes(8).toString('hex');
      const combined = `${timestamp}${random}`;

      const hash = createHash('sha256').update(combined).digest('hex');

      accountNumber = hash.replace(/\D/g, '').slice(0, 10);
      const options: FindOneOptions<Account> = {
        where: {
          accountNumber
        }
      };
      exists = (await this.findOne(options)) !== null;
      checkCount++;
    } while (exists && checkCount < 3);

    return accountNumber;
  }
}
