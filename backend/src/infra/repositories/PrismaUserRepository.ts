import type { PrismaClient } from '../../generated/prisma/client';
import type { User } from '../../entities/User';
import type { IUserRepository } from '../../repositories/IUserRepository';

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(_id: string): Promise<User | null> {
    throw new Error('não implementado');
  }

  async findByEmail(_email: string): Promise<User | null> {
    throw new Error('não implementado');
  }
}
