import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/** Errors of the API on their fields; the first one gets the focus. */
export const applyFieldErrors = <T extends FieldValues>(
  setError: UseFormSetError<T>,
  fields: Partial<Record<string, string>>,
) =>
  Object.entries(fields).forEach(([name, message], index) =>
    setError(name as Path<T>, { type: 'server', message }, { shouldFocus: index === 0 }),
  );
