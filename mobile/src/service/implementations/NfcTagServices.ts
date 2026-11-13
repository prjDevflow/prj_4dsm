import type {
  CreateNfcTagBody,
  ListNfcTagsParams,
  ModoCadastro,
  TagNfc,
} from '@/lib/types/nfcTags';
import type { Page } from '@/lib/types/page';
import { AxiosInstance } from '../AxiosInstance';
import type {
  ICreateNfcTagService,
  IEnableEnrollModeService,
  IListNfcTagsService,
  IUpdateNfcTagService,
} from '../INfcTagService';

// /nfc-tags and /terminals/:id/enroll-mode (B16).

export class ListNfcTagsService implements IListNfcTagsService {
  async exec(params: ListNfcTagsParams): Promise<Page<TagNfc>> {
    const { data } = await AxiosInstance.get<Page<TagNfc>>('/nfc-tags', { params });
    return data;
  }
}

export class CreateNfcTagService implements ICreateNfcTagService {
  async exec(body: CreateNfcTagBody): Promise<TagNfc> {
    const { data } = await AxiosInstance.post<TagNfc>('/nfc-tags', body);
    return data;
  }
}

export class UpdateNfcTagService implements IUpdateNfcTagService {
  async exec(id: string, ativa: boolean): Promise<TagNfc> {
    const { data } = await AxiosInstance.patch<TagNfc>(`/nfc-tags/${encodeURIComponent(id)}`, {
      ativa,
    });
    return data;
  }
}

export class EnableEnrollModeService implements IEnableEnrollModeService {
  async exec(terminalId: string, usuarioId: string): Promise<ModoCadastro> {
    const { data } = await AxiosInstance.post<ModoCadastro>(
      `/terminals/${encodeURIComponent(terminalId)}/enroll-mode`,
      { usuarioId },
    );
    return data;
  }
}
