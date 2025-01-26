import { singleton } from 'tsyringe';
import { catchAsync } from '../../utils/catch-async.utils';
import { IRequest } from '../../user/interfaces/user.interface';
import { Request } from 'express';
import { Account } from '../entities/account.entity';
import {
  accountCreateValidation,
  confirmAccountValidator,
  getOneUserAccountValidator
} from '../validator/account.validator';
import { CommonUtils } from '../../utils/common.utils';
import { AccountJobType, AccountStatus, AccountType } from '../enum/account.enum';
import { AccountQueue } from '../job-processor/account.queue';
import { AccountService } from '../services/account.service';
import { FindOneOptions } from 'typeorm';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../../common/http-codes/codes';

@singleton()
export class AccountController {
  constructor(
    private readonly accountQueue: AccountQueue,
    private readonly accountService: AccountService
  ) {}

  createAccount() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const {
        id: userId,
        approvedKycLevel,
        firstName,
        lastName
      } = (req as IRequest).user;
      await accountCreateValidation(req.body, approvedKycLevel);

      const accountCreationData: Partial<Account> = {
        userId,
        name: req.body?.accountName || CommonUtils.generateRandomAccountName(),
        balance: 0,
        username: `${firstName} ${lastName}`,
        type: AccountType.SAVINGS,
        status: AccountStatus.ACTIVE
      };

      this.accountQueue.addJob(AccountJobType.CREATION, accountCreationData);

      res.json({
        status: 'success',
        message: 'Your new account is being set up, you will be notified shortly.'
      });
    });
  }

  getUserAccount() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const userId = (req as IRequest).user.id;
      await getOneUserAccountValidator.validateAsync(req.params);
      const options: FindOneOptions<Account> = {
        where: [{ id: req.params.id, userId }]
      };

      const account = await this.accountService.findOne(options);
      if (!account) throw new AppError('Account does not exist', HttpStatus.NOT_FOUND);

      res.json({ status: 'success', account });
    });
  }

  confirmAccount() {
    return catchAsync(async (req: IRequest | Request, res) => {
      await confirmAccountValidator.validateAsync(req.params);

      const account = await this.accountService.confirmAccount(req.params.accountNumber);
      if (!account) throw new AppError('Invalid account number', HttpStatus.NOT_FOUND);

      res.json({
        status: 'success',
        account
      });
    });
  }

  getAllUserAccounts() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const userId = (req as IRequest).user.id;
      const accounts = await this.accountService.findAll(userId);

      res.json({ status: 'success', accounts });
    });
  }
}
