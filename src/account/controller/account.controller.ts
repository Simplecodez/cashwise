import { singleton } from 'tsyringe';
import { catchAsync } from '../../utils/catch-async.utils';
import { IRequest } from '../../user/interfaces/user.interface';
import { Request } from 'express';
import { Account } from '../entities/account.entity';
import {
  accountCreateValidation,
  confirmAccountValidator,
  deleteAccountBeneficiaryValidator,
  getOneUserAccountValidator,
  getOneValidator,
  uuidIdSchema
} from '../validator/account.validator';
import { CommonUtils } from '../../utils/common.utils';
import { AccountJobType, AccountStatus, AccountType } from '../enum/account.enum';
import { AccountQueue } from '../job-processor/account.queue';
import { AccountService } from '../services/account.service';
import { FindOneOptions } from 'typeorm';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../../common/http-codes/codes';
import { BeneficiaryService } from '../services/beneficiary.service';
import { validatePaginationParams } from '../../common/pagination/pagination/validator';

@singleton()
export class AccountController {
  constructor(
    private readonly accountQueue: AccountQueue,
    private readonly accountService: AccountService,
    private readonly beneficiaryService: BeneficiaryService
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

  getAccountBeneficiaries() {
    return catchAsync(async (req: IRequest | Request, res) => {
      await getOneValidator.validateAsync(req.params);

      const { paginationParams } = await validatePaginationParams(
        req.query as { limit: string; nextCursor?: string; filter?: string }
      );

      const { id: accountId } = req.params;
      const { id: userId } = (req as IRequest).user;

      const beneficiaries = await this.beneficiaryService.getAccountBeneficiaries(
        userId,
        accountId,
        paginationParams
      );

      res.json({
        status: 'success',
        beneficiaries
      });
    });
  }

  getAllAccounts() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const { paginationParams, parsedFilter } = await validatePaginationParams(
        req.query as { limit: string; nextCursor?: string; filter?: string }
      );
      const userRole = (req as IRequest).user.role;
      if (parsedFilter?.userId) await uuidIdSchema.validateAsync(parsedFilter.userId);

      const accounts = await this.accountService.findAllAccounts(
        userRole,
        paginationParams,
        parsedFilter
      );

      res.json({
        status: 'success',
        accounts
      });
    });
  }

  getOneAccount() {
    return catchAsync(async (req: IRequest | Request, res) => {
      await getOneValidator.validateAsync(req.params);
      const userRole = (req as IRequest).user.role;
      const { id: accountId } = req.params;
      const account = await this.accountService.findOneAccount(userRole, accountId);

      res.json({
        status: 'success',
        account
      });
    });
  }

  freezeAccount() {
    return catchAsync(async (req: IRequest | Request, res) => {
      await getOneValidator.validateAsync(req.params);
      const { id: accountId } = req.params;
      await this.accountService.freezeAccount(accountId);

      res.json({
        status: 'success',
        message: 'Account freezed successfully'
      });
    });
  }

  deleteAccountBeneficiary() {
    return catchAsync(async (req: IRequest | Request, res) => {
      await deleteAccountBeneficiaryValidator.validateAsync(req.params);
      const { id: userId } = (req as IRequest).user;
      const { id: accountId, beneficiaryId } = req.params;
      await this.beneficiaryService.delete(beneficiaryId, accountId, userId);

      res.status(HttpStatus.NO_CONTENT).json({
        status: 'success'
      });
    });
  }
}
