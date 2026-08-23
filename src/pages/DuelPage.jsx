import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import getEffectiveStats from "../utils/playerStats";
import applyDamageVariance, { chooseEnemyAction } from "../utils/combat";
import createScaledEnemy from "../utils/enemyScaling";
import {
  getMaxHealthForLevel,
  getMaxManaForLevel,
} from "../utils/playerProgression";
import "./DuelPage.css";

const basicAttack = { id: "basic-attack", name: "Pálcaütés", manaCost: 0 };
const maxAutoTurns = 100;

function chooseRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
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
    enemyShield: 0,
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

function getUsablePlayerActions(player, spells, state) {
  const actions = [basicAttack];
  spells.forEach((spell) => {
    if (
      !player.knownSpells.includes(spell.id) ||
      player.level < spell.requiredLevel ||
      state.combatMana < spell.manaCost
    )
      return;
    if (spell.type === "shield" && state.combatShield < spell.shieldAmount)
      actions.push(spell);
    if (spell.type === "heal" && state.combatHealth < state.maxHealth * 0.75)
      actions.push(spell);
    if (spell.type === "attack") actions.push(spell);
  });
  return actions;
}

function performEnemyAction(state, effectiveStats, addLog) {
  const action = chooseEnemyAction(state.scaledEnemy);
  if (action.type === "shield") {
    state.enemyShield += action.shieldAmount || 10;
    addLog(`${state.scaledEnemy.name} mágikus védőburkot vont maga köré.`);
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
  const absorbed = Math.min(state.combatShield, incoming);
  state.combatShield -= absorbed;
  state.combatHealth = Math.max(0, state.combatHealth - incoming + absorbed);
  addLog(
    heavy
      ? `${state.scaledEnemy.name} pusztító csapása ${incoming - absorbed} sebzést okozott.`
      : `${state.scaledEnemy.name} ${incoming - absorbed} sebzést okozott.`,
  );
  if (absorbed > 0) addLog(`A védőpajzsod ${absorbed} sebzést felfogott.`);
}

function simulateDuel(player, spells, items, duelState) {
  const state = { ...duelState };
  const effectiveStats = getEffectiveStats(player, items);
  const log = [];
  const addLog = (entry) => {
    if (log.length < 8) log.push(entry);
  };

  for (let turn = 0; turn < maxAutoTurns; turn += 1) {
    const actions = getUsablePlayerActions(player, spells, state);
    const action = chooseRandom(actions);
    state.combatMana -= action.manaCost;
    if (action.type === "attack" || action.id === basicAttack.id) {
      const result = getAttackDamage(action, effectiveStats);
      const damage = typeof result === "number" ? result : result.damage;
      const blocked = Math.min(state.enemyShield, damage);
      state.enemyShield -= blocked;
      state.enemyHealth = Math.max(0, state.enemyHealth - damage + blocked);
      addLog(`${action.name} ${damage} sebzést okozott.`);
    } else if (action.type === "shield") {
      state.combatShield += action.shieldAmount;
      addLog(`${action.name} ${action.shieldAmount} pajzsot adott.`);
    } else if (action.type === "heal") {
      const healed = Math.min(
        action.healAmount,
        state.maxHealth - state.combatHealth,
      );
      state.combatHealth += healed;
      addLog(`${action.name} ${healed} életerőt állított helyre.`);
    }
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
  const canStartDuel =
    player.health > 0 &&
    !isResting &&
    (!isExamMode || (!examCompleted && examReady));
  const [duel, setDuel] = useState(() =>
    createDuelState(
      isExamMode ? examOpponent : chooseRandom(normalEnemies),
      player.level,
      player.health,
    ),
  );
  const [combatLog, setCombatLog] = useState([
    `${duel.scaledEnemy.name} megjelent a párbajban.`,
  ]);
  const [duelStatus, setDuelStatus] = useState(
    canStartDuel ? "active" : "blocked",
  );
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [victorySummary, setVictorySummary] = useState(null);
  const effectiveStats = getEffectiveStats(player, items);
  const combatMaxHealth = getMaxHealthForLevel(player.level);
  const combatMaxMana = getMaxManaForLevel(player.level);
  const availableSpells = [
    basicAttack,
    ...spells.filter(
      (spell) =>
        player.knownSpells.includes(spell.id) &&
        ["attack", "shield", "heal"].includes(spell.type),
    ),
  ];

  function addLog(entry) {
    setCombatLog((currentLog) => [...currentLog, entry]);
  }

  function startNewDuel() {
    if (!canStartDuel) {
      setDuelStatus("blocked");
      setCombatLog([
        examCompleted
          ? "Ezt a vizsgát már sikeresen teljesítetted."
          : player.health <= 0
            ? "Túl sérült vagy a párbajhoz. Előbb fel kell gyógyulnod."
            : isResting
              ? "A karaktered a Gyengélkedőn pihen. Előbb keltsd fel, hogy folytathasd."
              : "A vizsga feltételei még nem teljesültek.",
      ]);
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
          player.level < spell.requiredLevel))
    )
      return;
    const nextDuel = { ...duel, combatMana: duel.combatMana - spell.manaCost };
    if (spell.type === "attack" || spell.id === basicAttack.id) {
      const result = getAttackDamage(spell, effectiveStats);
      const damage = typeof result === "number" ? result : result.damage;
      const blocked = Math.min(nextDuel.enemyShield, damage);
      nextDuel.enemyShield -= blocked;
      nextDuel.enemyHealth = Math.max(
        0,
        nextDuel.enemyHealth - damage + blocked,
      );
      addLog(
        `${spell.name} varázslatot használtál, és ${damage} sebzést okoztál.`,
      );
    } else if (spell.type === "shield") {
      nextDuel.combatShield += spell.shieldAmount;
      addLog(
        `${spell.name}et idéztél, és ${spell.shieldAmount} pajzsot kaptál.`,
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
                  <p>Manaigény: {spell.manaCost}</p>
                  <button
                    className="button"
                    type="button"
                    onClick={() => castSpell(spell)}
                    disabled={duel.combatMana < spell.manaCost}
                  >
                    Varázslás
                  </button>
                </article>
              ))}
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
              ? examCompleted
                ? "Ezt a vizsgát már teljesítetted."
                : player.health <= 0
                  ? "Túl sérült vagy a harchoz."
                  : "A vizsga feltételei még nem teljesültek."
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
          {duelStatus === "blocked" ? null : isExamMode &&
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
