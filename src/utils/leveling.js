import { getMaxHealthForLevel } from "./playerProgression";

function getXpRequiredForLevel(level) {
  return Math.round(100 * Math.pow(1.25, level - 1));
}

function processExperience(player, earnedXp) {
  let level = player.level;
  let xp = player.xp + earnedXp;

  // Resolve every level first so resource restoration happens only once.
  while (xp >= getXpRequiredForLevel(level)) {
    xp -= getXpRequiredForLevel(level);
    level += 1;
  }

  const leveledUp = level > player.level;
  const maxHealth = getMaxHealthForLevel(level);
  return {
    level,
    xp,
    maxHealth,
    health: leveledUp ? maxHealth : Math.min(maxHealth, player.health),
    energy: leveledUp ? player.maxEnergy : player.energy,
    leveledUp,
    newLevel: level,
  };
}

export { getXpRequiredForLevel, processExperience };
