import { useSyncExternalStore } from 'react';

const subscribe = (listener: () => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};
export function useRoute() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1) || '/',
    () => '/',
  );
}
