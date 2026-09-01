import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import getEffectiveStats, { getEffectiveMaxMana } from "../utils/playerStats";
import applyDamageVariance, {
  applyShield,
  applyTemporaryEffect,
  chooseEnemyAction,
  consumeTemporaryEffect,
  getTemporaryEffect,
  removeTemporaryEffect,
  resolveShieldDamage,
} from "../utils/combat";
import createScaledEnemy from "../utils/enemyScaling";
import {
  getEnemyIntent,
  matchesIntentInteraction,
} from "../utils/enemyIntent";
import { getMaxHealthForLevel } from "../utils/playerProgression";
import { getAcademyYear } from "../utils/academy";
import "./DuelPage.css";

const basicAttack = { id: "basic-attack", name: "Pálcaütés", manaCost: 0 };
const maxAutoTurns = 100;
const maxBaseIntentShieldAutoHealthRatio = 0.4;

function chooseRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getCurrentEnemyIntent(state) {
  return state.intentEnabled
    ? getEnemyIntent(state.pendingEnemyAction)
    : null;
}

function getIntentInteractionState(action, state) {
  const interaction = action.intentInteraction;
  const intent = getCurrentEnemyIntent(state);
  return {
    interaction,
    intent,
    active: matchesIntentInteraction(intent, interaction),
  };
}

function selectEnemyAction(state) {
  const shieldOnCooldown = state.enemyShieldCooldown > 0;
  if (shieldOnCooldown) state.enemyShieldCooldown -= 1;
  const availableActions = state.scaledEnemy.actions?.filter((action) => {
    if (action.type !== "shield") return true;
    const shieldAmount = action.shieldAmount || 10;
    return !shieldOnCooldown && state.enemyShield <= shieldAmount * 0.5;
  });
  return chooseEnemyAction({
    ...state.scaledEnemy,
    actions: availableActions,
  });
}

function commitNextEnemyAction(state) {
  if (!state.intentEnabled) return;
  state.pendingEnemyAction = selectEnemyAction(state);
}

function isDefensiveTemporaryEffect(action) {
  return Boolean(
    action.effect?.target === "player" &&
      action.effect.trigger === "enemyDamagingAttack" &&
      action.effect.magnitude,
  );
}

function isNonDamagingDefensiveAction(action) {
  return (
    action.type === "shield" ||
    isDefensiveTemporaryEffect(action) ||
    (action.combatRole === "defense" && action.type !== "attack")
  );
}

function shouldExcludeDefensiveActionForIntent(action, state) {
  return Boolean(
    getCurrentEnemyIntent(state)?.id === "defense" &&
      isNonDamagingDefensiveAction(action),
  );
}

function shouldExcludeUnenhancedIntentShield(action, state) {
  if (action.intentInteraction?.mode !== "shield-bonus") return false;
  const intentState = getIntentInteractionState(action, state);
  return Boolean(
    intentState.intent?.id === "normal-attack" &&
      !intentState.active &&
      state.combatHealth / state.maxHealth >
        maxBaseIntentShieldAutoHealthRatio,
  );
}

function getDefensiveTemporaryEffectAutoWeight(action, state) {
  if (!isDefensiveTemporaryEffect(action)) return null;
  const healthRatio = state.combatHealth / state.maxHealth;
  const activeEffect = getTemporaryEffect(
    state.activeEffects[action.effect.target],
    action.effect.id,
  );
  if (healthRatio > 0.8 || activeEffect?.charges > 1) return 0;
  return healthRatio > 0.55 ? 1 : 5;
}

function getInteractionEffect(action, state) {
  const interaction = action.effectInteraction;
  if (!interaction) return null;
  return getTemporaryEffect(
    state.activeEffects[interaction.target],
    interaction.effectId,
  );
}

function getAdaptiveRepeatMechanic(state) {
  const mechanic = state.scaledEnemy.specialMechanic;
  return mechanic?.type === "adaptive-shield-on-repeat" ? mechanic : null;
}

function isAdaptiveSpellRepeat(action, state) {
  return Boolean(
    action.id !== basicAttack.id &&
      getAdaptiveRepeatMechanic(state) &&
      state.lastPlayerSpellId === action.id,
  );
}

function prepareEnemyForPlayerAction(state, action, addLog) {
  const mechanic = getAdaptiveRepeatMechanic(state);
  if (!mechanic) return;
  if (action.id === basicAttack.id) {
    state.lastPlayerSpellId = null;
    return;
  }

  const repeatedSpell = state.lastPlayerSpellId === action.id;
  state.lastPlayerSpellId = action.id;
  if (!repeatedSpell) return;

  const previousShield = state.enemyShield;
  state.enemyShield = applyShield(state.enemyShield, {
    shieldAmount: mechanic.shieldAmount,
  });
  addLog(
    `${state.scaledEnemy.name} felismerte az ismétlődő varázslatmintát.`,
  );
  addLog(
    state.enemyShield > previousShield
      ? `${mechanic.name} ereje: ${state.enemyShield}.`
      : `${state.scaledEnemy.name} alkalmazkodó védelme továbbra is aktív. Pajzs ereje: ${state.enemyShield}.`,
  );
}

function recordSuccessfulCombo(interaction, effect, onComboExecuted) {
  if (!effect || !interaction?.comboType) return;
  onComboExecuted?.(interaction.comboType);
}

function getGeneratedShieldAmount(action, state) {
  const effectInteraction = action.effectInteraction;
  let generatedShield = action.shieldAmount || 0;
  if (effectInteraction?.mode === "consume-all-for-shield") {
    generatedShield =
      effectInteraction.baseShieldAmount +
      (getInteractionEffect(action, state)?.charges || 0) *
        effectInteraction.shieldPerCharge;
  }
  const intentState = getIntentInteractionState(action, state);
  if (
    intentState.active &&
    intentState.interaction.mode === "shield-bonus"
  ) {
    generatedShield += intentState.interaction.shieldBonus;
  }
  return generatedShield;
}

