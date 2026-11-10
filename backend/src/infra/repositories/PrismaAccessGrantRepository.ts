import type { PrismaClient } from '../../generated/prisma/client';
import type {
  CommitApprovalInput,
  CommitApprovalResult,
  CommitNfcApprovalInput,
  CommitNfcApprovalResult,
  IAccessGrantRepository,
} from '../../repositories/IAccessGrantRepository';
import { PrismaAccessEventRepository } from './PrismaAccessEventRepository';
import { PrismaTerminalCommandRepository } from './PrismaTerminalCommandRepository';

/** Thrown inside the transaction to undo what it did so far; caught right outside as a plain denial. */
class LostRace extends Error {
  constructor(readonly reason: 'USOS_ESGOTADOS') {
    super(reason);
  }
}

/** Same, for an NFC approval whose `Idempotency-Key` already belongs to another event. */
class KeyAlreadyUsed extends Error {}

// P2002 is Prisma's unique-constraint violation; `clientEventId` is the only unique column besides the id.
const isClientEventIdTaken = (error: unknown) =>
  (error as { code?: string } | null)?.code === 'P2002' &&
  JSON.stringify((error as { meta?: unknown }).meta ?? '').includes('clientEventId');

export class PrismaAccessGrantRepository implements IAccessGrantRepository {
  constructor(private prisma: PrismaClient) {}

  async commitApproval(input: CommitApprovalInput): Promise<CommitApprovalResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Each step is one conditional UPDATE: the row is locked until the transaction ends, a
        //    concurrent request waits, and then re-checks the condition against what was committed.
        //    That is what makes "only one wins" hold without reading first.
        const credential = await tx.qrCredential.updateMany({
          where: { id: input.credentialId, consumidoEm: null },
          data: { consumidoEm: input.now, consumidoPorId: input.userId },
        });
        // Nothing was written yet, so there is nothing to undo.
        if (credential.count === 0) return { ok: false, reason: 'CREDENCIAL_REUTILIZADA' } as const;

        // 2. One use, only while the authorization is active and has uses left.
        const { usosPermitidos } = tx.authorization.fields;
        const use = await tx.authorization.updateMany({
          where: {
            id: input.authorizationId,
            situacao: 'ATIVA',
            usosRealizados: { lt: usosPermitidos },
          },
          data: { usosRealizados: { increment: 1 } },
        });
        // A denial must not consume the credential: leaving by exception rolls step 1 back.
        if (use.count === 0) throw new LostRace('USOS_ESGOTADOS');

        // The row is still locked by this transaction, so this read sees exactly our update.
        const authorization = await tx.authorization.findUniqueOrThrow({
          where: { id: input.authorizationId },
          select: { usosPermitidos: true, usosRealizados: true },
        });

        // 3 and 4. Same code as the stand-alone repositories, on the transaction client. A failure
        //    here is not caught: it undoes steps 1 and 2 and reaches the caller (500).
        await new PrismaAccessEventRepository(tx).append(input.event);
        await new PrismaTerminalCommandRepository(tx).create(input.command);

        return {
          ok: true,
          usosRestantes: authorization.usosPermitidos - authorization.usosRealizados,
        } as const;
      });
    } catch (error) {
      if (error instanceof LostRace) return { ok: false, reason: error.reason };
      throw error;
    }
  }
  async commitNfcApproval(input: CommitNfcApprovalInput): Promise<CommitNfcApprovalResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. The event first. Its `clientEventId` is unique, so a retry racing its own original waits here
        //    for the other transaction, then fails: it never reaches the use below, which could be spent
        //    by then and turn a repeated read into a false USOS_ESGOTADOS.
        try {
          await new PrismaAccessEventRepository(tx).append(input.event);
        } catch (error) {
          if (isClientEventIdTaken(error)) throw new KeyAlreadyUsed();
          throw error;
        }

        // 2. One use, only while the authorization is active and has uses left. When none is left the
        //    exception undoes step 1: a denial leaves no approval behind.
        const { usosPermitidos } = tx.authorization.fields;
        const use = await tx.authorization.updateMany({
          where: {
            id: input.authorizationId,
            situacao: 'ATIVA',
            usosRealizados: { lt: usosPermitidos },
          },
          data: { usosRealizados: { increment: 1 } },
        });
        if (use.count === 0) throw new LostRace('USOS_ESGOTADOS');

        // The row is still locked by this transaction, so this read sees exactly our update.
        const authorization = await tx.authorization.findUniqueOrThrow({
          where: { id: input.authorizationId },
          select: { usosPermitidos: true, usosRealizados: true },
        });
        return {
          ok: true,
          usosRestantes: authorization.usosPermitidos - authorization.usosRealizados,
        } as const;
      });
    } catch (error) {
      if (error instanceof KeyAlreadyUsed) return { ok: false, reason: 'CHAVE_REPETIDA' };
      if (error instanceof LostRace) return { ok: false, reason: error.reason };
      throw error;
    }
  }
}
