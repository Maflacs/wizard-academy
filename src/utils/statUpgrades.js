// Upgrade costs use base stats so equipment bonuses never make upgrades more expensive.
function getStatUpgradeCost(currentBaseStat) {
  return 20 + currentBaseStat * 10;
}

export default getStatUpgradeCost;
