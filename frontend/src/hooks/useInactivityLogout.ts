import { useCallback, useEffect, useRef } from 'react';

const INACTIVITY_MS = 20 * 60 * 1000; // 20 minutos
const THROTTLE_MS = 1000; // resetear el timer como máximo una vez por segundo

export function useInactivityLogout(onInactive: () => void) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < THROTTLE_MS) return;
    lastActivityRef.current = now;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onInactive();
    }, INACTIVITY_MS);
  }, [onInactive]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]);
}
