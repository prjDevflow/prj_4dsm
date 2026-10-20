import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../test/doubles/FakeClock';
import { JwtTokenProvider } from './JwtTokenProvider';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';
const PAYLOAD = { sub: '00000000-0000-4000-8000-0000000000e1', perfil: 'ADMIN' } as const;

const makeSut = (secret = SECRET) => {
  const clock = new FakeClock(new Date('2026-10-20T14:00:00Z'));
  const sut = new JwtTokenProvider(secret, 60, clock);
  return { sut, clock };
};

describe('JwtTokenProvider', () => {
  it('deve devolver o sub e o perfil de um token recém-emitido', () => {
    const { sut } = makeSut();

    expect(sut.verify(sut.sign(PAYLOAD))).toEqual(PAYLOAD);
  });

  it('deve gravar sub, perfil, iat e exp, com iat vindo do relógio injetado', () => {
    const { sut } = makeSut();

    const claims = jwt.decode(sut.sign(PAYLOAD)) as Record<string, unknown>;

    expect(claims).toEqual({
      ...PAYLOAD,
      iat: Date.parse('2026-10-20T14:00:00Z') / 1000,
      exp: Date.parse('2026-10-20T14:01:00Z') / 1000,
    });
  });

  it('deve aceitar o token um segundo antes de expirar e recusá-lo no instante da expiração', () => {
    const { sut, clock } = makeSut();
    const token = sut.sign(PAYLOAD);

    clock.advance(59_000);
    expect(sut.verify(token)).toEqual(PAYLOAD);

    clock.advance(1_000);
    expect(sut.verify(token)).toBeNull();
  });

  it('deve recusar um token assinado com outro segredo', () => {
    const forged = makeSut('outro-segredo-tambem-com-mais-de-32-caracteres').sut.sign(PAYLOAD);

    expect(makeSut().sut.verify(forged)).toBeNull();
  });

  it('deve recusar um token com o conteúdo adulterado', () => {
    const { sut } = makeSut();
    const [header, , signature] = sut.sign(PAYLOAD).split('.');
    const payload = Buffer.from(JSON.stringify({ ...PAYLOAD, perfil: 'VISITANTE' })).toString(
      'base64url',
    );

    expect(sut.verify(`${header}.${payload}.${signature}`)).toBeNull();
  });

  it.each(['', 'isto-nao-e-um-token', 'a.b.c'])('deve recusar o token malformado "%s"', (token) => {
    expect(makeSut().sut.verify(token)).toBeNull();
  });

  it('deve recusar um token sem assinatura (alg none)', () => {
    const unsigned = jwt.sign(PAYLOAD, '', { algorithm: 'none' });

    expect(makeSut().sut.verify(unsigned)).toBeNull();
  });

  it('deve recusar um token com assinatura e prazo válidos, mas perfil desconhecido', () => {
    const iat = Date.parse('2026-10-20T14:00:00Z') / 1000;
    const token = jwt.sign({ sub: PAYLOAD.sub, perfil: 'ROOT', iat }, SECRET, {
      algorithm: 'HS256',
      expiresIn: 60,
    });

    expect(makeSut().sut.verify(token)).toBeNull();
  });
});