function getIntentInteractionAutoBonus(action, state) {
  const intentState = getIntentInteractionState(action, state);
  if (!intentState.active) return 0;
  const { interaction, intent } = intentState;
  if (interaction.mode === "damage-multiplier") {
    const basePower = action.basePower || 0;
    const intentBonusPower = basePower * (interaction.magnitude / 100);
    return Math.max(8, intentBonusPower + interaction.magnitude / 3);
  }
  if (interaction.mode === "heal") {
    const actualHealing = Math.min(
      interaction.healAmount,
      state.maxHealth - state.combatHealth,
    );
    if (actualHealing <= 0) return 0;
    const healingValue = actualHealing / interaction.healAmount;
    return (intent.id === "heavy-attack" ? 4 : 2) * healingValue;
  }
  if (interaction.mode === "shield-bonus") {
    const healthRatio = state.combatHealth / state.maxHealth;
    if (healthRatio > 0.8) return 0;
    return healthRatio > 0.55 ? 2 : 5;
  }
  return 0;
}

function getEffectInteractionAutoWeight(action, state) {
  const interaction = action.effectInteraction;
  if (!interaction) return null;
  const effect = getInteractionEffect(action, state);
  const charges = effect?.charges || 0;

  if (interaction.mode === "consume-all-for-damage") {
    return charges >= 2 ? 6 : charges === 1 ? 3 : 1;
  }
  if (interaction.mode === "consume-all-damage-ticks") {
    if (charges < 2) return 1;
    const enemyHealthRatio = state.enemyHealth / state.scaledEnemy.maxHealth;
    return enemyHealthRatio <= 0.35 ? 6 : 4;
  }
  if (interaction.mode === "consume-all-for-shield") {
    const healthRatio = state.combatHealth / state.maxHealth;
    const generatedShield = getGeneratedShieldAmount(action, state);
    if (!effect) {
      if (state.combatShield > interaction.baseShieldAmount * 0.5) return 0;
      return healthRatio > 0.75 ? 1 : healthRatio >= 0.4 ? 3 : 5;
    }
    if (generatedShield <= state.combatShield || healthRatio > 0.5) return 0;
    if (charges === 1) {
      return healthRatio <= 0.25 ? 6 : healthRatio <= 0.35 ? 4 : 1;
    }
    return healthRatio <= 0.35 ? 5 : 1;
  }
  return null;
}

function getActionUnavailableReason(action, state) {
  const interaction = action.effectInteraction;
  if (interaction?.mode === "consume-all-for-shield") {
    const generatedShield = getGeneratedShieldAmount(action, state);
    if (generatedShield <= state.combatShield) {
      return `Az ${action.name} ${generatedShield}-es pajzsot hozna létre, ami nem erősebb a jelenlegi ${state.combatShield}-es pajzsodnál.`;
    }
    return null;
  }
  if (action.type === "shield") {
    const generatedShield = getGeneratedShieldAmount(action, state);
    if (generatedShield <= state.combatShield) {
      return action.intentInteraction?.mode === "shield-bonus"
        ? `Az ${action.name} ${generatedShield}-es pajzsot hozna létre, ami nem erősebb a jelenlegi ${state.combatShield}-es pajzsodnál.`
        : "A pajzsod már teljes erejű.";
    }
  }
  if (action.type === "heal" && state.combatHealth >= state.maxHealth) {
    return "Az életerőd már teljes.";
  }
  return null;
}

function chooseWeightedAutoAction(
  actions,
  state,
  previousPlayerActionWasDefensive,
) {
  const healthRatio = state.combatHealth / state.maxHealth;
  const damagingActions = actions.filter(
    (action) => action.type === "attack" || action.id === basicAttack.id,
  );
  const mustBreakDefensiveStreak =
    previousPlayerActionWasDefensive && healthRatio > 0.3;
  const eligibleActions = mustBreakDefensiveStreak
    ? damagingActions.length > 0
      ? damagingActions
      : [basicAttack]
    : actions;
  const healthEligibleActions = eligibleActions.filter(
    (action) =>
      getDefensiveTemporaryEffectAutoWeight(action, state) !== 0 &&
      getEffectInteractionAutoWeight(action, state) !== 0,
  );
  const hasNonRepeatingAlternative = healthEligibleActions.some(
    (action) => !isAdaptiveSpellRepeat(action, state),
  );
  const hasObviousFinisher =
    state.intentEnabled &&
    healthEligibleActions.some(
      (action) => {
        if (action.type !== "attack" && action.id !== basicAttack.id) {
          return false;
        }
        const intentState = getIntentInteractionState(action, state);
        const intentMultiplier =
          intentState.active &&
          intentState.interaction.mode === "damage-multiplier"
            ? 1 + intentState.interaction.magnitude / 100
            : 1;
        return (action.basePower || 4) * intentMultiplier >= state.enemyHealth;
      },
    );
  const weightedActions = healthEligibleActions.map((action) => {
    let weight = 1;
    const defensiveEffectWeight = getDefensiveTemporaryEffectAutoWeight(
      action,
      state,
    );
    const interactionWeight = getEffectInteractionAutoWeight(action, state);
    if (interactionWeight !== null) {
      weight = interactionWeight;
    } else if (action.type === "attack" || action.id === basicAttack.id) {
      weight = healthRatio > 0.75 ? 5 : healthRatio >= 0.4 ? 3 : 2;
    } else if (action.type === "shield") {
      weight = healthRatio > 0.75 ? 1 : healthRatio >= 0.4 ? 3 : 5;
    } else if (action.type === "heal") {
      weight = healthRatio >= 0.4 ? 4 : 6;
    } else if (defensiveEffectWeight !== null) {
      weight = defensiveEffectWeight;
    } else if (action.type === "buff") {
      weight = healthRatio >= 0.75 ? 1 : healthRatio >= 0.4 ? 3 : 5;
    }
    if (
      action.effect &&
      !isDefensiveTemporaryEffect(action) &&
      !getTemporaryEffect(
        state.activeEffects[action.effect.target],
        action.effect.id,
      )
    ) {
      weight += 2;
    }
    weight += getIntentInteractionAutoBonus(action, state);
    if (
      hasObviousFinisher &&
      (action.type === "attack" || action.id === basicAttack.id)
    ) {
      weight += 7;
    } else if (hasObviousFinisher && isNonDamagingDefensiveAction(action)) {
      weight = Math.max(0.25, weight * 0.25);
    }
    if (
      hasNonRepeatingAlternative &&
      isAdaptiveSpellRepeat(action, state)
    ) {
      weight = Math.max(0.25, weight * 0.15);
    }
    return { action, weight };
  });
  const totalWeight = weightedActions.reduce(
    (total, candidate) => total + candidate.weight,
    0,
  );
  let roll = Math.random() * totalWeight;

  for (const candidate of weightedActions) {
    roll -= candidate.weight;
    if (roll < 0) return candidate.action;
  }

  return weightedActions[weightedActions.length - 1].action;
}

