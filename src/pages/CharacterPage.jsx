import { useEffect, useState } from "react";
import getEffectiveStats, {
  getEffectiveMaxMana,
  getEquipmentBonuses,
} from "../utils/playerStats";
import { getXpRequiredForLevel } from "../utils/leveling";
import { getMaxHealthForLevel, getMaxManaForLevel } from "../utils/playerProgression";
import getStatUpgradeCost from "../utils/statUpgrades";
import { formatAcademyYear } from "../utils/academy";
import { formatItemBonuses } from "../utils/items";
import "./CharacterPage.css";

const equipmentSlots = [
  { key: "wand", label: "Varázspálca" },
  { key: "robe", label: "Köpeny" },
  { key: "amulet", label: "Amulett" },
];

const statDefinitions = [
  ["magicPower", "Mágikus erő", "Növeli a támadó varázsigék sebzését."],
  ["defense", "Védelem", "Csökkenti az ellenfelektől kapott sebzést."],
  ["focus", "Fókusz", "Növeli a kritikus találat esélyét."],
];

function ResourceBar({ value, maximum }) {
  return (
    <span className="character-resource-track" aria-hidden="true">
      <span style={{ width: `${Math.min(100, (value / maximum) * 100)}%` }} />
    </span>
  );
}

function CharacterPage({
  player,
  items,
  onSaveName,
  onEquipItem,
  onUnequipItem,
  onUpgradeStat,
  energyStatus,
  isResting,
  academyYear,
}) {
  const [name, setName] = useState(player.name);
  const [statMessage, setStatMessage] = useState("");

  useEffect(() => {
    if (!statMessage) return undefined;
    const timeoutId = setTimeout(() => setStatMessage(""), 3000);
    return () => clearTimeout(timeoutId);
  }, [statMessage]);

  function upgradeStat(stat) {
    if (!onUpgradeStat(stat)) return;
    const statNames = {
      magicPower: "Mágikus erőd",
      defense: "Védelmed",
      focus: "Fókuszod",
    };
    setStatMessage(`${statNames[stat]} 1 ponttal nőtt.`);
  }

  function saveName(event) {
    event.preventDefault();
    const savedName = name.trim() || "Névtelen tanonc";
    onSaveName(savedName);
    setName(savedName);
  }

  const inventoryItems = player.inventory
    .map((inventoryItem) => ({
      ...inventoryItem,
      item: items.find((item) => item.id === inventoryItem.itemId),
    }))
    .filter((inventoryItem) => inventoryItem.item);
  const equippedItems = equipmentSlots.map((slot) => ({
    ...slot,
    item: items.find((item) => item.id === player.equipment[slot.key]),
  }));
  const effectiveStats = getEffectiveStats(player, items);
  const equipmentBonuses = getEquipmentBonuses(player, items);
  const xpRequired = getXpRequiredForLevel(player.level);
  const xpRemaining = Math.max(0, xpRequired - player.xp);
  const maxHealth = getMaxHealthForLevel(player.level);
  const baseMaxMana = getMaxManaForLevel(player.level);
  const maxMana = getEffectiveMaxMana(player, items);

  return (
    <section className="page character-page">
      <p className="eyebrow">A játékos nyilvántartása</p>
      <h2>Karakter</h2>

      <div className="parchment-panel character-sheet">
        <p className="eyebrow">Tanoncadatlap</p>
        <form className="name-form" onSubmit={saveName}>
          <label htmlFor="wizard-name">Név</label>
          <div className="name-editor">
            <input id="wizard-name" value={name} onChange={(event) => setName(event.target.value)} />
            <button className="button" type="submit">Név mentése</button>
          </div>
        </form>
        <div className="profile-summary-grid">
          <section className="profile-summary-group">
            <p className="eyebrow">Személyes adatok</p>
            <div className="identity-facts">
              <div><span>Rend</span><strong>Még nincs kijelölve</strong></div>
              <div><span>Akadémiai évfolyam</span><strong>{formatAcademyYear(academyYear)}</strong></div>
              <div><span>Szint</span><strong>{player.level}</strong></div>
            </div>
          </section>
          <section className="profile-summary-group character-progress">
            <p className="eyebrow">Haladás</p>
            <div className="progress-summary">
              <div>
                <span>Tapasztalat</span>
                <strong>{player.xp} / {xpRequired} XP</strong>
                <ResourceBar value={player.xp} maximum={xpRequired} />
                <small>Szintlépésig: {xpRemaining} XP</small>
              </div>
              <div className="gold-summary"><span>Arany</span><strong>{player.gold} korona</strong></div>
            </div>
          </section>
          <section className="profile-summary-group character-resources">
            <p className="eyebrow">Erőforrások</p>
            <div className="resource-grid">
              <div className="resource-card">
                <span>Életerő</span><strong>{player.health} / {maxHealth}</strong>
                <ResourceBar value={player.health} maximum={maxHealth} />
              </div>
              <div className="resource-card">
                <span>Energia</span><strong>{player.energy} / {player.maxEnergy}</strong>
                <ResourceBar value={player.energy} maximum={player.maxEnergy} />
                <small>{energyStatus.countdown ? `Következő energia: ${energyStatus.countdown}` : "Teljesen feltöltve"}</small>
              </div>
              <div className="resource-card mana-card">
                <span>Harci mana</span><strong>{maxMana}</strong>
                <small>Alap: {baseMaxMana} · Felszerelés: +{equipmentBonuses.maxMana}</small>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="character-sections">
        <div className="parchment-panel stat-section">
          <h3 className="eyebrow title">A karakter tulajdonságai</h3>
          <div className="core-stat-grid">
            {statDefinitions.map(([stat, label]) => (
              <div className="core-stat" key={stat}><span>{label}</span><strong>{effectiveStats[stat]}</strong></div>
            ))}
          </div>
        </div>
        <div className="parchment-panel equipment-section">
          <h3 className="eyebrow title">Felszerelések</h3>
          <ul>
            {equippedItems.map((slot) => (
              <li key={slot.key}>
                <div className="equipment-copy">
                  <span className="equipment-slot-name">{slot.label}</span>
                  <strong>{slot.item ? slot.item.name : "Nincs felszerelve"}</strong>
                  {slot.item && <small>{formatItemBonuses(slot.item).join(" · ")}</small>}
                </div>
                {slot.item && (
                  <button className="text-button" type="button" onClick={() => onUnequipItem(slot.key)} disabled={isResting}>Leveszem</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="parchment-panel stat-upgrades">
        <div className="section-heading">
          <div><p className="eyebrow">Fejlődési lehetőségek</p><h3>Képességfejlesztés</h3></div>
          <strong>{player.gold} korona áll rendelkezésre</strong>
        </div>
        <div className="stat-upgrade-list">
          {statDefinitions.map(([stat, label, description]) => {
            const baseValue = player.stats[stat];
            const upgradeCost = getStatUpgradeCost(baseValue);
            return (
              <article className="stat-upgrade" key={stat}>
                <div>
                  <h4>{label}</h4>
                  <p className="stat-description">{description}</p>
                  <dl>
                    <div><dt>Alapérték</dt><dd>{baseValue}</dd></div>
                    <div><dt>Felszerelés</dt><dd>+{equipmentBonuses[stat]}</dd></div>
                    <div className="stat-total"><dt>Összesen</dt><dd>{effectiveStats[stat]}</dd></div>
                  </dl>
                </div>
                <div className="upgrade-action">
                  <strong>{upgradeCost} korona</strong>
                  <button className="button" type="button" onClick={() => upgradeStat(stat)} disabled={isResting || player.gold < upgradeCost}>Fejlesztem</button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {statMessage && <p className="stat-upgrade-message" role="status" aria-live="polite">{statMessage}</p>}

      <div className="parchment-panel inventory">
        <div className="section-heading">
          <div><p className="eyebrow">Személyes holmik</p><h3>A táska tartalma</h3></div>
          <span>{inventoryItems.length} tárgytípus</span>
        </div>
        {inventoryItems.length === 0 ? (
          <p className="inventory-empty">A táskád még üres.</p>
        ) : (
          <ul>
            {inventoryItems.map((inventoryItem) => {
              const equipped =
                inventoryItem.item.type === "equipment" &&
                player.equipment[inventoryItem.item.slot] === inventoryItem.item.id;
              return (
                <li className={equipped ? "inventory-equipped" : ""} key={inventoryItem.itemId}>
                  <div className="inventory-item-copy">
                    <strong>{inventoryItem.item.name}</strong>
                    {inventoryItem.item.bonuses && <small>{formatItemBonuses(inventoryItem.item).join(" · ")}</small>}
                  </div>
                  <div className="inventory-actions">
                    <strong>{inventoryItem.quantity} db</strong>
                    {equipped ? (
                      <span className="equipped-badge">Felszerelve</span>
                    ) : inventoryItem.item.type === "equipment" ? (
                      <button className="text-button" type="button" onClick={() => onEquipItem(inventoryItem.item)} disabled={isResting}>Felszerelem</button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export default CharacterPage;
