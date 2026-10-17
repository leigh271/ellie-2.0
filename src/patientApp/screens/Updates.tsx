import { useDemoStore } from '../../state/DemoStore';
import { AppCard, PageHeading } from '../components';
import { useLanguage } from '../useLanguage';
import type { Messages } from '../i18n';

export default function UpdatesScreen() {
  const { state, update } = useDemoStore();
  const { language, messages } = useLanguage();
  const patientTasks = state.tasks.filter((task) => task.patientId === state.patientId);
  const shared = patientTasks.filter((task) => task.shareWithPatient && task.patientMessage.trim());
  const requests = patientTasks.filter((task) => task.source.startsWith('Patient app · need:'));
  const needLabels: Record<string, keyof Messages> = {
    rides: 'helpRides', costs: 'helpCosts', food: 'helpFood', emotional: 'helpEmotional',
    caregiver: 'helpCaregiver', medications: 'helpMedication', symptoms: 'helpSymptoms',
  };
  const requestLabel = (task: typeof requests[number]) => {
    const need = task.source.split(':').at(-1)?.trim() ?? '';
    return messages[needLabels[need] ?? 'requestDetails'];
  };
  const statusLabel = (status: 'Open' | 'In progress' | 'Done') => status === 'Open' ? messages.statusOpen : status === 'In progress' ? messages.statusInProgress : messages.statusDone;
  const acknowledge = (taskId: string) => update((previous) => ({
    ...previous,
    patientReplies: { ...previous.patientReplies, [taskId]: messages.received },
  }));
  const combinedText = [...shared.map((task) => task.patientMessage), ...requests.map((task) => `${requestLabel(task)}. ${statusLabel(task.status)}`)].join('. ');

  return <div className="patient-app-screen">
    <PageHeading title={messages.updatesHeading} subtitle={messages.updatesSub} language={language} />
    <AppCard title={messages.careTeamMessage} text={shared.length ? shared.map((task) => task.patientMessage).join('. ') : messages.noUpdates} language="en">
      {shared.length ? shared.map((task) => <article className="patient-app-update-card" key={task.id}>
        <p className="patient-app-update-language">{messages.careTeamMessage} · {messages.originalLanguage}: English</p>
        <p>{task.patientMessage}</p>
        {state.patientReplies[task.id] ? <p className="patient-app-success" role="status">{messages.youReceived}</p> : <button type="button" className="patient-app-secondary" onClick={() => acknowledge(task.id)}>{messages.received}</button>}
      </article>) : <p className="patient-app-empty">{messages.noUpdates}</p>}
    </AppCard>
    <AppCard title={messages.helpRequests} text={requests.length ? combinedText : messages.noUpdates} language={language}>
      {requests.length ? requests.map((task) => <article className="patient-app-request-card" key={task.id}>
        <p>{requestLabel(task)}</p>
        <span className={`patient-app-status status-${task.status.toLowerCase().replace(' ', '-')}`}>{statusLabel(task.status)}</span>
      </article>) : <p className="patient-app-empty">{messages.noUpdates}</p>}
    </AppCard>
  </div>;
}
