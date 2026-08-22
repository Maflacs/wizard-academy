function getEffectiveStats(player, items) {
  const effectiveStats = { ...player.stats };

  Object.values(player.equipment).forEach((itemId) => {
    const item = items.find((candidate) => candidate.id === itemId);
    if (item?.bonuses) {
      Object.entries(item.bonuses).forEach(([stat, bonus]) => {
        effectiveStats[stat] += bonus;
      });
    }
  });

  return effectiveStats;
}

export default getEffectiveStats;
