function createScaledEnemy(baseEnemy, playerLevel) {
  // Generate one exact player-level opponent, then derive every value from base data.
  const level = playerLevel;

  return {
    ...baseEnemy,
    level,
    maxHealth: baseEnemy.baseHealth + (level - 1) * baseEnemy.healthPerLevel,
    attack: baseEnemy.baseAttack + (level - 1) * baseEnemy.attackPerLevel,
    xpReward: baseEnemy.baseXpReward + (level - 1) * 5,
    goldReward: baseEnemy.baseGoldReward + (level - 1) * 2,
  };
}

export default createScaledEnemy;
