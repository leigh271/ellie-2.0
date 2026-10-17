import type { PatientLanguage } from '../../state/DemoStore';
import type { HelpNeedKey } from './helpNeeds';

export const RESOURCE_CATEGORIES = ['transportation', 'emotional', 'local'] as const;
export type ResourceCategory = typeof RESOURCE_CATEGORIES[number];
export type ResourceCopy = {
  title: string;
  description: string;
  who: string;
  services: string[];
  apply: string;
};
export type PatientResource = {
  id: string;
  categories: ResourceCategory[];
  icon: 'bus' | 'heart' | 'mapPin' | 'phone';
  url?: string;
  phoneHref?: string;
  phoneLabel?: string;
  helpNeed?: HelpNeedKey;
  content: Record<PatientLanguage, ResourceCopy>;
};

export const resources: PatientResource[] = [
  {
    id: 'acs-road-to-recovery',
    categories: ['transportation'],
    icon: 'bus',
    url: 'https://www.cancer.org/support-programs-and-services/road-to-recovery.html',
    phoneHref: 'tel:18002272345',
    phoneLabel: '1-800-227-2345',
    content: {
      en: {
        title: 'American Cancer Society Road To Recovery®',
        description: 'Free rides to and from cancer treatment, driven by volunteers, for eligible patients. Availability depends on area.',
        who: 'Eligible patients who need rides to and from cancer treatment.',
        services: ['Free rides to and from cancer treatment', 'Volunteer drivers', 'Availability depends on area'],
        apply: 'Call the ACS 24/7 cancer helpline at 1-800-227-2345 or visit the website.',
      },
      es: {
        title: 'Road To Recovery® de la Sociedad Americana Contra el Cáncer',
        description: 'Viajes gratuitos de ida y vuelta al tratamiento contra el cáncer, con conductores voluntarios, para pacientes que reúnen los requisitos. La disponibilidad depende de la zona.',
        who: 'Pacientes que reúnen los requisitos y necesitan transporte de ida y vuelta al tratamiento contra el cáncer.',
        services: ['Viajes gratuitos de ida y vuelta al tratamiento contra el cáncer', 'Conductores voluntarios', 'La disponibilidad depende de la zona'],
        apply: 'Llama a la línea de ayuda contra el cáncer de ACS, disponible las 24 horas, al 1-800-227-2345 o visita el sitio web.',
      },
      ht: {
        title: 'Road To Recovery® Sosyete Ameriken Kansè a',
        description: 'Vwayaj gratis pou ale ak soti nan tretman kansè, avèk chofè volontè, pou pasyan ki kalifye. Disponiblite a depann de zòn nan.',
        who: 'Pasyan ki kalifye epi ki bezwen vwayaj pou ale ak soti nan tretman kansè.',
        services: ['Vwayaj gratis pou ale ak soti nan tretman kansè', 'Chofè volontè', 'Disponiblite a depann de zòn nan'],
        apply: 'Rele liy asistans kansè ACS la ki disponib 24 sou 24 nan 1-800-227-2345 oswa vizite sit entènèt la.',
      },
    },
  },
  {
    id: 'broward-county-transit',
    categories: ['transportation'],
    icon: 'bus',
    url: 'https://www.broward.org/BCT',
    content: {
      en: {
        title: 'Broward County Transit',
        description: 'Broward County Transit (BCT), in Broward County, Florida, offers fixed-route bus service. Paratransit (door-to-door) and reduced fares are available for riders who qualify.',
        who: 'People looking for public transit in Broward County, Florida.',
        services: ['Fixed-route bus service', 'Paratransit (door-to-door) for riders who qualify', 'Reduced fares for riders who qualify'],
        apply: 'Visit broward.org/BCT for eligibility, applications and phone numbers.',
      },
      es: {
        title: 'Transporte Público del Condado de Broward',
        description: 'Broward County Transit (BCT), en el condado de Broward, Florida, ofrece servicio de autobús con rutas fijas. Hay paratránsito (servicio puerta a puerta) y tarifas reducidas para quienes reúnen los requisitos.',
        who: 'Personas que buscan transporte público en el condado de Broward, Florida.',
        services: ['Servicio de autobús con rutas fijas', 'Paratránsito (puerta a puerta) para quienes reúnen los requisitos', 'Tarifas reducidas para quienes reúnen los requisitos'],
        apply: 'Visita broward.org/BCT para consultar requisitos, solicitudes y números de teléfono.',
      },
      ht: {
        title: 'Transpò Piblik Konte Broward',
        description: 'Broward County Transit (BCT), nan Konte Broward, Florid, ofri sèvis otobis sou wout fiks. Gen transpò adapte (pòt an pòt) ak pri redui pou pasaje ki kalifye.',
        who: 'Moun k ap chèche transpò piblik nan Konte Broward, Florid.',
        services: ['Sèvis otobis sou wout fiks', 'Transpò adapte (pòt an pòt) pou pasaje ki kalifye', 'Pri redui pou pasaje ki kalifye'],
        apply: 'Vizite broward.org/BCT pou kondisyon, aplikasyon ak nimewo telefòn.',
      },
    },
  },
  {
    id: 'care-team-rides',
    categories: ['transportation'],
    icon: 'heart',
    helpNeed: 'rides',
    content: {
      en: {
        title: 'Ask your care team about ride help',
        description: 'A social worker or navigator can connect you with local ride programs.',
        who: 'People who want to ask their care team about local ride programs.',
        services: ['Ask your care team for help finding local ride programs'],
        apply: 'Send a ride-help request to your care team.',
      },
      es: {
        title: 'Pregunta a tu equipo por ayuda con el transporte',
        description: 'Un trabajador social o navegador puede conectarte con programas locales de transporte.',
        who: 'Personas que quieren preguntar a su equipo por programas locales de transporte.',
        services: ['Pide a tu equipo ayuda para encontrar programas locales de transporte'],
        apply: 'Envía una solicitud de ayuda con el transporte a tu equipo.',
      },
      ht: {
        title: 'Mande ekip swen ou sou èd pou transpò',
        description: 'Yon travayè sosyal oswa yon konseye ka konekte w ak pwogram transpò nan zòn ou.',
        who: 'Moun ki vle mande ekip swen yo sou pwogram transpò nan zòn yo.',
        services: ['Mande ekip swen ou ede w jwenn pwogram transpò nan zòn ou'],
        apply: 'Voye yon demann èd pou transpò bay ekip swen ou.',
      },
    },
  },
  {
    id: 'acs-helpline',
    categories: ['emotional', 'local'],
    icon: 'phone',
    url: 'https://www.cancer.org',
    phoneHref: 'tel:18002272345',
    phoneLabel: '1-800-227-2345',
    content: {
      en: {
        title: 'American Cancer Society 24/7 Cancer Helpline',
        description: 'The American Cancer Society Cancer Helpline is available 24/7.',
        who: 'People contacting the American Cancer Society.',
        services: ['24/7 Cancer Helpline'],
        apply: 'Call 1-800-227-2345 or visit the website.',
      },
      es: {
        title: 'Línea de ayuda contra el cáncer de la Sociedad Americana Contra el Cáncer, 24/7',
        description: 'La línea de ayuda contra el cáncer de la Sociedad Americana Contra el Cáncer está disponible las 24 horas.',
        who: 'Personas que se comunican con la Sociedad Americana Contra el Cáncer.',
        services: ['Línea de ayuda contra el cáncer, disponible las 24 horas'],
        apply: 'Llama al 1-800-227-2345 o visita el sitio web.',
      },
      ht: {
        title: 'Liy Asistans Kansè Sosyete Ameriken Kansè a, 24 sou 24',
        description: 'Liy asistans kansè Sosyete Ameriken Kansè a disponib 24 sou 24.',
        who: 'Moun ki kontakte Sosyete Ameriken Kansè a.',
        services: ['Liy asistans kansè ki disponib 24 sou 24'],
        apply: 'Rele 1-800-227-2345 oswa vizite sit entènèt la.',
      },
    },
  },
  {
    id: 'lifeline-988',
    categories: ['emotional'],
    icon: 'heart',
    url: 'https://988lifeline.org',
    phoneHref: 'tel:988',
    phoneLabel: '988',
    content: {
      en: {
        title: '988 Suicide & Crisis Lifeline',
        description: 'Call or text 988, 24/7.',
        who: 'People seeking suicide or crisis support.',
        services: ['Call 988', 'Text 988', 'Available 24/7'],
        apply: 'Call or text 988, 24/7, or visit the website.',
      },
      es: {
        title: 'Línea 988 de prevención del suicidio y crisis',
        description: 'Llama o envía un mensaje de texto al 988, las 24 horas.',
        who: 'Personas que buscan apoyo por suicidio o una crisis.',
        services: ['Llama al 988', 'Envía un mensaje de texto al 988', 'Disponible las 24 horas'],
        apply: 'Llama o envía un mensaje de texto al 988, las 24 horas, o visita el sitio web.',
      },
      ht: {
        title: 'Liy 988 pou Prevansyon Swisid ak Sipò nan Kriz',
        description: 'Rele oswa voye mesaj bay 988, 24 sou 24.',
        who: 'Moun k ap chèche sipò pou swisid oswa kriz.',
        services: ['Rele 988', 'Voye mesaj bay 988', 'Disponib 24 sou 24'],
        apply: 'Rele oswa voye mesaj bay 988, 24 sou 24, oswa vizite sit entènèt la.',
      },
    },
  },
  {
    id: 'care-team-support',
    categories: ['emotional'],
    icon: 'heart',
    helpNeed: 'emotional',
    content: {
      en: {
        title: 'Talk with your care team or social worker',
        description: 'Ask your care team or social worker about support.',
        who: 'People who want to talk with their care team or social worker.',
        services: ['Send a request to your care team'],
        apply: 'Send an emotional-support request to your care team.',
      },
      es: {
        title: 'Habla con tu equipo o trabajador social',
        description: 'Pregunta a tu equipo o trabajador social sobre el apoyo disponible.',
        who: 'Personas que quieren hablar con su equipo o trabajador social.',
        services: ['Envía una solicitud a tu equipo de atención'],
        apply: 'Envía una solicitud de apoyo emocional a tu equipo.',
      },
      ht: {
        title: 'Pale ak ekip swen ou oswa travayè sosyal la',
        description: 'Mande ekip swen ou oswa travayè sosyal la sou sipò.',
        who: 'Moun ki vle pale ak ekip swen yo oswa travayè sosyal la.',
        services: ['Voye yon demann bay ekip swen ou'],
        apply: 'Voye yon demann sipò emosyonèl bay ekip swen ou.',
      },
    },
  },
  {
    id: 'dial-211',
    categories: ['local'],
    icon: 'phone',
    url: 'https://www.211.org',
    phoneHref: 'tel:211',
    phoneLabel: '2-1-1',
    content: {
      en: {
        title: '211',
        description: 'Dial 2-1-1 to find local help with food, bills, housing and rides.',
        who: 'People looking for local help with food, bills, housing or rides.',
        services: ['Find local help with food', 'Find local help with bills and housing', 'Find local help with rides'],
        apply: 'Dial 2-1-1 or visit the website.',
      },
      es: {
        title: '211',
        description: 'Marca 2-1-1 para encontrar ayuda local con alimentos, facturas, vivienda y transporte.',
        who: 'Personas que buscan ayuda local con alimentos, facturas, vivienda o transporte.',
        services: ['Busca ayuda local con alimentos', 'Busca ayuda local con facturas y vivienda', 'Busca ayuda local con transporte'],
        apply: 'Marca 2-1-1 o visita el sitio web.',
      },
      ht: {
        title: '211',
        description: 'Rele 2-1-1 pou jwenn èd nan zòn ou pou manje, bòdwo, lojman ak transpò.',
        who: 'Moun k ap chèche èd nan zòn yo pou manje, bòdwo, lojman oswa transpò.',
        services: ['Jwenn èd nan zòn ou pou manje', 'Jwenn èd nan zòn ou pou bòdwo ak lojman', 'Jwenn èd nan zòn ou pou transpò'],
        apply: 'Rele 2-1-1 oswa vizite sit entènèt la.',
      },
    },
  },
  {
    id: 'care-team-local',
    categories: ['local'],
    icon: 'mapPin',
    helpNeed: 'food',
    content: {
      en: {
        title: 'Ask your care team for local resources',
        description: 'Ask your care team for local resources related to food or money.',
        who: 'People looking for local food or money resources.',
        services: ['Send a request to your care team about food or money resources'],
        apply: 'Send a food-support request to your care team.',
      },
      es: {
        title: 'Pide a tu equipo recursos locales',
        description: 'Pide a tu equipo recursos locales relacionados con alimentos o dinero.',
        who: 'Personas que buscan recursos locales de alimentos o dinero.',
        services: ['Envía una solicitud a tu equipo sobre recursos de alimentos o dinero'],
        apply: 'Envía una solicitud de apoyo con alimentos a tu equipo.',
      },
      ht: {
        title: 'Mande ekip swen ou pou resous nan zòn ou',
        description: 'Mande ekip swen ou resous nan zòn ou pou manje oswa lajan.',
        who: 'Moun k ap chèche resous nan zòn yo pou manje oswa lajan.',
        services: ['Voye yon demann bay ekip swen ou pou resous manje oswa lajan'],
        apply: 'Voye yon demann èd pou manje bay ekip swen ou.',
      },
    },
  },
];

export function getResource(id: string) {
  return resources.find((resource) => resource.id === id);
}
