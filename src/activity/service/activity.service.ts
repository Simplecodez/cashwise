import { inject, singleton } from 'tsyringe';
import { Repository } from 'typeorm';
import { Activity } from '../entity/activity.entity';
import { FilterQueryBuilder } from '../../common/pagination/lib/query-builder/filter-query-builder';
import { FiltersExpression } from '../../common/pagination/lib/interface/filters-expression.input';
import { paginate } from '../../common/pagination/pagination/paginate';
import { PaginationParams } from '../../common/pagination/pagination/pagination.args';
import { ComparisonOperatorEnum } from '../../common/pagination/lib/enum/comparison-operator.enum';

@singleton()
export class ActivityService {
  constructor(
    @inject('ActivityRepository')
    private readonly activityRepository: Repository<Activity>
  ) {}

  create(activity: Partial<Activity>) {
    const newActivity = this.activityRepository.create(activity);
    return this.activityRepository.insert(newActivity);
  }

  async findAll(userId: string, paginationParams: PaginationParams) {
    const filtersExpression: FiltersExpression = {
      filters: []
    };

    filtersExpression.filters?.push({
      field: 'Activity.userId',
      operator: ComparisonOperatorEnum.EQUAL,
      value: userId
    });

    const query = new FilterQueryBuilder(
      this.activityRepository,
      'Activity',
      filtersExpression
    );

    const result = await paginate(query.build(), paginationParams, 'createdAt');

    return result;
  }
}
