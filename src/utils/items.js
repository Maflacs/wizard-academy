const itemBonusLabels = {
  magicPower: "Mágikus erő",
  defense: "Védelem",
  focus: "Fókusz",
  maxMana: "maximális mana",
};

function formatItemBonuses(item) {
  return Object.entries(item.bonuses || {}).map(
    ([stat, bonus]) => `+${bonus} ${itemBonusLabels[stat] || stat}`,
  );
}

export { formatItemBonuses };
