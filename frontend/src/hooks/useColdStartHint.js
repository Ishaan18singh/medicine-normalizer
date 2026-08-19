import { useEffect, useState } from 'react';

/**
 * The backend free tier spins down after 15min idle and takes 30-60s to wake
 * on the next request. Returns true once `loading` has been true for a bit,
 * so the UI can explain the delay instead of looking frozen.
 */
export default function useColdStartHint(loading, delayMs = 4000) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [loading, delayMs]);

  return show;
}
