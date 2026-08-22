import { useState } from "react";
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
  message,
  onEquipItem,
  onUnequipItem,
  energyStatus,
  manaStatus,
}) {
  const [name, setName] = useState(player.name);

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
  const effectiveStats = { ...player.stats };
  equippedItems.forEach(({ item }) => {
    if (item?.bonuses) {
      Object.entries(item.bonuses).forEach(([stat, bonus]) => {
        effectiveStats[stat] += bonus;
      });
    }
  });

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
            <dt>Szint</dt>
            <dd>{player.level}</dd>
          </div>
          <div>
            <dt>Tapasztalat</dt>
            <dd>{player.xp} XP</dd>
          </div>
          <div>
            <dt>Arany</dt>
            <dd>{player.gold} korona</dd>
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
              {player.mana} / {player.maxMana}
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
        {manaStatus.countdown ? (
          <p className="energy-countdown">
            Következő mana: {manaStatus.countdown}
          </p>
        ) : (
          <p className="energy-countdown">A manád teljesen feltöltődött.</p>
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
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => onUnequipItem(slot.key)}
                  >
                    Leveszem
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {message && <p className="game-message">{message}</p>}
      <div className="parchment-panel inventory">
        <h3 className="eyebrow title">A táska tartalma</h3>
        {inventoryItems.length === 0 ? (
          <p className="inventory-empty">A táskád még üres.</p>
        ) : (
          <ul>
            {inventoryItems.map((inventoryItem) => (
              <li key={inventoryItem.itemId}>
                <span>{inventoryItem.item.name}</span>
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
