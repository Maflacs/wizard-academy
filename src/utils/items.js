const itemBonusLabels = {
  magicPower: "Mágikus erő",
  defense: "Védelem",
  focus: "Fókusz",
  maxMana: "maximális mana",
};

const ITEM_SELL_RATE = 0.5;

function formatItemBonuses(item) {
  return Object.entries(item.bonuses || {}).map(
    ([stat, bonus]) => `+${bonus} ${itemBonusLabels[stat] || stat}`,
  );
}

function isItemSellable(item) {
  return item.sellable !== false && item.price > 0;
}

function getItemSellPrice(item) {
  if (!isItemSellable(item)) return 0;
  return Math.max(1, Math.floor(item.price * ITEM_SELL_RATE));
}

export {
  ITEM_SELL_RATE,
  formatItemBonuses,
  getItemSellPrice,
  isItemSellable,
};
