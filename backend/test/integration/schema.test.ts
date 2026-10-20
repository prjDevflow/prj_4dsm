import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BCRYPT_HASH,
  expectViolation,
  insertAccessPoint,
  insertAuthorization,
  insertBuilding,
  insertNfcTag,
  insertQrCredential,
  insertTerminal,
  insertUser,
  prisma,
  resetDatabase,
  sha256Hex,
} from './helpers';

const day = (iso: string) => new Date(iso);

describe('modelo de dados v1', () => {
  beforeEach(resetDatabase);

  describe('estrutura', () => {
    it('cria as nove tabelas do modelo e nenhuma sobra', async () => {
      const rows = await prisma.$queryRaw<{ tablename: string }[]>`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
        ORDER BY tablename`;

      expect(rows.map((r) => r.tablename)).toEqual([
        'access_events',
        'access_points',
        'authorizations',
        'buildings',
        'nfc_tags',
        'qr_credentials',
        'terminal_commands',
        'terminals',
        'users',
      ]);
    });

    it.each([
      ['access_events', 'ocorridoEm'],
      ['access_events', 'usuarioId, ocorridoEm'],
      ['access_events', 'accessPointId, ocorridoEm'],
      ['qr_credentials', 'expiraEm'],
      ['terminal_commands', 'terminalId, id'],
      ['authorizations', 'usuarioId'],
      ['authorizations', 'accessPointId'],
    ])('tem índice em %s (%s)', async (table, columns) => {
      const rows = await prisma.$queryRaw<{ indexdef: string }[]>`
        SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = ${table}`;

      // Postgres only quotes identifiers that need it, so compare without quotes.
      const definitions = rows.map((r) => r.indexdef.replaceAll('"', ''));
      expect(definitions.some((d) => d.endsWith(`(${columns})`))).toBe(true);
    });
  });

  describe('unicidade', () => {
    it('rejeita dois usuários com o mesmo e-mail', async () => {
      await insertUser({ email: 'a@teste.local' });

      await expectViolation(insertUser({ email: 'a@teste.local' }), 'users_email_key');
    });

    it('rejeita e-mail com letra maiúscula', async () => {
      await expectViolation(
        insertUser({ email: 'Maiuscula@teste.local' }),
        'users_email_lowercase_chk',
      );
    });

    it('rejeita identificação repetida no mesmo edifício, mas aceita em outro', async () => {
      const building = await insertBuilding();
      await insertAccessPoint({ buildingId: building.id, identificacao: 'CAT-1' });

      await expectViolation(
        insertAccessPoint({ buildingId: building.id, identificacao: 'CAT-1' }),
        'access_points_buildingId_identificacao_key',
      );
      await expect(insertAccessPoint({ identificacao: 'CAT-1' })).resolves.toBeTruthy();
    });

    it('rejeita dois terminais no mesmo ponto de acesso', async () => {
      const point = await insertAccessPoint();
      await insertTerminal({ accessPointId: point.id });

      await expectViolation(
        insertTerminal({ accessPointId: point.id }),
        'terminals_accessPointId_key',
      );
    });

    it('rejeita UID de tag NFC repetido', async () => {
      await insertNfcTag({ uid: '04A1B2C3D4' });

      await expectViolation(insertNfcTag({ uid: '04A1B2C3D4' }), 'nfc_tags_uid_key');
    });

    it('rejeita hash de token de QR repetido', async () => {
      await insertQrCredential({ tokenHash: sha256Hex('c') });

      await expectViolation(
        insertQrCredential({ tokenHash: sha256Hex('c') }),
        'qr_credentials_tokenHash_key',
      );
    });

    it('aceita vários eventos sem clientEventId, mas rejeita clientEventId repetido', async () => {
      const base = { metodo: 'NFC', resultado: 'NEGADO', ocorridoEm: new Date() } as const;
      await prisma.accessEvent.create({ data: base });
      await prisma.accessEvent.create({ data: base });
      await prisma.accessEvent.create({ data: { ...base, clientEventId: 'cli-1' } });

      await expectViolation(
        prisma.accessEvent.create({ data: { ...base, clientEventId: 'cli-1' } }),
        'access_events_clientEventId_key',
      );
    });
  });

  describe('restrições da autorização (CHECK)', () => {
    it('rejeita usosRealizados maior que usosPermitidos', async () => {
      await expectViolation(
        insertAuthorization({ usosPermitidos: 3, usosRealizados: 4 }),
        'authorizations_usos_chk',
      );
    });

    it('aceita usosRealizados igual a usosPermitidos', async () => {
      await expect(
        insertAuthorization({ usosPermitidos: 3, usosRealizados: 3 }),
      ).resolves.toBeTruthy();
    });

    it.each([0, 1001])('rejeita usosPermitidos %i (fora de 1 a 1000)', async (usos) => {
      await expectViolation(
        insertAuthorization({ usosPermitidos: usos }),
        'authorizations_usos_permitidos_chk',
      );
    });

    it.each([1, 1000])('aceita usosPermitidos %i (limites do intervalo)', async (usos) => {
      await expect(insertAuthorization({ usosPermitidos: usos })).resolves.toBeTruthy();
    });

    it('rejeita usosRealizados negativo', async () => {
      await expectViolation(insertAuthorization({ usosRealizados: -1 }), 'authorizations_usos_chk');
    });

    it('rejeita dataFim anterior a dataInicio e aceita dataFim igual', async () => {
      await expectViolation(
        insertAuthorization({ dataInicio: day('2026-10-10'), dataFim: day('2026-10-09') }),
        'authorizations_datas_chk',
      );
      await expect(
        insertAuthorization({ dataInicio: day('2026-10-10'), dataFim: day('2026-10-10') }),
      ).resolves.toBeTruthy();
    });

    it.each(['8:00', '24:00', '12:60', '08h00', ''])(
      'rejeita horaInicio "%s" fora de HH:mm',
      async (hora) => {
        await expectViolation(
          insertAuthorization({ horaInicio: hora, horaFim: '23:59' }),
          'authorizations_horas_formato_chk',
        );
      },
    );

    it('rejeita horaFim igual ou anterior a horaInicio', async () => {
      await expectViolation(
        insertAuthorization({ horaInicio: '08:00', horaFim: '08:00' }),
        'authorizations_horas_ordem_chk',
      );
      await expectViolation(
        insertAuthorization({ horaInicio: '18:00', horaFim: '08:00' }),
        'authorizations_horas_ordem_chk',
      );
    });

    it('aceita 00:00 a 23:59 e um intervalo de um minuto', async () => {
      await expect(
        insertAuthorization({ horaInicio: '00:00', horaFim: '23:59' }),
      ).resolves.toBeTruthy();
      await expect(
        insertAuthorization({ horaInicio: '08:00', horaFim: '08:01' }),
      ).resolves.toBeTruthy();
    });

    it('começa ATIVA e sem usos realizados', async () => {
      const authorization = await insertAuthorization();

      expect(authorization).toMatchObject({ situacao: 'ATIVA', usosRealizados: 0 });
    });
  });

  describe('outras restrições (CHECK)', () => {
    it.each([
      [
        'latitude acima de 90',
        () => insertBuilding({ latitude: 90.1 }),
        'buildings_coordenadas_chk',
      ],
      [
        'latitude abaixo de -90',
        () => insertBuilding({ latitude: -90.1 }),
        'buildings_coordenadas_chk',
      ],
      [
        'longitude acima de 180',
        () => insertBuilding({ longitude: 180.1 }),
        'buildings_coordenadas_chk',
      ],
      [
        'longitude abaixo de -180 no ponto de acesso',
        () => insertAccessPoint({ longitude: -180.1 }),
        'access_points_coordenadas_chk',
      ],
      [
        'ultimaLat fora do intervalo',
        () => insertTerminal({ ultimaLat: 91 }),
        'terminals_posicao_chk',
      ],
    ])('rejeita coordenada inválida: %s', async (_nome, insert, constraint) => {
      await expectViolation(insert(), constraint);
    });

    it('aceita as coordenadas extremas válidas', async () => {
      await expect(insertBuilding({ latitude: 90, longitude: -180 })).resolves.toBeTruthy();
    });

    it.each(['04a1b2c3d4', '04A1B2C', '04A1-B2C3', 'ZZZZZZZZ'])(
      'rejeita UID de tag NFC inválido "%s"',
      async (uid) => {
        await expectViolation(insertNfcTag({ uid }), 'nfc_tags_uid_formato_chk');
      },
    );

    it('rejeita UID de tag NFC com mais de 20 caracteres', async () => {
      await expectViolation(insertNfcTag({ uid: 'A'.repeat(21) }), 'character varying(20)');
    });

    it('aceita UID de tag NFC com 8 e com 20 caracteres', async () => {
      await expect(insertNfcTag({ uid: 'A'.repeat(8) })).resolves.toBeTruthy();
      await expect(insertNfcTag({ uid: 'B'.repeat(20) })).resolves.toBeTruthy();
    });

    it('rejeita credencial QR que expira antes ou junto da emissão', async () => {
      const emitidoEm = new Date('2026-10-20T14:00:00Z');

      await expectViolation(
        insertQrCredential({ emitidoEm, expiraEm: emitidoEm }),
        'qr_credentials_validade_chk',
      );
    });

    it('rejeita comando que expira antes ou junto da criação e numera em ordem crescente', async () => {
      const terminal = await insertTerminal();
      const criadoEm = new Date('2026-10-20T14:00:00Z');

      await expectViolation(
        prisma.terminalCommand.create({
          data: { terminalId: terminal.id, tipo: 'ABRIR', criadoEm, expiraEm: criadoEm },
        }),
        'terminal_commands_validade_chk',
      );

      const expiraEm = new Date(criadoEm.getTime() + 10_000);
      const first = await prisma.terminalCommand.create({
        data: { terminalId: terminal.id, tipo: 'ABRIR', criadoEm, expiraEm },
      });
      const second = await prisma.terminalCommand.create({
        data: {
          terminalId: terminal.id,
          tipo: 'NEGAR',
          motivo: 'FORA_DO_PERIODO',
          criadoEm,
          expiraEm,
        },
      });
      expect(second.id).toBeGreaterThan(first.id);
    });
  });

  describe('segredos nunca em texto puro', () => {
    it('rejeita senhaHash que não é um hash bcrypt', async () => {
      await expectViolation(
        insertUser({ senhaHash: 'senha-em-texto-puro' }),
        'users_senhaHash_bcrypt_chk',
      );
      await expect(insertUser({ senhaHash: BCRYPT_HASH })).resolves.toBeTruthy();
    });

    it('rejeita apiKeyHash que não é SHA-256 em hexadecimal', async () => {
      await expectViolation(
        insertTerminal({ apiKeyHash: 'chave-do-terminal' }),
        'terminals_apiKeyHash_sha256_chk',
      );
      await expect(insertTerminal({ apiKeyHash: sha256Hex('a') })).resolves.toBeTruthy();
    });

    it('rejeita tokenHash que não é SHA-256 em hexadecimal', async () => {
      await expectViolation(
        insertQrCredential({ tokenHash: 'ACS1:q3F8k2Zr1pLw9XbTn0YhVA' }),
        'qr_credentials_tokenHash_sha256_chk',
      );
    });

    it('não declara no schema.prisma nenhuma coluna de segredo sem o sufixo Hash', () => {
      const schema = readFileSync(resolve(__dirname, '../../prisma/schema.prisma'), 'utf8');
      const fields = [...schema.matchAll(/^ {2}([a-zA-Z]\w*)[ \t]+\S+/gm)].map(
        (m) => m[1] as string,
      );
      const secretLike = fields.filter((name) =>
        /senha|password|token|apikey|chave|secret/i.test(name),
      );

      expect(fields.length).toBeGreaterThan(30);
      expect(secretLike.filter((name) => !name.endsWith('Hash'))).toEqual([]);
      expect(secretLike.sort()).toEqual(['apiKeyHash', 'senhaHash', 'tokenHash']);
    });
  });

  describe('chaves estrangeiras', () => {
    it('não apaga um usuário que tem autorização (Restrict)', async () => {
      const authorization = await insertAuthorization();

      await expectViolation(
        prisma.user.delete({ where: { id: authorization.usuarioId } }),
        'authorizations_usuarioId_fkey',
      );
    });

    it('rejeita autorização para um ponto de acesso inexistente', async () => {
      await expectViolation(
        insertAuthorization({ accessPointId: '00000000-0000-4000-8000-000000000000' }),
        'authorizations_accessPointId_fkey',
      );
    });

    it('aceita evento sem terminal, ponto, usuário nem autorização (credencial desconhecida)', async () => {
      const event = await prisma.accessEvent.create({
        data: {
          metodo: 'QR',
          resultado: 'NEGADO',
          motivo: 'CREDENCIAL_INVALIDA',
          detalhes: { tokenHashPrefixo: 'ab12cd34' },
        },
      });

      expect(event).toMatchObject({
        terminalId: null,
        accessPointId: null,
        usuarioId: null,
        authorizationId: null,
        detalhes: { tokenHashPrefixo: 'ab12cd34' },
      });
    });
  });

  describe('valores padrão', () => {
    it('cria usuário ativo e terminal sem GPS', async () => {
      const user = await insertUser();
      const terminal = await insertTerminal();

      expect(user.ativo).toBe(true);
      expect(terminal).toMatchObject({ ativo: true, gpsFix: false, gpsSimulado: false });
    });
  });
});
