import { useMemo } from 'react';

/** Rol JWT guardado tras el login (portal ALARA). */
export function useIsAlaraAdmin(): boolean {
  return useMemo(
    () => typeof window !== 'undefined' && localStorage.getItem('alara-role') === 'ADMIN',
    [],
  );
}