function getDuelBlockMessage({
  isExamMode,
  examCompleted,
  health,
  isResting,
  examReady,
}) {
  if (isExamMode && examCompleted)
    return "Ezt a vizsgát már sikeresen teljesítetted.";
  if (health <= 0)
    return "Túl sérült vagy a párbajhoz. Előbb fel kell gyógyulnod.";
  if (isResting)
    return "A karaktered a Gyengélkedőn pihen. Előbb keltsd fel, hogy folytathasd.";
  if (isExamMode && !examReady)
    return "A vizsga feltételei még nem teljesültek.";
  return null;
}

function createDuelState(enemy, player, items) {
  const scaledEnemy = createScaledEnemy(enemy, player.level);
  const maxHealth = getMaxHealthForLevel(player.level);
  const maxMana = getEffectiveMaxMana(player, items);
  const state = {
    scaledEnemy,
    enemyHealth: scaledEnemy.maxHealth,
    combatHealth: Math.min(maxHealth, Math.max(0, player.health)),
    combatMana: maxMana,
    maxHealth,
    maxMana,
    combatShield: 0,
    combatShieldName: null,
    enemyShield: 0,
    enemyShieldCooldown: 0,
    lastPlayerSpellId: null,
    intentEnabled: getAcademyYear(player) >= 4,
    pendingEnemyAction: null,
    activeEffects: { player: [], enemy: [] },
  };
  commitNextEnemyAction(state);
  return state;
}

function getAttackDamage(spell, effectiveStats, damageMultiplier = 1) {
  const baseDamage =
    spell.id === basicAttack.id
      ? 4 + Math.floor(effectiveStats.magicPower * 0.5)
      : spell.basePower + effectiveStats.magicPower;
  const variedDamage = applyDamageVariance(baseDamage);
  const modifiedDamage = Math.max(
    1,
    Math.round(variedDamage * damageMultiplier),
  );
  if (spell.id === basicAttack.id) return modifiedDamage;
  const criticalChance = Math.min(
    50,
    5 + effectiveStats.focus + (spell.critChanceBonus || 0),
  );
  const isCritical = Math.random() * 100 < criticalChance;
  return {
    damage: isCritical ? Math.round(modifiedDamage * 1.5) : modifiedDamage,
    isCritical,
  };
}

function getUsablePlayerActions(player, spells, state, automatic = false) {
  const preparedActions = [];
  const preparedSpellIds = player.preparedSpells || [];
  spells.forEach((spell) => {
    if (
      !preparedSpellIds.includes(spell.id) ||
      !player.knownSpells.includes(spell.id) ||
      player.level < spell.requiredLevel ||
      getAcademyYear(player) < (spell.requiredAcademyYear ?? 1) ||
      state.combatMana < spell.manaCost
    )
      return;
    if (automatic && shouldExcludeDefensiveActionForIntent(spell, state)) {
      return;
    }
    if (automatic && shouldExcludeUnenhancedIntentShield(spell, state)) {
      return;
    }
    if (
      automatic &&
      getDefensiveTemporaryEffectAutoWeight(spell, state) === 0
    )
      return;
    if (automatic && getEffectInteractionAutoWeight(spell, state) === 0) return;
    if (automatic && spell.effect) {
      const targetEffects = state.activeEffects[spell.effect.target];
      const activeEffect = getTemporaryEffect(targetEffects, spell.effect.id);
      const followUpAttacks = spells.filter(
        (candidate) =>
          candidate.id !== spell.id &&
          candidate.type === "attack" &&
          preparedSpellIds.includes(candidate.id),
      );
      if (activeEffect?.charges > 1) return;
      if (
        spell.effect.trigger === "playerDamagingAttack" &&
        followUpAttacks.length > 0 &&
        followUpAttacks.every(
          (candidate) => state.combatMana - spell.manaCost < candidate.manaCost,
        )
      )
        return;
    }
    if (
      spell.type === "shield" &&
      (spell.effectInteraction?.mode === "consume-all-for-shield"
        ? getGeneratedShieldAmount(spell, state) > state.combatShield
        : automatic
          ? state.combatShield <= getGeneratedShieldAmount(spell, state) * 0.5
          : state.combatShield < getGeneratedShieldAmount(spell, state))
    )
      preparedActions.push(spell);
    if (
      spell.type === "heal" &&
      state.combatHealth <
        (automatic ? state.maxHealth * 0.75 : state.maxHealth) &&
      (!automatic ||
        state.maxHealth - state.combatHealth >= spell.healAmount * 0.5)
    )
      preparedActions.push(spell);
    if (spell.type === "attack") preparedActions.push(spell);
    if (spell.type === "buff") preparedActions.push(spell);
  });
  // Wand Strike is implicit only when no prepared spell can currently be used.
  return preparedActions.length > 0 ? preparedActions : [basicAttack];
}

function applySpellEffect(state, effect, addLog) {
  if (!effect) return;
  state.activeEffects = {
    ...state.activeEffects,
    [effect.target]: applyTemporaryEffect(
      state.activeEffects[effect.target],
      effect,
    ),
  };
  addLog(`${effect.name} hatás aktiválódott (${effect.charges} alkalom).`);
}

