const emergencyWords = ['chest pain', 'fever', 'bleeding', "can't breathe", 'cannot breathe', 'suicidal'];

export function companionReply(message: string): string {
  const text = message.toLowerCase();
  if (emergencyWords.some((word) => text.includes(word))) {
    return 'I’m glad you told me. Please contact your care team now or call 911 for urgent or severe symptoms. I can help you prepare what to share, but I can’t assess emergencies.';
  }
  if (/(symptom|pain|medicine|medication|treatment|dose|diagnos)/.test(text)) {
    return 'That is an important clinical question. Please contact your care team for guidance. If it helps, I can help you write down when it started, what you noticed, and the questions you want to ask.';
  }
  if (/(trend|steps|sleep|activity|wearable|tired|fatigue|energy)/.test(text)) {
    return 'Your activity and sleep patterns can vary from day to day. A gentle check-in with your care team can help put a change in context. Would you like help preparing a question about what you have noticed?';
  }
  if (/(ride|transport|money|cost|support|resource|group|lonely)/.test(text)) {
    return 'I can help you ask your care team about transportation, financial navigation, peer support, or other community resources. Which kind of support would be most useful right now?';
  }
  return 'I can help you prepare questions for your care team, explore support resources, or reflect on your wellness goals. What would feel most helpful today?';
}
