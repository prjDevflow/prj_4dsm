import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** `?page=1&pageSize=20` from the contract; query strings arrive as text, hence the coercion. */
export const paginationShape = {
  page: z.coerce
    .number({ error: 'deve ser um número inteiro' })
    .int('deve ser um número inteiro')
    .min(1, 'deve ser no mínimo 1')
    .default(1),
  pageSize: z.coerce
    .number({ error: 'deve ser um número inteiro' })
    .int('deve ser um número inteiro')
    .min(1, 'deve ser no mínimo 1')
    .max(MAX_PAGE_SIZE, `deve ser no máximo ${MAX_PAGE_SIZE}`)
    .default(DEFAULT_PAGE_SIZE),
};

/** `{ data, page, pageSize, total }`, the paginated body of the contract. */
export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
