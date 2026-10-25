import type { Terminal } from '../../../entities/Terminal';
import type { IHashProvider } from '../../../providers/IHashProvider';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { ISecureRandom } from '../../../providers/ISecureRandom';
import type { IAccessPointRepository } from '../../../repositories/IAccessPointRepository';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { ICreateTerminalDTO } from './CreateTerminal_DTO';

/** 32 random bytes, as the contract asks. */
const KEY_BYTES = 32;

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
    const apiKey = this.random.base64Url(KEY_BYTES);
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
