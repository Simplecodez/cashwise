export interface PageInfo<T extends object> {
  // endCursor?: string;
  startCursor?: string;
  nextCursor?: string;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
  data: T[];
}
