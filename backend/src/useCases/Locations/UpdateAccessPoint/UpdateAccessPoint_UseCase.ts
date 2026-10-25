import type { AccessPoint } from '../../../entities/AccessPoint';
import { todayInSaoPaulo } from '../../../entities/rules/todayInSaoPaulo';
import type { IClock } from '../../../providers/IClock';
import type { IAccessPointRepository } from '../../../repositories/IAccessPointRepository';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { IBuildingRepository } from '../../../repositories/IBuildingRepository';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { LocalWithActiveAuthorizationsError } from '../locationErrors';
import type { IUpdateAccessPointDTO } from './UpdateAccessPoint_DTO';

export class UpdateAccessPointUseCase {
  constructor(
    private buildings: IBuildingRepository,
    private accessPoints: IAccessPointRepository,
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(id: string, input: IUpdateAccessPointDTO): Promise<AccessPoint> {
    const accessPoint = await this.accessPoints.findById(id);
    if (!accessPoint) throw new NotFoundError('Ponto de acesso não encontrado');

    const updated: AccessPoint = {
      ...accessPoint,
      tipo: input.tipo ?? accessPoint.tipo,
      nome: input.nome ?? accessPoint.nome,
      identificacao: input.identificacao ?? accessPoint.identificacao,
      latitude: input.latitude ?? accessPoint.latitude,
      longitude: input.longitude ?? accessPoint.longitude,
      ativo: input.ativo ?? accessPoint.ativo,
    };

    if (accessPoint.ativo && !updated.ativo) await this.assertNoActiveAuthorizations(id);
    if (!accessPoint.ativo && updated.ativo) await this.assertBuildingIsActive(accessPoint);

    // `save` rejects a repeated identification in the building (409), even between simultaneous requests.
    await this.accessPoints.save(updated);
    return updated;
  }

  private async assertNoActiveAuthorizations(accessPointId: string) {
    const today = todayInSaoPaulo(this.clock.now());
    if (await this.authorizations.hasActiveNonExpiredForAccessPoint(accessPointId, today)) {
      throw new LocalWithActiveAuthorizationsError();
    }
  }

  /** A point does not come back to life inside a building that was shut down. */
  private async assertBuildingIsActive(accessPoint: AccessPoint) {
    const building = await this.buildings.findById(accessPoint.buildingId);
    if (!building?.ativo) {
      throw new ValidationError('Dados inválidos', [
        { field: 'ativo', message: 'O edifício está inativo; reative-o antes' },
      ]);
    }
  }
}
