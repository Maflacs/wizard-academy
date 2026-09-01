const enemyIntents = {
  "normal-attack": {
    id: "normal-attack",
    icon: "⚔",
    label: "Támadás készül",
    group: "damaging",
  },
  "heavy-attack": {
    id: "heavy-attack",
    icon: "✦",
    label: "Erős támadás készül",
    group: "damaging",
  },
  defense: {
    id: "defense",
    icon: "◇",
    label: "Védekező mágia készül",
    group: "defensive",
  },
};

const actionIntentIds = {
  attack: "normal-attack",
  heavyAttack: "heavy-attack",
  shield: "defense",
  heal: "defense",
};

function getEnemyIntent(action) {
  return enemyIntents[actionIntentIds[action?.type]] || null;
}

function matchesIntentInteraction(intent, interaction) {
  if (!intent || !interaction) return false;
  if (interaction.requiredIntent) {
    return intent.id === interaction.requiredIntent;
  }
  if (interaction.requiredIntentGroup) {
    return intent.group === interaction.requiredIntentGroup;
  }
  return false;
}

export { enemyIntents, getEnemyIntent, matchesIntentInteraction };
