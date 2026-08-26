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

function getSpellDependency(spell, spells) {
  const interaction = spell.effectInteraction;
  if (!interaction?.sourceSpellId) return null;
  const sourceSpell = spells.find(
    (candidate) => candidate.id === interaction.sourceSpellId,
  );
  if (!sourceSpell) return null;
  return {
    effectName: interaction.effectName,
    sourceSpell,
    sourceEffect:
      sourceSpell.effect?.id === interaction.effectId
        ? sourceSpell.effect
        : null,
  };
}

function getSpellQuickStats(spell, spells = []) {
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
  if (spell.effectInteraction?.mode === "consume-all-for-damage") {
    stats.push({
      id: "effect-conversion",
      label: `Sebezhető: +${spell.effectInteraction.damageBonusPerCharge}% / hátralévő alkalom`,
    });
  } else if (
    spell.effectInteraction?.mode === "consume-all-damage-ticks"
  ) {
    stats.push({
      id: "effect-conversion",
      label: "Mérgezett: hátralévő hatások azonnali aktiválása",
    });
  } else if (spell.effectInteraction?.mode === "consume-all-for-shield") {
    stats.push({
      id: "base-shield",
      label: `Alappajzs: ${spell.effectInteraction.baseShieldAmount}`,
    });
    stats.push({
      id: "effect-conversion",
      label: `${spell.effectInteraction.effectName}: +${spell.effectInteraction.shieldPerCharge} pajzs / alkalom`,
    });
  }
  const dependency = getSpellDependency(spell, spells);
  if (dependency) {
    stats.push({
      id: "dependency",
      label: spell.effectInteraction.effectOptional
        ? `Opcionális kombó: ${dependency.sourceSpell.name} → ${dependency.effectName} → erősebb ${spell.name}`
        : `Feltétel: ${dependency.effectName} (forrás: ${dependency.sourceSpell.name})`,
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

export {
  getSpellDependency,
  getSpellQuickStats,
  getSpellRole,
  spellRoleLabels,
};
