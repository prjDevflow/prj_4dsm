import { accessPointFormSchema, buildingFormSchema } from './locations.schema';

const errors = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) =>
  result.success
    ? {}
    : Object.fromEntries(result.error!.issues.map((issue) => [issue.path[0], issue.message]));

const building = {
  nome: 'Edifício Central',
  endereco: 'Rua das Acácias, 120',
  latitude: '-23,30512',
  longitude: '-45,96551',
  ativo: true,
};

const buildingErrors = (input: Partial<typeof building>) =>
  errors(buildingFormSchema.safeParse({ ...building, ...input }));

describe('buildingFormSchema', () => {
  it('converte a vírgula decimal e entrega números', () => {
    expect(buildingFormSchema.parse(building)).toEqual({
      nome: 'Edifício Central',
      endereco: 'Rua das Acácias, 120',
      latitude: -23.30512,
      longitude: -45.96551,
      ativo: true,
    });
  });

  it('nome e endereço são obrigatórios', () => {
    expect(buildingErrors({ nome: '  ', endereco: '' })).toEqual({
      nome: 'Informe o nome.',
      endereco: 'Informe o endereço.',
    });
  });

  it('nome até 120 e endereço até 255 caracteres', () => {
    expect(buildingErrors({ nome: 'a'.repeat(121), endereco: 'a'.repeat(256) })).toEqual({
      nome: 'O nome pode ter no máximo 120 caracteres.',
      endereco: 'O endereço pode ter no máximo 255 caracteres.',
    });
  });

  it('os limites de latitude (-90 e 90) e longitude (-180 e 180) passam', () => {
    for (const [latitude, longitude] of [
      ['-90', '-180'],
      ['90', '180'],
      ['0', '0'],
    ]) {
      expect(buildingErrors({ latitude, longitude })).toEqual({});
    }
  });

  it('fora da faixa ou que não é número dá "Latitude inválida." e "Longitude inválida."', () => {
    expect(buildingErrors({ latitude: '90,0001', longitude: '-180.0001' })).toEqual({
      latitude: 'Latitude inválida.',
      longitude: 'Longitude inválida.',
    });
    expect(buildingErrors({ latitude: 'abc', longitude: '1,2,3' })).toEqual({
      latitude: 'Latitude inválida.',
      longitude: 'Longitude inválida.',
    });
  });

  it('coordenada vazia pede para informar', () => {
    expect(buildingErrors({ latitude: '', longitude: ' ' })).toEqual({
      latitude: 'Informe a latitude.',
      longitude: 'Informe a longitude.',
    });
  });
});

const point = {
  buildingId: 'b-1',
  tipo: 'CATRACA' as const,
  nome: 'Catraca Social',
  identificacao: ' CAT-01 ',
  latitude: '-23.30512',
  longitude: '-45.96551',
  ativo: true,
};

const pointErrors = (input: Partial<Record<keyof typeof point, unknown>>) =>
  errors(accessPointFormSchema.safeParse({ ...point, ...input }));

describe('accessPointFormSchema', () => {
  it('entrega a identificação sem espaços e as coordenadas como número', () => {
    expect(accessPointFormSchema.parse(point)).toMatchObject({
      identificacao: 'CAT-01',
      latitude: -23.30512,
    });
  });

  it('edifício, tipo, nome e identificação são obrigatórios', () => {
    expect(pointErrors({ buildingId: null, tipo: null, nome: '', identificacao: '' })).toEqual({
      buildingId: 'Escolha o edifício.',
      tipo: 'Escolha o tipo.',
      nome: 'Informe o nome.',
      identificacao: 'Informe a identificação.',
    });
  });

  it('identificação até 60 caracteres', () => {
    expect(pointErrors({ identificacao: 'A'.repeat(61) })).toEqual({
      identificacao: 'A identificação pode ter no máximo 60 caracteres.',
    });
  });

  it('as coordenadas seguem as mesmas regras do edifício', () => {
    expect(pointErrors({ latitude: '-91', longitude: '181' })).toEqual({
      latitude: 'Latitude inválida.',
      longitude: 'Longitude inválida.',
    });
  });
});
