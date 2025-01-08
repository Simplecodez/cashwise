import { inject, singleton } from 'tsyringe';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';

singleton();
export class AccountService {
  constructor(
    @inject('AccountRepository') private readonly accountRepository: Repository<Account>
  ) {}

  async create(data: Partial<Account>) {
    const newAccount = this.accountRepository.create(data);
    return this.accountRepository.insert(newAccount);
  }
}
