import type { AccessEvent } from '../../entities/AccessEvent';
import { Prisma } from '../../generated/prisma/client';
import type {
  AccessEventDetails,
  AccessEventListFilter,
  AccessEventListResult,
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

// Only what the history shows: `detalhes` and `clientEventId` are never read for a list.
const listSelect = {
  id: true,
  ocorridoEm: true,
  metodo: true,
  resultado: true,
  motivo: true,
  distanciaM: true,
  authorizationId: true,
  usuario: { select: { id: true, nome: true, perfil: true } },
  accessPoint: {
    select: { id: true, nome: true, tipo: true, building: { select: { id: true, nome: true } } },
  },
  terminal: { select: { id: true, nome: true } },
} satisfies Prisma.AccessEventSelect;

type ListRow = Prisma.AccessEventGetPayload<{ select: typeof listSelect }>;

// Explicit as well: only these columns are ever written.
const toCreateData = (event: AccessEvent): Prisma.AccessEventUncheckedCreateInput => ({
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
});

const toDetails = (row: ListRow): AccessEventDetails => ({
  id: row.id,
  ocorridoEm: row.ocorridoEm,
  metodo: row.metodo,
  resultado: row.resultado,
  motivo: row.motivo,
  distanciaM: row.distanciaM,
  authorizationId: row.authorizationId,
  usuario: row.usuario,
  local: row.accessPoint && {
    id: row.accessPoint.id,
    nome: row.accessPoint.nome,
    tipo: row.accessPoint.tipo,
    edificio: row.accessPoint.building,
  },
  terminal: row.terminal,
});

export class PrismaAccessEventRepository implements IAccessEventRepository {
  // A transaction client too: the approval (B15) writes the event inside its own transaction.
  constructor(private prisma: Prisma.TransactionClient) {}

  async append(event: AccessEvent): Promise<void> {
    await this.prisma.accessEvent.create({ data: toCreateData(event) });
  }

  async list(filter: AccessEventListFilter): Promise<AccessEventListResult> {
    // An `undefined` field is no condition at all, so each filter applies only when it was sent.
    const where: Prisma.AccessEventWhereInput = {
      usuarioId: filter.usuarioId,
      accessPointId: filter.accessPointId,
      terminalId: filter.terminalId,
      metodo: filter.metodo,
      resultado: filter.resultado,
      motivo: filter.motivo,
      // Both ends are inclusive.
      ocorridoEm: { gte: filter.de, lte: filter.ate },
    };
    // Two queries, not `$transaction`: the repository also runs on a transaction client.
    const rows = await this.prisma.accessEvent.findMany({
      where,
      select: listSelect,
      // `id` breaks ties, so a page never repeats or skips an event that shares an instant.
      orderBy: [{ ocorridoEm: 'desc' }, { id: 'desc' }],
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    });
    const total = await this.prisma.accessEvent.count({ where });
    return { items: rows.map(toDetails), total };
  }

  async appendIfAbsent(events: AccessEvent[]): Promise<number> {
    if (events.length === 0) return 0;
    // `ON CONFLICT DO NOTHING` on the unique `clientEventId`: the database settles who stored a key first,
    // even when the same batch arrives twice at once.
    const { count } = await this.prisma.accessEvent.createMany({
      data: events.map(toCreateData),
      skipDuplicates: true,
    });
    return count;
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
        // Only live reads: a batch sent after an outage carries the terminal's clock. Approved reads have no
        // `motivo` (NULL), and `<>` alone would drop them, so the NULL is asked for.
        OR: [{ motivo: null }, { motivo: { not: 'TERMINAL_OFFLINE' } }],
      },
      orderBy: [{ ocorridoEm: 'desc' }, { id: 'desc' }],
    });
    return row ? toEntity(row) : null;
  }
}
