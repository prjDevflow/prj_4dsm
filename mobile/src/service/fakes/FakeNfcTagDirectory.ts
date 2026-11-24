import { isValidUid, normalizeUid } from '@/lib/nfcUid';
import type { CreateNfcTagBody, ListNfcTagsParams, TagNfc } from '@/lib/types/nfcTags';
import type { Page } from '@/lib/types/page';
import { ApiError } from '../ApiError';
import { sampleUsers } from './sampleData';

const ENROLL_MS = 60_000;

type Options = { now?: () => Date; withSamples?: boolean };

/** Answers /nfc-tags like the B16: normalized UID, unique for everyone, newest first. */
export class FakeNfcTagDirectory {
  private tags: TagNfc[] = [];
  private enrollments = new Map<string, { usuarioId: string; until: number }>();
  private sequence = 0;
  private now: () => Date;

  constructor({ now = () => new Date(), withSamples = false }: Options = {}) {
    this.now = now;
    if (withSamples) {
      const [maria, ana, , carla] = sampleUsers.slice(3);
      this.create({ usuarioId: maria.id, uid: '04A1B2C3D4', descricao: 'Chaveiro azul' });
      this.create({ usuarioId: ana.id, uid: '04F7E21A9C', descricao: 'Cartão da garagem' });
      const old = this.create({
        usuarioId: carla.id,
        uid: '04B6A0E553',
        descricao: 'Cartão antigo',
      });
      this.update(old.id, false);
    }
  }

  list({ usuarioId, ativa, page, pageSize }: ListNfcTagsParams): Page<TagNfc> {
    const matching = this.tags
      .filter(
        (tag) =>
          (!usuarioId || tag.usuarioId === usuarioId) &&
          (ativa === undefined || tag.ativa === ativa),
      )
      .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm) || b.id.localeCompare(a.id));
    const start = (page - 1) * pageSize;
    return {
      data: matching.slice(start, start + pageSize),
      page,
      pageSize,
      total: matching.length,
    };
  }

  create({ usuarioId, uid, descricao }: CreateNfcTagBody): TagNfc {
    const normalized = normalizeUid(uid);
    if (!isValidUid(normalized)) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', [
        { field: 'uid', message: 'deve ter de 8 a 20 caracteres hexadecimais' },
      ]);
    }
    if (this.tags.some((tag) => tag.uid === normalized)) {
      throw new ApiError(409, 'TAG_JA_CADASTRADA', 'Esta tag já está cadastrada');
    }
    this.sequence += 1;
    const tag: TagNfc = {
      id: `7a650000-0000-4000-8000-${String(this.sequence).padStart(12, '0')}`,
      usuarioId,
      uid: normalized,
      descricao: descricao?.trim() ? descricao.trim() : null,
      ativa: true,
      // One second apart, so the order is stable even when created in the same instant.
      criadaEm: new Date(this.now().getTime() + this.sequence * 1000).toISOString(),
    };
    this.tags.push(tag);
    return tag;
  }

  update(id: string, ativa: boolean): TagNfc {
    const tag = this.tags.find((item) => item.id === id);
    if (!tag) throw new ApiError(404, 'TAG_NAO_ENCONTRADA', 'Tag não encontrada');
    tag.ativa = ativa;
    return { ...tag };
  }

  enroll(terminalId: string, usuarioId: string) {
    const until = this.now().getTime() + ENROLL_MS;
    this.enrollments.set(terminalId, { usuarioId, until });
    return { terminalId, usuarioId, expiraEm: new Date(until).toISOString() };
  }

  /** What the terminal does with a tag in enroll mode (B17); null when there is no mode on. */
  readOnTerminal(terminalId: string, uid: string): TagNfc | null {
    const enrollment = this.enrollments.get(terminalId);
    if (!enrollment || enrollment.until < this.now().getTime()) return null;
    this.enrollments.delete(terminalId);
    return this.create({ usuarioId: enrollment.usuarioId, uid });
  }
}