function performPlayerShield(
  state,
  spell,
  addLog,
  manual = false,
  onComboExecuted,
) {
  const interaction = spell.effectInteraction;
  if (interaction?.mode === "consume-all-for-shield") {
    const convertedEffect = getInteractionEffect(spell, state);
    const generatedShield = getGeneratedShieldAmount(spell, state);
    if (convertedEffect) {
      state.activeEffects = {
        ...state.activeEffects,
        [interaction.target]: removeTemporaryEffect(
          state.activeEffects[interaction.target],
          interaction.effectId,
        ),
      };
      recordSuccessfulCombo(interaction, convertedEffect, onComboExecuted);
    }
    state.combatShield = applyShield(state.combatShield, {
      shieldAmount: generatedShield,
    });
    state.combatShieldName = spell.name;
    if (convertedEffect) {
      addLog(
        `Az ${spell.name} felhasználta a ${convertedEffect.name} ${convertedEffect.charges} hátralévő alkalmát.`,
      );
    }
    addLog(`${spell.name} pajzsod ereje: ${state.combatShield}.`);
    return;
  }

  const hadShield = state.combatShield > 0;
  const generatedShield = getGeneratedShieldAmount(spell, state);
  const intentState = getIntentInteractionState(spell, state);
  state.combatShield = applyShield(state.combatShield, {
    shieldAmount: generatedShield,
  });
  state.combatShieldName = spell.name;
  if (
    intentState.active &&
    intentState.interaction.mode === "shield-bonus"
  ) {
    addLog(
      `Az ${spell.name} kihasználta a közelgő erős támadást (+${intentState.interaction.shieldBonus} pajzs).`,
    );
    addLog(`${spell.name} pajzsod ereje: ${state.combatShield}.`);
    return;
  }
  addLog(
    spell.intentInteraction?.mode === "shield-bonus"
      ? `${spell.name} pajzsod ereje: ${state.combatShield}.`
      : hadShield
      ? manual
        ? `Újra megerősítetted a ${spell.name} varázslatot. Pajzsod ereje: ${state.combatShield}.`
        : `Újra felállítottad a ${spell.name} varázslatot. Pajzsod ereje: ${state.combatShield}.`
      : `${spell.name} varázslatot idéztél. Pajzsod ereje: ${state.combatShield}.`,
  );
}

function damageEnemyThroughShield(state, damage, sourceName, addLog) {
  if (state.enemyShield <= 0) {
    state.enemyHealth = Math.max(0, state.enemyHealth - damage);
    addLog(`${sourceName} ${damage} sebzést okozott.`);
    return;
  }
  const shieldResult = resolveShieldDamage(state.enemyShield, damage);
  const enemyHealthBeforeDamage = state.enemyHealth;
  state.enemyShield = shieldResult.remainingShield;
  state.enemyHealth = Math.max(
    0,
    state.enemyHealth - shieldResult.healthDamage,
  );
  const actualHealthDamage = enemyHealthBeforeDamage - state.enemyHealth;
  addLog(
    shieldResult.remainingShield > 0
      ? `${state.scaledEnemy.name} védőpajzsa ${shieldResult.absorbed} sebzést felfogott.`
      : `${state.scaledEnemy.name} védőpajzsa ${shieldResult.absorbed} sebzést felfogott és szertefoszlott.`,
  );
  if (actualHealthDamage > 0) {
    addLog(`${sourceName} ${actualHealthDamage} sebzést okozott.`);
  } else {
    addLog(
      shieldResult.remainingShield > 0
        ? `A támadás nem jutott át a pajzson. Maradék pajzs: ${shieldResult.remainingShield}.`
        : "A támadás nem jutott át a pajzson.",
    );
  }
}

function getPlayerAttackAmplifyingEffect(state) {
  return state.activeEffects.enemy.find(
    (effect) => effect.trigger === "playerDamagingAttack" && effect.magnitude,
  );
}

function logPreservedTemporaryEffect(
  state,
  target,
  effectBeforeAction,
  addLog,
) {
  if (!effectBeforeAction) return;
  const activeEffect = state.activeEffects[target].find(
    (effect) => effect.id === effectBeforeAction.id,
  );
  if (activeEffect) {
    addLog(
      `A ${activeEffect.name} hatás továbbra is aktív. Hátralévő alkalmak: ${activeEffect.charges}.`,
    );
  }
}

function logConsumedDamageOverTimeEffect(state, effect, addLog) {
  const activeEffect = state.activeEffects.enemy.find(
    (candidate) => candidate.id === effect.id,
  );
  addLog(
    activeEffect
      ? `A ${effect.name} hatás továbbra is aktív. Hátralévő alkalmak: ${activeEffect.charges}.`
      : `A ${effect.name} hatás megszűnt.`,
  );
}

function dealTemporaryEffectDamage(state, effect, addLog) {
  damageEnemyThroughShield(
    state,
    effect.damage,
    effect.sourceName || effect.name,
    addLog,
  );
}

function performEnemyAction(state, effectiveStats, addLog) {
  const action = state.pendingEnemyAction || selectEnemyAction(state);
  state.pendingEnemyAction = null;
  const isDamagingAction = ["attack", "heavyAttack"].includes(action.type);
  const venom = state.activeEffects.enemy.find(
    (effect) =>
      effect.trigger === "enemyDamagingAction" && effect.damage !== undefined,
  );
  if (isDamagingAction) {
    if (venom) {
      state.activeEffects = {
        ...state.activeEffects,
        enemy: consumeTemporaryEffect(state.activeEffects.enemy, venom.id),
      };
      dealTemporaryEffectDamage(state, venom, addLog);
      logConsumedDamageOverTimeEffect(state, venom, addLog);
      if (state.enemyHealth <= 0) return;
    }
  }
  if (action.type === "shield") {
    const hadShield = state.enemyShield > 0;
    state.enemyShield = applyShield(state.enemyShield, {
      shieldAmount: action.shieldAmount || 10,
    });
    state.enemyShieldCooldown = 1;
    addLog(
      hadShield
        ? `${state.scaledEnemy.name} megerősítette mágikus védőburkát. Pajzs ereje: ${state.enemyShield}.`
        : `${state.scaledEnemy.name} mágikus védőburkot vont maga köré. Pajzs ereje: ${state.enemyShield}.`,
    );
    logPreservedTemporaryEffect(state, "enemy", venom, addLog);
    return;
  }
  if (
    action.type === "heal" &&
    state.enemyHealth < state.scaledEnemy.maxHealth / 2
  ) {
    const healed = Math.min(
      action.healAmount || 10,
      state.scaledEnemy.maxHealth - state.enemyHealth,
    );
    state.enemyHealth += healed;
    addLog(`${state.scaledEnemy.name} ${healed} életerőt állított helyre.`);
    logPreservedTemporaryEffect(state, "enemy", venom, addLog);
    return;
  }
  const heavy = action.type === "heavyAttack";
  const attack = heavy
    ? state.scaledEnemy.attack * 1.35
    : state.scaledEnemy.attack;
  let incoming = Math.max(
    1,
    applyDamageVariance(attack) - effectiveStats.defense,
  );
  const fortified = state.activeEffects.player.find(
    (effect) => effect.trigger === "enemyDamagingAttack" && effect.magnitude,
  );
  if (fortified) {
    const damageBeforeFortified = incoming;
    incoming = Math.max(
      1,
      Math.round(incoming * (1 - fortified.magnitude / 100)),
    );
    state.activeEffects = {
      ...state.activeEffects,
      player: consumeTemporaryEffect(state.activeEffects.player, fortified.id),
    };
    const remainingFortified = state.activeEffects.player.find(
      (effect) => effect.id === fortified.id,
    );
    const preventedDamage = damageBeforeFortified - incoming;
    addLog(
      remainingFortified
        ? `${fortified.name} ${preventedDamage} sebzést csillapított. Hátralévő alkalmak: ${remainingFortified.charges}.`
        : `${fortified.name} ${preventedDamage} sebzést csillapított és megszűnt.`,
    );
  }
  if (state.combatShield > 0) {
    const shieldName = state.combatShieldName || "Védőpajzsod";
    const result = resolveShieldDamage(state.combatShield, incoming);
    state.combatShield = result.remainingShield;
    state.combatHealth = Math.max(0, state.combatHealth - result.healthDamage);
    addLog(
      result.remainingShield > 0
        ? `${shieldName} ${result.absorbed} sebzést felfogott.`
        : `${shieldName} ${result.absorbed} sebzést felfogott és szertefoszlott.`,
    );
    if (result.healthDamage > 0) {
      addLog(
        `${state.scaledEnemy.name}${heavy ? " pusztító csapása" : " támadása"} ${result.healthDamage} életerőt sebzett.`,
      );
    } else {
      addLog(
        result.remainingShield > 0
          ? `A támadás nem jutott át a pajzson. Maradék pajzs: ${result.remainingShield}.`
          : "A támadás nem jutott át a pajzson.",
      );
    }
    if (result.remainingShield === 0) state.combatShieldName = null;
    return;
  }
  state.combatHealth = Math.max(0, state.combatHealth - incoming);
  addLog(
    heavy
      ? `${state.scaledEnemy.name} pusztító csapása ${incoming} életerőt sebzett.`
      : `${state.scaledEnemy.name} támadása ${incoming} életerőt sebzett.`,
  );
}

