import type { PatientLanguage } from '../../state/DemoStore';

export type GlossaryTerm = {
  id: string;
  name: Record<PatientLanguage, string>;
  definition: Record<PatientLanguage, string>;
};

export const glossary: GlossaryTerm[] = [
  {
    id: 'oncologist',
    name: { en: 'oncologist', es: 'oncólogo', ht: 'onkològ' },
    definition: {
      en: 'A doctor who cares for people with cancer.',
      es: 'Un médico que atiende a personas con cáncer.',
      ht: 'Yon doktè ki bay moun ki gen kansè swen.',
    },
  },
  {
    id: 'survivorship',
    name: { en: 'survivorship', es: 'vida después del cáncer', ht: 'lavi apre kansè' },
    definition: {
      en: 'Life during and after cancer care, including follow-up and support.',
      es: 'La vida durante y después de la atención del cáncer, con seguimiento y apoyo.',
      ht: 'Lavi pandan swen kansè ak apre li, ansanm ak swivi ak sipò.',
    },
  },
  {
    id: 'remission',
    name: { en: 'remission', es: 'remisión', ht: 'remisyon' },
    definition: {
      en: 'A time when signs or symptoms of a disease are reduced or not found. Ask your doctor what the word means in your records.',
      es: 'Un período en que las señales o los síntomas de una enfermedad disminuyen o no se encuentran. Pregunta a tu médico qué significa en tus documentos.',
      ht: 'Yon peryòd kote siy oswa sentòm yon maladi diminye oswa yo pa jwenn yo. Mande doktè ou sa mo a vle di nan dosye pa w.',
    },
  },
  {
    id: 'recurrence',
    name: { en: 'recurrence', es: 'recurrencia', ht: 'retou kansè' },
    definition: {
      en: 'Cancer that returns after a period when it could not be found. Your care team can explain what follow-up means for you.',
      es: 'Cáncer que vuelve después de un período en que no se encontraba. Tu equipo puede explicar qué seguimiento necesitas.',
      ht: 'Kansè ki retounen apre yon peryòd kote yo pa t jwenn li. Ekip swen ou ka esplike ki swivi ki pou ou.',
    },
  },
  {
    id: 'chemotherapy',
    name: { en: 'chemotherapy', es: 'quimioterapia', ht: 'chimyoterapi' },
    definition: {
      en: 'A type of cancer treatment that uses medicines to affect cancer cells.',
      es: 'Un tipo de tratamiento del cáncer que usa medicamentos para actuar sobre las células cancerosas.',
      ht: 'Yon kalite tretman kansè ki sèvi ak medikaman pou aji sou selil kansè yo.',
    },
  },
  {
    id: 'radiation',
    name: { en: 'radiation', es: 'radioterapia', ht: 'radyasyon' },
    definition: {
      en: 'Treatment that uses carefully planned energy to affect cells in a part of the body.',
      es: 'Tratamiento que usa energía planificada con cuidado para actuar sobre células de una parte del cuerpo.',
      ht: 'Yon tretman ki sèvi ak enèji byen planifye pou aji sou selil nan yon pati nan kò a.',
    },
  },
  {
    id: 'lymph-node',
    name: { en: 'lymph node', es: 'ganglio linfático', ht: 'gangli lenfatik' },
    definition: {
      en: 'A small part of the immune system that helps filter fluid and respond to infection.',
      es: 'Una parte pequeña del sistema inmunitario que ayuda a filtrar líquidos y responder a infecciones.',
      ht: 'Yon ti pati nan sistèm iminitè a ki ede filtre likid epi reponn ak enfeksyon.',
    },
  },
  {
    id: 'biopsy',
    name: { en: 'biopsy', es: 'biopsia', ht: 'byopsi' },
    definition: {
      en: 'A test in which a small sample of tissue is checked in a laboratory.',
      es: 'Una prueba en la que se analiza una pequeña muestra de tejido en un laboratorio.',
      ht: 'Yon tès kote yo egzamine yon ti echantiyon tisi nan yon laboratwa.',
    },
  },
  {
    id: 'stage',
    name: { en: 'stage', es: 'etapa', ht: 'etap' },
    definition: {
      en: 'A term doctors use to describe how much cancer is in the body. Ask your doctor to explain the stage in your own record.',
      es: 'Un término que usan los médicos para describir cuánto cáncer hay en el cuerpo. Pide a tu médico que explique la etapa de tu caso.',
      ht: 'Yon mo doktè yo sèvi pou dekri kantite kansè ki nan kò a. Mande doktè ou esplike etap ki nan dosye pa w.',
    },
  },
  {
    id: 'hpv',
    name: { en: 'HPV', es: 'VPH', ht: 'HPV' },
    definition: {
      en: 'Human papillomavirus, a common group of viruses. A clinician can explain whether it matters for your care.',
      es: 'Virus del papiloma humano, un grupo común de virus. Un profesional puede explicar si tiene importancia para tu atención.',
      ht: 'Viris papilòm imen, yon gwoup viris ki komen. Yon pwofesyonèl ka esplike si sa gen enpòtans pou swen ou.',
    },
  },
  {
    id: 'pap-test',
    name: { en: 'Pap test', es: 'prueba de Papanicolaou', ht: 'tès Pap' },
    definition: {
      en: 'A screening test that checks cells from the cervix for changes.',
      es: 'Una prueba de detección que revisa células del cuello uterino para encontrar cambios.',
      ht: 'Yon tès depistaj ki egzamine selil nan kòl matris pou chèche chanjman.',
    },
  },
  {
    id: 'side-effect',
    name: { en: 'side effect', es: 'efecto secundario', ht: 'efè segondè' },
    definition: {
      en: 'An unwanted effect that can happen during or after a treatment or medicine.',
      es: 'Un efecto no deseado que puede ocurrir durante o después de un tratamiento o medicamento.',
      ht: 'Yon efè moun pa vle ki ka rive pandan oswa apre tretman oswa medikaman.',
    },
  },
  {
    id: 'fatigue',
    name: { en: 'fatigue', es: 'fatiga', ht: 'fatig' },
    definition: {
      en: 'A feeling of being very tired that may not go away with rest.',
      es: 'Una sensación de mucho cansancio que quizá no desaparezca con el descanso.',
      ht: 'Yon gwo sansasyon fatig ki ka pa disparèt lè ou repoze.',
    },
  },
  {
    id: 'neuropathy',
    name: { en: 'neuropathy', es: 'neuropatía', ht: 'neropati' },
    definition: {
      en: 'A problem with nerves that can cause changes such as numbness, tingling, or pain.',
      es: 'Un problema de los nervios que puede causar entumecimiento, cosquilleo o dolor.',
      ht: 'Yon pwoblèm nan nè ki ka lakòz pèt sansasyon, pikotman oswa doulè.',
    },
  },
  {
    id: 'immunotherapy',
    name: { en: 'immunotherapy', es: 'inmunoterapia', ht: 'imunoterapi' },
    definition: {
      en: 'A type of treatment that helps the immune system respond to cancer.',
      es: 'Un tipo de tratamiento que ayuda al sistema inmunitario a responder al cáncer.',
      ht: 'Yon kalite tretman ki ede sistèm iminitè a reponn ak kansè.',
    },
  },
  {
    id: 'follow-up-scan',
    name: { en: 'follow-up scan', es: 'estudio de seguimiento', ht: 'eskanè swivi' },
    definition: {
      en: 'An imaging test that may be used during follow-up. Your clinician explains whether one is part of your care.',
      es: 'Un estudio de imágenes que puede usarse durante el seguimiento. Tu profesional explica si forma parte de tu atención.',
      ht: 'Yon tès imaj yo ka sèvi avè l pandan swivi. Pwofesyonèl ou ka di w si li fè pati swen ou.',
    },
  },
  {
    id: 'cbc',
    name: { en: 'CBC', es: 'hemograma', ht: 'tès san konplè' },
    definition: {
      en: 'A blood test that measures different kinds of blood cells.',
      es: 'Un análisis de sangre que mide distintos tipos de células sanguíneas.',
      ht: 'Yon tès san ki mezire diferan kalite selil nan san an.',
    },
  },
  {
    id: 'lymphedema',
    name: { en: 'lymphedema', es: 'linfedema', ht: 'lenfedèm' },
    definition: {
      en: 'Swelling that can happen when lymph fluid does not move as it should.',
      es: 'Hinchazón que puede ocurrir cuando el líquido linfático no circula como debería.',
      ht: 'Anflamasyon ki ka rive lè likid lenfatik la pa deplase jan li ta dwe deplase.',
    },
  },
  {
    id: 'navigator',
    name: { en: 'navigator', es: 'navegador de pacientes', ht: 'navigatè pasyan' },
    definition: {
      en: 'A care team member who helps people understand options and connect with services.',
      es: 'Una persona del equipo que ayuda a comprender opciones y conectarse con servicios.',
      ht: 'Yon moun nan ekip swen an ki ede konprann opsyon epi jwenn sèvis.',
    },
  },
  {
    id: 'palliative-care',
    name: { en: 'palliative care', es: 'cuidados paliativos', ht: 'swen palyatif' },
    definition: {
      en: 'Care that focuses on comfort, symptoms, and quality of life at any point in an illness.',
      es: 'Atención que se enfoca en el bienestar, los síntomas y la calidad de vida en cualquier momento de una enfermedad.',
      ht: 'Swen ki konsantre sou konfò, sentòm ak kalite lavi nenpòt lè pandan yon maladi.',
    },
  },
];

export function findGlossaryTerm(text: string, language: PatientLanguage): GlossaryTerm | undefined {
  const normalized = text.toLocaleLowerCase(language === 'ht' ? 'fr' : language);
  return glossary.find((term) => normalized.includes(term.name[language].toLocaleLowerCase(language === 'ht' ? 'fr' : language)));
}
