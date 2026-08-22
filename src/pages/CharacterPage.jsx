import { useState } from "react";
import "./CharacterPage.css";

function CharacterPage({ player, items, onSaveName, energyStatus }) {
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

  return (
    <section className="page">
      <p className="eyebrow">A játékos nyilvántartása</p>
      <h2>Karakter</h2>
      <div className="two-column">
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
          </dl>
          {energyStatus.countdown ? (
            <p className="energy-countdown">
              Következő energia: {energyStatus.countdown}
            </p>
          ) : (
            <p className="energy-countdown">
              Az energiád teljesen feltöltődött.
            </p>
          )}
        </div>
        <div className="parchment-panel spellbook">
          <p className="eyebrow">Ismert varázsigék</p>
          <h3>Varázskönyv</h3>
          <ul>
            <li>✧ Fénygyújtás</li>
            <li>✧ Forrasztó bűbáj</li>
            <li>✧ Suttogó szél</li>
          </ul>
        </div>
      </div>
      <div className="parchment-panel inventory">
        <p className="eyebrow">A tanonc táskája</p>
        <h3>Felszerelés</h3>
        {inventoryItems.length === 0 ? (
          <p className="inventory-empty">A táskád még üres.</p>
        ) : (
          <ul>
            {inventoryItems.map((inventoryItem) => (
              <li key={inventoryItem.itemId}>
                <span>{inventoryItem.item.name}</span>
                <strong>{inventoryItem.quantity} db</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default CharacterPage;
