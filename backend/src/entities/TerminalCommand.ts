export type CommandType = 'ABRIR' | 'NEGAR';

export interface TerminalCommand {
  /** Increasing integer, so the terminal can ask for commands "after" the last one it saw. */
  id: number;
  terminalId: string;
  tipo: CommandType;
  motivo: string | null;
  aberturaMs: number | null;
  criadoEm: Date;
  expiraEm: Date;
  entregueEm: Date | null;
  executadoEm: Date | null;
}
