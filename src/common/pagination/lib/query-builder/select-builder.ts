import { SelectQueryBuilder } from 'typeorm';
import { FiltersExpression } from '../interface/filters-expression.input';

export class SelectBuilder<T extends object> {
  constructor(
    private readonly qb: SelectQueryBuilder<T>,
    private filterExpression?: FiltersExpression
  ) {}

  build() {
    if (!this.filterExpression) return;
    const selectFieldArray = this.filterExpression.filters?.map((filter) => {
      if (!filter.selectFields || filter.selectFields.length === 0) {
        return [];
      }
      return filter?.selectFields;
    });
    if (selectFieldArray && selectFieldArray.length > 0) {
      const selectFields = selectFieldArray?.flat();

      if (selectFields && selectFields.length > 0) {
        this.qb.select(selectFields);
      }
    }
  }
}
