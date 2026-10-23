export type AccessPointType = 'PORTARIA' | 'PORTA' | 'CATRACA';

export interface AccessPoint {
  id: string;
  buildingId: string;
  tipo: AccessPointType;
  nome: string;
  identificacao: string;
  latitude: number;
  longitude: number;
  ativo: boolean;
}
