function createScaledEnemy(baseEnemy, playerLevel) {
  // Generate one level for the new duel, then derive every combat value from base data.
  const minimumLevel = Math.max(1, playerLevel - 1);
  const maximumLevel = playerLevel + 1;
  const level =
    minimumLevel + Math.floor(Math.random() * (maximumLevel - minimumLevel + 1));

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
