/**
 * Only what B07 needs; B08 and B09 grow this port.
 * "Active and not expired" means stored status `ATIVA` and `dataFim` today or later (usage is ignored).
 */
export interface IAuthorizationRepository {
  /** `today` is YYYY-MM-DD in America/Sao_Paulo. */
  hasActiveNonExpiredForAccessPoint(accessPointId: string, today: string): Promise<boolean>;
  /** Same, for any access point of the building. */
  hasActiveNonExpiredForBuilding(buildingId: string, today: string): Promise<boolean>;
}
