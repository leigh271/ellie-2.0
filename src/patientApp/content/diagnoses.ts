import type { PatientLanguage } from '../../state/DemoStore';

export type DiagnosisKey = 'cervical' | 'breast' | 'lymphoma' | 'colorectal' | 'ovarian' | 'prostate';
export type PhaseKey = 'Recovery' | 'Survivorship' | 'Long-term care';
export type SectionKey = 'what' | 'phase' | 'common' | 'care' | 'call' | 'questions';

type Localized<T> = Record<PatientLanguage, T>;
export type TextVariants = { full: string[]; simple: string[] };
export type LocalizedVariants = Localized<TextVariants>;

export const diagnosisKeys: DiagnosisKey[] = ['cervical', 'breast', 'lymphoma', 'colorectal', 'ovarian', 'prostate'];

export const diagnoses: Record<DiagnosisKey, { name: Localized<string>; what: LocalizedVariants }> = {
  cervical: {
    name: { en: 'Cervical cancer', es: 'Cáncer de cuello uterino', ht: 'Kansè kòl matris' },
    what: {
      en: {
        full: ['The cervix is the lower part of the uterus that connects to the vagina. Cervical cancer begins when cells in the cervix grow in an unusual way.', 'An oncologist or another member of your care team can explain your own diagnosis and records.'],
        simple: ['The cervix is the opening from the uterus to the vagina. Cervical cancer starts when cells there grow differently.', 'Your care team can explain what this means for you.'],
      },
      es: {
        full: ['El cuello uterino es la parte baja del útero que se conecta con la vagina. El cáncer de cuello uterino comienza cuando algunas células crecen de manera diferente.', 'Un oncólogo u otra persona de tu equipo puede explicarte tu diagnóstico y tus documentos.'],
        simple: ['El cuello uterino es la salida del útero hacia la vagina. El cáncer comienza cuando algunas células crecen de forma diferente.', 'Tu equipo puede explicarte qué significa para ti.'],
      },
      ht: {
        full: ['Kòl matris la se pati anba matris la ki konekte ak vajen an. Kansè kòl matris kòmanse lè kèk selil nan kòl matris la grandi yon fason ki pa nòmal.', 'Yon onkològ oswa yon lòt moun nan ekip swen ou ka esplike dyagnostik ak dosye pa w.'],
        simple: ['Kòl matris la se ouvèti matris la pou ale nan vajen an. Kansè a kòmanse lè kèk selil grandi yon lòt jan.', 'Ekip swen ou ka esplike sa sa vle di pou ou.'],
      },
    },
  },
  breast: {
    name: { en: 'Breast cancer', es: 'Cáncer de mama', ht: 'Kansè tete' },
    what: {
      en: {
        full: ['Breast cancer begins when some cells in breast tissue grow in an unusual way. Breast tissue is found in people of all genders.', 'An oncologist or another member of your care team can explain your own diagnosis and records.'],
        simple: ['Breast cancer starts when some cells in the breast grow differently.', 'Your care team can explain what this means for you.'],
      },
      es: {
        full: ['El cáncer de mama comienza cuando algunas células del tejido mamario crecen de manera diferente. Personas de todos los géneros tienen tejido mamario.', 'Un oncólogo u otra persona de tu equipo puede explicarte tu diagnóstico y tus documentos.'],
        simple: ['El cáncer de mama comienza cuando algunas células de la mama crecen de forma diferente.', 'Tu equipo puede explicarte qué significa para ti.'],
      },
      ht: {
        full: ['Kansè tete kòmanse lè kèk selil nan tisi tete a grandi yon fason ki pa nòmal. Moun tout sèks gen tisi tete.', 'Yon onkològ oswa yon lòt moun nan ekip swen ou ka esplike dyagnostik ak dosye pa w.'],
        simple: ['Kansè tete kòmanse lè kèk selil nan tete a grandi yon lòt jan.', 'Ekip swen ou ka esplike sa sa vle di pou ou.'],
      },
    },
  },
  lymphoma: {
    name: { en: 'Lymphoma', es: 'Linfoma', ht: 'Lenfòm' },
    what: {
      en: {
        full: ['Lymphoma is a cancer that begins in lymphocytes, a kind of white blood cell in the immune system. Lymphocytes are found in lymph nodes and other parts of the body.', 'An oncologist or another member of your care team can explain your own diagnosis and records.'],
        simple: ['Lymphoma is a cancer of some white blood cells that help the body fight illness.', 'Your care team can explain what this means for you.'],
      },
      es: {
        full: ['El linfoma es un cáncer que comienza en los linfocitos, un tipo de glóbulo blanco del sistema inmunitario. Los linfocitos se encuentran en los ganglios linfáticos y otras partes del cuerpo.', 'Un oncólogo u otra persona de tu equipo puede explicarte tu diagnóstico y tus documentos.'],
        simple: ['El linfoma es un cáncer de algunos glóbulos blancos que ayudan al cuerpo a combatir enfermedades.', 'Tu equipo puede explicarte qué significa para ti.'],
      },
      ht: {
        full: ['Lenfòm se yon kansè ki kòmanse nan lenfosit, yon kalite globil blan nan sistèm iminitè a. Lenfosit yo nan gangli lenfatik ak lòt pati nan kò a.', 'Yon onkològ oswa yon lòt moun nan ekip swen ou ka esplike dyagnostik ak dosye pa w.'],
        simple: ['Lenfòm se yon kansè nan kèk globil blan ki ede kò a konbat maladi.', 'Ekip swen ou ka esplike sa sa vle di pou ou.'],
      },
    },
  },
  colorectal: {
    name: { en: 'Colorectal cancer', es: 'Cáncer colorrectal', ht: 'Kansè kolon ak rektòm' },
    what: {
      en: {
        full: ['Colorectal cancer begins in the colon or rectum, which are parts of the large intestine. These organs help move and store waste from the body.', 'An oncologist or another member of your care team can explain your own diagnosis and records.'],
        simple: ['Colorectal cancer starts in the colon or rectum, parts of the large intestine.', 'Your care team can explain what this means for you.'],
      },
      es: {
        full: ['El cáncer colorrectal comienza en el colon o el recto, partes del intestino grueso. Estos órganos ayudan a mover y almacenar los desechos del cuerpo.', 'Un oncólogo u otra persona de tu equipo puede explicarte tu diagnóstico y tus documentos.'],
        simple: ['El cáncer colorrectal comienza en el colon o el recto, partes del intestino grueso.', 'Tu equipo puede explicarte qué significa para ti.'],
      },
      ht: {
        full: ['Kansè kolon ak rektòm kòmanse nan kolon an oswa rektòm nan, ki se pati nan gwo trip la. Ògàn sa yo ede deplase epi kenbe dechè nan kò a.', 'Yon onkològ oswa yon lòt moun nan ekip swen ou ka esplike dyagnostik ak dosye pa w.'],
        simple: ['Kansè sa a kòmanse nan kolon oswa rektòm, pati nan gwo trip la.', 'Ekip swen ou ka esplike sa sa vle di pou ou.'],
      },
    },
  },
  ovarian: {
    name: { en: 'Ovarian cancer', es: 'Cáncer de ovario', ht: 'Kansè ovè' },
    what: {
      en: {
        full: ['Ovarian cancer begins in cells in or near an ovary. Ovaries are organs that make eggs and some hormones.', 'An oncologist or another member of your care team can explain your own diagnosis and records.'],
        simple: ['Ovarian cancer starts in or near an ovary. Ovaries are organs in the pelvis.', 'Your care team can explain what this means for you.'],
      },
      es: {
        full: ['El cáncer de ovario comienza en células del ovario o cerca de él. Los ovarios son órganos que producen óvulos y algunas hormonas.', 'Un oncólogo u otra persona de tu equipo puede explicarte tu diagnóstico y tus documentos.'],
        simple: ['El cáncer de ovario comienza en el ovario o cerca de él. Los ovarios son órganos de la pelvis.', 'Tu equipo puede explicarte qué significa para ti.'],
      },
      ht: {
        full: ['Kansè ovè kòmanse nan selil ki nan ovè a oswa toupre li. Ovè yo se ògàn ki fè ze ak kèk òmòn.', 'Yon onkològ oswa yon lòt moun nan ekip swen ou ka esplike dyagnostik ak dosye pa w.'],
        simple: ['Kansè ovè kòmanse nan ovè a oswa toupre li. Ovè yo se ògàn nan basen an.', 'Ekip swen ou ka esplike sa sa vle di pou ou.'],
      },
    },
  },
  prostate: {
    name: { en: 'Prostate cancer', es: 'Cáncer de próstata', ht: 'Kansè pwostat' },
    what: {
      en: {
        full: ['The prostate is a small gland below the bladder in people who have one. Prostate cancer begins when some cells in the gland grow in an unusual way.', 'An oncologist or another member of your care team can explain your own diagnosis and records.'],
        simple: ['The prostate is a small gland near the bladder. Prostate cancer starts when some cells there grow differently.', 'Your care team can explain what this means for you.'],
      },
      es: {
        full: ['La próstata es una glándula pequeña debajo de la vejiga en las personas que la tienen. El cáncer comienza cuando algunas células de la glándula crecen de manera diferente.', 'Un oncólogo u otra persona de tu equipo puede explicarte tu diagnóstico y tus documentos.'],
        simple: ['La próstata es una glándula pequeña cerca de la vejiga. El cáncer comienza cuando algunas células crecen de forma diferente.', 'Tu equipo puede explicarte qué significa para ti.'],
      },
      ht: {
        full: ['Pwostat la se yon ti glann ki anba blad pipi a lakay moun ki genyen li. Kansè pwostat kòmanse lè kèk selil nan glann nan grandi yon fason ki pa nòmal.', 'Yon onkològ oswa yon lòt moun nan ekip swen ou ka esplike dyagnostik ak dosye pa w.'],
        simple: ['Pwostat la se yon ti glann toupre blad pipi a. Kansè a kòmanse lè kèk selil grandi yon lòt jan.', 'Ekip swen ou ka esplike sa sa vle di pou ou.'],
      },
    },
  },
};

