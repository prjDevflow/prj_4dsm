// Every paginated list of the API: ?page=1&pageSize=20 (up to 100).
export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