function performPlayerAttack(
  state,
  spell,
  effectiveStats,
  addLog,
  onComboExecuted,
) {
  const interaction = spell.effectInteraction;
  const intentState = getIntentInteractionState(spell, state);
  const convertedEffect =
    interaction?.mode === "consume-all-for-damage"
      ? getInteractionEffect(spell, state)
      : null;
  const conversionBonus = convertedEffect
    ? convertedEffect.charges * interaction.damageBonusPerCharge
    : 0;
  const intentDamageBonus =
    intentState.active && intentState.interaction.mode === "damage-multiplier"
      ? intentState.interaction.magnitude
      : 0;
  if (convertedEffect) {
    state.activeEffects = {
      ...state.activeEffects,
      [interaction.target]: removeTemporaryEffect(
        state.activeEffects[interaction.target],
        interaction.effectId,
      ),
    };
    recordSuccessfulCombo(interaction, convertedEffect, onComboExecuted);
  }
  const result = getAttackDamage(
    spell,
    effectiveStats,
    (1 + conversionBonus / 100) * (1 + intentDamageBonus / 100),
  );
  let damage = typeof result === "number" ? result : result.damage;
  let consumedExposed = null;
  const exposed = convertedEffect ? null : getPlayerAttackAmplifyingEffect(state);
  if (exposed) {
    damage = Math.max(1, Math.round(damage * (1 + exposed.magnitude / 100)));
    state.activeEffects = {
      ...state.activeEffects,
      enemy: consumeTemporaryEffect(state.activeEffects.enemy, exposed.id),
    };
    consumedExposed = exposed;
  }
  damageEnemyThroughShield(state, damage, spell.name, addLog);
  if (intentDamageBonus > 0) {
    addLog(
      `Az ${spell.name} kihasználta az ellenfél védekező szándékát (+${intentDamageBonus}% sebzés).`,
    );
  }
  if (convertedEffect) {
    addLog(
      `${spell.name} felhasználta a ${convertedEffect.name} hatás ${convertedEffect.charges} hátralévő alkalmát (+${conversionBonus}% sebzés).`,
    );
  }
  if (consumedExposed) {
    const remainingExposed = state.activeEffects.enemy.find(
      (effect) => effect.id === consumedExposed.id,
    );
    addLog(
      remainingExposed
        ? `A ${consumedExposed.name} hatás felerősítette a támadást. Hátralévő alkalmak: ${remainingExposed.charges}.`
        : `A ${consumedExposed.name} hatás felerősítette a támadást és megszűnt.`,
    );
  }

  if (spell.healAmount !== undefined) {
    const healed = Math.min(
      spell.healAmount,
      state.maxHealth - state.combatHealth,
    );
    state.combatHealth += healed;
    if (healed > 0) addLog(`${spell.name} ${healed} életerőt állított helyre.`);
  }
  if (intentState.active && intentState.interaction.mode === "heal") {
    const healed = Math.min(
      intentState.interaction.healAmount,
      state.maxHealth - state.combatHealth,
    );
    state.combatHealth += healed;
    if (healed > 0) {
      addLog(
        `A ${spell.name} kihasználta az ellenfél támadó szándékát, és ${healed} életerőt állított helyre.`,
      );
    }
  }
  const harvestedEffect =
    interaction?.mode === "consume-all-damage-ticks"
      ? getInteractionEffect(spell, state)
      : null;
  if (harvestedEffect) {
    state.activeEffects = {
      ...state.activeEffects,
      [interaction.target]: removeTemporaryEffect(
        state.activeEffects[interaction.target],
        interaction.effectId,
      ),
    };
    recordSuccessfulCombo(interaction, harvestedEffect, onComboExecuted);
    addLog(`${spell.name} felszabadította a ${harvestedEffect.name} hatást.`);
    for (let charge = 0; charge < harvestedEffect.charges; charge += 1) {
      dealTemporaryEffectDamage(state, harvestedEffect, addLog);
      if (state.enemyHealth <= 0) break;
    }
    addLog(`A ${harvestedEffect.name} hatás megszűnt.`);
  }
  applySpellEffect(state, spell.effect, addLog);
}

