import { fetchAllPages } from './fetchAllPages';

const pages = (total: number) => {
  const calls: { page: number; pageSize: number }[] = [];
  const fetchPage = async ({ page, pageSize }: { page: number; pageSize: number }) => {
    calls.push({ page, pageSize });
    const start = (page - 1) * pageSize;
    const data = Array.from(
      { length: Math.max(0, Math.min(pageSize, total - start)) },
      (_, i) => start + i,
    );
    return { data, page, pageSize, total };
  };
  return { calls, fetchPage };
};

describe('fetchAllPages', () => {
  it('busca de 100 em 100 até trazer tudo', async () => {
    const { calls, fetchPage } = pages(230);

    const items = await fetchAllPages(fetchPage);

    expect(items).toHaveLength(230);
    expect(items[229]).toBe(229);
    expect(calls).toEqual([
      { page: 1, pageSize: 100 },
      { page: 2, pageSize: 100 },
      { page: 3, pageSize: 100 },
    ]);
  });

  it('lista vazia faz uma chamada só', async () => {
    const { calls, fetchPage } = pages(0);

    await expect(fetchAllPages(fetchPage)).resolves.toEqual([]);
    expect(calls).toHaveLength(1);
  });
});
