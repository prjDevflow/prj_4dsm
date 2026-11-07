import { container as c } from '../../../main/container';
import { ListNfcTagsController } from './ListNfcTags_Controller';
import { ListNfcTagsUseCase } from './ListNfcTags_UseCase';

const useCase = new ListNfcTagsUseCase(c.nfcTags);
export const listNfcTagsController = new ListNfcTagsController(useCase);
