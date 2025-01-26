import { Repository, SelectQueryBuilder } from 'typeorm';
import { FiltersExpression } from '../interface/filters-expression.input';
import { JoinBuilder } from './join-builder';
import { WhereBuilder } from './where-builder';
import { SelectBuilder } from './select-builder';

export class FilterQueryBuilder<T extends object> {
  private qb: SelectQueryBuilder<T>;

  constructor(
    entityRepostory: Repository<T>,
    entityAlias: string,
    private filterExpression: FiltersExpression
  ) {
    this.qb = entityRepostory.createQueryBuilder(entityAlias);
  }

  build() {
    const joinBuilder = new JoinBuilder(this.qb, this.filterExpression);
    joinBuilder.build();
    const selectBuilder = new SelectBuilder(this.qb, this.filterExpression);
    selectBuilder.build();
    const whereBuilder = new WhereBuilder(this.qb, this.filterExpression);
    whereBuilder.build();

    return this.qb;
  }
}
