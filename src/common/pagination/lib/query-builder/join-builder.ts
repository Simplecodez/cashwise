import { SelectQueryBuilder } from 'typeorm';
import { FiltersExpression } from '../interface/filters-expression.input';

/**
 * JoinBuilder recursively traverses the FiltersExpression and adds
 * a LEFT JOIN for each relationField
 *
 * Credit: https://dev.to/mgustus/filtering-graphql-query-using-typescript-and-typeorm-2l49
 */
export class JoinBuilder<T extends object> {
  private joinedEntities = new Set<string>();

  constructor(
    private readonly qb: SelectQueryBuilder<T>,
    private filtersExpression?: FiltersExpression
  ) {}

  /**
   * Recursively traverse the FiltersExpression and add LEFT JOINs
   * for each relationField. This is necessary to ensure that the
   * WHERE clause can reference fields on related entities.
   *
   * @returns The SelectQueryBuilder with the LEFT JOINs added.
   */
  build() {
    if (!this.filtersExpression) return;
    this.buildJoinEntitiesRec(this.filtersExpression);
  }

  private buildJoinEntitiesRec(fe: FiltersExpression): void {
    const combined = [...(fe.filters ?? []), ...(fe.childExpressions ?? [])];
    for (const item of combined) {
      if ('field' in item) {
        this.addJoinEntity(item.field, item.relationField, item.joinAndSelect);
      } else {
        this.buildJoinEntitiesRec(item);
      }
    }
  }

  private addJoinEntity(
    field: string,
    relationField?: string,
    joinAndSelect: boolean = true
  ) {
    const entityName = field.split('.')[0];

    if (relationField && !this.joinedEntities.has(entityName)) {
      if (joinAndSelect) {
        this.qb.leftJoinAndSelect(relationField, entityName);
      } else {
        this.qb.leftJoin(relationField, entityName);
      }

      this.joinedEntities.add(entityName);
    }
  }
}