export const phaseContent: Record<PhaseKey, LocalizedVariants> = {
  Recovery: {
    en: { full: ['Recovery is a period when you may be adjusting after treatment or other care. People have different needs and timelines.', 'Your care team can explain which follow-up visits or tests are part of your plan.'], simple: ['Recovery is a time to adjust after care. Each person is different.', 'Ask your care team what follow-up you need.'] },
    es: { full: ['La recuperación es un período para adaptarte después del tratamiento u otra atención. Cada persona tiene necesidades y tiempos distintos.', 'Tu equipo puede explicarte qué visitas o estudios de seguimiento forman parte de tu plan.'], simple: ['La recuperación es un tiempo para adaptarte después de la atención. Cada persona es distinta.', 'Pregunta a tu equipo qué seguimiento necesitas.'] },
    ht: { full: ['Rekiperasyon se yon peryòd kote ou ka ap adapte apre tretman oswa lòt swen. Chak moun gen bezwen ak tan pa yo.', 'Ekip swen ou ka di w ki vizit oswa tès swivi ki nan plan ou.'], simple: ['Rekiperasyon se yon tan pou adapte apre swen. Chak moun diferan.', 'Mande ekip ou ki swivi ou bezwen.'] },
  },
  Survivorship: {
    en: { full: ['Survivorship describes life during and after cancer care. It can include follow-up, support for ongoing effects, and attention to your daily needs.', 'There is no single right way to feel during survivorship. Your care team can help you find support that fits you.'], simple: ['Survivorship is life during and after cancer care.', 'Your care team can help with questions and support.'] },
    es: { full: ['La vida después del cáncer puede incluir seguimiento, apoyo para efectos secundarios que continúan y atención a tus necesidades diarias.', 'No hay una sola manera correcta de sentirse. Tu equipo puede ayudarte a encontrar apoyo adecuado para ti.'], simple: ['La vida después del cáncer incluye atención y apoyo.', 'Tu equipo puede ayudarte con preguntas y apoyo.'] },
    ht: { full: ['Lavi apre kansè ka gen swivi, èd pou efè segondè ki kontinye, ak sipò pou bezwen chak jou.', 'Pa gen yon sèl fason pou tout moun santi yo. Ekip swen ou ka ede w jwenn sipò ki bon pou ou.'], simple: ['Lavi apre kansè gen swivi ak sipò ladan l.', 'Ekip ou ka ede w ak kesyon ak sipò.'] },
  },
  'Long-term care': {
    en: { full: ['Long-term care can include visits over time, attention to new or ongoing changes, and support for your health and daily life.', 'Your care team can explain who to contact and how often to check in.'], simple: ['Long-term care means checking in over time.', 'Ask your team who to contact and when.'] },
    es: { full: ['La atención a largo plazo puede incluir visitas con el tiempo, atención a cambios nuevos o continuos y apoyo para tu salud y vida diaria.', 'Tu equipo puede explicarte a quién contactar y cuándo volver.'], simple: ['La atención a largo plazo incluye visitas con el tiempo.', 'Pregunta a tu equipo a quién contactar y cuándo.'] },
    ht: { full: ['Swen alontèm ka gen vizit pandan tan ap pase, atansyon pou nouvo chanjman oswa chanjman ki kontinye, ak sipò pou sante ak lavi chak jou.', 'Ekip swen ou ka di w ki moun pou kontakte ak kilè pou tounen.'], simple: ['Swen alontèm vle di fè vizit pandan tan ap pase.', 'Mande ekip ou kiyès pou kontakte ak kilè.'] },
  },
};

