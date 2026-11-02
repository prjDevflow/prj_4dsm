import { useEffect, useRef, useState } from 'react';

const systemClock = () => new Date();

/** The current time, read again every `intervalMs` ("Visto há" keeps counting on screen). */
export const useNow = (clock: () => Date = systemClock, intervalMs = 30_000) => {
  const [now, setNow] = useState(clock);
  const clockRef = useRef(clock);
  useEffect(() => {
    clockRef.current = clock;
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(clockRef.current()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
};
