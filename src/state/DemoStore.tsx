import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { elliePatients } from '../data/ellieDemo';

export type CareLoop = {
  detect: string | null;
  understand: string | null;
  review: string | null;
  act: string | null;
  followup: string | null;
};

export type PatientLanguage = 'en' | 'es' | 'ht';

export type CareTask = {
  id: string;
  patientId: string;
  title: string;
  source: string;
  assignee: string;
  dueDate: string;
  status: 'Open' | 'In progress' | 'Done';
  outcome: string;
  shareWithPatient: boolean;
  patientMessage: string;
  details?: string;
  createdAt: string;
};

export type DemoActivity = {
  id: string;
  at: string;
  type: string;
  patientId: string;
  message: string;
};

export type CheckIn = { id: string; patientId?: string; energy: 'Good' | 'Okay' | 'Low'; note: string; at: string };
export type SupervisorReview = {
  status: 'Pending' | 'In review' | 'Approved' | 'Escalated';
  note: string;
  acknowledged: string[];
};

export type DemoState = {
  role: 'provider' | 'patient';
  patientId: string;
  tasks: CareTask[];
  activity: DemoActivity[];
  careLoops: Record<string, CareLoop>;
  checkIns: CheckIn[];
  patientReplies: Record<string, string>;
  sharedResources: Record<string, string[]>;
  patientLanguage: Record<string, PatientLanguage>;
  patientQuestions: Record<string, string[]>;
  reviews: Record<string, SupervisorReview>;
};

const STORAGE_KEY = 'ellie-demo-v1';
const mariaLoop: CareLoop = { detect: new Date().toISOString(), understand: null, review: null, act: null, followup: null };

function preferredLanguage(language: string): PatientLanguage {
  const normalized = language.toLowerCase();
  if (normalized.startsWith('spanish') || normalized === 'es') return 'es';
  if (normalized.startsWith('haitian') || normalized === 'ht') return 'ht';
  return 'en';
}

function createSeed(): DemoState {
  return {
    role: 'provider',
    patientId: 'maria',
    tasks: [
      { id: 'seed-1', patientId: 'maria', title: 'Confirm transportation support for Maria', source: 'Care plan', assignee: 'Navigator', dueDate: '2025-10-20', status: 'Open', outcome: '', shareWithPatient: false, patientMessage: '', createdAt: new Date().toISOString() },
      { id: 'seed-2', patientId: 'jasmine', title: 'Review transportation options', source: 'Patient request', assignee: 'Survivorship coordinator', dueDate: '2025-10-24', status: 'In progress', outcome: '', shareWithPatient: false, patientMessage: '', createdAt: new Date().toISOString() },
    ],
    activity: [{ id: 'seed-log', at: new Date().toISOString(), type: 'Demo started', patientId: 'maria', message: 'Ellie workspace opened with fictional demo data.' }],
    careLoops: Object.fromEntries(elliePatients.map((patient) => [patient.id, patient.id === 'maria' ? { ...mariaLoop } : { detect: null, understand: null, review: null, act: null, followup: null }])),
    checkIns: [],
    patientReplies: {},
    sharedResources: {},
    patientLanguage: Object.fromEntries(elliePatients.map((patient) => [patient.id, preferredLanguage(patient.language)])),
    patientQuestions: {},
    reviews: {},
  };
}

function mergeStoredState(value: Partial<DemoState>): DemoState {
  const seed = createSeed();
  return {
    ...seed,
    ...value,
    patientLanguage: { ...seed.patientLanguage, ...value.patientLanguage },
    patientQuestions: { ...seed.patientQuestions, ...value.patientQuestions },
  };
}

function readState(): DemoState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return mergeStoredState(JSON.parse(stored) as Partial<DemoState>);
  } catch {
    // A fresh demo state is safer than partially parsed browser data.
  }
  return createSeed();
}

