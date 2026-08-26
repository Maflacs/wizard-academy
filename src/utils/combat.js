function applyDamageVariance(baseDamage) {
  // A narrow range keeps stats meaningful while making repeated attacks less predictable.
  const multiplier = 0.85 + Math.random() * 0.3;
  return Math.max(1, Math.round(baseDamage * multiplier));
}

function chooseEnemyAction(enemy) {
  const actions = enemy.actions?.length
    ? enemy.actions
    : [{ type: "attack", weight: 100 }];
  const totalWeight = actions.reduce((total, action) => total + action.weight, 0);
  let roll = Math.random() * totalWeight;

  // Weighted actions keep enemy behavior varied without introducing an AI system.
  for (const action of actions) {
    roll -= action.weight;
    if (roll < 0) {
      return action;
    }
  }

  return actions[actions.length - 1];
}

function applyShield(currentShield, spell) {
  return Math.max(currentShield, spell.shieldAmount);
}

function resolveShieldDamage(currentShield, incomingDamage) {
  const absorbed = Math.min(currentShield, incomingDamage);
  return {
    absorbed,
    remainingShield: currentShield - absorbed,
    healthDamage: incomingDamage - absorbed,
  };
}

function applyTemporaryEffect(activeEffects, effect) {
  const existing = activeEffects.find((candidate) => candidate.id === effect.id);
  const nextEffect = existing
    ? {
        ...existing,
        ...effect,
        charges: Math.max(existing.charges, effect.charges),
        magnitude: Math.max(existing.magnitude || 0, effect.magnitude || 0),
        damage: Math.max(existing.damage || 0, effect.damage || 0),
      }
    : { ...effect };
  return [
    ...activeEffects.filter((candidate) => candidate.id !== effect.id),
    nextEffect,
  ];
}

function consumeTemporaryEffect(activeEffects, effectId) {
  return activeEffects.flatMap((effect) => {
    if (effect.id !== effectId) return [effect];
    return effect.charges > 1 ? [{ ...effect, charges: effect.charges - 1 }] : [];
  });
}

function getTemporaryEffect(activeEffects, effectId) {
  return activeEffects.find((effect) => effect.id === effectId);
}

function removeTemporaryEffect(activeEffects, effectId) {
  return activeEffects.filter((effect) => effect.id !== effectId);
}

export {
  applyShield,
  applyTemporaryEffect,
  chooseEnemyAction,
  consumeTemporaryEffect,
  getTemporaryEffect,
  removeTemporaryEffect,
  resolveShieldDamage,
};
export default applyDamageVariance;
