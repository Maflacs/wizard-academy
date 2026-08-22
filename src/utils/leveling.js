const xpPerLevel = 100;

// Keeping the requirement in one helper keeps XP rewards and UI progress aligned.
function getXpRequiredForLevel(_level) {
  return xpPerLevel;
}

export { getXpRequiredForLevel, xpPerLevel };
