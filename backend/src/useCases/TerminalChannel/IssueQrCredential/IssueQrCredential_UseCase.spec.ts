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

  it.todo('deve gravar só o SHA-256 do token, sem o token em nenhum campo');
  it.todo('deve gravar terminalId, emitidoEm e expiraEm com o relógio injetado');
  it.todo('deve gerar tokens diferentes em dois pedidos seguidos');
  it.todo('deve fazer expiraEm menos emitidoEm ser 15 s por padrão');
  it.todo('deve mudar a validade quando QR_TTL_SECONDS ou QR_TOLERANCE_SECONDS mudam');
  it.todo('deve devolver emitidoEm, expiraEm em ISO e renovarEmMs da configuração');
  it.todo('deve lançar 429 quando o pedido vem com menos de 5 s do anterior');
  it.todo('deve emitir quando o pedido vem com exatamente 5 s do anterior');
  it.todo('deve respeitar o intervalo configurado');
  it.todo('deve limitar por terminal: o QR de um terminal não barra o de outro');
  it.todo('deve não gravar nada quando o pedido é barrado pelo limite');
  it.todo('deve manter válido o QR anterior até a própria expiração');
});
