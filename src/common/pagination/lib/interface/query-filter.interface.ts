/**
 * This class represents the input for a filter
 * @example { field: 'Entity.field', operator: ComparisonOperatorEnum.EQUALS, value: 'value' }
 * @example { field: 'Entity.field', operator: ComparisonOperatorEnum.IN, value: ['value1', 'value2'] }
 * @example { field: 'RelatedEntity.id', relationField: 'Entity.manyToOneField' }
 */

import { ComparisonOperatorEnum } from '../enum/comparison-operator.enum';

export interface FilterInput {
  /**
   * The field to filter on
   * @example 'Entity.field'
   * @type {string}
   */

  field: string;

  /**
   * The operator to use for the filter
   * @type {ComparisonOperatorEnum}
   */

  operator?: ComparisonOperatorEnum;

  /**
   * The value to filter on
   * @type {any}
   */

  value?: any;

  /**
   * The field to filter on in the relation
   * For internal use only.
   * @type {string}
   * @example 'RelatedEntity.field'
   */
  relationField?: string;

  /**
   * The fields you want to include from the joined table
   * For internal use only
   * @type {string[]}
   * @example '['field']'
   */
  selectFields?: string[];

  /**
   * A boolean to determine if a field should be joined and selected
   * For internal use only
   * @type {boolean}
   * @example true|false
   */
  joinAndSelect?: boolean;
}
