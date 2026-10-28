import type { User, UserProfile } from '../entities/User';

export interface UserListFilter {
  perfil?: UserProfile;
  ativo?: boolean;
  /** Part of the name or of the e-mail, case-insensitive. */
  q?: string;
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface UserListResult {
  items: User[];
  /** Matches before pagination. */
  total: number;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  /**
   * Same as `findById`, but inside a unit of work it locks the row against changes (`FOR SHARE`) until
   * the transaction ends: a deactivation running at the same time waits, or has already been committed
   * and is seen. The id must already be validated.
   */
  findByIdForShare(id: string): Promise<User | null>;
  /** Expects the e-mail already in lower case, as the database stores it. */
  findByEmail(email: string): Promise<User | null>;
  /** Expects the e-mail already in lower case. */
  existsByEmail(email: string): Promise<boolean>;
  /** Inserts a new user or updates the one with the same id. */
  save(user: User): Promise<void>;
  /** Ordered by name. */
  list(filter: UserListFilter): Promise<UserListResult>;
  countActiveAdmins(): Promise<number>;
}