type StoreValue = {
  state: DemoState;
  update: (updater: (state: DemoState) => DemoState) => void;
  reset: () => void;
  log: (type: string, patientId: string, message: string) => void;
  setRole: (role: 'provider' | 'patient') => void;
  setPatientId: (patientId: string) => void;
  markLoop: (patientId: string, stage: keyof CareLoop) => void;
  createTask: (task: Omit<CareTask, 'id' | 'createdAt'>) => void;
  setTaskStatus: (id: string, status: CareTask['status'], outcome?: string) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(readState);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try { setState(mergeStoredState(JSON.parse(event.newValue) as Partial<DemoState>)); } catch { /* Ignore invalid cross-tab state. */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((updater: (previous: DemoState) => DemoState) => {
    setState((previous) => {
      const next = updater(previous);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const log = useCallback((type: string, patientId: string, message: string) => {
    update((previous) => ({
      ...previous,
      activity: [{ id: crypto.randomUUID(), at: new Date().toISOString(), type, patientId, message }, ...previous.activity],
    }));
  }, [update]);

  const value = useMemo<StoreValue>(() => ({
    state,
    update,
    reset: () => { const next = createSeed(); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setState(next); },
    log,
    setRole: (role) => update((previous) => ({ ...previous, role })),
    setPatientId: (patientId) => update((previous) => ({ ...previous, patientId })),
    markLoop: (patientId, stage) => update((previous) => ({
      ...previous,
      careLoops: {
        ...previous.careLoops,
        [patientId]: { ...(previous.careLoops[patientId] ?? { detect: null, understand: null, review: null, act: null, followup: null }), [stage]: new Date().toISOString() },
      },
    })),
    createTask: (task) => update((previous) => {
      const record: CareTask = { ...task, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      const currentLoop = previous.careLoops[task.patientId];
      const needsDetect = task.source.startsWith('Patient app · need:') && !currentLoop?.detect;
      const isInsightTask = task.patientId === 'maria' && (task.source.startsWith('Simulated Ellie') || task.source.startsWith('Insight'));
      const nextLoop = currentLoop ?? { detect: null, understand: null, review: null, act: null, followup: null };
      return {
        ...previous,
        tasks: [record, ...previous.tasks],
        careLoops: needsDetect
          ? { ...previous.careLoops, [task.patientId]: { ...nextLoop, detect: record.createdAt } }
          : isInsightTask
            ? { ...previous.careLoops, maria: { ...nextLoop, act: nextLoop.act ?? record.createdAt } }
            : previous.careLoops,
        activity: [{ id: crypto.randomUUID(), at: record.createdAt, type: 'Task created', patientId: task.patientId, message: record.title }, ...previous.activity],
      };
    }),
    setTaskStatus: (id, status, outcome) => update((previous) => {
      const target = previous.tasks.find((task) => task.id === id);
      if (!target) return previous;
      const closed = status === 'Done';
      const at = new Date().toISOString();
      const nextTasks = previous.tasks.map((task) => task.id === id ? { ...task, status, outcome: outcome ?? task.outcome } : task);
      const isLoopTask = target.patientId === 'maria' && (target.source.startsWith('Simulated Ellie') || target.source.startsWith('Insight'));
      const isPatientAppRequest = target.source.startsWith('Patient app · need:');
      const loop = previous.careLoops[target.patientId] ?? { detect: null, understand: null, review: null, act: null, followup: null };
      return {
        ...previous,
        tasks: nextTasks,
        careLoops: closed && (isLoopTask || isPatientAppRequest)
          ? { ...previous.careLoops, [target.patientId]: { ...loop, followup: at } }
          : previous.careLoops,
        activity: [{ id: crypto.randomUUID(), at, type: closed ? 'Task closed' : 'Task updated', patientId: target.patientId, message: closed ? `${target.title} · outcome: ${outcome}` : `${target.title} · ${status}` }, ...previous.activity],
      };
    }),
  }), [state, update, log]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDemoStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useDemoStore must be used inside DemoStoreProvider');
  return value;
}

export const STORE_KEY = STORAGE_KEY;
