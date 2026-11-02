import { FakeLocationDirectory } from './FakeLocationDirectory';

const all = { page: 1, pageSize: 100 };
const now = new Date('2026-11-02T15:00:00.000Z');

const setup = () => new FakeLocationDirectory({ now: () => now });

const central = (directory: FakeLocationDirectory) =>
  directory.listBuildings(all).data.find((building) => building.nome === 'Edifício Central')!;

const point = (directory: FakeLocationDirectory, nome: string) =>
  directory.listAccessPoints(all).data.find((ap) => ap.nome === nome)!;

const newPoint = (buildingId: string, identificacao = 'POR-09') => ({
  buildingId,
  tipo: 'PORTA' as const,
  nome: 'Porta dos Fundos',
  identificacao,
  latitude: -23.3,
  longitude: -45.9,
  ativo: true,
});

describe('FakeLocationDirectory', () => {
  it('começa com os locais do Figma, ordenados por nome', () => {
    const directory = setup();

    expect(directory.listBuildings(all).data.map(({ nome }) => nome)).toEqual([
      'Edifício Anexo',
      'Edifício Central',
    ]);
    expect(directory.listAccessPoints(all).data.map(({ nome }) => nome)).toEqual([
      'Catraca do Anexo',
      'Catraca Social',
      'Porta da Garagem',
      'Portaria Principal',
    ]);
    expect(directory.listTerminals(all).total).toBe(4);
  });

  it('pagina as listas', () => {
    const directory = setup();

    expect(directory.listAccessPoints({ page: 2, pageSize: 3 })).toMatchObject({
      page: 2,
      total: 4,
      data: [expect.objectContaining({ nome: 'Portaria Principal' })],
    });
  });

  it('cria edifício e ponto de acesso', () => {
    const directory = setup();

    const building = directory.createBuilding({
      nome: 'Bloco B',
      endereco: 'Rua das Acácias, 200',
      latitude: -23.3,
      longitude: -45.9,
      ativo: true,
    });
    const ap = directory.createAccessPoint(newPoint(building.id));

    expect(building).toMatchObject({ nome: 'Bloco B', ativo: true });
    expect(ap).toMatchObject({ buildingId: building.id, identificacao: 'POR-09' });
  });

  it('identificação repetida no mesmo edifício dá 409 CONFLICT; em outro edifício pode', () => {
    const directory = setup();
    const anexo = directory.listBuildings(all).data[0];

    expect(() => directory.createAccessPoint(newPoint(central(directory).id, 'CAT-01'))).toThrow(
      expect.objectContaining({ status: 409, code: 'CONFLICT' }),
    );
    expect(directory.createAccessPoint(newPoint(anexo.id, 'CAT-01'))).toMatchObject({
      identificacao: 'CAT-01',
    });
  });

  it('ponto em edifício inativo dá 422 no buildingId; edifício que não existe dá 404', () => {
    const directory = setup();
    const anexo = directory.updateBuilding(directory.listBuildings(all).data[0].id, {
      ativo: false,
    });

    expect(() => directory.createAccessPoint(newPoint(anexo.id))).toThrow(
      expect.objectContaining({
        status: 422,
        details: [expect.objectContaining({ field: 'buildingId' })],
      }),
    );
    expect(() => directory.createAccessPoint(newPoint('nao-existe'))).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  it('desativar ponto com autorização ativa dá 409 LOCAL_COM_AUTORIZACOES_ATIVAS', () => {
    const directory = setup();

    expect(() =>
      directory.updateAccessPoint(point(directory, 'Catraca Social').id, { ativo: false }),
    ).toThrow(expect.objectContaining({ status: 409, code: 'LOCAL_COM_AUTORIZACOES_ATIVAS' }));
    expect(
      directory.updateAccessPoint(point(directory, 'Porta da Garagem').id, { ativo: false }),
    ).toMatchObject({ ativo: false });
  });

  it('desativar o edifício desativa os pontos, e recusa se algum tem autorização ativa', () => {
    const directory = setup();
    const anexo = directory.listBuildings(all).data[0];

    expect(() => directory.updateBuilding(central(directory).id, { ativo: false })).toThrow(
      expect.objectContaining({ code: 'LOCAL_COM_AUTORIZACOES_ATIVAS' }),
    );
    directory.updateAccessPoint(point(directory, 'Catraca do Anexo').id, { ativo: true });
    directory.updateBuilding(anexo.id, { ativo: false });
    expect(point(directory, 'Catraca do Anexo').ativo).toBe(false);
  });

  it('reativar ponto de edifício inativo dá 422 no campo ativo', () => {
    const directory = setup();
    const anexo = directory.listBuildings(all).data[0];
    directory.updateBuilding(anexo.id, { ativo: false });

    expect(() =>
      directory.updateAccessPoint(point(directory, 'Catraca do Anexo').id, { ativo: true }),
    ).toThrow(
      expect.objectContaining({
        status: 422,
        details: [expect.objectContaining({ field: 'ativo' })],
      }),
    );
  });

  it('terminal: online quando o último contato tem menos de 30 s', () => {
    const directory = setup();
    const byName = Object.fromEntries(directory.listTerminals(all).data.map((t) => [t.nome, t]));

    expect(byName['Terminal Social']).toMatchObject({ online: true, ativo: true });
    expect(byName['Terminal da Garagem']).toMatchObject({ online: false, ativo: true });
    expect(byName['Terminal do Anexo']).toMatchObject({ online: false, ativo: false });
  });

  it('cria terminal com uma chave de 43 caracteres que não aparece na lista nem no detalhe', () => {
    const directory = setup();
    const ap = directory.createAccessPoint(newPoint(central(directory).id));

    const { id, apiKey } = directory.createTerminal({
      accessPointId: ap.id,
      nome: 'Terminal dos Fundos',
    });

    expect(apiKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(directory.getTerminal(id)).toMatchObject({ nome: 'Terminal dos Fundos', online: false });
    expect(JSON.stringify(directory.listTerminals(all))).not.toContain(apiKey);
    expect(JSON.stringify(directory.getTerminal(id))).not.toContain(apiKey);
  });

  it('um terminal por ponto (409 CONFLICT) e ponto inativo dá 422 no accessPointId', () => {
    const directory = setup();

    expect(() =>
      directory.createTerminal({
        accessPointId: point(directory, 'Catraca Social').id,
        nome: 'Outro',
      }),
    ).toThrow(expect.objectContaining({ status: 409, code: 'CONFLICT' }));

    const anexoPoint = point(directory, 'Catraca do Anexo');
    expect(() => directory.createTerminal({ accessPointId: anexoPoint.id, nome: 'Outro' })).toThrow(
      expect.objectContaining({
        status: 422,
        details: [expect.objectContaining({ field: 'accessPointId' })],
      }),
    );
  });

  it('gerar nova chave devolve outra chave; terminal que não existe dá 404', () => {
    const directory = setup();
    const terminal = directory.listTerminals(all).data[0];

    const first = directory.rotateKey(terminal.id);
    const second = directory.rotateKey(terminal.id);

    expect(first.apiKey).not.toBe(second.apiKey);
    expect(() => directory.rotateKey('nao-existe')).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  it('altera nome e ativo do terminal', () => {
    const directory = setup();
    const terminal = directory.listTerminals(all).data[0];

    expect(
      directory.updateTerminal(terminal.id, { nome: 'Novo nome', ativo: false }),
    ).toMatchObject({
      nome: 'Novo nome',
      ativo: false,
    });
  });
});
