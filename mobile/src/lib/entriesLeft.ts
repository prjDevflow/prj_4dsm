/** "Restam 2 entradas", as the T10 and the T25 write it. */
export const entriesLeft = (entries: number) =>
  entries === 0
    ? 'Nenhuma entrada restante'
    : entries === 1
      ? 'Resta 1 entrada'
      : `Restam ${entries} entradas`;
