export type WearableDay = {
  day: number;
  date: string;
  steps: number | null;
  sleepHours: number | null;
  restingHR: number | null;
  hrv: number | null;
};

export type ElliePatient = {
  id: string;
  name: string;
  initials: string;
  diagnosis: string;
  phase: string;
  language: string;
  energy: string;
  appointment: string;
  goals: string[];
  needs: string[];
  notes: string[];
  glucoseNotes: string[];
  wearable: WearableDay[];
};

const seedPatients: Omit<ElliePatient, 'wearable'>[] = [
  {
    id: 'maria', name: 'Maria Rodriguez', initials: 'MR', diagnosis: 'Cervical cancer', phase: 'Survivorship',
    language: 'English', energy: 'Okay', appointment: 'Oct 22', goals: ['Take a short walk after lunch', 'Practice a calming bedtime routine'],
    needs: ['Transportation support', 'Peer support options', 'Wellness trend review'],
    notes: ['Prefers afternoon calls.', 'Asked for help finding a local walking group.'],
    glucoseNotes: ['Lunch: beans, rice & vegetables · felt comfortably full', 'Walked 12 minutes after dinner'],
  },
  {
    id: 'jasmine', name: 'Jasmine Thompson', initials: 'JT', diagnosis: 'Breast cancer', phase: 'Recovery',
    language: 'English', energy: 'Good', appointment: 'Oct 29', goals: ['Build a consistent sleep schedule'],
    needs: ['Transportation options'], notes: ['Discussed family support at last coaching visit.'],
    glucoseNotes: ['Breakfast: oatmeal and berries', 'Enjoys a short walk with her sister'],
  },
  {
    id: 'ana', name: 'Ana Lopez', initials: 'AL', diagnosis: 'Lymphoma', phase: 'Survivorship',
    language: 'Spanish', energy: 'Good', appointment: 'Nov 03', goals: ['Try gentle stretching twice a week'],
    needs: ['Nutrition education'], notes: ['Would like Spanish-language resources.'],
    glucoseNotes: ['Dinner is often later on workdays'],
  },
  {
    id: 'david', name: 'David Chen', initials: 'DC', diagnosis: 'Colorectal cancer', phase: 'Long-term care',
    language: 'English', energy: 'Okay', appointment: 'Nov 08', goals: ['Prepare questions for survivorship visit'],
    needs: ['Survivorship education'], notes: ['Wants written next steps after appointments.'],
    glucoseNotes: ['Usually takes an evening walk'],
  },
  {
    id: 'priya', name: 'Priya Patel', initials: 'PP', diagnosis: 'Ovarian cancer', phase: 'Recovery',
    language: 'English', energy: 'Okay', appointment: 'Nov 12', goals: ['Notice energy changes during the week'],
    needs: ['Emotional and peer support'], notes: ['Interested in a peer group.'],
    glucoseNotes: ['Keeps a simple meal and mood journal'],
  },
  {
    id: 'robert', name: 'Robert Williams', initials: 'RW', diagnosis: 'Prostate cancer', phase: 'Survivorship',
    language: 'English', energy: 'Good', appointment: 'Nov 16', goals: ['Keep up with weekly movement goals'],
    needs: ['Exercise oncology information'], notes: ['Prefers concise check-ins by phone.'],
    glucoseNotes: ['Often walks with a neighbor after breakfast'],
  },
];

function createSeries(patientIndex: number): WearableDay[] {
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - 41;
    const isMariaRoughPatch = patientIndex === 0 && day >= -5;
    const wave = Math.sin((index + patientIndex * 3) * 0.72);
    const stepsBase = 6100 + patientIndex * 230 + wave * 500;
    const sleepBase = 7.1 + Math.sin(index * 0.48 + patientIndex) * 0.32;
    const hrBase = 67 + patientIndex * 1.8 + Math.cos(index * 0.37) * 2;
    const nullDay = (index + patientIndex * 5) % 17 === 0;
    return {
      day,
      date: day === 0 ? 'Today' : `${day}d`,
      steps: nullDay ? null : Math.round(stepsBase * (isMariaRoughPatch ? 0.59 : 1)),
      sleepHours: nullDay ? null : Number((sleepBase - (isMariaRoughPatch ? 1.15 : 0)).toFixed(1)),
      restingHR: nullDay ? null : Math.round(hrBase + (isMariaRoughPatch ? 6 : 0)),
      hrv: nullDay ? null : Math.round(42 + Math.sin(index * 0.32 + patientIndex) * 5 - (isMariaRoughPatch ? 5 : 0)),
    };
  });
}

export const elliePatients: ElliePatient[] = seedPatients.map((patient, index) => ({
  ...patient,
  wearable: createSeries(index),
}));

export const maria = elliePatients[0];
