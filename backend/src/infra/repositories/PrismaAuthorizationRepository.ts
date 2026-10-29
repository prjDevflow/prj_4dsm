import type { Authorization } from '../../entities/Authorization';
import { todayInSaoPaulo } from '../../entities/rules/todayInSaoPaulo';
import type { Prisma } from '../../generated/prisma/client';
import type {
  AuthorizationDetails,
  AuthorizationListFilter,
  IAuthorizationRepository,
} from '../../repositories/IAuthorizationRepository';

const withRelations = {
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
} satisfies Prisma.AuthorizationInclude;

type AuthorizationRow = Prisma.AuthorizationGetPayload<{ include: typeof withRelations }>;

// Explicit mapping, so a column added later never reaches the entity by accident.
const toDetails = (row: AuthorizationRow): AuthorizationDetails => ({
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
});

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
      include: withRelations,
    });
    return row ? toDetails(row) : null;
  }

  async list(filter: AuthorizationListFilter) {
    const where: Prisma.AuthorizationWhereInput = {
      AND: [
        filter.usuarioId ? { usuarioId: filter.usuarioId } : {},
        filter.accessPointId ? { accessPointId: filter.accessPointId } : {},
        // Overlap with [dataDe, dataAte]: it ends on or after the start and begins on or before the end.
        filter.dataDe ? { dataFim: { gte: new Date(filter.dataDe) } } : {},
        filter.dataAte ? { dataInicio: { lte: new Date(filter.dataAte) } } : {},
        filter.situacao ? this.effectiveStatus(filter.situacao, filter.now) : {},
      ],
    };
    const orderBy: Prisma.AuthorizationOrderByWithRelationInput[] =
      filter.sort === 'recent'
        ? [{ criadoEm: 'desc' }, { id: 'desc' }]
        : [{ dataFim: 'asc' }, { id: 'asc' }];
    // Two queries, not `$transaction`: the repository also runs on a transaction client.
    const rows = await this.prisma.authorization.findMany({
      where,
      orderBy,
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: withRelations,
    });
    const total = await this.prisma.authorization.count({ where });
    return { items: rows.map(toDetails), total };
  }

  // The contract's order of precedence (rules/computeEffectiveStatus), written as a condition.
  private effectiveStatus(
    situacao: NonNullable<AuthorizationListFilter['situacao']>,
    now: Date,
  ): Prisma.AuthorizationWhereInput {
    const today = new Date(todayInSaoPaulo(now));
    const { usosPermitidos } = this.prisma.authorization.fields;
    switch (situacao) {
      case 'CANCELADA':
        return { situacao: 'CANCELADA' };
      case 'EXPIRADA':
        return { situacao: 'ATIVA', dataFim: { lt: today } };
      case 'ESGOTADA':
        return {
          situacao: 'ATIVA',
          dataFim: { gte: today },
          usosRealizados: { gte: usosPermitidos },
        };
      case 'ATIVA':
        return {
          situacao: 'ATIVA',
          dataFim: { gte: today },
          usosRealizados: { lt: usosPermitidos },
        };
    }
  }

  async cancelIfActive(input: {
    id: string;
    canceladoPorId: string;
    canceladoEm: Date;
    motivo: string | null;
  }) {
    // One conditional UPDATE: the row only changes while it is still ATIVA, so of two
    // simultaneous calls exactly one counts and the first `canceladoEm` stays.
    const { count } = await this.prisma.authorization.updateMany({
      where: { id: input.id, situacao: 'ATIVA' },
      data: {
        situacao: 'CANCELADA',
        canceladoPorId: input.canceladoPorId,
        canceladoEm: input.canceladoEm,
        motivoCancelamento: input.motivo,
      },
    });
    return count === 1;
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
