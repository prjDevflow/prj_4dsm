import type { Page } from './types/page';

const PAGE_SIZE = 100; // the largest page the API gives

/** Every item of a paginated list, page after page (short lists: buildings, places, terminals). */
export const fetchAllPages = async <T>(
  fetchPage: (params: { page: number; pageSize: number }) => Promise<Page<T>>,
): Promise<T[]> => {
  const items: T[] = [];
  for (let page = 1; ; page += 1) {
    const result = await fetchPage({ page, pageSize: PAGE_SIZE });
    items.push(...result.data);
    if (result.data.length === 0 || items.length >= result.total) return items;
  }
};
