import { inject, singleton } from 'tsyringe';
import { FindOneOptions, Repository } from 'typeorm';
import { Account } from '../../entities/account.entity';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../../common/http-codes/codes';
import { AccountStatus } from '../../enum/account.enum';
import { Logger } from '../../../common/logger/logger';

@singleton()
export class AccountValidationService {
  private readonly MINIMUM_ACCOUNT_BALANCE = 10000;

  constructor(
    @inject('AccountRepository')
    private readonly accountRepository: Repository<Account>,
    private readonly logger: Logger
  ) {}

  async validateReceiverAccount(receiverAccountNumber: string) {
    const findReceiverAccountOptions: FindOneOptions<Account> = {
      where: { accountNumber: receiverAccountNumber },
      relations: ['user'],
      select: {
        id: true,
        user: { firstName: true, lastName: true },
        accountNumber: true
      }
    };

    const receiverAccount = await this.accountRepository.findOne(findReceiverAccountOptions);

    if (!receiverAccount) throw new AppError('Invalid receiver account', HttpStatus.NOT_FOUND);

    return {
      receiverName: `${receiverAccount.user.firstName} ${receiverAccount.user.lastName}`,
      accountNumber: receiverAccount.accountNumber,
      accountId: receiverAccount.id
    };
  }

  async validateSenderAccount(userId: string, senderAccountId: string, amount: number) {
    const amountInLowerUnit = Number(amount) * 100;
    const requiredAvailableFunds = amountInLowerUnit + this.MINIMUM_ACCOUNT_BALANCE;

    const findSenderAccountOptions: FindOneOptions<Account> = {
      where: { id: senderAccountId, userId }
    };
    const senderAccount = await this.accountRepository.findOne(findSenderAccountOptions);

    this.guardAgainstInvalidAccountState(senderAccount, userId, requiredAvailableFunds);
  }

  private guardAgainstInvalidAccountState(
    senderAccount: Account | null,
    userId: string,
    requiredAvailableFunds: number
  ) {
    if (!senderAccount) {
      this.logAccountWarning(userId, 'Invalid account');
      throw new AppError('Invalid account', HttpStatus.NOT_FOUND);
    }

    switch (senderAccount.status) {
      case AccountStatus.SUSPENDED:
        this.logAccountWarning(userId, 'Account suspended');
        throw new AppError(
          'Your account has been suspended. Please contact Customer Service for assistance.',
          HttpStatus.FORBIDDEN
        );

      case AccountStatus.LOCKED:
        this.logAccountWarning(userId, 'Account locked');
        throw new AppError(
          'Your account is currently locked and will be unlocked in approximately 23 hour(s)',
          HttpStatus.LOCKED
        );
    }

    if (requiredAvailableFunds > Number(senderAccount.balance)) {
      this.logAccountWarning(userId, 'Insufficient balance');
      throw new AppError('Insufficient balance', HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  private logAccountWarning(userId: string, reason: string) {
    this.logger.appLogger.warn(
      `Transfer failed, account validation failed: User ID ${userId}. Reason: ${reason}. Timestamp: ${new Date().toISOString()}`
    );
  }
}