export const sectionContent: Record<'common' | 'care' | 'call' | 'questions', LocalizedVariants> = {
  common: {
    en: {
      full: ['After treatment, some people notice changes in energy, sleep, feelings, or movement. Fatigue or another side effect may continue for a while, but experiences differ.', 'Tell your care team about new, ongoing, or worrying changes. They can help you decide what support may fit.'],
      simple: ['Some people feel tired or notice changes after treatment. Everyone is different.', 'Tell your care team about changes that worry you.'],
    },
    es: {
      full: ['Después del tratamiento, algunas personas notan cambios en la energía, el sueño, los sentimientos o el movimiento. La fatiga u otro efecto secundario puede continuar por un tiempo; cada experiencia es distinta.', 'Cuéntale a tu equipo sobre cambios nuevos, persistentes o que te preocupen. Pueden ayudarte a hablar de apoyo.'],
      simple: ['Algunas personas sienten cansancio o notan cambios después del tratamiento. Cada persona es distinta.', 'Cuéntale a tu equipo sobre los cambios que te preocupan.'],
    },
    ht: {
      full: ['Apre tretman, kèk moun remake chanjman nan enèji, dòmi, santiman oswa mouvman. Fatig oswa yon lòt efè segondè ka kontinye pandan yon tan; chak moun diferan.', 'Pale ak ekip swen ou sou nouvo chanjman, chanjman ki kontinye, oswa sa ki fè w enkyè. Yo ka ede w pale sou sipò.'],
      simple: ['Kèk moun santi yo fatige oswa remake chanjman apre tretman. Chak moun diferan.', 'Pale ak ekip swen ou sou chanjman ki enkyete w.'],
    },
  },
  care: {
    en: {
      full: ['Choose gentle movement that feels comfortable, and ask your care team before making a big change to activity.', 'A calming bedtime routine and regular sleep times may support rest.', 'Share food, appetite, or hydration questions with your care team or a dietitian.', 'Emotional, family, peer, and practical support can all be part of care.'],
      simple: ['Move gently if it feels okay; ask your team before a big change.', 'Try a calm bedtime routine.', 'Ask for help with food or feelings when you need it.'],
    },
    es: {
      full: ['Elige movimiento suave que te resulte cómodo y pregunta a tu equipo antes de hacer un gran cambio en tu actividad.', 'Una rutina tranquila antes de dormir y horarios regulares pueden ayudar al descanso.', 'Comparte tus preguntas sobre comida, apetito o líquidos con tu equipo o un dietista.', 'El apoyo emocional, familiar, de otras personas y práctico también puede ser parte de la atención.'],
      simple: ['Muévete con suavidad si te sientes bien; pregunta a tu equipo antes de cambiar mucho.', 'Prueba una rutina tranquila para dormir.', 'Pide ayuda con la comida o tus sentimientos cuando la necesites.'],
    },
    ht: {
      full: ['Chwazi mouvman dou ki alèz pou ou, epi mande ekip swen ou anvan ou fè gwo chanjman nan aktivite ou.', 'Yon woutin trankil anvan dòmi ak lè dòmi regilye ka ede w repoze.', 'Pale ak ekip ou oswa yon dyetetisyen sou kesyon manje, apeti oswa dlo.', 'Sipò pou santiman, fanmi, lòt moun ak bezwen pratik ka fè pati swen an.'],
      simple: ['Fè ti mouvman dous si sa alèz; mande ekip ou anvan gwo chanjman.', 'Eseye yon woutin trankil anvan dòmi.', 'Mande èd pou manje oswa santiman lè ou bezwen li.'],
    },
  },
  call: {
    en: {
      full: ['Contact your care team about a new lump, unusual bleeding, a new pain that does not go away, or another change that worries you.', 'During or soon after treatment, ask your team how they want you to handle a fever. A fever over 100.4°F (38°C), heavy bleeding, chest pain, or trouble breathing needs urgent attention.', 'For severe or life-threatening symptoms, call emergency services now.'],
      simple: ['Call your team about a new lump, unusual bleeding, pain that will not go away, or a worrying change.', 'Ask your team what to do about fever. For chest pain, heavy bleeding, or trouble breathing, get urgent help now.'],
    },
    es: {
      full: ['Contacta a tu equipo por un bulto nuevo, sangrado inusual, dolor nuevo que no desaparece u otro cambio que te preocupe.', 'Durante o poco después del tratamiento, pregunta cómo actuar ante la fiebre. Una fiebre de más de 100.4°F (38°C), sangrado abundante, dolor de pecho o dificultad para respirar requiere atención urgente.', 'Si los síntomas son graves o ponen en peligro la vida, llama a emergencias ahora.'],
      simple: ['Llama a tu equipo por un bulto nuevo, sangrado inusual, dolor que no desaparece o un cambio que te preocupe.', 'Pregunta qué hacer si tienes fiebre. Por dolor de pecho, sangrado abundante o dificultad para respirar, busca ayuda urgente.'],
    },
    ht: {
      full: ['Kontakte ekip swen ou si gen yon nouvo boul, senyen ki pa nòmal, yon nouvo doulè ki pa disparèt, oswa yon lòt chanjman ki enkyete w.', 'Pandan tretman oswa tousuit apre li, mande ekip ou sa pou fè si ou gen lafyèv. Lafyèv ki pi wo pase 100.4°F (38°C), gwo senyen, doulè nan pwatrin oswa difikilte pou respire bezwen swen ijan.', 'Pou sentòm ki grav oswa ki ka menase lavi, rele sèvis ijans kounye a.'],
      simple: ['Rele ekip ou si gen yon nouvo boul, senyen ki pa nòmal, doulè ki pa disparèt, oswa yon chanjman ki enkyete w.', 'Mande sa pou fè si ou gen lafyèv. Pou doulè nan pwatrin, gwo senyen oswa difikilte pou respire, chèche èd ijan.'],
    },
  },
  questions: {
    en: {
      full: ['What follow-up visits or tests should I plan for?', 'Which changes should I tell my care team about right away?', 'Could a side effect or fatigue be related to my care, and who can help?', 'Who should I contact if I have a question after hours?', 'What support is available for transportation, costs, food, or feelings?'],
      simple: ['When should I come back for follow-up?', 'What changes should I report?', 'Who can help with side effects or fatigue?', 'Who can I call after hours?', 'What help is available for daily needs?'],
    },
    es: {
      full: ['¿Qué visitas o estudios de seguimiento debo planear?', '¿Qué cambios debo comunicarle de inmediato a mi equipo?', '¿Un efecto secundario o la fatiga podrían relacionarse con mi atención y quién puede ayudar?', '¿A quién contacto si tengo una pregunta fuera del horario habitual?', '¿Qué apoyo hay para transporte, gastos, comida o sentimientos?'],
      simple: ['¿Cuándo debo volver para seguimiento?', '¿Qué cambios debo comunicar?', '¿Quién puede ayudar con los efectos secundarios o la fatiga?', '¿A quién llamo fuera de horario?', '¿Qué ayuda hay para mis necesidades diarias?'],
    },
    ht: {
      full: ['Ki vizit oswa tès swivi mwen ta dwe planifye?', 'Ki chanjman mwen ta dwe di ekip swen mwen tousuit?', 'Èske yon efè segondè oswa fatig ta ka gen rapò ak swen mwen, epi kiyès ki ka ede?', 'Ki moun pou m kontakte si mwen gen yon kesyon apre lè travay?', 'Ki sipò ki genyen pou transpò, depans, manje oswa santiman?'],
      simple: ['Kilè pou m tounen pou swivi?', 'Ki chanjman pou m di ekip mwen?', 'Kiyès ki ka ede ak efè segondè oswa fatig?', 'Kiyès pou m rele apre lè travay?', 'Ki èd ki genyen pou bezwen chak jou?'],
    },
  },
};

export function phaseKey(phase: string): PhaseKey {
  if (phase === 'Recovery') return 'Recovery';
  if (phase === 'Long-term care') return 'Long-term care';
  return 'Survivorship';
}

export function localizedDiagnosisKey(diagnosis: string): DiagnosisKey {
  const normalized = diagnosis.toLowerCase();
  if (normalized.includes('breast') || normalized.includes('mama') || normalized.includes('tete')) return 'breast';
  if (normalized.includes('lymphoma') || normalized.includes('linfoma') || normalized.includes('lenfòm')) return 'lymphoma';
  if (normalized.includes('colorectal') || normalized.includes('colorrectal') || normalized.includes('kolon')) return 'colorectal';
  if (normalized.includes('ovarian') || normalized.includes('ovario') || normalized.includes('ovè')) return 'ovarian';
  if (normalized.includes('prostate') || normalized.includes('próstata') || normalized.includes('pwostat')) return 'prostate';
  return 'cervical';
}
