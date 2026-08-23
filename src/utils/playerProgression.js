// These formulas are centralized so UI, persistence, and duel setup share one balance.
function getMaxHealthForLevel(level) {
  return 140 + (level - 1) * 20;
}

function getMaxManaForLevel(level) {
  return 50 + (level - 1) * 8;
}

export { getMaxHealthForLevel, getMaxManaForLevel };
