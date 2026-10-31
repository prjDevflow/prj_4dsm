import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryQrCredentialRepository } from '../../../../test/doubles/InMemoryQrCredentialRepository';
import { makeQrCredential } from '../../../../test/factories/makeQrCredential';
import { PurgeExpiredCredentialsUseCase } from './PurgeExpiredCredentials_UseCase';

const HOUR = 3_600_000;

const makeSut = (purgeAfterHours = 1) => {
  const credentials = new InMemoryQrCredentialRepository();
  const clock = new FakeClock();
  const sut = new PurgeExpiredCredentialsUseCase(credentials, clock, { purgeAfterHours });
  /** Stores a credential that expired `msAgo` before the clock's now. */
  const expiredAgo = (n: number, msAgo: number) =>
    credentials.seed(
      makeQrCredential({
        id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
        tokenHash: String(n).repeat(64).slice(0, 64),
        emitidoEm: new Date(clock.now().getTime() - msAgo - 15_000),
        expiraEm: new Date(clock.now().getTime() - msAgo),
      }),
    );
  return { sut, credentials, clock, expiredAgo };
};

describe('PurgeExpiredCredentials', () => {
  it('deve apagar a credencial vencida há mais de 1 hora', async () => {
    const { sut, credentials, expiredAgo } = makeSut();
    expiredAgo(1, HOUR + 1);

    await sut.execute();

    expect(credentials.all()).toHaveLength(0);
  });

  it('deve manter a credencial vencida há exatamente 1 hora', async () => {
    const { sut, credentials, expiredAgo } = makeSut();
    expiredAgo(1, HOUR);

    await sut.execute();

    expect(credentials.all()).toHaveLength(1);
  });

  it('deve manter a credencial recém vencida e a ainda válida', async () => {
    const { sut, credentials, expiredAgo } = makeSut();
    expiredAgo(1, 1);
    expiredAgo(2, -5_000);

    await sut.execute();

    expect(credentials.all()).toHaveLength(2);
  });

  it('deve apagar só as vencidas há mais de 1 hora entre várias', async () => {
    const { sut, credentials, expiredAgo } = makeSut();
    expiredAgo(1, 3 * HOUR);
    expiredAgo(2, HOUR + 1);
    expiredAgo(3, HOUR);
    expiredAgo(4, 60_000);

    await sut.execute();

    expect(credentials.all().map((c) => c.tokenHash.charAt(0))).toEqual(['3', '4']);
  });

  it('deve devolver quantas credenciais apagou', async () => {
    const { sut, expiredAgo } = makeSut();
    expiredAgo(1, 2 * HOUR);
    expiredAgo(2, 2 * HOUR);
    expiredAgo(3, 10);

    expect(await sut.execute()).toBe(2);
  });

  it('deve usar o prazo configurado e o relógio injetado', async () => {
    const { sut, credentials, clock, expiredAgo } = makeSut(3);
    expiredAgo(1, 2 * HOUR);
    expiredAgo(2, 3 * HOUR + 1);

    await sut.execute();
    expect(credentials.all()).toHaveLength(1);

    clock.advance(HOUR + 1);
    await sut.execute();
    expect(credentials.all()).toHaveLength(0);
  });
});
