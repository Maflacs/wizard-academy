import { getMaxManaForLevel } from "./playerProgression";

function getEquipmentBonuses(player, items) {
  const equipmentBonuses = {
    magicPower: 0,
    defense: 0,
    focus: 0,
    maxMana: 0,
  };
  Object.values(player.equipment).forEach((itemId) => {
    const item = items.find((candidate) => candidate.id === itemId);
    if (item?.bonuses) {
      Object.entries(item.bonuses).forEach(([stat, bonus]) => {
        equipmentBonuses[stat] = (equipmentBonuses[stat] || 0) + bonus;
      });
    }
  });

  return equipmentBonuses;
}

function getEffectiveStats(player, items) {
  const effectiveStats = { ...player.stats };
  const equipmentBonuses = getEquipmentBonuses(player, items);

  Object.keys(player.stats).forEach((stat) => {
    effectiveStats[stat] += equipmentBonuses[stat];
  });

  return effectiveStats;
}

function getEffectiveMaxMana(player, items) {
  return (
    getMaxManaForLevel(player.level) +
    getEquipmentBonuses(player, items).maxMana
  );
}

export { getEffectiveMaxMana, getEquipmentBonuses };
export default getEffectiveStats;
