import type {
  CreateNfcTagBody,
  ListNfcTagsParams,
  ModoCadastro,
  TagNfc,
} from '@/lib/types/nfcTags';
import type { Page } from '@/lib/types/page';
import type {
  ICreateNfcTagService,
  IEnableEnrollModeService,
  IListNfcTagsService,
  IUpdateNfcTagService,
} from '../INfcTagService';
import { FakeNfcTagDirectory } from './FakeNfcTagDirectory';

const shared = new FakeNfcTagDirectory({ withSamples: true });

export class FakeListNfcTagsService implements IListNfcTagsService {
  readonly calls: ListNfcTagsParams[] = [];

  constructor(private directory = shared) {}

  async exec(params: ListNfcTagsParams): Promise<Page<TagNfc>> {
    this.calls.push(params);
    return this.directory.list(params);
  }
}

export class FakeCreateNfcTagService implements ICreateNfcTagService {
  readonly calls: CreateNfcTagBody[] = [];

  constructor(private directory = shared) {}

  async exec(body: CreateNfcTagBody): Promise<TagNfc> {
    this.calls.push(body);
    return this.directory.create(body);
  }
}

export class FakeUpdateNfcTagService implements IUpdateNfcTagService {
  readonly calls: { id: string; ativa: boolean }[] = [];

  constructor(private directory = shared) {}

  async exec(id: string, ativa: boolean): Promise<TagNfc> {
    this.calls.push({ id, ativa });
    return this.directory.update(id, ativa);
  }
}

/**
 * Turns the enroll mode on. Without hardware, `readAfterMs` plays a tag read by the terminal after
 * that time, so the T30 can be seen working with the fakes; the tests leave it off.
 */
export class FakeEnableEnrollModeService implements IEnableEnrollModeService {
  readonly calls: { terminalId: string; usuarioId: string }[] = [];

  constructor(
    private directory = shared,
    private readAfterMs: number | null = 4000,
  ) {}

  async exec(terminalId: string, usuarioId: string): Promise<ModoCadastro> {
    this.calls.push({ terminalId, usuarioId });
    const mode = this.directory.enroll(terminalId, usuarioId);
    if (this.readAfterMs !== null) {
      const uid = `0A${Date.now().toString(16).slice(-8).toUpperCase()}`;
      setTimeout(() => this.directory.readOnTerminal(terminalId, uid), this.readAfterMs);
    }
    return mode;
  }
}
