import { container as c } from '../../../main/container';
import { UpdateNfcTagController } from './UpdateNfcTag_Controller';
import { UpdateNfcTagUseCase } from './UpdateNfcTag_UseCase';

const useCase = new UpdateNfcTagUseCase(c.nfcTags);
export const updateNfcTagController = new UpdateNfcTagController(useCase);
