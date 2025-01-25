import { SelectQueryBuilder } from 'typeorm';
import { FiltersExpression } from '../interface/filters-expression.input';

export class SelectBuilder<T extends object> {
  constructor(
    private readonly qb: SelectQueryBuilder<T>,
    private filterExpression: FiltersExpression
  ) {}

  build() {
    const selectFieldArray = this.filterExpression.filters?.map((filter) => {
      const entityAlias = filter.field.split('.')[0].toLowerCase();
      if (!filter.selectFields || filter.selectFields.length === 0) {
        return [];
      }
      return filter?.selectFields?.map((selectField) => `${entityAlias}.${selectField}`);
    });
    if (selectFieldArray && selectFieldArray.length > 0) {
      const selectFields = selectFieldArray?.flat();
      console.log(selectFields);
      if (selectFields && selectFields.length > 0) {
        this.qb.select(['Event.id', ' Event.created_at']);
      }
    }
  }
}

// filter = [
//   { field
//     select: ['a']
//   },
//   {
//     field
//     select: ['a']
//   }
// ]
