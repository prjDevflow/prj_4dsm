// POST /access/qr/validate (B15), as in backend/openapi.yaml.

export type ValidateQrBody = {
  payload: string;
  /** Left out when the phone could not locate itself: the server answers LOCALIZACAO_INVALIDA. */
  latitude?: number;
  longitude?: number;
  precisaoMetros?: number;
};

export type AccessGranted = {
  resultado: 'AUTORIZADO';
  mensagem: string;
  local: { nome: string };
  usosRestantes: number;
  distanciaM: number;
  ocorridoEm: string;
};
