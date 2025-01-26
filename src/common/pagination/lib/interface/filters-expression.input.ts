import { LogicalOperatorEnum } from '../enum/logical-operator.enum';
import { FilterInput } from './query-filter.interface';

export interface FiltersExpression {
  filters?: FilterInput[];
  operator?: LogicalOperatorEnum;
  childExpressions?: FiltersExpression[];
}