function simulateDuel(player, spells, items, duelState, onComboExecuted) {
  const state = {
    ...duelState,
    activeEffects: {
      player: [...duelState.activeEffects.player],
      enemy: [...duelState.activeEffects.enemy],
    },
  };
  const effectiveStats = getEffectiveStats(player, items);
  const log = [];
  let previousPlayerActionWasDefensive = false;
  const addLog = (entry) => {
    log.push(entry);
  };

  for (let turn = 0; turn < maxAutoTurns; turn += 1) {
    const actions = getUsablePlayerActions(player, spells, state, true);
    const action = chooseWeightedAutoAction(
      actions,
      state,
      previousPlayerActionWasDefensive,
    );
    const preservedAttackEffect = getPlayerAttackAmplifyingEffect(state);
    prepareEnemyForPlayerAction(state, action, addLog);
    state.combatMana -= action.manaCost;
    if (action.type === "attack" || action.id === basicAttack.id) {
      performPlayerAttack(
        state,
        action,
        effectiveStats,
        addLog,
        onComboExecuted,
      );
    } else if (action.type === "shield") {
      performPlayerShield(state, action, addLog, false, onComboExecuted);
      logPreservedTemporaryEffect(
        state,
        "enemy",
        preservedAttackEffect,
        addLog,
      );
    } else if (action.type === "heal") {
      const healed = Math.min(
        action.healAmount,
        state.maxHealth - state.combatHealth,
      );
      state.combatHealth += healed;
      addLog(`${action.name} ${healed} életerőt állított helyre.`);
      logPreservedTemporaryEffect(
        state,
        "enemy",
        preservedAttackEffect,
        addLog,
      );
    } else if (action.type === "buff") {
      applySpellEffect(state, action.effect, addLog);
      logPreservedTemporaryEffect(
        state,
        "enemy",
        preservedAttackEffect,
        addLog,
      );
    }
    previousPlayerActionWasDefensive = isNonDamagingDefensiveAction(action);
    if (state.enemyHealth <= 0) {
      state.pendingEnemyAction = null;
      return { ...state, status: "victory", log };
    }
    performEnemyAction(state, effectiveStats, addLog);
    if (state.enemyHealth <= 0) return { ...state, status: "victory", log };
    if (state.combatHealth <= 0) return { ...state, status: "defeat", log };
    commitNextEnemyAction(state);
  }
  state.pendingEnemyAction = null;
  return { ...state, status: "draw", log };
}

function EffectList({ effects }) {
  if (effects.length === 0) return null;
  return (
    <div className="active-effects">
      <p className="eyebrow">Aktív hatások</p>
      {effects.map((effect) => (
        <p key={effect.id}>
          {effect.name} — {effect.charges}{" "}
          {effect.trigger === "enemyDamagingAction" ? "hatás" : "támadás"}
        </p>
      ))}
    </div>
  );
}

