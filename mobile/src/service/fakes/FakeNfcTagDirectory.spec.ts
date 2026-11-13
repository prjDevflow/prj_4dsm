import { ApiError } from '../ApiError';
import { FakeNfcTagDirectory } from './FakeNfcTagDirectory';
import { sampleUsers } from './sampleData';

const NOW = new Date('2026-11-13T15:00:00Z');
const [maria, ana] = sampleUsers;

describe('FakeNfcTagDirectory', () => {
  const directory = () => new FakeNfcTagDirectory({ now: () => NOW });

  it('lista da mais nova para a mais antiga e filtra pela pessoa', () => {
    const tags = directory();
    tags.create({ usuarioId: maria.id, uid: '04A1B2C3' });
    tags.create({ usuarioId: ana.id, uid: '04F7E21A9C' });

    const all = tags.list({ page: 1, pageSize: 20 });
    const mine = tags.list({ usuarioId: maria.id, page: 1, pageSize: 20 });

    expect(all.data.map((tag) => tag.uid).slice(0, 2)).toEqual(['04F7E21A9C', '04A1B2C3']);
    expect(mine.data.every((tag) => tag.usuarioId === maria.id)).toBe(true);
  });

  it('normaliza o código como o servidor', () => {
    const created = directory().create({ usuarioId: maria.id, uid: '04:a1:b2:c3' });

    expect(created).toMatchObject({ uid: '04A1B2C3', ativa: true, descricao: null });
  });

  it('código repetido dá 409, para qualquer pessoa', () => {
    const tags = directory();
    tags.create({ usuarioId: maria.id, uid: '04A1B2C3' });

    expect(() => tags.create({ usuarioId: ana.id, uid: '04-a1-b2-c3' })).toThrow(
      expect.objectContaining({ status: 409, code: 'TAG_JA_CADASTRADA' }),
    );
  });

  it('código inválido dá 422 no campo uid', () => {
    let error: unknown;
    try {
      directory().create({ usuarioId: maria.id, uid: '04A1' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).details.map((detail) => detail.field)).toEqual(['uid']);
  });

  it('desativa e ativa', () => {
    const tags = directory();
    const { id } = tags.create({ usuarioId: maria.id, uid: '04A1B2C3' });

    expect(tags.update(id, false).ativa).toBe(false);
    expect(tags.update(id, true).ativa).toBe(true);
  });

  it('no modo de cadastro, a próxima tag lida é vinculada à pessoa', () => {
    const tags = directory();
    tags.enroll('t-1', maria.id);

    const linked = tags.readOnTerminal('t-1', '0a0b0c0d');

    expect(linked).toMatchObject({ usuarioId: maria.id, uid: '0A0B0C0D' });
    expect(tags.readOnTerminal('t-1', '0a0b0c0e')).toBeNull();
  });
});
