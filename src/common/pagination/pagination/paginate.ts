import { Brackets, LessThan, MoreThan, SelectQueryBuilder } from 'typeorm';
import { PaginationParams } from './pagination.args';
import { Cursor } from './cursor';
import { formatDbField } from '../../../utils/db.utils';
import { PageInfo } from '../lib/interface/page-info';

interface IIndexable<T = any> {
  [key: string]: T;
}

const multiColumnDelimiter = '|';

export async function paginate<T extends object>(
  query: SelectQueryBuilder<T>,
  paginationParams: PaginationParams,
  cursorColumn = 'id'
) {
  const entityAlias = query.expressionMap.mainAlias?.name as string;
  cursorColumn =
    cursorColumn.split('.').length < 2 ? `${entityAlias}.${cursorColumn}` : cursorColumn;
  const columnId = cursorColumn.split('.').slice(1)[0];
  let limit = 10;
  let orderDirection: 'DESC' | 'ASC' = paginationParams.reverse ? 'DESC' : 'ASC';
  let cursor: string | null = null;

  if (paginationParams.first) {
    limit = paginationParams.first;
    orderDirection = paginationParams.reverse ? 'DESC' : 'ASC';
    if (paginationParams.after) {
      cursor = paginationParams.after;
    }
  } else if (paginationParams.last) {
    limit = paginationParams.last;
    orderDirection = paginationParams.reverse ? 'ASC' : 'DESC';
    if (paginationParams.before) {
      cursor = paginationParams.before;
    }
  }
  // order by the cursorColumn
  query.orderBy({ [cursorColumn]: orderDirection });
  // if the cursorColumn is not id, then order by the id
  if (columnId !== 'id') {
    if (entityAlias) {
      query.addOrderBy(`${entityAlias}.id`, orderDirection);
    } else {
      throw new Error('Unable to determine entity alias for secondary ordering');
    }
  }

  if (cursor) {
    cursorWhereClause(query, cursor, columnId, paginationParams);
  }

  query.take(limit + 1);
  let queryResult: T[] = await query.getMany();
  const paginatedResult = formatDataToIncludePageInfo(queryResult, limit, columnId);

  return paginatedResult;
}

function formatDataToIncludePageInfo<T extends object>(
  dbResult: T[],
  limit: number,
  columnId: string
): PageInfo<T> {
  let nextCursor: string | undefined;
  let startCursor: string | undefined;
  let hasNextPage: boolean = false;

  const lastData = dbResult.slice(-2)[0];
  const firstData = dbResult[0];
  let data = dbResult;

  if (dbResult.length <= 0) {
    return {
      data,
      startCursor,
      nextCursor,
      hasNextPage
    };
  }

  if (dbResult.length > limit) {
    hasNextPage = true;
    data = dbResult.slice(0, dbResult.length - 1);
  }

  if (columnId !== 'id') {
    const startId = (firstData as IIndexable)['id'];
    const startColumnId = formatDbField((firstData as IIndexable)[columnId]);
    const nextId = (lastData as IIndexable)['id'];
    const nextColumnId = formatDbField((lastData as IIndexable)[columnId]);

    startCursor = Cursor.encode(`${startColumnId}${multiColumnDelimiter}${startId}`);
    nextCursor = Cursor.encode(`${nextColumnId}${multiColumnDelimiter}${nextId}`);
  } else {
    const startColumnId = formatDbField((firstData as IIndexable)[columnId]);
    const nextColumnId = formatDbField((lastData as IIndexable)[columnId]);
    startCursor = Cursor.encode(startColumnId);
    nextCursor = Cursor.encode(nextColumnId);
  }

  return {
    data,
    startCursor,
    nextCursor,
    hasNextPage
  };
}

function cursorWhereClause<T extends object>(
  query: SelectQueryBuilder<T>,
  cursor: string,
  columnId: string,
  paginationParams: PaginationParams
) {
  const offsetId = Cursor.decode(cursor);
  let primaryColumnOffset: string | null = null;
  let secondaryColumnOffset: string | null = null;
  let findOperator: typeof LessThan | typeof MoreThan;

  if (columnId === 'id') {
    primaryColumnOffset = offsetId;
  } else {
    primaryColumnOffset = formatDbField(offsetId.split(multiColumnDelimiter)[0]);
    secondaryColumnOffset = formatDbField(offsetId.split(multiColumnDelimiter)[1]);
  }

  if (paginationParams.first && paginationParams.after) {
    findOperator = paginationParams.reverse ? LessThan : MoreThan;
  } else if (paginationParams.last && paginationParams.before) {
    findOperator = paginationParams.reverse ? MoreThan : LessThan;
  } else {
    throw new Error('Invalid pagination params');
  }

  const whereExpression = new Brackets((qb) => {
    qb.where({ [columnId]: findOperator(primaryColumnOffset) });
    if (columnId !== 'id') {
      qb.orWhere(
        new Brackets((qb) => {
          qb.where({
            [columnId]: primaryColumnOffset
          }).andWhere({
            id: findOperator(secondaryColumnOffset)
          });
        })
      );
    }
  });
  if (query.expressionMap.wheres && query.expressionMap.wheres.length) {
    query.andWhere(whereExpression);
  } else {
    query.where(whereExpression);
  }
}
