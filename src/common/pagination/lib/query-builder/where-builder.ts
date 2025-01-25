import { Repository, SelectQueryBuilder } from 'typeorm';
import { ComparisonOperatorEnum } from '../enum/comparison-operator.enum';
import { FiltersExpression } from '../interface/filters-expression.input';
import { FilterInput } from '../interface/query-filter.interface';

type ParamValue = string | number | Array<string | number>;

/**
 * WhereBuilder recursively goes over the filters expression tree and
 * builds the WHERE clause of the SQL query.
 *
 * Credit: https://dev.to/mgustus/filtering-graphql-query-using-typescript-and-typeorm-2l49
 */
export class WhereBuilder<T extends object> {
  private params: Record<string, ParamValue> = {};
  private paramsCount = 0;

  constructor(
    private readonly qb: SelectQueryBuilder<T>,
    private filtersExpression?: FiltersExpression
  ) {}

  /**
   * Traverse the FiltersExpression and build the WHERE clause of the SQL query
   * using the SelectQueryBuilder provided in the constructor.
   *
   * If the FiltersExpression is not empty, this method will build the WHERE
   * clause of the SQL query and set the parameters of the query.
   *
   * @returns The WHERE clause of the SQL query
   */
  build() {
    if (!this.filtersExpression) return;

    const whereSql = this.buildExpressionRec(this.filtersExpression);
    this.qb.where(whereSql, this.params);
  }

  private buildExpressionRec(fe: FiltersExpression): string {
    const filtersWithValues = fe.filters?.filter((f) => f.value && f.value.length > 0);
    const filters = filtersWithValues?.map((f) => this.buildFilter(f)) || [];
    const children =
      fe.childExpressions?.map((child) => this.buildExpressionRec(child)) || [];

    const allSqlBlocks = [...filters, ...children];
    const sqLExpr = allSqlBlocks.join(` ${fe.operator} `);
    return sqLExpr === '' ? '' : `(${sqLExpr})`;
  }

  private buildFilter(filter: FilterInput) {
    if (!filter.value || filter.value.length === 0) {
      return; //throw new Error(`filter must have one or more values`);
    }
    const entityAlias = this.qb.expressionMap.mainAlias?.name;
    filter.field =
      filter.field.split('.').length < 2
        ? `${entityAlias}.${filter.field}`
        : filter.field;
    const paramName = `${filter.field}_${++this.paramsCount}`;
    switch (filter.operator) {
      case ComparisonOperatorEnum.EQUAL: {
        this.params[paramName] = filter.value;
        return `${filter.field} = :${paramName}`;
      }
      case ComparisonOperatorEnum.BETWEEN: {
        this.params[paramName] = filter.value[0];
        this.params[paramName + 1] = filter.value[1];
        return `${filter.field} BETWEEN :${paramName} AND :${paramName + 1}`;
      }
      case ComparisonOperatorEnum.IN: {
        this.params[paramName] = filter.value;
        return `${filter.field} IN (:...${paramName})`;
      }
      case ComparisonOperatorEnum.ILIKE: {
        this.params[paramName] = `%${filter.value}%`;
        return `${filter.field} ILIKE :${paramName}`;
      }
      case ComparisonOperatorEnum.LIKE: {
        this.params[paramName] = `%${filter.value}%`;
        return `${filter.field} LIKE :${paramName}`;
      }
      case ComparisonOperatorEnum.GREATER_THAN: {
        this.params[paramName] = filter.value;
        return `${filter.field} > :${paramName}`;
      }
      case ComparisonOperatorEnum.GREATER_THAN_OR_EQUAL: {
        this.params[paramName] = filter.value;
        return `${filter.field} >= :${paramName}`;
      }
      case ComparisonOperatorEnum.LESS_THAN: {
        this.params[paramName] = filter.value;
        return `${filter.field} < :${paramName}`;
      }
      case ComparisonOperatorEnum.LESS_THAN_OR_EQUAL: {
        this.params[paramName] = filter.value;
        return `${filter.field} <= :${paramName}`;
      }
      case ComparisonOperatorEnum.NOT: {
        this.params[paramName] = filter.value;
        return `${filter.field} != :${paramName}`;
      }
      case ComparisonOperatorEnum.CONTAINS: {
        this.params[paramName] = `%${filter.value}%`;
        return `${filter.field} ILIKE :${paramName}`;
      }
      case ComparisonOperatorEnum.ANY: {
        this.params[paramName] = filter.value;
        return `:${paramName} = ANY(${filter.field})`;
      }
      case ComparisonOperatorEnum.ARRAY_CONTAINS: {
        this.params[paramName] = [filter.value];
        return `${filter.field} @> :${paramName}`;
      }
      default: {
        throw new Error(`Unknown filter operation: ${filter.operator}`);
      }
    }
  }
}
