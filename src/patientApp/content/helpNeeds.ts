export const HELP_NEED_KEYS = ['rides', 'costs', 'food', 'emotional', 'caregiver', 'medications', 'symptoms'] as const;
export type HelpNeedKey = typeof HELP_NEED_KEYS[number];
