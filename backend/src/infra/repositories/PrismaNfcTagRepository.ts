import type { NfcTag } from '../../entities/NfcTag';
import type { PrismaClient } from '../../generated/prisma/client';
import type {
  INfcTagRepository,
  NfcTagDetails,
  NfcTagListFilter,
  NfcTagListResult,
} from '../../repositories/INfcTagRepository';

export class PrismaNfcTagRepository implements INfcTagRepository {
  constructor(private prisma: PrismaClient) {}

  async save(_tag: NfcTag): Promise<void> {
    throw new Error('não implementado');
  }

  async findByUid(_uid: string): Promise<NfcTag | null> {
    throw new Error('não implementado');
  }

  async list(_filter: NfcTagListFilter): Promise<NfcTagListResult> {
    throw new Error('não implementado');
  }

  async update(_id: string, _changes: { ativa: boolean }): Promise<NfcTagDetails | null> {
    throw new Error('não implementado');
  }
}
