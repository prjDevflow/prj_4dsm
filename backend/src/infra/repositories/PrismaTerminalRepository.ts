import type { Terminal } from '../../entities/Terminal';
import type { PrismaClient } from '../../generated/prisma/client';
import type {
  ITerminalRepository,
  TerminalListFilter,
  TerminalHeartbeat,
  TerminalListResult,
} from '../../repositories/ITerminalRepository';
import { ConflictError } from '../../shared/errors/AppError';

type TerminalRow = Awaited<ReturnType<PrismaClient['terminal']['findUniqueOrThrow']>>;

const toEntity = (row: TerminalRow): Terminal => ({
  id: row.id,
  accessPointId: row.accessPointId,
  nome: row.nome,
  apiKeyHash: row.apiKeyHash,
  ativo: row.ativo,
  ultimoContatoEm: row.ultimoContatoEm,
  ultimaLat: row.ultimaLat,
  ultimaLon: row.ultimaLon,
  gpsFix: row.gpsFix,
  gpsSimulado: row.gpsSimulado,
  firmware: row.firmware,
  rssi: row.rssi,
  modoCadastroUsuarioId: row.modoCadastroUsuarioId,
  modoCadastroAte: row.modoCadastroAte,
});

// P2002 is Prisma's unique-constraint violation; `accessPointId` is the only unique column besides the id.
const isAccessPointTaken = (error: unknown) =>
  (error as { code?: string } | null)?.code === 'P2002' &&
  JSON.stringify((error as { meta?: unknown }).meta ?? '').includes('accessPointId');

// P2025 is Prisma's "record to update not found".
const isRecordNotFound = (error: unknown) => (error as { code?: string } | null)?.code === 'P2025';

export class PrismaTerminalRepository implements ITerminalRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    const row = await this.prisma.terminal.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async save(terminal: Terminal) {
    try {
      await this.prisma.terminal.create({ data: terminal });
    } catch (error) {
      // The unique index decides when two requests create a terminal for the same point at once.
      if (isAccessPointTaken(error)) {
        throw new ConflictError('CONFLICT', 'Este ponto de acesso já tem um terminal');
      }
      throw error;
    }
  }

  async updateDetails(id: string, changes: { nome?: string; ativo?: boolean }) {
    try {
      return toEntity(await this.prisma.terminal.update({ where: { id }, data: changes }));
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      throw error;
    }
  }

  async replaceKeyHash(id: string, apiKeyHash: string) {
    const { count } = await this.prisma.terminal.updateMany({
      where: { id },
      data: { apiKeyHash },
    });
    return count > 0;
  }

  async updateHeartbeat(_id: string, _heartbeat: TerminalHeartbeat, _previousContactUntil: Date) {
    return false;
  }

  async list(filter: TerminalListFilter): Promise<TerminalListResult> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.terminal.findMany({
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.terminal.count(),
    ]);
    return { items: rows.map(toEntity), total };
  }
}
