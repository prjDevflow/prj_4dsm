import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaNfcTagRepository } from '../../src/infra/repositories/PrismaNfcTagRepository';
import { insertNfcTag, insertUser, newId, prisma, resetDatabase } from './helpers';

const tags = new PrismaNfcTagRepository(prisma);

const at = (day: number) => new Date(`2026-10-${String(day).padStart(2, '0')}T12:00:00.000Z`);

describe('PrismaNfcTagRepository.save', () => {
  beforeEach(resetDatabase);

  it('deve inserir a tag com todos os campos', async () => {
    const user = await insertUser();
    const tag = {
      id: newId(),
      usuarioId: user.id,
      uid: '04A1B2C3D4',
      descricao: 'Cartão azul',
      ativa: true,
      criadaEm: at(5),
    };

    await tags.save(tag);

    const row = await prisma.nfcTag.findUniqueOrThrow({ where: { id: tag.id } });
    expect(row).toEqual(tag);
  });

  it('deve traduzir o UID repetido em 409 TAG_JA_CADASTRADA e não gravar a segunda', async () => {
    const user = await insertUser();
    await insertNfcTag({ usuarioId: user.id, uid: '04A1B2C3D4' });

    const error = await tags
      .save({
        id: newId(),
        usuarioId: user.id,
        uid: '04A1B2C3D4',
        descricao: null,
        ativa: true,
        criadaEm: at(5),
      })
      .catch((e) => e);

    expect(error).toMatchObject({ code: 'TAG_JA_CADASTRADA', status: 409 });
    expect(await prisma.nfcTag.count()).toBe(1);
  });

  it('não deve esconder outra violação do banco atrás do 409 (usuário inexistente)', async () => {
    const error = await tags
      .save({
        id: newId(),
        usuarioId: newId(),
        uid: '04A1B2C3D4',
        descricao: null,
        ativa: true,
        criadaEm: at(5),
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error.code).not.toBe('TAG_JA_CADASTRADA');
    expect(await prisma.nfcTag.count()).toBe(0);
  });
});

describe('PrismaNfcTagRepository.updateStatus', () => {
  beforeEach(resetDatabase);

  it('deve gravar só ativa: não desfaz o que outra requisição gravou depois da leitura', async () => {
    const tag = await insertNfcTag({ uid: '04A1B2C3D4', descricao: 'antiga' });
    await prisma.nfcTag.update({ where: { id: tag.id }, data: { descricao: 'nova' } });

    const updated = await tags.updateStatus(tag.id, false);

    expect(updated).toEqual({ ...tag, descricao: 'nova', ativa: false });
    const row = await prisma.nfcTag.findUniqueOrThrow({ where: { id: tag.id } });
    expect(row).toEqual({ ...tag, descricao: 'nova', ativa: false });
  });

  it('deve reativar a tag', async () => {
    const tag = await insertNfcTag({ ativa: false });

    const updated = await tags.updateStatus(tag.id, true);

    expect(updated?.ativa).toBe(true);
  });

  it('deve devolver null para tag inexistente', async () => {
    expect(await tags.updateStatus(newId(), false)).toBeNull();
  });
});

describe('PrismaNfcTagRepository.list', () => {
  beforeEach(resetDatabase);

  const seed = async () => {
    const ana = await insertUser({ nome: 'Ana' });
    const bruno = await insertUser({ nome: 'Bruno' });
    // Oldest to newest: t1 (Ana, active), t2 (Bruno, inactive), t3 (Ana, inactive), t4 (Bruno, active).
    const t1 = await insertNfcTag({ usuarioId: ana.id, uid: '01000001', criadaEm: at(1) });
    const t2 = await insertNfcTag({
      usuarioId: bruno.id,
      uid: '01000002',
      criadaEm: at(2),
      ativa: false,
    });
    const t3 = await insertNfcTag({
      usuarioId: ana.id,
      uid: '01000003',
      criadaEm: at(3),
      ativa: false,
    });
    const t4 = await insertNfcTag({ usuarioId: bruno.id, uid: '01000004', criadaEm: at(4) });
    return { ana, bruno, t1, t2, t3, t4 };
  };
  const page = { page: 1, pageSize: 20 };
  const uids = (result: { items: { uid: string }[] }) => result.items.map((tag) => tag.uid);

  it('deve listar da mais nova para a mais antiga, com o total', async () => {
    await seed();

    const result = await tags.list(page);

    expect(uids(result)).toEqual(['01000004', '01000003', '01000002', '01000001']);
    expect(result.total).toBe(4);
  });

  it('deve desempatar pelo id, do maior para o menor, quando a data é a mesma', async () => {
    const user = await insertUser();
    const low = await insertNfcTag({
      id: '5eed0000-0000-4000-8000-000000000001',
      usuarioId: user.id,
      uid: '02000001',
      criadaEm: at(1),
    });
    const high = await insertNfcTag({
      id: '5eed0000-0000-4000-8000-000000000009',
      usuarioId: user.id,
      uid: '02000002',
      criadaEm: at(1),
    });

    const result = await tags.list(page);

    expect(result.items.map((tag) => tag.id)).toEqual([high.id, low.id]);
  });

  it('deve filtrar por usuário, por ativa e pelos dois juntos', async () => {
    const { ana, bruno } = await seed();

    expect(uids(await tags.list({ ...page, usuarioId: ana.id }))).toEqual(['01000003', '01000001']);
    expect(uids(await tags.list({ ...page, ativa: true }))).toEqual(['01000004', '01000001']);
    expect(uids(await tags.list({ ...page, ativa: false }))).toEqual(['01000003', '01000002']);
    const both = await tags.list({ ...page, usuarioId: bruno.id, ativa: false });
    expect(uids(both)).toEqual(['01000002']);
    expect(both.total).toBe(1);
  });

  it('deve limitar a página ao pageSize', async () => {
    await seed();

    const first = await tags.list({ page: 1, pageSize: 2 });

    expect(uids(first)).toEqual(['01000004', '01000003']);
    expect(first.total).toBe(4);
  });

  it('deve paginar e manter o total de antes da página', async () => {
    await seed();

    const second = await tags.list({ page: 2, pageSize: 3 });
    const beyond = await tags.list({ page: 3, pageSize: 3 });

    expect(uids(second)).toEqual(['01000001']);
    expect(second.total).toBe(4);
    expect(beyond.items).toEqual([]);
    expect(beyond.total).toBe(4);
  });

  it('deve devolver a tag como entidade, com os seis campos e nada mais', async () => {
    const { t4 } = await seed();

    const [first] = (await tags.list(page)).items;

    expect(first).toEqual(t4);
    expect(Object.keys(first!).sort()).toEqual(
      ['ativa', 'criadaEm', 'descricao', 'id', 'uid', 'usuarioId'].sort(),
    );
  });
});