function DuelPage({
  player,
  items,
  spells,
  enemies,
  onAwardRewards,
  onExamVictory,
  onDuelEnd,
  onComboExecuted,
  isExamAvailable,
  isResting,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const examId = new URLSearchParams(location.search).get("exam");
  const isExamMode = Boolean(examId);
  const trackComboExecution = isExamMode ? null : onComboExecuted;
  const examOpponent = enemies.find((enemy) => enemy.examId === examId);
  const normalEnemies = enemies.filter((enemy) => !enemy.isExamOpponent);
  const examCompleted = player.completedMilestones.includes(examId);
  const examReady = Boolean(examOpponent && isExamAvailable(examId));
  const blockMessage = getDuelBlockMessage({
    isExamMode,
    examCompleted,
    health: player.health,
    isResting,
    examReady,
  });
  const canStartDuel = blockMessage === null;
  const [duel, setDuel] = useState(() =>
    createDuelState(
      isExamMode
        ? examOpponent || normalEnemies[0]
        : chooseRandom(normalEnemies),
      player,
      items,
    ),
  );
  const [combatLog, setCombatLog] = useState([
    canStartDuel
      ? `${duel.scaledEnemy.name} megjelent a párbajban.`
      : blockMessage,
  ]);
  const [duelStatus, setDuelStatus] = useState(
    canStartDuel ? "active" : "blocked",
  );
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [victorySummary, setVictorySummary] = useState(null);
  const effectiveStats = getEffectiveStats(player, items);
  const combatMaxHealth = getMaxHealthForLevel(player.level);
  const combatMaxMana = duel.maxMana;
  const availableSpells = (player.preparedSpells || [])
    .map((spellId) => spells.find((spell) => spell.id === spellId))
    .filter(
      (spell) =>
        spell &&
        player.knownSpells.includes(spell.id) &&
        player.level >= spell.requiredLevel &&
        getAcademyYear(player) >= (spell.requiredAcademyYear ?? 1) &&
        ["attack", "shield", "heal", "buff"].includes(spell.type),
    );
  const usableActions = getUsablePlayerActions(player, availableSpells, duel);
  const adaptiveMechanic = getAdaptiveRepeatMechanic(duel);
  const enemyIntent = getCurrentEnemyIntent(duel);
  const previousPlayerSpell = spells.find(
    (spell) => spell.id === duel.lastPlayerSpellId,
  );
  const showFallback =
    usableActions.length === 1 && usableActions[0].id === basicAttack.id;
  const needsInfirmary = player.health <= 0 || duel.combatHealth <= 0;

  function addLog(entry) {
    setCombatLog((currentLog) => [...currentLog, entry]);
  }

  function startNewDuel() {
    if (!canStartDuel) {
      setDuelStatus("blocked");
      setCombatLog([blockMessage]);
      return;
    }
    const nextDuel = createDuelState(
      isExamMode
        ? examOpponent || normalEnemies[0]
        : chooseRandom(normalEnemies),
      player,
      items,
    );
    setDuel(nextDuel);
    setCombatLog([`${nextDuel.scaledEnemy.name} megjelent a párbajban.`]);
    setDuelStatus("active");
    setRewardClaimed(false);
    setVictorySummary(null);
  }

  function finishVictory(nextDuel) {
    setDuelStatus("victory");
    if (!rewardClaimed) {
      const rewards = isExamMode
        ? { exam: onExamVictory(examId, nextDuel.combatHealth) }
        : onAwardRewards(nextDuel.scaledEnemy, nextDuel.combatHealth);
      setVictorySummary(rewards);
      setRewardClaimed(true);
    }
  }

  function performManualEnemyTurn(nextDuel) {
    performEnemyAction(nextDuel, effectiveStats, addLog);
    if (nextDuel.enemyHealth <= 0) {
      setDuel(nextDuel);
      finishVictory(nextDuel);
      return;
    }
    if (nextDuel.combatHealth <= 0) {
      setDuel(nextDuel);
      onDuelEnd(0);
      setDuelStatus("defeat");
      addLog(
        isExamMode
          ? "A vizsga ezúttal nem sikerült. Felépülés után újra megpróbálhatod."
          : "Vereség! A gyakorlópárbajt elvesztetted.",
      );
      return;
    }
    commitNextEnemyAction(nextDuel);
    setDuel(nextDuel);
  }

  function castSpell(spell) {
    if (
      duelStatus !== "active" ||
      duel.combatMana < spell.manaCost ||
      (spell.id !== basicAttack.id &&
        (!player.knownSpells.includes(spell.id) ||
          player.level < spell.requiredLevel ||
          getAcademyYear(player) < (spell.requiredAcademyYear ?? 1))) ||
      getActionUnavailableReason(spell, duel)
    )
      return;
    const nextDuel = { ...duel, combatMana: duel.combatMana - spell.manaCost };
    const preservedAttackEffect = getPlayerAttackAmplifyingEffect(nextDuel);
    prepareEnemyForPlayerAction(nextDuel, spell, addLog);
    if (spell.type === "attack" || spell.id === basicAttack.id) {
      performPlayerAttack(
        nextDuel,
        spell,
        effectiveStats,
        addLog,
        trackComboExecution,
      );
    } else if (spell.type === "shield") {
      performPlayerShield(
        nextDuel,
        spell,
        addLog,
        true,
        trackComboExecution,
      );
      logPreservedTemporaryEffect(
        nextDuel,
        "enemy",
        preservedAttackEffect,
        addLog,
      );
    } else if (spell.type === "heal") {
      const healed = Math.min(
        spell.healAmount,
        combatMaxHealth - nextDuel.combatHealth,
      );
      nextDuel.combatHealth += healed;
      addLog(`${spell.name} ${healed} életerőt állított helyre.`);
      logPreservedTemporaryEffect(
        nextDuel,
        "enemy",
        preservedAttackEffect,
        addLog,
      );
    } else if (spell.type === "buff") {
      applySpellEffect(nextDuel, spell.effect, addLog);
      logPreservedTemporaryEffect(
        nextDuel,
        "enemy",
        preservedAttackEffect,
        addLog,
      );
    }
    if (nextDuel.enemyHealth <= 0) {
      nextDuel.pendingEnemyAction = null;
      setDuel(nextDuel);
      finishVictory(nextDuel);
      return;
    }
    performManualEnemyTurn(nextDuel);
  }

  function startAutomaticCombat() {
    if (duelStatus !== "active") return;
    const result = simulateDuel(
      player,
      spells,
      items,
      duel,
      trackComboExecution,
    );
    setDuel(result);
    setCombatLog(result.log);
    setDuelStatus(result.status);
    if (result.status === "victory" && !rewardClaimed) {
      setVictorySummary(
        isExamMode
          ? { exam: onExamVictory(examId, result.combatHealth) }
          : onAwardRewards(result.scaledEnemy, result.combatHealth),
      );
      setRewardClaimed(true);
    } else if (result.status !== "victory") {
      onDuelEnd(result.combatHealth);
    }
    if (result.status === "draw")
      setCombatLog([
        ...result.log,
        "A párbaj túl sokáig elhúzódott, ezért döntetlenül ért véget.",
      ]);
  }

  return (
    <section className="page duel-page">
      <p className="eyebrow">
        {isExamMode ? "Az akadémia vizsgaterme" : "A gyakorlópárbaj csarnoka"}
      </p>
      <h2>
        {isExamMode ? examOpponent?.examTitle || "Vizsga" : "Párbajterem"}
      </h2>
      <div className="duel-status-bar">
        <span>
          Mana: {duel.combatMana} / {combatMaxMana}
        </span>
        <span>
          Automatikus harc: az egész párbaj egy pillanat alatt lezajlik.
        </span>
      </div>
      {adaptiveMechanic && (
        <aside className="duel-special-rule">
          <p className="eyebrow">{adaptiveMechanic.title}</p>
          <p>
            {adaptiveMechanic.description} Pajzs ereje:{" "}
            {adaptiveMechanic.shieldAmount}.
          </p>
          <p>{adaptiveMechanic.basicAttackNote}</p>
          {previousPlayerSpell && (
            <p>
              <strong>Előző varázslat:</strong> {previousPlayerSpell.name}
            </p>
          )}
        </aside>
      )}
      <div className="duelants">
        <article className="parchment-panel combatant player-combatant">
          <p className="eyebrow">Te</p>
          <h3>{player.name}</h3>
          <p>
            Életerő: {duel.combatHealth} / {combatMaxHealth}
          </p>
          {duel.combatShield > 0 && <p>Védőpajzs: {duel.combatShield}</p>}
          <p>
            Mana: {duel.combatMana} / {combatMaxMana}
          </p>
          <EffectList effects={duel.activeEffects.player} />
        </article>
        <div className="versus" aria-hidden="true">
          VS
        </div>
        <article className="parchment-panel combatant enemy-combatant">
          <p className="eyebrow">
            {isExamMode ? "Vizsgaellenfél" : "Gyakorló ellenfél"}
          </p>
          <h3>{duel.scaledEnemy.name}</h3>
          <p>Szint: {duel.scaledEnemy.level}</p>
          <p>
            Életerő: {duel.enemyHealth} / {duel.scaledEnemy.maxHealth}
          </p>
          {duel.enemyShield > 0 && <p>Védőpajzs: {duel.enemyShield}</p>}
          {duelStatus === "active" && enemyIntent && (
            <div
              className={`enemy-intent enemy-intent-${enemyIntent.id}`}
              aria-live="polite"
            >
              <p className="eyebrow">Következő szándék</p>
              <strong>
                <span aria-hidden="true">{enemyIntent.icon}</span>{" "}
                {enemyIntent.label}
              </strong>
            </div>
          )}
          <EffectList effects={duel.activeEffects.enemy} />
        </article>
      </div>
      {duelStatus === "active" && (
        <>
          <div className="duel-actions">
            <p className="eyebrow">Válassz varázslatot</p>
            <div className="spell-actions">
              {availableSpells.map((spell) => {
                const unavailableReason = getActionUnavailableReason(
                  spell,
                  duel,
                );
                const interaction = spell.effectInteraction;
                const intentState = getIntentInteractionState(spell, duel);
                const repeatsPreparedSpell =
                  duel.combatMana >= spell.manaCost &&
                  !unavailableReason &&
                  isAdaptiveSpellRepeat(spell, duel);
                return (
                  <article
                  className="parchment-panel spell-action"
                  key={spell.id}
                >
                  <h3>{spell.name}</h3>
                  {spell.type === "attack" || spell.id === basicAttack.id ? (
                    <p>
                      Sebzés: körülbelül{" "}
                      {spell.id === basicAttack.id
                        ? 4 + Math.floor(effectiveStats.magicPower * 0.5)
                        : spell.basePower + effectiveStats.magicPower}
                    </p>
                  ) : spell.type === "shield" ? (
                    <p>
                      Pajzs: {getGeneratedShieldAmount(spell, duel)}
                    </p>
                  ) : spell.type === "heal" ? (
                    <p>Gyógyítás: {spell.healAmount}</p>
                  ) : (
                    <p>
                      {spell.effect.name}: {spell.effect.magnitude}% ·{" "}
                      {spell.effect.charges} támadás
                    </p>
                  )}
                  {spell.effect?.trigger === "playerDamagingAttack" && (
                    <p>
                      Következő {spell.effect.charges} támadás: +
                      {spell.effect.magnitude}% sebzés
                    </p>
                  )}
                  {spell.effect?.damage !== undefined && (
                    <p>
                      Méreg: {spell.effect.damage} sebzés,{" "}
                      {spell.effect.charges} alkalommal
                    </p>
                  )}
                  {spell.type === "attack" &&
                    spell.healAmount !== undefined && (
                      <p>Gyógyítás: {spell.healAmount}</p>
                    )}
                  {spell.critChanceBonus !== undefined && (
                    <p>Kritikus bónusz: +{spell.critChanceBonus}%</p>
                  )}
                  {interaction?.mode === "consume-all-for-damage" && (
                    <p>
                      Sebezhető: +{interaction.damageBonusPerCharge}% / hátralévő
                      alkalom
                    </p>
                  )}
                  {interaction?.mode === "consume-all-damage-ticks" && (
                    <p>Mérgezett: hátralévő hatások azonnali aktiválása</p>
                  )}
                  {spell.intentInteraction?.mode === "damage-multiplier" && (
                    <p>
                      Védekező szándék: +
                      {spell.intentInteraction.magnitude}% sebzés
                    </p>
                  )}
                  {spell.intentInteraction?.mode === "heal" && (
                    <p>
                      Támadó szándék: +{spell.intentInteraction.healAmount}{" "}
                      életerő
                    </p>
                  )}
                  {intentState.active &&
                    spell.intentInteraction?.mode === "shield-bonus" && (
                      <p className="intent-match-hint">
                        Erős támadásra hangolva: +
                        {spell.intentInteraction.shieldBonus} pajzs
                      </p>
                    )}
                  <p>Manaigény: {spell.manaCost}</p>
                  {repeatsPreparedSpell && (
                    <small className="adaptive-repeat-warning">
                      Ismétlés: {duel.scaledEnemy.name} legalább{" "}
                      {adaptiveMechanic.shieldAmount} pajzserőt tart fenn.
                    </small>
                  )}
                  <button
                    className="button"
                    type="button"
                    onClick={() => castSpell(spell)}
                    disabled={
                      duel.combatMana < spell.manaCost ||
                      Boolean(unavailableReason)
                    }
                  >
                    Varázslás
                  </button>
                  {unavailableReason && <small>{unavailableReason}</small>}
                </article>
                );
              })}
              {showFallback && (
                <article className="parchment-panel spell-action spell-fallback">
                  <h3>{basicAttack.name}</h3>
                  <p>Nincs elég manád a bekészített varázslatokhoz.</p>
                  <p>Manaigény: 0</p>
                  <button
                    className="button"
                    type="button"
                    onClick={() => castSpell(basicAttack)}
                  >
                    Varázslás
                  </button>
                </article>
              )}
            </div>
          </div>
          <button
            className="button auto-button"
            type="button"
            onClick={startAutomaticCombat}
          >
            Automatikus harc
          </button>
        </>
      )}
      <div className="parchment-panel combat-log">
        <p className="eyebrow">Párbajnapló</p>
        <ul>
          {combatLog.map((entry, index) => (
            <li key={`${entry}-${index}`}>{entry}</li>
          ))}
        </ul>
      </div>
      {duelStatus === "victory" && victorySummary && !isExamMode && (
        <div className="parchment-panel victory-summary">
          <p className="eyebrow">Győzelem!</p>
          <h3>Jutalmak</h3>
          <p>+{duel.scaledEnemy.xpReward} XP</p>
          <p>+{duel.scaledEnemy.goldReward} korona</p>
          {victorySummary.leveledUp && (
            <strong>
              Szintet léptél! Életerőd és energiád teljesen feltöltődött.
            </strong>
          )}
        </div>
      )}
      {duelStatus !== "active" && (
        <div className="duel-result">
          <strong>
            {duelStatus === "blocked"
              ? blockMessage
              : needsInfirmary
                ? "Életerőd elfogyott. Új párbaj előtt fel kell gyógyulnod."
                : isExamMode && duelStatus === "victory"
                  ? "A vizsga sikerült!"
                  : isExamMode && duelStatus === "defeat"
                    ? "A vizsga nem sikerült. Felkészülhetsz, majd újra próbálkozhatsz."
                    : duelStatus === "victory"
                      ? "Győzedelmeskedtél!"
                      : duelStatus === "defeat"
                        ? "Vereség."
                        : "Döntetlen."}
          </strong>
          {needsInfirmary ? (
            <button
              className="button"
              type="button"
              onClick={() => navigate("/infirmary")}
            >
              Irány a Gyengélkedő
            </button>
          ) : duelStatus === "blocked" ? null : isExamMode &&
            duelStatus === "victory" ? (
            <button
              className="button"
              type="button"
              onClick={() => navigate("/quests")}
            >
              Vissza a feladatokhoz
            </button>
          ) : (
            <button className="button" type="button" onClick={startNewDuel}>
              {isExamMode ? "Új vizsgapróba" : "Új párbaj"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default DuelPage;
