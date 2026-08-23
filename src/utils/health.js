import { getMaxHealthForLevel } from "./playerProgression";

const healthRegenerationInterval = 10 * 60 * 1000;
const BED_REST_REGEN_MULTIPLIER = 4;

function getHealthRegenerationAmount(maxHealth) {
  return Math.max(1, Math.round(maxHealth * 0.05));
}

function getHealthRegenerationInterval(isResting = false) {
  return isResting
    ? healthRegenerationInterval / BED_REST_REGEN_MULTIPLIER
    : healthRegenerationInterval;
}

function updateHealth(player, currentTime) {
  const maxHealth = getMaxHealthForLevel(player.level);
  const health = Math.min(maxHealth, Math.max(0, player.health));

  if (health >= maxHealth) {
    if (health === player.health && !player.isResting) return player;
    return {
      ...player,
      health: maxHealth,
      isResting: false,
      lastHealthUpdate: currentTime,
    };
  }

  const interval = getHealthRegenerationInterval(player.isResting);
  const elapsedTime = currentTime - (player.lastHealthUpdate || currentTime);
  const completedIntervals = Math.floor(
    elapsedTime / interval,
  );
  if (completedIntervals < 1) {
    return health === player.health ? player : { ...player, health };
  }

  const healing = completedIntervals * getHealthRegenerationAmount(maxHealth);
  const nextHealth = Math.min(maxHealth, health + healing);
  return {
    ...player,
    health: nextHealth,
    lastHealthUpdate:
      nextHealth >= maxHealth
        ? currentTime
        : player.lastHealthUpdate +
          completedIntervals * interval,
    isResting: nextHealth >= maxHealth ? false : player.isResting,
  };
}

function getHealthCountdown(player, currentTime) {
  const maxHealth = getMaxHealthForLevel(player.level);
  if (player.health >= maxHealth) return null;

  const interval = getHealthRegenerationInterval(player.isResting);
  const elapsedTime = currentTime - (player.lastHealthUpdate || currentTime);
  return Math.ceil(
    (interval - (elapsedTime % interval)) /
      1000,
  );
}

function changeRestingState(player, isResting, currentTime) {
  const updatedPlayer = updateHealth(player, currentTime);
  if (updatedPlayer.health >= getMaxHealthForLevel(player.level)) {
    return { ...updatedPlayer, isResting: false, lastHealthUpdate: currentTime };
  }

  const oldInterval = getHealthRegenerationInterval(player.isResting);
  const newInterval = getHealthRegenerationInterval(isResting);
  const elapsedTime = currentTime - (updatedPlayer.lastHealthUpdate || currentTime);
  const progress = Math.min(1, Math.max(0, elapsedTime / oldInterval));
  return {
    ...updatedPlayer,
    isResting,
    // Preserve the current interval progress when changing recovery modes.
    lastHealthUpdate: currentTime - progress * newInterval,
  };
}

function getInstantTreatmentCost(player) {
  const maxHealth = getMaxHealthForLevel(player.level);
  const missingHealth = Math.max(0, maxHealth - player.health);
  return Math.ceil(missingHealth * 0.5);
}

export {
  getHealthCountdown,
  getHealthRegenerationAmount,
  getHealthRegenerationInterval,
  getInstantTreatmentCost,
  changeRestingState,
  updateHealth,
};