import { useCallback, useSyncExternalStore } from 'react';

const CHANGE_EVENT = 'ellie-preferred-name-change';
const WELCOMED_KEY = 'ellie-app-welcomed';
const nameKey = (patientId: string) => `ellie-app-preferred-name:${patientId}`;

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function usePreferredName(patientId: string) {
  const name = useSyncExternalStore(subscribe, () => localStorage.getItem(nameKey(patientId)) ?? '', () => '');
  const setName = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed) localStorage.setItem(nameKey(patientId), trimmed);
    else localStorage.removeItem(nameKey(patientId));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [patientId]);
  return [name, setName] as const;
}

export const hasBeenWelcomed = () => localStorage.getItem(WELCOMED_KEY) === '1';
export const markWelcomed = () => localStorage.setItem(WELCOMED_KEY, '1');
