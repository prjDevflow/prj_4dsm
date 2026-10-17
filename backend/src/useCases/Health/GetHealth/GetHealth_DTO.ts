export interface IGetHealthResponseDTO {
  status: 'ok';
  version: string;
  time: string;
  db: 'up' | 'down';
}
