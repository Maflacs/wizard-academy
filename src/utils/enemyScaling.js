function createScaledEnemy(baseEnemy, playerLevel) {
  // Generate one exact player-level opponent, then derive every value from base data.
  const level = playerLevel;

  return {
    ...baseEnemy,
    level,
    maxHealth: Math.round(
      (baseEnemy.baseHealth + (level - 1) * baseEnemy.healthPerLevel) *
        (baseEnemy.healthMultiplier || 1),
    ),
    attack:
      (baseEnemy.baseAttack + (level - 1) * baseEnemy.attackPerLevel) *
      (baseEnemy.attackMultiplier || 1),
    xpReward: baseEnemy.isExamOpponent
      ? 0
      : baseEnemy.baseXpReward + (level - 1) * 5,
    goldReward: baseEnemy.isExamOpponent
      ? 0
      : baseEnemy.baseGoldReward + (level - 1) * 2,
  };
}

export default createScaledEnemy;
