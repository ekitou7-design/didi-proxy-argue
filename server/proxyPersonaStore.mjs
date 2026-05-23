let nextPersonaId = 1;
const arguePersonas = [];

export function createArguePersona(data) {
  const now = new Date().toISOString();
  const persona = {
    id: nextPersonaId++,
    userId: Number(data.userId),
    name: data.name,
    sourceType: data.sourceType,
    tone: data.tone,
    emotionLevel: data.emotionLevel,
    logicStyle: data.logicStyle,
    commonPhrases: data.commonPhrases || [],
    avoidWords: data.avoidWords || [],
    replyStrategy: data.replyStrategy,
    profileSummary: data.profileSummary,
    createdAt: now,
    updatedAt: now
  };
  arguePersonas.unshift(persona);
  return persona;
}

export function listArguePersonas(userId) {
  return arguePersonas.filter((persona) => persona.userId === Number(userId));
}

export function findArguePersona({ userId, personaId }) {
  return arguePersonas.find(
    (persona) => persona.userId === Number(userId) && persona.id === Number(personaId)
  );
}
