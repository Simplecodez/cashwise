import { Account } from '../account/entities/account.entity';
import { Transaction } from '../account/entities/transaction.entity';
import { HttpStatus } from '../common/http-codes/codes';
import { ComparisonOperatorEnum } from '../common/pagination/lib/enum/comparison-operator.enum';
import { LogicalOperatorEnum } from '../common/pagination/lib/enum/logical-operator.enum';
import { FiltersExpression } from '../common/pagination/lib/interface/filters-expression.input';
import { PageInfo } from '../common/pagination/lib/interface/page-info';
import { User } from '../user/entities/user.entity';
import { AppError } from './app-error.utils';

export function formatDbField(value: any): any {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const dateRegex =
      /^(\d{4}-\d{2}-\d{2}|\w{3} \w{3} \d{2} \d{4})( \d{2}:\d{2}:\d{2}(.\d{3})? GMT[+-]\d{4})?(\s*\([^)]+\))?$/;

    if (dateRegex.test(value)) {
      const cleanedValue = value.replace(/\s*\([^)]+\)$/, '').trim();

      try {
        const date = new Date(cleanedValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (error) {
        console.warn(`Failed to parse date: ${value}`);
        return value;
      }
    }
  }

  return value;
}

export function formatDbQueryFilter(
  columns: string[],
  filterObject?: Record<string, string>
) {
  if (!filterObject) return;

  if (Object.keys(filterObject).length > 2)
    throw new AppError('You can only filter by two column', HttpStatus.BAD_REQUEST);

  const filter: FiltersExpression = {
    filters: [],
    operator: LogicalOperatorEnum.AND
  };

  for (const [column, value] of Object.entries(filterObject)) {
    if (!columns.includes(column))
      throw new AppError(`Invalid filter field: ${column}`, HttpStatus.BAD_REQUEST);

    filter.filters?.push({
      field: column,
      operator: ComparisonOperatorEnum.EQUAL,
      value
    });
  }

  return filter;
}

export function maskUsers(users: User[]) {
  users.forEach(maskUser);
}

export function maskUser(user: User) {
  const [name, domain] = user.email.split('@');
  user.email = `${name.slice(0, 2)}***@${domain}`;
  user.phoneNumber = maskNumberString(user.phoneNumber);
  user.address = `*****${user.address.slice(-4)}`;
}

export function maskAccounts(accounts: Account[]) {
  accounts.forEach(maskAccount);
}

export function maskAccount(account: Account) {
  account.accountNumber = maskNumberString(account.accountNumber);
  (account as any).balance = '*****';
}

export function maskTransactions(transactions: Transaction[]) {
  transactions.forEach(maskTransaction);
}

export function maskTransaction(transaction: Transaction) {
  transaction.amountInNaira = '*****';
  (transaction as any).amount = '*****';
  transaction.remark = '********';
  if (transaction.senderAccount?.accountNumber)
    transaction.senderAccount.accountNumber = maskNumberString(
      transaction.senderAccount.accountNumber
    );
  if (transaction.receiverAccount?.accountNumber)
    transaction.receiverAccount.accountNumber = maskNumberString(
      transaction.receiverAccount.accountNumber
    );
}

function maskNumberString(data: string) {
  return data.replace(/\d(?=\d{4})/g, '*');
}
