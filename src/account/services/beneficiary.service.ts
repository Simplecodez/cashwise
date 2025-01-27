import { inject, singleton } from 'tsyringe';
import { Repository } from 'typeorm';
import { Beneficiary } from '../entities/beneficiary.entity';
import { FiltersExpression } from '../../common/pagination/lib/interface/filters-expression.input';
import { ComparisonOperatorEnum } from '../../common/pagination/lib/enum/comparison-operator.enum';
import { LogicalOperatorEnum } from '../../common/pagination/lib/enum/logical-operator.enum';
import { FilterQueryBuilder } from '../../common/pagination/lib/query-builder/filter-query-builder';
import { paginate } from '../../common/pagination/pagination/paginate';
import { PaginationParams } from '../../common/pagination/pagination/pagination.args';

@singleton()
export class BeneficiaryService {
  constructor(
    @inject('BeneficiaryRepository')
    private readonly beneficiaryRepository: Repository<Beneficiary>
  ) {}

  async create(data: Partial<Beneficiary>) {
    const newBeneficiary = this.beneficiaryRepository.create(data);
    return this.beneficiaryRepository.insert(newBeneficiary);
  }

  async delete(id: string, accountId: string, userId: string) {
    return this.beneficiaryRepository.delete({ id, accountId, userId });
  }

  async findOne(accountId: string, beneficiaryAccountNumber: string) {
    return this.beneficiaryRepository.findOne({
      where: {
        accountId,
        beneficiaryAccountNumber
      }
    });
  }

  async getAccountBeneficiaries(
    userId: string,
    accountId: string,
    paginationParams: PaginationParams
  ) {
    const filter: FiltersExpression = {
      filters: [
        {
          field: 'accountId',
          operator: ComparisonOperatorEnum.EQUAL,
          value: accountId
        },
        {
          field: 'userId',
          operator: ComparisonOperatorEnum.EQUAL,
          value: userId
        }
      ],
      operator: LogicalOperatorEnum.AND
    };

    const query = new FilterQueryBuilder<Beneficiary>(
      this.beneficiaryRepository,
      'Transaction',
      filter
    );

    const result = await paginate(query.build(), paginationParams, 'createdAt');
    return result;
  }
}
