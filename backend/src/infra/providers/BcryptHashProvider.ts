import type { IHashProvider } from '../../providers/IHashProvider';

export class BcryptHashProvider implements IHashProvider {
  constructor(private cost: number) {}

  async hash(_plain: string): Promise<string> {
    throw new Error('não implementado');
  }

  async compare(_plain: string, _hash: string): Promise<boolean> {
    throw new Error('não implementado');
  }
}
