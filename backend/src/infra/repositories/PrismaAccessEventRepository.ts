import type { AccessEvent } from '../../entities/AccessEvent';
import { Prisma } from '../../generated/prisma/client';
import type { IAccessEventRepository } from '../../repositories/IAccessEventRepository';

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
}
