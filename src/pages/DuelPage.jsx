import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import getEffectiveStats from "../utils/playerStats";
import applyDamageVariance, {
  applyShield,
  chooseEnemyAction,
  resolveShieldDamage,
} from "../utils/combat";
import createScaledEnemy from "../utils/enemyScaling";
import {
  getMaxHealthForLevel,
  getMaxManaForLevel,
} from "../utils/playerProgression";
import { getAcademyYear } from "../utils/academy";
import "./DuelPage.css";

const basicAttack = { id: "basic-attack", name: "Pálcaütés", manaCost: 0 };
const maxAutoTurns = 100;

function chooseRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function chooseWeightedAutoAction(actions, state, previousActionType) {
  const hasPreparedAttack = actions.some((action) => action.type === "attack");
  const eligibleActions =
    previousActionType === "shield" && hasPreparedAttack
      ? actions.filter((action) => action.type !== "shield")
      : actions;
  const healthRatio = state.combatHealth / state.maxHealth;
  const weightedActions = eligibleActions.map((action) => {
    let weight = 1;
    if (action.type === "attack" || action.id === basicAttack.id) {
      weight = healthRatio > 0.75 ? 5 : healthRatio >= 0.4 ? 3 : 2;
    } else if (action.type === "shield") {
      weight = healthRatio > 0.75 ? 1 : healthRatio >= 0.4 ? 3 : 5;
    } else if (action.type === "heal") {
      weight = healthRatio >= 0.4 ? 4 : 6;
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

function createDuelState(enemy, playerLevel, playerHealth) {
  const scaledEnemy = createScaledEnemy(enemy, playerLevel);
  const maxHealth = getMaxHealthForLevel(playerLevel);
  return {
    scaledEnemy,
    enemyHealth: scaledEnemy.maxHealth,
    combatHealth: Math.min(maxHealth, Math.max(0, playerHealth)),
    combatMana: getMaxManaForLevel(playerLevel),
    maxHealth: getMaxHealthForLevel(playerLevel),
    maxMana: getMaxManaForLevel(playerLevel),
    combatShield: 0,
    combatShieldName: null,
    enemyShield: 0,
    enemyShieldCooldown: 0,
  };
}

function getAttackDamage(spell, effectiveStats) {
  const baseDamage =
    spell.id === basicAttack.id
      ? 4 + Math.floor(effectiveStats.magicPower * 0.5)
      : spell.basePower + effectiveStats.magicPower;
  const variedDamage = applyDamageVariance(baseDamage);
  if (spell.id === basicAttack.id) return variedDamage;
  const criticalChance = Math.min(50, 5 + effectiveStats.focus);
  const isCritical = Math.random() * 100 < criticalChance;
  return {
    damage: isCritical ? Math.round(variedDamage * 1.5) : variedDamage,
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
    if (
      spell.type === "shield" &&
      (automatic
        ? state.combatShield <= spell.shieldAmount * 0.5
        : state.combatShield < spell.shieldAmount)
    )
      preparedActions.push(spell);
    if (
      spell.type === "heal" &&
      state.combatHealth <
        (automatic ? state.maxHealth * 0.75 : state.maxHealth)
    )
      preparedActions.push(spell);
    if (spell.type === "attack") preparedActions.push(spell);
  });
  // Wand Strike is implicit only when no prepared spell can currently be used.
  return preparedActions.length > 0 ? preparedActions : [basicAttack];
}

function performEnemyAction(state, effectiveStats, addLog) {
  const shieldOnCooldown = state.enemyShieldCooldown > 0;
  if (shieldOnCooldown) state.enemyShieldCooldown -= 1;
  const availableActions = state.scaledEnemy.actions?.filter((action) => {
    if (action.type !== "shield") return true;
    const shieldAmount = action.shieldAmount || 10;
    return !shieldOnCooldown && state.enemyShield <= shieldAmount * 0.5;
  });
  const action = chooseEnemyAction({
    ...state.scaledEnemy,
    actions: availableActions,
  });
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
    return;
  }
  const heavy = action.type === "heavyAttack";
  const attack = heavy
    ? state.scaledEnemy.attack * 1.35
    : state.scaledEnemy.attack;
  const incoming = Math.max(
    1,
    applyDamageVariance(attack) - effectiveStats.defense,
  );
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

function performPlayerAttack(state, spell, effectiveStats, addLog) {
  const result = getAttackDamage(spell, effectiveStats);
  const damage = typeof result === "number" ? result : result.damage;
  if (state.enemyShield > 0) {
    const shieldResult = resolveShieldDamage(state.enemyShield, damage);
    const enemyHealthBeforeAttack = state.enemyHealth;
    state.enemyShield = shieldResult.remainingShield;
    state.enemyHealth = Math.max(
      0,
      state.enemyHealth - shieldResult.healthDamage,
    );
    const actualHealthDamage = enemyHealthBeforeAttack - state.enemyHealth;
    addLog(
      shieldResult.remainingShield > 0
        ? `${state.scaledEnemy.name} védőpajzsa ${shieldResult.absorbed} sebzést felfogott.`
        : `${state.scaledEnemy.name} védőpajzsa ${shieldResult.absorbed} sebzést felfogott és szertefoszlott.`,
    );
    if (actualHealthDamage > 0) {
      addLog(
        `${spell.name} ${actualHealthDamage} sebzést okozott ${state.scaledEnemy.name} ellen.`,
      );
    } else {
      addLog(
        shieldResult.remainingShield > 0
          ? `A támadás nem jutott át a pajzson. Maradék pajzs: ${shieldResult.remainingShield}.`
          : "A támadás nem jutott át a pajzson.",
      );
    }
  } else {
    state.enemyHealth = Math.max(0, state.enemyHealth - damage);
    addLog(`${spell.name} ${damage} sebzést okozott.`);
  }

  if (spell.healAmount !== undefined) {
    const healed = Math.min(
      spell.healAmount,
      state.maxHealth - state.combatHealth,
    );
    state.combatHealth += healed;
    if (healed > 0) addLog(`${spell.name} ${healed} életerőt állított helyre.`);
  }
}

function simulateDuel(player, spells, items, duelState) {
  const state = { ...duelState };
  const effectiveStats = getEffectiveStats(player, items);
  const log = [];
  let previousActionType = null;
  const addLog = (entry) => {
    log.push(entry);
  };

  for (let turn = 0; turn < maxAutoTurns; turn += 1) {
    const actions = getUsablePlayerActions(player, spells, state, true);
    const action = chooseWeightedAutoAction(actions, state, previousActionType);
    state.combatMana -= action.manaCost;
    if (action.type === "attack" || action.id === basicAttack.id) {
      performPlayerAttack(state, action, effectiveStats, addLog);
    } else if (action.type === "shield") {
      const hadShield = state.combatShield > 0;
      state.combatShield = applyShield(state.combatShield, action);
      state.combatShieldName = action.name;
      addLog(
        hadShield
          ? `Újra megerősítetted a ${action.name} varázslatot. Pajzsod ereje: ${state.combatShield}.`
          : `${action.name} varázslatot idéztél. Pajzsod ereje: ${state.combatShield}.`,
      );
    } else if (action.type === "heal") {
      const healed = Math.min(
        action.healAmount,
        state.maxHealth - state.combatHealth,
      );
      state.combatHealth += healed;
      addLog(`${action.name} ${healed} életerőt állított helyre.`);
    }
    previousActionType = action.type || "attack";
    if (state.enemyHealth <= 0) return { ...state, status: "victory", log };
    performEnemyAction(state, effectiveStats, addLog);
    if (state.combatHealth <= 0) return { ...state, status: "defeat", log };
  }
  return { ...state, status: "draw", log };
}

function DuelPage({
  player,
  items,
  spells,
  enemies,
  onAwardRewards,
  onExamVictory,
  onDuelEnd,
  examReady,
  isResting,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isExamMode =
    new URLSearchParams(location.search).get("exam") === "first-exam";
  const examOpponent = enemies.find((enemy) => enemy.isExamOpponent);
  const normalEnemies = enemies.filter((enemy) => !enemy.isExamOpponent);
  const examCompleted = player.completedMilestones.includes("first-exam");
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
      isExamMode ? examOpponent : chooseRandom(normalEnemies),
      player.level,
      player.health,
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
  const combatMaxMana = getMaxManaForLevel(player.level);
  const availableSpells = (player.preparedSpells || [])
    .map((spellId) => spells.find((spell) => spell.id === spellId))
    .filter(
      (spell) =>
        spell &&
        player.knownSpells.includes(spell.id) &&
        getAcademyYear(player) >= (spell.requiredAcademyYear ?? 1) &&
        ["attack", "shield", "heal"].includes(spell.type),
    );
  const usableActions = getUsablePlayerActions(player, availableSpells, duel);
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
      isExamMode ? examOpponent : chooseRandom(normalEnemies),
      player.level,
      player.health,
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
        ? { exam: onExamVictory(nextDuel.combatHealth) }
        : onAwardRewards(nextDuel.scaledEnemy, nextDuel.combatHealth);
      setVictorySummary(rewards);
      setRewardClaimed(true);
    }
  }

  function performManualEnemyTurn(nextDuel) {
    performEnemyAction(nextDuel, effectiveStats, addLog);
    setDuel(nextDuel);
    if (nextDuel.combatHealth <= 0) {
      onDuelEnd(0);
      setDuelStatus("defeat");
      addLog("Vereség! A gyakorlópárbajt elvesztetted.");
    }
  }

  function castSpell(spell) {
    if (
      duelStatus !== "active" ||
      duel.combatMana < spell.manaCost ||
      (spell.id !== basicAttack.id &&
        (!player.knownSpells.includes(spell.id) ||
          player.level < spell.requiredLevel ||
          getAcademyYear(player) < (spell.requiredAcademyYear ?? 1))) ||
      (spell.type === "shield" && duel.combatShield >= spell.shieldAmount) ||
      (spell.type === "heal" && duel.combatHealth >= combatMaxHealth)
    )
      return;
    const nextDuel = { ...duel, combatMana: duel.combatMana - spell.manaCost };
    if (spell.type === "attack" || spell.id === basicAttack.id) {
      performPlayerAttack(nextDuel, spell, effectiveStats, addLog);
    } else if (spell.type === "shield") {
      const hadShield = nextDuel.combatShield > 0;
      nextDuel.combatShield = applyShield(nextDuel.combatShield, spell);
      nextDuel.combatShieldName = spell.name;
      addLog(
        hadShield
          ? `Újra megerősítetted a ${spell.name} varázslatot. Pajzsod ereje: ${nextDuel.combatShield}.`
          : `${spell.name} varázslatot idéztél. Pajzsod ereje: ${nextDuel.combatShield}.`,
      );
    } else if (spell.type === "heal") {
      const healed = Math.min(
        spell.healAmount,
        combatMaxHealth - nextDuel.combatHealth,
      );
      nextDuel.combatHealth += healed;
      addLog(`${spell.name} ${healed} életerőt állított helyre.`);
    }
    if (nextDuel.enemyHealth <= 0) {
      setDuel(nextDuel);
      finishVictory(nextDuel);
      return;
    }
    performManualEnemyTurn(nextDuel);
  }

  function startAutomaticCombat() {
    if (duelStatus !== "active") return;
    const result = simulateDuel(player, spells, items, duel);
    setDuel(result);
    setCombatLog(result.log);
    setDuelStatus(result.status);
    if (result.status === "victory" && !rewardClaimed) {
      setVictorySummary(
        isExamMode
          ? { exam: onExamVictory(result.combatHealth) }
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
      <h2>{isExamMode ? "Első vizsga" : "Párbajterem"}</h2>
      <div className="duel-status-bar">
        <span>
          Mana: {duel.combatMana} / {combatMaxMana}
        </span>
        <span>
          Automatikus harc: az egész párbaj egy pillanat alatt lezajlik.
        </span>
      </div>
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
        </article>
      </div>
      {duelStatus === "active" && (
        <>
          <div className="duel-actions">
            <p className="eyebrow">Válassz varázslatot</p>
            <div className="spell-actions">
              {availableSpells.map((spell) => (
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
                    <p>Pajzs ereje: {spell.shieldAmount}</p>
                  ) : (
                    <p>Gyógyítás: {spell.healAmount}</p>
                  )}
                  {spell.type === "attack" &&
                    spell.healAmount !== undefined && (
                      <p>Gyógyítás: {spell.healAmount}</p>
                    )}
                  <p>Manaigény: {spell.manaCost}</p>
                  <button
                    className="button"
                    type="button"
                    onClick={() => castSpell(spell)}
                    disabled={
                      duel.combatMana < spell.manaCost ||
                      (spell.type === "shield" &&
                        duel.combatShield >= spell.shieldAmount) ||
                      (spell.type === "heal" &&
                        duel.combatHealth >= combatMaxHealth)
                    }
                  >
                    Varázslás
                  </button>
                  {spell.type === "shield" &&
                    duel.combatShield >= spell.shieldAmount && (
                      <small>A pajzsod már teljes erejű.</small>
                    )}
                </article>
              ))}
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
