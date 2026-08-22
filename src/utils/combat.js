function applyDamageVariance(baseDamage) {
  // A narrow range keeps stats meaningful while making repeated attacks less predictable.
  const multiplier = 0.85 + Math.random() * 0.3;
  return Math.max(1, Math.round(baseDamage * multiplier));
}

export default applyDamageVariance;
