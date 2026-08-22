function getEquipmentBonuses(player, items) {
  const equipmentBonuses = {
    magicPower: 0,
    defense: 0,
    focus: 0,
  };
  Object.values(player.equipment).forEach((itemId) => {
    const item = items.find((candidate) => candidate.id === itemId);
    if (item?.bonuses) {
      Object.entries(item.bonuses).forEach(([stat, bonus]) => {
        equipmentBonuses[stat] += bonus;
      });
    }
  });

  return equipmentBonuses;
}

function getEffectiveStats(player, items) {
  const effectiveStats = { ...player.stats };
  const equipmentBonuses = getEquipmentBonuses(player, items);

  Object.keys(equipmentBonuses).forEach((stat) => {
    effectiveStats[stat] += equipmentBonuses[stat];
  });

  return effectiveStats;
}

export { getEquipmentBonuses };
export default getEffectiveStats;
