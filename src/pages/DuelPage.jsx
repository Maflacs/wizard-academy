import { useState } from "react";
import getEffectiveStats from "../utils/playerStats";
import applyDamageVariance from "../utils/combat";
import "./DuelPage.css";

function DuelPage({
  player,
  items,
  spells,
  enemy,
  manaStatus,
  onAwardRewards,
}) {
  const [enemyHealth, setEnemyHealth] = useState(enemy.maxHealth);
  const [combatHealth, setCombatHealth] = useState(player.maxHealth);
  const [combatMana, setCombatMana] = useState(player.maxMana);
  const [combatLog, setCombatLog] = useState(["A gyakorlópárbaj elkezdődött."]);
  const [duelStatus, setDuelStatus] = useState("active");
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [victorySummary, setVictorySummary] = useState(null);
  const effectiveStats = getEffectiveStats(player, items);
  const attackSpells = spells.filter(
    (spell) => player.knownSpells.includes(spell.id) && spell.type === "attack",
  );

  function addLog(entry) {
    setCombatLog((currentLog) => [...currentLog, entry]);
  }

  function restartDuel() {
    setEnemyHealth(enemy.maxHealth);
    setCombatHealth(player.maxHealth);
    setCombatMana(player.maxMana);
    setCombatLog(["A gyakorlópárbaj újra kezdődött."]);
    setDuelStatus("active");
    setRewardClaimed(false);
    setVictorySummary(null);
  }

  function castAttackSpell(spell) {
    if (
      duelStatus !== "active" ||
      !player.knownSpells.includes(spell.id) ||
      combatMana < spell.manaCost
    ) {
      return;
    }

    // Combat mana is temporary; persistent mana remains available outside the duel.
    setCombatMana((currentMana) => currentMana - spell.manaCost);
    const criticalChance = Math.min(50, 5 + effectiveStats.focus);
    // This roll happens only after a player action, never during rendering.
    // eslint-disable-next-line react-hooks/purity
    const isCritical = Math.random() * 100 < criticalChance;
    const baseDamage = spell.basePower + effectiveStats.magicPower;
    const variedDamage = applyDamageVariance(baseDamage);
    const damage = isCritical ? Math.round(variedDamage * 1.5) : variedDamage;
    const remainingEnemyHealth = Math.max(0, enemyHealth - damage);

    setEnemyHealth(remainingEnemyHealth);
    addLog(
      isCritical
        ? `${spell.name} kritikus találat! ${damage} sebzést okoztál.`
        : `${spell.name}et használtál, és ${damage} sebzést okoztál.`,
    );

    if (remainingEnemyHealth <= 0) {
      setDuelStatus("victory");
      if (!rewardClaimed) {
        const rewardResult = onAwardRewards(enemy);
        setVictorySummary(rewardResult);
        setRewardClaimed(true);
      }
      addLog(
        `Győzelem! Jutalmad: +${enemy.xpReward} XP és +${enemy.goldReward} arany.`,
      );
      return;
    }

    const variedEnemyAttack = applyDamageVariance(enemy.attack);
    const damageTaken = Math.max(1, variedEnemyAttack - effectiveStats.defense);
    const remainingCombatHealth = Math.max(0, combatHealth - damageTaken);
    setCombatHealth(remainingCombatHealth);
    addLog(`${enemy.name} támadása ${damageTaken} életerőt sebzett.`);

    if (remainingCombatHealth <= 0) {
      setDuelStatus("defeat");
      addLog("Vereség! A gyakorlópárbajt elvesztetted.");
    }
  }

  return (
    <section className="page duel-page">
      <p className="eyebrow">A gyakorlópárbaj csarnoka</p>
      <h2>Párbajterem</h2>
      <div className="duel-status-bar">
        <span>
          Mana: {combatMana} / {player.maxMana}
        </span>
        <span>
          {manaStatus?.countdown
            ? `Következő mana: ${manaStatus.countdown}`
            : "A manád teljesen feltöltődött."}
        </span>
      </div>
      <div className="duelants">
        <article className="parchment-panel combatant player-combatant">
          <p className="eyebrow">Te</p>
          <h3>{player.name}</h3>
          <p>
            Életerő: {combatHealth} / {player.maxHealth}
          </p>
          <p>
            Mana: {combatMana} / {player.maxMana}
          </p>
        </article>
        <div className="versus" aria-hidden="true">
          VS
        </div>
        <article className="parchment-panel combatant enemy-combatant">
          <p className="eyebrow">Gyakorló ellenfél</p>
          <h3>{enemy.name}</h3>
          <p>Szint: {enemy.level}</p>
          <p>
            Életerő: {enemyHealth} / {enemy.maxHealth}
          </p>
        </article>
      </div>
      <div className="duel-actions">
        <p className="eyebrow">Válassz támadó varázslatot</p>
        {attackSpells.length === 0 ? (
          <p className="duel-empty">Nincs használható támadó varázslatod.</p>
        ) : (
          <div className="spell-actions">
            {attackSpells.map((spell) => (
              <article className="parchment-panel spell-action" key={spell.id}>
                <h3>{spell.name}</h3>
                <p>
                  Sebzés: körülbelül{" "}
                  {spell.basePower + effectiveStats.magicPower}
                </p>
                <p>Manaigény: {spell.manaCost}</p>
                {combatMana < spell.manaCost && (
                  <small>Nincs elég manád.</small>
                )}
                <button
                  className="button"
                  type="button"
                  onClick={() => castAttackSpell(spell)}
                  disabled={
                    duelStatus !== "active" || combatMana < spell.manaCost
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
          <p>+{enemy.xpReward} XP</p>
          <p>+{enemy.goldReward} korona</p>
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
