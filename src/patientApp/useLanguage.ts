import { useCallback } from 'react';
import { useDemoStore } from '../state/DemoStore';
import type { PatientLanguage } from '../state/DemoStore';
import { getMessages } from './i18n';

export function useLanguage() {
  const { state, update } = useDemoStore();
  const language = state.patientLanguage[state.patientId] ?? 'en';
  const setLanguage = useCallback((next: PatientLanguage) => {
    update((previous) => ({
      ...previous,
      patientLanguage: { ...previous.patientLanguage, [previous.patientId]: next },
    }));
  }, [update]);
  return { language, messages: getMessages(language), setLanguage };
}
