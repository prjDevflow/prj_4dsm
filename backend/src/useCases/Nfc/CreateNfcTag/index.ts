import { container as c } from '../../../main/container';
import { CreateNfcTagController } from './CreateNfcTag_Controller';
import { CreateNfcTagUseCase } from './CreateNfcTag_UseCase';

const useCase = new CreateNfcTagUseCase(c.users, c.nfcTags, c.ids, c.clock);
export const createNfcTagController = new CreateNfcTagController(useCase);
