import { singleton } from 'tsyringe';
import { FindOneOptions } from 'typeorm';
import { Account } from '../../entities/account.entity';
import { ExternalRecipient } from '../../entities/external-account.entity';
import { Role } from '../../../user/enum/user.enum';
import { PaginationParams } from '../../../common/pagination/pagination/pagination.args';
import { AccountValidationService } from './account-validation.service';
import { AccountCreationService } from './account-creation.service';
import { AccountRetrievalService } from './account-retrieval.service';

@singleton()
export class AccountService {
  constructor(
    private readonly accountValidationService: AccountValidationService,
    private readonly accountCreationService: AccountCreationService,
    private readonly accountRetrievalService: AccountRetrievalService
  ) {}

  async validateSenderAccount(userId: string, senderAccountId: string, amount: number) {
    return this.accountValidationService.validateSenderAccount(userId, senderAccountId, amount);
  }

  async validateReceiverAccount(receiverAccountNumber: string) {
    return this.accountValidationService.validateReceiverAccount(receiverAccountNumber);
  }

  async createAccount(data: Partial<Account>) {
    return this.accountCreationService.createAccount(data);
  }

  async createExternalRecipient(data: Partial<ExternalRecipient>) {
    return this.accountCreationService.createExternalRecipient(data);
  }

  async findOne(options: FindOneOptions<Account>) {
    return this.accountRetrievalService.findOne(options);
  }

  async findOneExternalAccount(options: FindOneOptions<ExternalRecipient>) {
    return this.accountRetrievalService.findOneExternalAccount(options);
  }

  async confirmAccount(accountNumber: string) {
    return this.accountRetrievalService.confirmAccount(accountNumber);
  }

  async findAll(userId: string) {
    return this.accountRetrievalService.findAll(userId);
  }

  async findAllAccounts(
    userRole: Role,
    paginationParams: PaginationParams,
    filterParams?: Record<string, string>
  ) {
    return this.accountRetrievalService.findAllAccounts(userRole, paginationParams, filterParams);
  }

  async findOneAccount(userRole: Role, accountId: string) {
    return this.accountRetrievalService.findOneAccount(userRole, accountId);
  }

  async freezeAccount(accountId: string) {
    return this.accountRetrievalService.freezeAccount(accountId);
  }
}
