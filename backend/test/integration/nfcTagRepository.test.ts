import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaNfcTagRepository } from '../../src/infra/repositories/PrismaNfcTagRepository';
import { makeNfcTag } from '../factories/makeNfcTag';
import { insertNfcTag, insertUser, newId, prisma, resetDatabase } from './helpers';

const page = { page: 1, pageSize: 20 };

describe('PrismaNfcTagRepository', () => {
  const repository = new PrismaNfcTagRepository(prisma);
  beforeEach(resetDatabase);

  it('save grava a tag com todos os campos e findByUid a encontra', async () => {
    const user = await insertUser();
    const tag = makeNfcTag({ id: newId(), usuarioId: user.id, descricao: 'Chaveiro azul' });

    await repository.save(tag);

    expect(await repository.findByUid(tag.uid)).toEqual(tag);
  });

  it('findByUid devolve null quando o UID não existe', async () => {
    expect(await repository.findByUid('04A1B2C3')).toBeNull();
  });

  it('findByUid encontra a tag desativada', async () => {
    await insertNfcTag({ uid: '04A1B2C3', ativa: false });

    expect((await repository.findByUid('04A1B2C3'))?.ativa).toBe(false);
  });

  it('save com UID repetido lança 409 TAG_JA_CADASTRADA', async () => {
    const user = await insertUser();
    await insertNfcTag({ uid: '04A1B2C3', usuarioId: user.id });

    await expect(
      repository.save(makeNfcTag({ id: newId(), usuarioId: user.id, uid: '04A1B2C3' })),
    ).rejects.toMatchObject({ code: 'TAG_JA_CADASTRADA', status: 409 });
  });

  it('list traz só o id e o nome do usuário', async () => {
    const user = await insertUser({ nome: 'Maria Souza' });
    await insertNfcTag({ usuarioId: user.id });

    const { items } = await repository.list(page);

    expect(items[0]?.usuario).toEqual({ id: user.id, nome: 'Maria Souza' });
  });

  it('list filtra por usuarioId e por ativa, e o total conta só o que passou no filtro', async () => {
    const maria = await insertUser();
    const joao = await insertUser();
    await insertNfcTag({ usuarioId: maria.id, uid: '04A1B2C1' });
    await insertNfcTag({ usuarioId: maria.id, uid: '04A1B2C2', ativa: false });
    await insertNfcTag({ usuarioId: joao.id, uid: '04A1B2C3' });

    const uids = async (filter: { usuarioId?: string; ativa?: boolean }) => {
      const { items, total } = await repository.list({ ...page, ...filter });
      expect(total).toBe(items.length);
      return items.map((item) => item.tag.uid).sort();
    };

    expect(await uids({ usuarioId: maria.id })).toEqual(['04A1B2C1', '04A1B2C2']);
    expect(await uids({ ativa: false })).toEqual(['04A1B2C2']);
    expect(await uids({ ativa: true })).toEqual(['04A1B2C1', '04A1B2C3']);
    expect(await uids({ usuarioId: maria.id, ativa: true })).toEqual(['04A1B2C1']);
  });

  it('list pagina da mais nova para a mais antiga, e o total ignora a página', async () => {
    const user = await insertUser();
    const at = (minute: number) => new Date(`2026-11-06T12:0${minute}:00Z`);
    await insertNfcTag({ usuarioId: user.id, uid: '04A1B2C1', criadaEm: at(1) });
    await insertNfcTag({ usuarioId: user.id, uid: '04A1B2C3', criadaEm: at(3) });
    await insertNfcTag({ usuarioId: user.id, uid: '04A1B2C2', criadaEm: at(2) });

    const first = await repository.list({ page: 1, pageSize: 2 });
    const second = await repository.list({ page: 2, pageSize: 2 });

    expect(first.items.map((item) => item.tag.uid)).toEqual(['04A1B2C3', '04A1B2C2']);
    expect(second.items.map((item) => item.tag.uid)).toEqual(['04A1B2C1']);
    expect(first.total).toBe(3);
  });

  it('list usa o id para desempatar tags criadas no mesmo instante', async () => {
    const user = await insertUser();
    const criadaEm = new Date('2026-11-06T12:00:00Z');
    const ids = [newId(), newId(), newId()];
    for (const [index, id] of ids.entries()) {
      await insertNfcTag({ id, usuarioId: user.id, uid: `04A1B2C${index}`, criadaEm });
    }

    const { items } = await repository.list(page);

    expect(items.map((item) => item.tag.id)).toEqual([...ids].sort());
  });

  it('update muda só ativa e devolve a tag com o usuário', async () => {
    const user = await insertUser({ nome: 'Maria Souza' });
    const row = await insertNfcTag({ usuarioId: user.id, uid: '04A1B2C3', descricao: 'Azul' });

    const updated = await repository.update(row.id, { ativa: false });

    expect(updated).toEqual({
      tag: {
        id: row.id,
        usuarioId: user.id,
        uid: '04A1B2C3',
        descricao: 'Azul',
        ativa: false,
        criadaEm: row.criadaEm,
      },
      usuario: { id: user.id, nome: 'Maria Souza' },
    });
    const saved = await prisma.nfcTag.findUniqueOrThrow({ where: { id: row.id } });
    expect(saved).toEqual({ ...row, ativa: false });
  });

  it('update devolve null para id inexistente', async () => {
    expect(await repository.update(newId(), { ativa: false })).toBeNull();
  });
});
