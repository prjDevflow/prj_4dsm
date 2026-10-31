import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { FakeHashProvider } from '../../../../test/doubles/FakeHashProvider';
import { FixedRandom } from '../../../../test/doubles/FixedRandom';
import { InMemoryQrCredentialRepository } from '../../../../test/doubles/InMemoryQrCredentialRepository';
import { SequentialIdGenerator } from '../../../../test/doubles/SequentialIdGenerator';
import {
  IssueQrCredentialUseCase,
  type IssueQrCredentialConfig,
} from './IssueQrCredential_UseCase';

const TERMINAL_ID = '00000000-0000-4000-8000-0000000000a9';
const TOKEN = 'q3F8k2Zr1pLw9XbTn0YhVA';

/** The fake hash keeps the text inside it; a real digest is what shows the token is not stored. */
class HexHashProvider extends FakeHashProvider {
  override sha256(text: string) {
    return createHash('sha256').update(text).digest('hex');
  }
}

const defaultConfig: IssueQrCredentialConfig = {
  ttlSeconds: 10,
  toleranceSeconds: 5,
  minIntervalSeconds: 5,
  renovarEmMs: 10000,
};

const makeSut = (config: Partial<IssueQrCredentialConfig> = {}, tokens: string[] = [TOKEN]) => {
  const credentials = new InMemoryQrCredentialRepository();
  const random = new FixedRandom(tokens);
  const hash = new HexHashProvider();
  const clock = new FakeClock();
  const sut = new IssueQrCredentialUseCase(
    credentials,
    random,
    hash,
    new SequentialIdGenerator(),
    clock,
    { ...defaultConfig, ...config },
  );
  return { sut, credentials, random, hash, clock };
};

describe('IssueQrCredential', () => {
  it('deve montar o payload ACS1 com um token de 16 bytes (22 caracteres)', async () => {
    const { sut, random } = makeSut();

    const result = await sut.execute(TERMINAL_ID);

    expect(result.payload).toBe(`ACS1:${TOKEN}`);
    expect(result.payload).toMatch(/^ACS1:[A-Za-z0-9_-]{22}$/);
    expect(random.lastBytes).toBe(16);
  });

  it('deve gravar só o SHA-256 do token, sem o token em nenhum campo', async () => {
    const { sut, credentials, hash } = makeSut();

    await sut.execute(TERMINAL_ID);

    const [stored] = credentials.all();
    expect(stored?.tokenHash).toBe(hash.sha256(TOKEN));
    expect(stored?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(TOKEN);
  });

  it('deve gravar terminalId, emitidoEm e expiraEm com o relógio injetado, sem uso', async () => {
    const { sut, credentials, clock } = makeSut();
    const emitidoEm = new Date('2026-10-20T14:32:07Z');
    clock.set(emitidoEm);

    await sut.execute(TERMINAL_ID);

    expect(credentials.all()).toEqual([
      expect.objectContaining({
        terminalId: TERMINAL_ID,
        emitidoEm,
        expiraEm: new Date('2026-10-20T14:32:22Z'),
        consumidoEm: null,
        consumidoPorId: null,
      }),
    ]);
  });

  it('deve gerar tokens diferentes em dois pedidos seguidos', async () => {
    const { sut, credentials, clock } = makeSut({}, []);

    const first = await sut.execute(TERMINAL_ID);
    clock.advance(5000);
    const second = await sut.execute(TERMINAL_ID);

    expect(second.payload).not.toBe(first.payload);
    const [a, b] = credentials.all();
    expect(a?.tokenHash).not.toBe(b?.tokenHash);
  });

  it('deve fazer expiraEm menos emitidoEm ser 15 s por padrão', async () => {
    const { sut } = makeSut();

    const result = await sut.execute(TERMINAL_ID);

    expect(Date.parse(result.expiraEm) - Date.parse(result.emitidoEm)).toBe(15_000);
  });

  it.each([
    { ttlSeconds: 20, toleranceSeconds: 10, expected: 30_000 },
    { ttlSeconds: 10, toleranceSeconds: 0, expected: 10_000 },
    { ttlSeconds: 3, toleranceSeconds: 2, expected: 5_000 },
  ])(
    'deve mudar a validade para $expected ms com TTL $ttlSeconds s e tolerância $toleranceSeconds s',
    async ({ ttlSeconds, toleranceSeconds, expected }) => {
      const { sut, credentials } = makeSut({ ttlSeconds, toleranceSeconds });

      const result = await sut.execute(TERMINAL_ID);

      expect(Date.parse(result.expiraEm) - Date.parse(result.emitidoEm)).toBe(expected);
      const [stored] = credentials.all();
      expect(stored!.expiraEm.getTime() - stored!.emitidoEm.getTime()).toBe(expected);
    },
  );

  it('deve devolver emitidoEm e expiraEm em ISO e renovarEmMs da configuração', async () => {
    const { sut, clock } = makeSut({ renovarEmMs: 7000 });
    clock.set(new Date('2026-10-20T14:32:07Z'));

    const result = await sut.execute(TERMINAL_ID);

    expect(result).toEqual({
      payload: `ACS1:${TOKEN}`,
      emitidoEm: '2026-10-20T14:32:07.000Z',
      expiraEm: '2026-10-20T14:32:22.000Z',
      renovarEmMs: 7000,
    });
  });

  it('deve manter o QR anterior intacto e válido até a própria expiração', async () => {
    const { sut, credentials, clock } = makeSut({}, []);
    await sut.execute(TERMINAL_ID);
    const [before] = credentials.all();
    clock.advance(10_000);

    await sut.execute(TERMINAL_ID);

    expect(credentials.all()).toHaveLength(2);
    expect(credentials.all()[0]).toEqual(before);
  });

  it.todo('deve lançar 429 quando o pedido vem com menos de 5 s do anterior');
  it.todo('deve emitir quando o pedido vem com exatamente 5 s do anterior');
  it.todo('deve respeitar o intervalo configurado');
  it.todo('deve limitar por terminal: o QR de um terminal não barra o de outro');
  it.todo('deve não gravar nada quando o pedido é barrado pelo limite');
  it.todo('deve manter válido o QR anterior até a própria expiração');
});
