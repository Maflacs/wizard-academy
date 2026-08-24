const spellRoleLabels = {
  attack: "Támadó",
  defense: "Védekező",
  healing: "Gyógyító",
  utility: "Egyéb",
};

function getSpellRole(spell) {
  if (spell.combatRole) return spell.combatRole;
  if (spell.type === "attack") return "attack";
  if (spell.type === "shield") return "defense";
  if (spell.type === "heal") return "healing";
  return "utility";
}

function getSpellQuickStats(spell) {
  const stats = [{ id: "mana", label: `Mana: ${spell.manaCost}` }];
  if (spell.basePower !== undefined) {
    stats.push({ id: "damage", label: `Sebzés: ${spell.basePower}` });
  }
  if (spell.shieldAmount !== undefined) {
    stats.push({ id: "shield", label: `Pajzs: ${spell.shieldAmount}` });
  }
  if (spell.healAmount !== undefined) {
    stats.push({ id: "healing", label: `Gyógyítás: ${spell.healAmount}` });
  }
  if (spell.critChanceBonus !== undefined) {
    stats.push({
      id: "critical",
      label: `Kritikus bónusz: +${spell.critChanceBonus}%`,
    });
  }
  if (spell.effect?.trigger === "playerDamagingAttack") {
    stats.push({
      id: "effect",
      label: `+${spell.effect.magnitude}% sebzés · ${spell.effect.charges} támadás`,
    });
  } else if (spell.effect?.damage !== undefined) {
    stats.push({
      id: "effect",
      label: `${spell.effect.damage} sebzés · ${spell.effect.charges} alkalom`,
    });
  } else if (spell.effect?.trigger === "enemyDamagingAttack") {
    stats.push({
      id: "effect",
      label: `-${spell.effect.magnitude}% sebzés · ${spell.effect.charges} támadás`,
    });
  }
  return stats;
}

export { getSpellQuickStats, getSpellRole, spellRoleLabels };
