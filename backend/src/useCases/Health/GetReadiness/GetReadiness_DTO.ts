export interface IGetReadinessResponseDTO {
  /** `ready` when the API can serve requests (database reachable), `unavailable` when it cannot. */
  status: 'ready' | 'unavailable';
  db: 'up' | 'down';
  time: string;
}
