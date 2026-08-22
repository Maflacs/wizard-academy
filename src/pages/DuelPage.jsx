import { useState } from "react";
import getEffectiveStats from "../utils/playerStats";
import applyDamageVariance from "../utils/combat";
import createScaledEnemy from "../utils/enemyScaling";
import {
  getMaxHealthForLevel,
  getMaxManaForLevel,
} from "../utils/playerProgression";
import "./DuelPage.css";

function DuelPage({ player, items, spells, enemy, onAwardRewards }) {
  const [scaledEnemy, setScaledEnemy] = useState(() =>
    createScaledEnemy(enemy, player.level),
  );
  const [enemyHealth, setEnemyHealth] = useState(scaledEnemy.maxHealth);
  const [combatHealth, setCombatHealth] = useState(() =>
    getMaxHealthForLevel(player.level),
  );
  const [combatMana, setCombatMana] = useState(() =>
    getMaxManaForLevel(player.level),
  );
  const [combatShield, setCombatShield] = useState(0);
  const [combatLog, setCombatLog] = useState(["A gyakorlópárbaj elkezdődött."]);
  const [duelStatus, setDuelStatus] = useState("active");
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [victorySummary, setVictorySummary] = useState(null);
  const effectiveStats = getEffectiveStats(player, items);
  const combatMaxHealth = getMaxHealthForLevel(player.level);
  const combatMaxMana = getMaxManaForLevel(player.level);

  function addLog(entry) {
    setCombatLog((currentLog) => [...currentLog, entry]);
  }

  function restartDuel() {
    const nextEnemy = createScaledEnemy(enemy, player.level);
    setScaledEnemy(nextEnemy);
    setEnemyHealth(nextEnemy.maxHealth);
    setCombatHealth(getMaxHealthForLevel(player.level));
    setCombatMana(getMaxManaForLevel(player.level));
    setCombatShield(0);
    setCombatLog(["A gyakorlópárbaj újra kezdődött."]);
    setDuelStatus("active");
    setRewardClaimed(false);
    setVictorySummary(null);
  }

  function castSpell(spell) {
    if (
      duelStatus !== "active" ||
      !player.knownSpells.includes(spell.id) ||
      player.level < spell.requiredLevel ||
      combatMana < spell.manaCost
    ) {
      return;
    }

    // Combat mana is temporary; persistent mana remains available outside the duel.
    setCombatMana((currentMana) => currentMana - spell.manaCost);
    if (spell.type === "attack") {
      const criticalChance = Math.min(50, 5 + effectiveStats.focus);
      // This roll happens only after a player action, never during rendering.
      // eslint-disable-next-line react-hooks/purity
      const isCritical = Math.random() * 100 < criticalChance;
      const baseDamage = spell.basePower + effectiveStats.magicPower;
      const variedDamage = applyDamageVariance(baseDamage);
      const damage = isCritical ? Math.round(variedDamage * 1.5) : variedDamage;
      const remainingEnemyHealth = Math.max(0, enemyHealth - damage);

      setEnemyHealth(remainingEnemyHealth);
      const isPlantSpell =
        spell.id === "biting-vine" || spell.id === "thorn-root";
      addLog(
        isCritical
          ? isPlantSpell
            ? `A megidézett ${spell.name} kritikus találata ${damage} sebzést okozott.`
            : `${spell.name} kritikus találat! ${damage} sebzést okoztál.`
          : isPlantSpell
            ? `A megidézett ${spell.name} az ellenfélbe mart, és ${damage} sebzést okozott.`
            : `${spell.name} varázslatot használtál, és ${damage} sebzést okoztál.`,
      );

      if (remainingEnemyHealth <= 0) {
        finishVictory();
        return;
      }
    } else if (spell.type === "shield") {
      setCombatShield((currentShield) => currentShield + spell.shieldAmount);
      addLog(
        `${spell.name}et idéztél, és ${spell.shieldAmount} pajzsot kaptál.`,
      );
    } else if (spell.type === "heal") {
      const restoredHealth = Math.min(
        spell.healAmount,
        combatMaxHealth - combatHealth,
      );
      setCombatHealth(combatHealth + restoredHealth);
      addLog(`${spell.name} ${restoredHealth} életerőt állított helyre.`);
    }

    const variedEnemyAttack = applyDamageVariance(scaledEnemy.attack);
    const damageTaken = Math.max(1, variedEnemyAttack - effectiveStats.defense);
    const absorbedDamage = Math.min(combatShield, damageTaken);
    const healthDamage = damageTaken - absorbedDamage;
    const remainingCombatHealth = Math.max(0, combatHealth - healthDamage);
    setCombatShield(combatShield - absorbedDamage);
    setCombatHealth(remainingCombatHealth);
    addLog(
      absorbedDamage > 0
        ? `${scaledEnemy.name} támadása ${damageTaken} sebzést okozott; a pajzs ${absorbedDamage} sebzést felfogott.`
        : `${scaledEnemy.name} támadása ${healthDamage} életerőt sebzett.`,
    );

    if (remainingCombatHealth <= 0) {
      setDuelStatus("defeat");
      addLog("Vereség! A gyakorlópárbajt elvesztetted.");
    }
  }

  function finishVictory() {
    setDuelStatus("victory");
    if (!rewardClaimed) {
      const rewardResult = onAwardRewards(scaledEnemy);
      setVictorySummary(rewardResult);
      setRewardClaimed(true);
    }
    addLog(
      `Győzelem! Jutalmad: +${scaledEnemy.xpReward} XP és +${scaledEnemy.goldReward} arany.`,
    );
  }

  const availableSpells = spells.filter(
    (spell) =>
      player.knownSpells.includes(spell.id) &&
      ["attack", "shield", "heal"].includes(spell.type),
  );

  return (
    <section className="page duel-page">
      <p className="eyebrow">A gyakorlópárbaj csarnoka</p>
      <h2>Párbajterem</h2>
      <div className="duel-status-bar">
        <span>
          Mana: {combatMana} / {player.maxMana}
        </span>
        <span>A párbaj manája csak erre a küzdelemre érvényes.</span>
      </div>
      <div className="duelants">
        <article className="parchment-panel combatant player-combatant">
          <p className="eyebrow">Te</p>
          <h3>{player.name}</h3>
          <p>
            Életerő: {combatHealth} / {combatMaxHealth}
          </p>
          {combatShield > 0 && <p>Védőpajzs: {combatShield}</p>}
          <p>
            Mana: {combatMana} / {combatMaxMana}
          </p>
        </article>
        <div className="versus" aria-hidden="true">
          VS
        </div>
        <article className="parchment-panel combatant enemy-combatant">
          <p className="eyebrow">Gyakorló ellenfél</p>
          <h3>{scaledEnemy.name}</h3>
          <p>Szint: {scaledEnemy.level}</p>
          <p>
            Életerő: {enemyHealth} / {scaledEnemy.maxHealth}
          </p>
        </article>
      </div>
      <div className="duel-actions">
        <p className="eyebrow">Válassz támadó varázslatot</p>
        {availableSpells.length === 0 ? (
          <p className="duel-empty">Nincs használható támadó varázslatod.</p>
        ) : (
          <div className="spell-actions">
            {availableSpells.map((spell) => (
              <article className="parchment-panel spell-action" key={spell.id}>
                <h3>{spell.name}</h3>
                {spell.type === "attack" && (
                  <p>
                    Sebzés: körülbelül{" "}
                    {spell.basePower + effectiveStats.magicPower}
                  </p>
                )}
                {spell.type === "shield" && (
                  <p>Pajzs ereje: {spell.shieldAmount}</p>
                )}
                {spell.type === "heal" && <p>Gyógyítás: {spell.healAmount}</p>}
                <p>Manaigény: {spell.manaCost}</p>
                {player.level < spell.requiredLevel && (
                  <small>Szükséges szint: {spell.requiredLevel}</small>
                )}
                {combatMana < spell.manaCost && (
                  <small>Nincs elég manád.</small>
                )}
                <button
                  className="button"
                  type="button"
                  onClick={() => castSpell(spell)}
                  disabled={
                    duelStatus !== "active" ||
                    player.level < spell.requiredLevel ||
                    combatMana < spell.manaCost
                  }
                >
                  Varázslás
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="parchment-panel combat-log">
        <p className="eyebrow">Párbajnapló</p>
        <ul>
          {combatLog.map((entry, index) => (
            <li key={`${entry}-${index}`}>{entry}</li>
          ))}
        </ul>
      </div>
      {duelStatus === "victory" && victorySummary && (
        <div className="parchment-panel victory-summary">
          <p className="eyebrow">Győzelem!</p>
          <h3>Jutalmak</h3>
          <p>+{scaledEnemy.xpReward} XP</p>
          <p>+{scaledEnemy.goldReward} korona</p>
          {victorySummary.leveledUp && (
            <strong>
              Szintlépés! Elérted a(z) {victorySummary.newLevel}. szintet.
            </strong>
          )}
        </div>
      )}
      {duelStatus !== "active" && (
        <div className="duel-result">
          <strong>
            {duelStatus === "victory"
              ? "Győzedelmeskedtél!"
              : "A párbaj véget ért."}
          </strong>
          <button className="button" type="button" onClick={restartDuel}>
            Új párbaj
          </button>
        </div>
      )}
    </section>
  );
}

export default DuelPage;
