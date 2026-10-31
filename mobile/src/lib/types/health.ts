export interface Health {
  status: 'ok';
  version: string;
  time: string;
  db: 'up' | 'down';
}
