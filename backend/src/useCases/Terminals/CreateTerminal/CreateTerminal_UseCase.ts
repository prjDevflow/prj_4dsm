import type { Terminal } from '../../../entities/Terminal';
import type { IHashProvider } from '../../../providers/IHashProvider';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { ISecureRandom } from '../../../providers/ISecureRandom';
import type { IAccessPointRepository } from '../../../repositories/IAccessPointRepository';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import type { ICreateTerminalDTO } from './CreateTerminal_DTO';

/** 32 random bytes, as the contract asks. */
export const TERMINAL_KEY_BYTES = 32;

export interface CreatedTerminal {
  id: string;
  /** Shown once: the database keeps only its SHA-256. */
  apiKey: string;
}

export class CreateTerminalUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private accessPoints: IAccessPointRepository,
    private hash: IHashProvider,
    private random: ISecureRandom,
    private ids: IIdGenerator,
  ) {}

  async execute(input: ICreateTerminalDTO): Promise<CreatedTerminal> {
    const accessPoint = await this.accessPoints.findById(input.accessPointId);
    if (!accessPoint) throw new NotFoundError('Ponto de acesso não encontrado');
    if (!accessPoint.ativo) {
      throw new ValidationError('Dados inválidos', [
        { field: 'accessPointId', message: 'Ponto de acesso inativo' },
      ]);
    }

    const apiKey = this.random.base64Url(TERMINAL_KEY_BYTES);
    const terminal: Terminal = {
      id: this.ids.next(),
      accessPointId: input.accessPointId,
      nome: input.nome,
      apiKeyHash: this.hash.sha256(apiKey),
      ativo: true,
      ultimoContatoEm: null,
      ultimaLat: null,
      ultimaLon: null,
      gpsFix: false,
      gpsSimulado: false,
      firmware: null,
      rssi: null,
      modoCadastroUsuarioId: null,
      modoCadastroAte: null,
    };
    await this.terminals.save(terminal);
    return { id: terminal.id, apiKey };
  }
}
