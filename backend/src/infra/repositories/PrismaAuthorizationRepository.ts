import type { Authorization } from '../../entities/Authorization';
import type { Prisma } from '../../generated/prisma/client';
import type {
  AuthorizationDetails,
  IAuthorizationRepository,
} from '../../repositories/IAuthorizationRepository';

export class PrismaAuthorizationRepository implements IAuthorizationRepository {
  // A transaction client too: inside a unit of work the same code runs on the transaction.
  constructor(private prisma: Prisma.TransactionClient) {}

  async save(authorization: Authorization) {
    await this.prisma.authorization.create({
      data: {
        id: authorization.id,
        usuarioId: authorization.usuarioId,
        accessPointId: authorization.accessPointId,
        // YYYY-MM-DD parses as UTC midnight, which is the calendar day the `date` column stores.
        dataInicio: new Date(authorization.dataInicio),
        dataFim: new Date(authorization.dataFim),
        horaInicio: authorization.horaInicio,
        horaFim: authorization.horaFim,
        usosPermitidos: authorization.usosPermitidos,
        usosRealizados: authorization.usosRealizados,
        situacao: authorization.situacao,
        criadoPorId: authorization.criadoPorId,
        criadoEm: authorization.criadoEm,
        canceladoPorId: authorization.canceladoPorId,
        canceladoEm: authorization.canceladoEm,
        motivoCancelamento: authorization.motivoCancelamento,
      },
    });
  }

  async findViewById(id: string): Promise<AuthorizationDetails | null> {
    const row = await this.prisma.authorization.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nome: true, perfil: true } },
        criadoPor: { select: { id: true, nome: true } },
        canceladoPor: { select: { id: true, nome: true } },
        accessPoint: {
          select: {
            id: true,
            nome: true,
            tipo: true,
            building: { select: { id: true, nome: true } },
          },
        },
      },
    });
    if (!row) return null;
    return {
      authorization: {
        id: row.id,
        usuarioId: row.usuarioId,
        accessPointId: row.accessPointId,
        dataInicio: row.dataInicio.toISOString().slice(0, 10),
        dataFim: row.dataFim.toISOString().slice(0, 10),
        horaInicio: row.horaInicio,
        horaFim: row.horaFim,
        usosPermitidos: row.usosPermitidos,
        usosRealizados: row.usosRealizados,
        situacao: row.situacao,
        criadoPorId: row.criadoPorId,
        criadoEm: row.criadoEm,
        canceladoPorId: row.canceladoPorId,
        canceladoEm: row.canceladoEm,
        motivoCancelamento: row.motivoCancelamento,
      },
      usuario: row.usuario,
      local: {
        id: row.accessPoint.id,
        nome: row.accessPoint.nome,
        tipo: row.accessPoint.tipo,
        edificio: row.accessPoint.building,
      },
      criadoPor: row.criadoPor,
      canceladoPor: row.canceladoPor,
    };
  }

  async hasActiveNonExpiredForAccessPoint(accessPointId: string, today: string) {
    return this.hasActiveNonExpired({ accessPointId }, today);
  }

  async hasActiveNonExpiredForBuilding(buildingId: string, today: string) {
    return this.hasActiveNonExpired({ accessPoint: { buildingId } }, today);
  }

  private async hasActiveNonExpired(
    place: { accessPointId: string } | { accessPoint: { buildingId: string } },
    today: string,
  ) {
    const found = await this.prisma.authorization.findFirst({
      where: {
        ...place,
        situacao: 'ATIVA',
        // `dataFim` is a calendar date: the last day still counts.
        dataFim: { gte: new Date(today) },
      },
      select: { id: true },
    });
    return found !== null;
  }
}
