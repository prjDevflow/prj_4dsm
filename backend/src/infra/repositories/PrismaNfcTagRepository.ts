import type { NfcTag } from '../../entities/NfcTag';
import type { PrismaClient } from '../../generated/prisma/client';
import type {
  INfcTagRepository,
  NfcTagListFilter,
  NfcTagListResult,
} from '../../repositories/INfcTagRepository';

export class PrismaNfcTagRepository implements INfcTagRepository {
  constructor(private prisma: PrismaClient) {}

  async save(_tag: NfcTag): Promise<void> {
    void this.prisma;
    throw new Error('PrismaNfcTagRepository.save ainda não implementado');
  }

  async updateStatus(_id: string, _ativa: boolean): Promise<NfcTag | null> {
    throw new Error('PrismaNfcTagRepository.updateStatus ainda não implementado');
  }

  async list(_filter: NfcTagListFilter): Promise<NfcTagListResult> {
    throw new Error('PrismaNfcTagRepository.list ainda não implementado');
  }
}
