export interface Terminal {
  id: string;
  accessPointId: string;
  nome: string;
  apiKeyHash: string;
  ativo: boolean;
  ultimoContatoEm: Date | null;
  ultimaLat: number | null;
  ultimaLon: number | null;
  gpsFix: boolean;
  gpsSimulado: boolean;
  firmware: string | null;
  rssi: number | null;
  modoCadastroUsuarioId: string | null;
  modoCadastroAte: Date | null;
}
