/** PostgreSQL text cannot hold a NUL byte; accepting one at the edge would end in a 500. */
export const hasNoNul = (text: string) => !text.includes('\0');
export const NO_NUL_MESSAGE = 'contém caractere inválido';
