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

export { applyShield, chooseEnemyAction, resolveShieldDamage };
export default applyDamageVariance;
