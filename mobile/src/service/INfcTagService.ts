import type {
  CreateNfcTagBody,
  ListNfcTagsParams,
  ModoCadastro,
  TagNfc,
} from '@/lib/types/nfcTags';
import type { Page } from '@/lib/types/page';

/** Admin only. The newest first; only `usuarioId` comes, the name comes from /users. */
export interface IListNfcTagsService {
  exec: (params: ListNfcTagsParams) => Promise<Page<TagNfc>>;
}

/** 409 TAG_JA_CADASTRADA for a UID that exists, for any person. */
export interface ICreateNfcTagService {
  exec: (body: CreateNfcTagBody) => Promise<TagNfc>;
}

/** Only `ativa` changes; there is no delete. */
export interface IUpdateNfcTagService {
  exec: (id: string, ativa: boolean) => Promise<TagNfc>;
}

/** The terminal links the next tag it reads to the person, for 60 s. */
export interface IEnableEnrollModeService {
  exec: (terminalId: string, usuarioId: string) => Promise<ModoCadastro>;
}
