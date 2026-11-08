import type { AccessEvent } from '../../entities/AccessEvent';
import { Prisma } from '../../generated/prisma/client';
import type {
  AccessEventListFilter,
  IAccessEventRepository,
  RecentNfcQuery,
} from '../../repositories/IAccessEventRepository';

type AccessEventRow = Awaited<
  ReturnType<Prisma.TransactionClient['accessEvent']['findUniqueOrThrow']>
>;

// Explicit mapping, so a column added later never reaches the entity by accident.
const toEntity = (row: AccessEventRow): AccessEvent => ({
  id: row.id,
  ocorridoEm: row.ocorridoEm,
  terminalId: row.terminalId,
  accessPointId: row.accessPointId,
  usuarioId: row.usuarioId,
  authorizationId: row.authorizationId,
  metodo: row.metodo,
  resultado: row.resultado,
  motivo: row.motivo,
  distanciaM: row.distanciaM,
  clientEventId: row.clientEventId,
  // The application only ever writes an object (or nothing) into this column.
  detalhes: row.detalhes as Record<string, unknown> | null,
});

export class PrismaAccessEventRepository implements IAccessEventRepository {
  // A transaction client too: the approval (B15) writes the event inside its own transaction.
  constructor(private prisma: Prisma.TransactionClient) {}

  async append(event: AccessEvent): Promise<void> {
    await this.prisma.accessEvent.create({
      data: {
        id: event.id,
        ocorridoEm: event.ocorridoEm,
        terminalId: event.terminalId,
        accessPointId: event.accessPointId,
        usuarioId: event.usuarioId,
        authorizationId: event.authorizationId,
        metodo: event.metodo,
        resultado: event.resultado,
        motivo: event.motivo,
        distanciaM: event.distanciaM,
        clientEventId: event.clientEventId,
        // Prisma needs the explicit marker for a SQL NULL in a Json column.
        detalhes: (event.detalhes as Prisma.InputJsonObject | null) ?? Prisma.DbNull,
      },
    });
  }

  async list(_filter: AccessEventListFilter): Promise<never> {
    throw new Error('não implementado');
  }

  async findByClientEventId(clientEventId: string) {
    const row = await this.prisma.accessEvent.findUnique({ where: { clientEventId } });
    return row ? toEntity(row) : null;
  }

  async findRecentNfc({ terminalId, uid, since }: RecentNfcQuery) {
    // The range on `ocorridoEm` (indexed) keeps the scan to the last few seconds; the JSON path then
    // compares the whole UID, never a prefix.
    const row = await this.prisma.accessEvent.findFirst({
      where: {
        metodo: 'NFC',
        terminalId,
        ocorridoEm: { gt: since },
        detalhes: { path: ['uid'], equals: uid },
      },
      orderBy: [{ ocorridoEm: 'desc' }, { id: 'desc' }],
    });
    return row ? toEntity(row) : null;
  }
}
