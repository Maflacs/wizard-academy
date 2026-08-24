import { useEffect, useState } from "react";
import getEffectiveStats, {
  getEffectiveMaxMana,
  getEquipmentBonuses,
} from "../utils/playerStats";
import { getXpRequiredForLevel } from "../utils/leveling";
import {
  getMaxHealthForLevel,
  getMaxManaForLevel,
} from "../utils/playerProgression";
import getStatUpgradeCost from "../utils/statUpgrades";
import { formatAcademyYear } from "../utils/academy";
import { formatItemBonuses } from "../utils/items";
import "./CharacterPage.css";

const equipmentSlots = [
  { key: "wand", label: "Varázspálca" },
  { key: "robe", label: "Köpeny" },
  { key: "amulet", label: "Amulett" },
];

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
    <section className="page">
      <p className="eyebrow">A játékos nyilvántartása</p>
      <h2>Karakter</h2>
      <div className="parchment-panel character-sheet">
        <p className="eyebrow">Tanoncadatlap</p>
        <form onSubmit={saveName}>
          <label htmlFor="wizard-name">Név</label>
          <input
            id="wizard-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button className="button" type="submit">
            Név mentése
          </button>
        </form>
        <dl className="stats">
          <div>
            <dt>Rend</dt>
            <dd>Még nincs kijelölve</dd>
          </div>
          <div>
            <dt>Akadémiai évfolyam</dt>
            <dd>{formatAcademyYear(academyYear)}</dd>
          </div>
          <div>
            <dt>Szint</dt>
            <dd>{player.level}</dd>
          </div>
          <div>
            <dt>Tapasztalat</dt>
            <dd>
              {player.xp} / {xpRequired} XP
            </dd>
          </div>
          <div>
            <dt>Szintlépésig</dt>
            <dd>{xpRemaining} XP</dd>
          </div>
          <div>
            <dt>Arany</dt>
            <dd>{player.gold} korona</dd>
          </div>
          <div>
            <dt>Életerő</dt>
            <dd>
              {player.health} / {maxHealth}
            </dd>
          </div>
          <div>
            <dt>Energia</dt>
            <dd>
              {player.energy} / {player.maxEnergy}
            </dd>
          </div>
          <div>
            <dt>Mana</dt>
            <dd>
              Harci mana: {maxMana}
              <small>
                Alap: {baseMaxMana} · Felszerelés: +
                {equipmentBonuses.maxMana}
              </small>
            </dd>
          </div>
        </dl>
        {energyStatus.countdown ? (
          <p className="energy-countdown">
            Következő energia: {energyStatus.countdown}
          </p>
        ) : (
          <p className="energy-countdown">Az energiád teljesen feltöltődött.</p>
        )}
      </div>
      <div className="character-sections">
        <div className="parchment-panel stat-section">
          <h3 className="eyebrow title">A karakter tulajdonságai</h3>
          <ul>
            <li>
              <span>Mágikus erő</span>
              <strong>{effectiveStats.magicPower}</strong>
            </li>
            <li>
              <span>Védelem</span>
              <strong>{effectiveStats.defense}</strong>
            </li>
            <li>
              <span>Fókusz</span>
              <strong>{effectiveStats.focus}</strong>
            </li>
          </ul>
        </div>
        <div className="parchment-panel equipment-section">
          <h3 className="eyebrow title">Felszerelések</h3>
          <ul>
            {equippedItems.map((slot) => (
              <li key={slot.key}>
                <span>{slot.label}</span>
                <strong>
                  {slot.item ? slot.item.name : "Nincs felszerelve"}
                </strong>
                {slot.item && (
                  <small className="equipment-bonuses">
                    {formatItemBonuses(slot.item).join(" · ")}
                  </small>
                )}
                {slot.item && (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => onUnequipItem(slot.key)}
                    disabled={isResting}
                  >
                    Leveszem
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="parchment-panel stat-upgrades">
        <h3 className="eyebrow title">Képességfejlesztés</h3>
        <div className="stat-upgrade-list">
          {[
            [
              "magicPower",
              "Mágikus erő",
              "Növeli a támadó varázsigék sebzését.",
            ],
            [
              "defense",
              "Védelem",
              "Csökkenti az ellenfelektől kapott sebzést.",
            ],
            ["focus", "Fókusz", "Növeli a kritikus találat esélyét."],
          ].map(([stat, label, description]) => {
            const baseValue = player.stats[stat];
            const upgradeCost = getStatUpgradeCost(baseValue);
            return (
              <div className="stat-upgrade" key={stat}>
                <div>
                  <h4>{label}</h4>
                  <p className="stat-description">{description}</p>
                  <p>Alap: {baseValue}</p>
                  <p>Felszerelés: +{equipmentBonuses[stat]}</p>
                  <p>Összesen: {effectiveStats[stat]}</p>
                  <p>Fejlesztés ára: {upgradeCost} korona</p>
                </div>
                <button
                  className="button"
                  type="button"
                  onClick={() => upgradeStat(stat)}
                  disabled={isResting || player.gold < upgradeCost}
                >
                  Fejlesztem
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {statMessage && (
        <p className="stat-upgrade-message" role="status" aria-live="polite">
          {statMessage}
        </p>
      )}
      <div className="parchment-panel inventory">
        <h3 className="eyebrow title">A táska tartalma</h3>
        {inventoryItems.length === 0 ? (
          <p className="inventory-empty">A táskád még üres.</p>
        ) : (
          <ul>
            {inventoryItems.map((inventoryItem) => (
              <li key={inventoryItem.itemId}>
                <span>
                  {inventoryItem.item.name}
                  {inventoryItem.item.bonuses && (
                    <small className="inventory-item-bonuses">
                      {formatItemBonuses(inventoryItem.item).join(" · ")}
                    </small>
                  )}
                </span>
                <span className="inventory-actions">
                  <strong>{inventoryItem.quantity} db</strong>
                  {inventoryItem.item.type === "equipment" &&
                    (player.equipment[inventoryItem.item.slot] ===
                    inventoryItem.item.id ? (
                      <em>Felszerelve</em>
                    ) : (
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onEquipItem(inventoryItem.item)}
                        disabled={isResting}
                      >
                        Felszerelem
                      </button>
                    ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default CharacterPage;
